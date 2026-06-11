# BlockDoc - Blockchain Document Integrity

A full-stack blockchain-based document integrity app built with React, Node.js, Solidity, and the Sepolia Ethereum testnet.

Users can:
- upload a document,
- generate a SHA-256 hash,
- register the hash on-chain,
- verify later whether a document has been tampered with,
- and optionally view the encrypted document through a verification link or QR code.

## Contributors

Group 7 Blockchain FTUI
- [Adhikananda Wira Januar](https://github.com/adhikwj) - 2306267113
- [M. Hilmi Al Muttaqi](https://github.com/muhmhilmi) - 2306267082
- [M. Avicenna Raffaiz A.](https://github.com/avicennaraffaiz) - 2206062844

## Tech Stack

- Frontend: React, ethers.js
- Backend: Node.js, Express, Multer, Axios
- Blockchain: Solidity smart contract on Sepolia testnet
- Storage: Pinata IPFS pinning, with local fallback mode for development
- Encryption: Browser-side AES-GCM encryption

## Project Structure

- `backend/` - Express API for hashing, pinning, and local encrypted blob serving
- `frontend/` - React UI for upload, register, verify, and QR generation
- `smart-contract/` - Solidity contract source

## Features

- Register document hashes on-chain
- Verify whether a document matches the on-chain hash
- Encrypt files in the browser before uploading
- Pin encrypted files to IPFS through Pinata
- Generate a verification URL and QR code
- Support local fallback storage if Pinata is unavailable

## Prerequisites

Before running the project, make sure you have:

- Node.js installed
- npm installed
- MetaMask installed in your browser
- A Sepolia testnet wallet with test ETH
- A deployed copy of `DocumentRegistry.sol` on Sepolia
- A Pinata JWT if you want IPFS pinning

## Important Configuration

### 1. Backend environment variables

Create a file at `backend/.env` with:

```env
PORT=5000
FRONTEND_URL=http://localhost:3000
PINATA_JWT=your_pinata_jwt_token_here
```

Notes:

- `PORT` is the backend server port.
- `FRONTEND_URL` must match the frontend origin for CORS.
- `PINATA_JWT` is used to pin encrypted files to Pinata.
- If `PINATA_JWT` is missing, the app falls back to local encrypted storage for development.

### 2. Frontend contract address
The frontend contract configuration is in:

- [frontend/src/contractConfig.js](frontend/src/contractConfig.js)

If you deploy a new version of the smart contract, update:

- `CONTRACT_ADDRESS`
- `CONTRACT_ABI` if the contract interface changes

The current app expects the deployed `DocumentRegistry` contract on Sepolia.

##  Installation
### Backend

```
cd backend
npm install
```

### Frontend

```
cd frontend
npm install
```
## Running the Project
### Start the backend

```
cd backend
npm start
```

The backend runs on:

- http://localhost:5000

### Start the frontend

```
cd frontend
npm start
```

The frontend runs on:

- http://localhost:3000

## How It Works
### Upload flow
1. The user selects a file in the frontend.
2. The browser computes a SHA-256 hash of the file.
3. The browser encrypts the file with AES-GCM.
4. The encrypted blob is sent to the backend `/pin` endpoint.
5. The backend pins the encrypted blob to Pinata, or stores it locally in fallback mode.
6. The frontend registers the SHA-256 hash on-chain using `registerDocument(bytes32)`.

### Verify flow
1. The user uploads the same file or opens the verification QR/link.
2. The browser computes the file hash.
3. The frontend checks the hash against the smart contract using `verifyDocument(bytes32)`.
4. If the link contains encrypted file metadata, the app fetches the encrypted blob and decrypts it in-browser.
5. The document can then be previewed in the browser.

## Smart Contract
The Solidity contract is in:

- [smart-contract/DocumentRegistry.sol](smart-contract/DocumentRegistry.sol)

It stores:

- the document hash,
- uploader address,
- timestamp,
- and whether a record exists.

Main functions:

- `registerDocument(bytes32 hash)`
- `verifyDocument(bytes32 hash)`
- `getDocument(bytes32 hash)`

## Environment Notes for Another Machine

If someone else wants to run this project in a different environment, they need to do all of the following:

1. Install Node.js and npm.
2. Clone the repository.
3. Install dependencies in both `backend/` and `frontend/`.
4. Create `backend/.env` with the correct values.
5. Deploy `DocumentRegistry.sol` to Sepolia.
6. Update `frontend/src/contractConfig.js` with the deployed contract address and ABI.
7. Make sure MetaMask is connected to Sepolia.
8. Ensure they have either:
    - a valid `PINATA_JWT`, or
    - local fallback mode for encrypted file storage.
9. Start the backend and frontend dev servers.

## Common Troubleshooting

### MetaMask not connecting
- Make sure MetaMask is installed.
- Make sure you are on the Sepolia network.
- Make sure the app has permission to access your wallet.

### Verification fails
- Confirm the contract address in `frontend/src/contractConfig.js`.
- Confirm the file being verified is exactly the same file that was registered.
- Make sure the backend is running.

### Pinning fails
- Check that `backend/.env` contains a valid `PINATA_JWT`.
- If no JWT is provided, the app should use local fallback storage.
- Check the backend terminal for `[PIN ERROR]` logs.

### QR verification link opens the wrong tab
- The app uses a tab-based UI.
- The generated link should include the `tab=verify` query parameter.
- If needed, refresh the page after opening the link.
