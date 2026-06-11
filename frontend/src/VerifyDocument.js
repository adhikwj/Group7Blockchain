import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contractConfig";
import { base64ToBuf, importAESKeyFromRaw } from "./cryptoHelpers";

// ─────────────────────────────────────────────
//  VERIFY DOCUMENT PAGE
//
//  Flow:
//  1. User picks a file (original or potentially tampered)
//  2. File is sent to backend POST /verify
//  3. Backend hashes it (SHA-256) → returns bytes32 hash
//  4. Frontend calls verifyDocument(hash) on smart contract
//     via ethers.js → READ call (no gas, no MetaMask popup)
//
//  TAMPERING DETECTION:
//  - Original file  → same hash → found on-chain → VALID ✅
//  - Modified file  → different hash → NOT on-chain → TAMPERED ❌
//
//  Even changing a single byte produces a completely different
//  SHA-256 hash due to the avalanche effect.
// ─────────────────────────────────────────────

const BACKEND_URL = "http://localhost:5000";
const SEPOLIA_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com";

function getReadProvider(provider) {
  return provider || new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
}

async function fetchEncryptedBlob(cid, storage) {
  if (storage === "local" || cid.startsWith("local:")) {
    const localId = cid.replace("local:", "");
    const localResp = await fetch(`${BACKEND_URL}/local-ipfs/${encodeURIComponent(localId)}`);
    if (!localResp.ok) {
      throw new Error("Local encrypted blob not found.");
    }
    return localResp.arrayBuffer();
  }

  const gatewayUrls = [
    `https://gateway.pinata.cloud/ipfs/${cid}`,
    `https://dweb.link/ipfs/${cid}`,
    `https://ipfs.io/ipfs/${cid}`,
  ];

  for (const fetchUrl of gatewayUrls) {
    try {
      const resp = await fetch(fetchUrl);
      if (resp.ok) {
        return resp.arrayBuffer();
      }
    } catch (_) {
      // try next gateway
    }
  }

  throw new Error("Failed to fetch encrypted document from IPFS gateways.");
}

