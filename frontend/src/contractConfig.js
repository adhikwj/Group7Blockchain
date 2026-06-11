// ─────────────────────────────────────────────
//  CONTRACT CONFIG
//  After deploying DocumentRegistry.sol on Remix,
//  paste the deployed contract address below.
// ─────────────────────────────────────────────

// ★ REPLACE THIS with your deployed contract address on Sepolia ★
export const CONTRACT_ADDRESS = "0xdd57935f88bFfCAfc8ff7b1C1CD276C5a8967EaA";

// ABI — copied from Remix IDE after compilation
// Only the functions we use are listed here
export const CONTRACT_ABI = [
  // registerDocument(bytes32 hash) — WRITE (costs gas)
  {
    inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
    name: "registerDocument",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // verifyDocument(bytes32 hash) → bool — READ (free)
  {
    inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
    name: "verifyDocument",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  // getDocument(bytes32 hash) → (bytes32, address, uint256) — READ (free)
  {
    inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
    name: "getDocument",
    outputs: [
      { internalType: "bytes32", name: "docHash",   type: "bytes32" },
      { internalType: "address", name: "uploader",  type: "address" },
      { internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // DocumentRegistered event
  {
    anonymous: false,
    inputs: [
      { indexed: true,  internalType: "bytes32", name: "hash",      type: "bytes32" },
      { indexed: true,  internalType: "address", name: "uploader",  type: "address" },
      { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" },
    ],
    name: "DocumentRegistered",
    type: "event",
  },
];
