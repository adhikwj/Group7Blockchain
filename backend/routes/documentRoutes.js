const express = require("express");
const multer = require("multer");
const path = require("path");
const { uploadDocument, verifyDocument } = require("../controllers/documentController");
const { pinEncrypted } = require('../controllers/pinController');

const router = express.Router();

// ─────────────────────────────────────────────
//  MULTER CONFIG
//  Files are stored temporarily in /uploads.
//  After hashing the file is deleted immediately.
//  Max file size: 20 MB.
// ─────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    // Use timestamp to avoid collisions
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

// ─────────────────────────────────────────────
//  ENDPOINTS
// ─────────────────────────────────────────────

/**
 * POST /upload
 * Body: multipart/form-data  field name: "document"
 * Returns: { success, fileName, fileSize, hash }
 *
 * Flow:
 *   Client → uploads file → backend hashes it (SHA-256)
 *   → returns hash → frontend calls registerDocument(hash) on-chain
 */
router.post("/upload", upload.single("document"), uploadDocument);

/**
 * POST /verify
 * Body: multipart/form-data  field name: "document"
 * Returns: { success, fileName, hash }
 *
 * Flow:
 *   Client → uploads file → backend hashes it (SHA-256)
 *   → returns hash → frontend calls verifyDocument(hash) on-chain
 *   → if on-chain returns false → TAMPERED DOCUMENT
 */
router.post("/verify", upload.single("document"), verifyDocument);

// POST /pin  (multipart form, field name: "document")
// Body should also include other form fields, but only the encrypted file is required here.
router.post('/pin', upload.single('document'), pinEncrypted);

module.exports = router;
