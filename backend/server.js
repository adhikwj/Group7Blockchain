require("dotenv").config();
const express = require("express");
const cors = require("cors");
const documentRoutes = require("./routes/documentRoutes");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 5000;

// ─────────────────────────────────────────────
//  MIDDLEWARE
// ─────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

// ─────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────
// All document-related endpoints: POST /upload  POST /verify
app.use("/", documentRoutes);

// Health-check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Backend is running" });
});

// Local IPFS endpoint
app.get("/local-ipfs/:id", (req, res) => {
  const safeId = path.basename(req.params.id);
  const filePath = path.join(__dirname, "uploads", safeId);
  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({ success: false, error: "Local encrypted blob not found." });
    }
  });
});

// ─────────────────────────────────────────────
//  START SERVER
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅  Backend server running on http://localhost:${PORT}`);
});
