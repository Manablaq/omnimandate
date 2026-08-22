"use client";

import { ArrowUpRight, WalletCards } from "lucide-react";
import { shortenAddress, useWallet } from "@/components/wallet/wallet-provider";

export function AccountAccess() {
  const {
    address,
    connectionState,
    error,
    isOnBradbury,
    connectWallet,
    switchToBradbury,
  } = useWallet();

  const isConnecting = connectionState === "connecting";
  const isSwitching = connectionState === "switching";
  const needsBradbury = Boolean(address) && !isOnBradbury;

  return <section className="wallet-empty" aria-live="polite">
    <div className="wallet-empty__icon"><WalletCards size={22} /></div>
    <div>
      <span className="technical-label">Account access</span>
      {!address && <><h2>Your treasury is ready when you are.</h2><p>Connect a wallet to load the vaults and mandate activity associated with your account.</p></>}
      {needsBradbury && <><h2>Bradbury Testnet required.</h2><p>Switch your connected wallet to Bradbury Testnet before it can be ready for OmniMandate.</p></>}
      {address && isOnBradbury && <><h2>Wallet connected.</h2><p>{shortenAddress(address)} is connected to Bradbury Testnet. Vault data is not loaded in this release.</p></>}
      {error && <p className="wallet-empty__error">{error}</p>}
    </div>
    {!address && <button className="connect-button connect-button--large" onClick={() => void connectWallet()} disabled={isConnecting}>
      {isConnecting ? "Connecting wallet" : "Connect wallet"} <ArrowUpRight size={16} />
    </button>}
    {needsBradbury && <button className="connect-button connect-button--large" onClick={() => void switchToBradbury()} disabled={isSwitching}>
      {isSwitching ? "Switching network" : "Switch to Bradbury"} <ArrowUpRight size={16} />
    </button>}
    {address && isOnBradbury && <span className="wallet-empty__status">Connected</span>}
  </section>;
}
