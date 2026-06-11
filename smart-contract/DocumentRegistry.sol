// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title DocumentRegistry
 * @dev Stores document hashes on-chain to ensure integrity.
 *      Tampering detection works by re-hashing the file off-chain
 *      and comparing against the stored hash. If they differ → tampered.
 */
contract DocumentRegistry {

    // ─────────────────────────────────────────────
    //  DATA STRUCTURES
    // ─────────────────────────────────────────────

    struct Document {
        bytes32 hash;        // SHA-256 hash of the original file (generated off-chain)
        address uploader;    // Wallet address that registered the document
        uint256 timestamp;   // Block timestamp at registration time
        bool exists;         // Guard flag so we can distinguish "not found" from zero-hash
    }

    // mapping: document hash → Document record
    mapping(bytes32 => Document) private documents;

    // ─────────────────────────────────────────────
    //  EVENTS
    // ─────────────────────────────────────────────

    /**
     * @dev Emitted every time a new document is registered.
     *      Front-end can listen to this event for real-time feedback.
     */
    event DocumentRegistered(
        bytes32 indexed hash,
        address indexed uploader,
        uint256 timestamp
    );

    // ─────────────────────────────────────────────
    //  WRITE FUNCTIONS
    // ─────────────────────────────────────────────

    /**
     * @notice Register a document hash on the blockchain.
     * @dev    BLOCKCHAIN INTERACTION POINT:
     *         This function writes to the chain → costs gas.
     *         Called by the front-end via ethers.js after the user
     *         connects MetaMask and approves the transaction.
     *
     * @param hash  SHA-256 hash of the document (bytes32), computed off-chain.
     */
    function registerDocument(bytes32 hash) external {
        // Prevent re-registration of an already-stored hash
        require(!documents[hash].exists, "Document already registered");

        // Store the record
        documents[hash] = Document({
            hash:      hash,
            uploader:  msg.sender,   // wallet address that sent the transaction
            timestamp: block.timestamp,
            exists:    true
        });

        emit DocumentRegistered(hash, msg.sender, block.timestamp);
    }

    // ─────────────────────────────────────────────
    //  READ FUNCTIONS (free — no gas cost)
    // ─────────────────────────────────────────────

    /**
     * @notice Check whether a document hash is registered.
     * @dev    TAMPERING DETECTION POINT:
     *         If the user modifies the file even by one byte, its SHA-256
     *         hash will be completely different. That new hash will NOT
     *         be found in the mapping → document is flagged as TAMPERED.
     *
     * @param  hash  SHA-256 hash to look up.
     * @return bool  true = hash found (VALID), false = not found (TAMPERED / unregistered).
     */
    function verifyDocument(bytes32 hash) external view returns (bool) {
        return documents[hash].exists;
    }

    /**
     * @notice Retrieve full metadata for a registered document.
     * @param  hash       SHA-256 hash to look up.
     * @return docHash    The stored hash.
     * @return uploader   Wallet address that registered it.
     * @return timestamp  Unix timestamp of registration.
     */
    function getDocument(bytes32 hash)
        external
        view
        returns (
            bytes32 docHash,
            address uploader,
            uint256 timestamp
        )
    {
        require(documents[hash].exists, "Document not found");
        Document storage doc = documents[hash];
        return (doc.hash, doc.uploader, doc.timestamp);
    }
}
