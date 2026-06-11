import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";

// ─────────────────────────────────────────────
//  METAMASK / WALLET HOOK
//  BLOCKCHAIN INTERACTION OCCURS HERE:
//  - Requests MetaMask account access
//  - Creates ethers.js provider + signer
//  - Enforces Sepolia testnet (chainId 11155111)
// ─────────────────────────────────────────────

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex

export function useWallet() {
  const [account, setAccount]   = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner]     = useState(null);
  const [error, setError]       = useState(null);
  const [loading, setLoading]   = useState(false);

  const connectWallet = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      // 1. Check MetaMask is installed
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed. Please install it from https://metamask.io");
      }

      // 2. Request account access — MetaMask popup appears here
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // 3. Enforce Sepolia network
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          // Ask MetaMask to switch to Sepolia automatically
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (switchErr) {
          throw new Error(
            "Please switch MetaMask to the Sepolia testnet and try again."
          );
        }
      }

      // 4. Build ethers provider + signer
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const web3Signer   = web3Provider.getSigner();

      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(accounts[0]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const restoreWallet = async () => {
      try {
        if (!window.ethereum) return;

        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (!accounts || accounts.length === 0) return;

        const chainId = await window.ethereum.request({ method: "eth_chainId" });
        if (chainId !== SEPOLIA_CHAIN_ID) return;

        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        const web3Signer = web3Provider.getSigner();

        setProvider(web3Provider);
        setSigner(web3Signer);
        setAccount(accounts[0]);
      } catch (err) {
        setError(err.message);
      }
    };

    restoreWallet();
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
  }, []);

  return { account, provider, signer, error, loading, connectWallet, disconnectWallet };
}
