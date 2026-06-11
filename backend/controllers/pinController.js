// backend/controllers/pinController.js
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

async function pinEncrypted(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded.' });
    }

    const jwtToken = process.env.PINATA_JWT?.trim();

    // Fallback to local storage if no JWT
    if (!jwtToken || jwtToken === 'your_pinata_jwt_token_here') {
      console.log('[PIN] Using local encrypted storage (no Pinata JWT)');
      return res.status(200).json({
        success: true,
        cid: `local:${req.file.filename}`,
        storage: 'local'
      });
    }

    // Read file and create FormData
    const fileBuffer = fs.readFileSync(req.file.path);
    const formData = new FormData();

    // CRITICAL: Must provide filename when appending buffer
    formData.append('file', fileBuffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype || 'application/octet-stream'
    });

    // Optional metadata
    const pinataMetadata = JSON.stringify({
      name: req.file.originalname,
      uploadedAt: new Date().toISOString()
    });
    formData.append('pinataMetadata', pinataMetadata);

    // Optional options
    const pinataOptions = JSON.stringify({
      cidVersion: 0
    });
    formData.append('pinataOptions', pinataOptions);

    // Upload to Pinata
    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          // CRITICAL: Spread formData headers to include boundary
          ...formData.getHeaders()
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    console.log('[PIN] Success! CID:', response.data.IpfsHash);

    // Cleanup
    fs.unlinkSync(req.file.path);

    return res.status(200).json({
      success: true,
      cid: response.data.IpfsHash,
      storage: 'pinata'
    });

  } catch (err) {
    console.error('[PIN ERROR]', err.response?.data || err.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Pinning failed',
      details: err.response?.data?.error || err.message
    });
  }
}

module.exports = { pinEncrypted };