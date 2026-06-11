const crypto = require("crypto");
const fs = require("fs");

// ─────────────────────────────────────────────
//  HASHING UTILITY
//  HASHING OCCURS HERE — on the backend using
//  Node.js built-in `crypto` module (SHA-256).
//  The same hashing also happens on the frontend
//  so the user can verify without re-uploading.
// ─────────────────────────────────────────────

/**
 * Generate a SHA-256 hex digest from a file path.
 * @param {string} filePath - Absolute path to the uploaded temp file.
 * @returns {string} 64-character hex string (32 bytes).
 */
function generateSHA256(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  return hashSum.digest("hex"); // e.g. "a3f1cc..."
}

/**
 * Clean up the temp file after processing.
 */
function deleteTempFile(filePath) {
  try {
    fs.unlinkSync(filePath);
  } catch (_) {
    // silently ignore cleanup errors
  }
}

// ─────────────────────────────────────────────
//  POST /upload
//  Accepts a file, hashes it, returns the hash.
//  The frontend then sends that hash to the
//  smart contract via ethers.js (MetaMask tx).
// ─────────────────────────────────────────────
const uploadDocument = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;
    const fileSize = req.file.size;

    // ★ HASHING OCCURS HERE ★
    const hash = generateSHA256(filePath);

    // Prepend "0x" so ethers.js can use it directly as bytes32
    const bytes32Hash = "0x" + hash;

    // Remove temp file — we only need the hash
    deleteTempFile(filePath);

    console.log(`[UPLOAD] File: ${originalName} | Hash: ${bytes32Hash}`);

    return res.status(200).json({
      success: true,
      fileName: originalName,
      fileSize,
      hash: bytes32Hash, // ready to pass to registerDocument()
    });
  } catch (err) {
    console.error("[UPLOAD ERROR]", err);
    return res.status(500).json({ success: false, error: "Hashing failed." });
  }
};

// ─────────────────────────────────────────────
//  POST /verify
//  Accepts a file, hashes it, returns the hash.
//  The frontend then calls verifyDocument() on
//  the smart contract and compares:
//    • hash returned here  ←→  hash stored on-chain
//  If they differ → TAMPERED DOCUMENT detected.
// ─────────────────────────────────────────────
const verifyDocument = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    const filePath = req.file.path;
    const originalName = req.file.originalname;

    // ★ HASHING OCCURS HERE ★
    const hash = generateSHA256(filePath);
    const bytes32Hash = "0x" + hash;

    deleteTempFile(filePath);

    console.log(`[VERIFY] File: ${originalName} | Hash: ${bytes32Hash}`);

    return res.status(200).json({
      success: true,
      fileName: originalName,
      hash: bytes32Hash, // frontend passes this to verifyDocument() on-chain
    });
  } catch (err) {
    console.error("[VERIFY ERROR]", err);
    return res.status(500).json({ success: false, error: "Hashing failed." });
  }
};

module.exports = { uploadDocument, verifyDocument };
