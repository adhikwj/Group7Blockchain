import { useEffect, useState } from "react";
import { useWallet } from "./useWallet";
import UploadDocument from "./UploadDocument";
import VerifyDocument from "./VerifyDocument";
import "./App.css";

// ─────────────────────────────────────────────
//  ROOT APP COMPONENT
//  - Manages wallet state (MetaMask connection)
//  - Provides tab-based navigation:
//      Tab 1 → Upload & Register Document
//      Tab 2 → Verify Document Integrity
// ─────────────────────────────────────────────

function App() {
  const [activeTab, setActiveTab] = useState("upload");
  const { account, provider, signer, error, loading, connectWallet, disconnectWallet } = useWallet();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedTab = params.get("tab");

    if (requestedTab === "verify" || requestedTab === "upload") {
      setActiveTab(requestedTab);
    }
  }, []);

  // Shorten wallet address for display: 0x1234…abcd
  const shortAddress = account
    ? `${account.slice(0, 6)}…${account.slice(-4)}`
    : null;

  return (
    <div className="app">

      {/* ── HEADER ── */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <span className="brand-icon">⛓️</span>
            <div>
              <h1 className="brand-title">BlockDoc Integrity</h1>
              <span className="brand-subtitle">Ethereum · Sepolia Testnet</span>
            </div>
          </div>

          {/* MetaMask connect / disconnect */}
          <div className="wallet-area">
            {account ? (
              <div className="wallet-connected">
                <span className="wallet-dot" />
                <span className="wallet-address">{shortAddress}</span>
                <button className="btn btn-outline-sm" onClick={disconnectWallet}>
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                className="btn btn-connect"
                onClick={connectWallet}
                disabled={loading}
              >
                {loading ? "Connecting…" : "🦊 Connect MetaMask"}
              </button>
            )}
          </div>
        </div>

        {/* Wallet error banner */}
        {error && <div className="wallet-error">⚠️ {error}</div>}

        {/* Not connected warning */}
        {!account && !error && (
          <div className="wallet-warning">
            ⚠️ Connect your MetaMask wallet (Sepolia testnet) to register or verify documents.
          </div>
        )}
      </header>

      {/* ── TABS ── */}
      <nav className="tabs">
        <button
          className={`tab ${activeTab === "upload" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("upload")}
        >
          📄 Upload &amp; Register
        </button>
        <button
          className={`tab ${activeTab === "verify" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("verify")}
        >
          🔍 Verify Integrity
        </button>
      </nav>

      {/* ── PAGE CONTENT ── */}
      <main className="main-content">
        {activeTab === "upload" && <UploadDocument signer={signer} />}
        {activeTab === "verify" && <VerifyDocument provider={provider} />}
      </main>

      {/* ── FOOTER ── */}
      <footer className="app-footer">
        <p>
          Blockchain Based Document Integrity System &nbsp;·&nbsp;
          Smart contract on{" "}
          <a href="https://sepolia.etherscan.io" target="_blank" rel="noreferrer">
            Sepolia Etherscan
          </a>
        </p>
        <p className="footer-note">
          SHA-256 hashing · Immutable on-chain storage · Tamper-evident verification
        </p>
      </footer>
    </div>
  );
}

export default App;
