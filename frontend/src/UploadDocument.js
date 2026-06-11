import { useState } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contractConfig";
import { computeSHA256Hex, generateAESGCMKey, encryptFileWithAESGCM, bufToBase64 } from "./cryptoHelpers";
import { QRCodeSVG } from "qrcode.react";

// ─────────────────────────────────────────────
//  UPLOAD DOCUMENT PAGE
//
//  Flow:
//  1. User picks a file
//  2. File is sent to backend POST /upload
//  3. Backend hashes it (SHA-256) → returns bytes32 hash
//  4. Frontend calls registerDocument(hash) on smart contract
//     via ethers.js + MetaMask → BLOCKCHAIN WRITE TX
//  5. Transaction receipt is shown to user
// ─────────────────────────────────────────────

const BACKEND_URL = "http://localhost:5000";

function UploadDocument({ signer }) {
  const [file, setFile]           = useState(null);
  const [status, setStatus]       = useState("idle"); // idle | hashing | registering | done | error
  const [hash, setHash]           = useState("");
  const [txHash, setTxHash]       = useState("");
  const [errorMsg, setErrorMsg]   = useState("");
  const [fileInfo, setFileInfo]   = useState(null);

  const reset = () => {
    setFile(null);
    setStatus("idle");
    setHash("");
    setTxHash("");
    setErrorMsg("");
    setFileInfo(null);
  };

  async function handleUpload() {
    if (!file || !signer) {
      if (!signer) setErrorMsg("Please connect MetaMask first.");
      return;
    }

    setErrorMsg('');
    setStatus('hashing');

    try {
      // 1) compute SHA-256 hex of original file (client-side)
      const hashHex = await computeSHA256Hex(file); // no 0x
      const bytes32Hash = '0x' + hashHex;
      setHash(bytes32Hash);

      // 2) generate AES key and encrypt file client-side
      const { key, raw } = await generateAESGCMKey();
      const { ciphertextBuffer, iv } = await encryptFileWithAESGCM(file, key);

      // 3) send encrypted blob to backend /pin endpoint
      setStatus('hashing'); // still okay
      const encBlob = new Blob([ciphertextBuffer], { type: 'application/octet-stream' });

      const fd = new FormData();
      fd.append('document', encBlob, file.name + '.enc'); // filename for IPFS
      // You may also send metadata, but not required for option 1
      const pinResp = await fetch(`${BACKEND_URL}/pin`, { method: 'POST', body: fd });
      const pinData = await pinResp.json();
      if (!pinData.success) throw new Error(pinData.error || 'Pin failed');
      const cid = pinData.cid;
      const storage = pinData.storage || "pinata";

      // 4) register hash on-chain (existing behavior)
      setStatus('registering');
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.registerDocument(bytes32Hash);
      await tx.wait(1);
      setTxHash(tx.hash);
      setStatus('done');

      // 5) build verify URL (embed base64 key + iv)
      const keyB64 = bufToBase64(raw); // raw is ArrayBuffer
      const ivB64  = bufToBase64(iv.buffer ?? iv); // iv is Uint8Array
      // encode components for URL safety
      const url = `${window.location.origin}/?tab=verify&cid=${encodeURIComponent(cid)}&storage=${encodeURIComponent(storage)}&k=${encodeURIComponent(keyB64)}&iv=${encodeURIComponent(ivB64)}&h=${encodeURIComponent(bytes32Hash)}`;

      // show the URL (and QR) to the user - implement UI to display `url`
      setFileInfo({ name: file.name, size: file.size, cid, storage, verifyUrl: url });

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Upload failed');
      setStatus('error');
    }
  };

  return (
    <div className="page-card">
      <h2 className="page-title">
        <span className="icon">📄</span> Upload &amp; Register Document
      </h2>
      <p className="page-subtitle">
        Upload your document to generate a SHA-256 hash and permanently store it on the Ethereum blockchain.
      </p>

      {/* ── File picker ── */}
      <div className="drop-zone">
        <input
          type="file"
          id="file-input"
          className="file-input-hidden"
          onChange={(e) => { reset(); setFile(e.target.files[0]); }}
        />
        <label htmlFor="file-input" className="drop-label">
          {file ? (
            <span>📎 {file.name} <span className="file-size">({(file.size / 1024).toFixed(1)} KB)</span></span>
          ) : (
            <span>Click to select a file <span className="hint">(any type, max 20 MB)</span></span>
          )}
        </label>
      </div>

      {/* ── Upload button ── */}
      <button
        className="btn btn-primary"
        onClick={handleUpload}
        disabled={!file || status === "hashing" || status === "registering"}
      >
        {status === "hashing"     && "⏳ Hashing document…"}
        {status === "registering" && "⛓️  Writing to blockchain…"}
        {(status === "idle" || status === "error") && "🔒 Register on Blockchain"}
        {status === "done"        && "✅ Registered!"}
      </button>

      {/* ── Results ── */}
      {status === "done" && (
        <div className="result-box result-valid">
          <h3>✅ Document Successfully Registered</h3>
          <div className="info-grid">
            <span className="info-label">File</span>
            <span className="info-value">{fileInfo?.name}</span>
            <span className="info-label">File Size</span>
            <span className="info-value">{fileInfo ? (fileInfo.size / 1024).toFixed(1) + " KB" : "-"}</span>
            <span className="info-label">SHA-256 Hash</span>
            <span className="info-value mono">{hash}</span>
            <span className="info-label">TX Hash</span>
            <span className="info-value mono">
              <a
                href={`https://sepolia.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                {txHash.slice(0, 20)}…{txHash.slice(-10)}
              </a>
            </span>
          </div>
          <p className="tip">
            💡 Keep the original file safe. If even one byte changes, the hash will be different and the document will be flagged as <strong>TAMPERED</strong>.
          </p>
          <button className="btn btn-secondary" onClick={reset}>Register another document</button>
        </div>
      )}

      {errorMsg && (
        <div className="result-box result-tampered">
          <strong>❌ Error:</strong> {errorMsg}
        </div>
      )}

      {fileInfo?.verifyUrl && (
        <div className="verify-url-box">
          <p className="verify-url-label">Verification URL:</p>
          <a className="verify-url-link" href={fileInfo.verifyUrl} target="_blank" rel="noreferrer">
            {fileInfo.verifyUrl}
          </a>
          <QRCodeSVG value={fileInfo.verifyUrl} />
        </div>
      )}
    </div>
  );
}

export default UploadDocument;