function VerifyDocument({ provider }) {
  const [file, setFile]         = useState(null);
  const [status, setStatus]     = useState("idle"); // idle | hashing | checking | done | error
  const [result, setResult]     = useState(null);   // null | { valid, hash, uploader, timestamp }
  const [errorMsg, setErrorMsg] = useState("");

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setResult(null);
    setErrorMsg("");
  };

  const handleVerify = async () => {
    if (!file) return;

    setErrorMsg("");
    setResult(null);
    setStatus("hashing");

    try {
      // ── STEP 1: Hash the file on the backend ──────────────────────────
      // HASHING OCCURS ON THE BACKEND (Node.js crypto module)
      const formData = new FormData();
      formData.append("document", file);

      const response = await fetch(`${BACKEND_URL}/verify`, {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Hashing failed");

      const documentHash = data.hash; // "0x" + 64-char hex
      setStatus("checking");

      // ── STEP 2: Query the blockchain ───────────────────────────────────
      // BLOCKCHAIN INTERACTION OCCURS HERE (READ — free, no MetaMask popup):
      // verifyDocument() checks if this exact hash exists in the mapping.
      // If the file was tampered, its hash is different → not found → false.
      const readProvider = getReadProvider(provider);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
      const isValid  = await contract.verifyDocument(documentHash);

      let uploader  = null;
      let timestamp = null;

      if (isValid) {
        // Fetch extra metadata for display
        const doc = await contract.getDocument(documentHash);
        uploader  = doc.uploader;
        timestamp = new Date(doc.timestamp.toNumber() * 1000).toLocaleString();
      }

      setResult({ valid: isValid, hash: documentHash, uploader, timestamp, fileName: data.fileName });
      setStatus("done");
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Verification failed.");
      setStatus("error");
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cid = params.get('cid');
    const storage = params.get('storage') || 'pinata';
    const keyB64 = params.get('k');
    const ivB64  = params.get('iv');
    const hash   = params.get('h'); // 0x...
    if (cid && keyB64 && ivB64 && hash) {
      (async () => {
        try {
          setStatus('checking');
          // 1) check on-chain
          const readProvider = getReadProvider(provider);
          const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, readProvider);
          const isValid = await contract.verifyDocument(hash);
          // 2) fetch ciphertext from IPFS (public gateway)
          const ctBuf = await fetchEncryptedBlob(cid, storage);
          // 3) import key and decrypt
          const rawKeyBuf = base64ToBuf(keyB64);
          const aesKey = await importAESKeyFromRaw(rawKeyBuf);
          const ivBuf = base64ToBuf(ivB64); // returns ArrayBuffer
          const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(ivBuf) }, aesKey, ctBuf);
          const blob = new Blob([plainBuf]); // attempt to detect MIME or assume PDF
          const url = URL.createObjectURL(blob);
          setResult({ valid: isValid, hash, cid, viewUrl: url });
          setStatus('done');
        } catch (err) {
          console.error(err);
          setErrorMsg(err.message || 'Decryption or fetch failed');
          setStatus('error');
        }
      })();
    }
  }, [provider]);

  return (
    <div className="page-card">
      <h2 className="page-title">
        <span className="icon">🔍</span> Verify Document Integrity
      </h2>
      <p className="page-subtitle">
        Upload a document to check whether it matches the hash stored on the blockchain.
        Any modification — even a single character — will be detected.
      </p>

      {/* ── File picker ── */}
      <div className="drop-zone">
        <input
          type="file"
          id="verify-file-input"
          className="file-input-hidden"
          onChange={(e) => { reset(); setFile(e.target.files[0]); }}
        />
        <label htmlFor="verify-file-input" className="drop-label">
          {file ? (
            <span>📎 {file.name} <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span></span>
          ) : (
            <span>Click to select a file to verify <span className="hint">(any type, max 20 MB)</span></span>
          )}
        </label>
      </div>

      {/* ── Verify button ── */}
      <button
        className="btn btn-verify"
        onClick={handleVerify}
        disabled={!file || status === "hashing" || status === "checking"}
      >
        {status === "hashing"  && "⏳ Hashing document…"}
        {status === "checking" && "🔗 Querying blockchain…"}
        {(status === "idle" || status === "error") && "🔍 Verify Document"}
        {status === "done"     && "🔍 Verify Another"}
      </button>

      {/* ── Result: VALID ── */}
      {status === "done" && result?.valid && (
        <div className="result-box result-valid">
          <div className="verdict verdict-valid">✅ VALID DOCUMENT</div>
          <p>This document's hash matches the record on the Ethereum blockchain. It has <strong>not been tampered with</strong>.</p>
          <div className="info-grid">
            <span className="info-label">File</span>
            <span className="info-value">{result.fileName}</span>
            <span className="info-label">SHA-256 Hash</span>
            <span className="info-value mono">{result.hash}</span>
            <span className="info-label">Uploader</span>
            <span className="info-value mono">{result.uploader}</span>
            <span className="info-label">Registered At</span>
            <span className="info-value">{result.timestamp}</span>
          </div>
        </div>
      )}

      {/* ── Result: TAMPERED ── */}
      {status === "done" && !result?.valid && (
        <div className="result-box result-tampered">
          <div className="verdict verdict-tampered">❌ TAMPERED / UNREGISTERED DOCUMENT</div>
          <p>
            The computed hash of this file does <strong>not exist</strong> on the blockchain.
            Either the document was <strong>modified after registration</strong>, or it was never registered.
          </p>
          <div className="info-grid">
            <span className="info-label">File</span>
            <span className="info-value">{result.fileName}</span>
            <span className="info-label">Computed Hash</span>
            <span className="info-value mono">{result.hash}</span>
            <span className="info-label">On-chain match</span>
            <span className="info-value" style={{ color: "#e74c3c", fontWeight: "bold" }}>NOT FOUND ✗</span>
          </div>
          <p className="tip">
            💡 <strong>How tampering is detected:</strong> SHA-256 is a one-way hash function.
            Changing even one character produces a completely different 256-bit output (avalanche effect).
            The new hash won't match any stored record → document flagged as tampered.
          </p>
        </div>
      )}

      {errorMsg && (
        <div className="result-box result-tampered">
          <strong>❌ Error:</strong> {errorMsg}
        </div>
      )}

      {result?.viewUrl && (
        <div>
          <h3>Document preview</h3>
          <iframe src={result.viewUrl} width="100%" height="600px" title="Document preview" />
        </div>
      )}
    </div>
  );
}

export default VerifyDocument;
