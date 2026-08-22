"use client";

import { Check, ChevronDown, Copy, LogOut, RefreshCw } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { shortenAddress, useWallet } from "@/components/wallet/wallet-provider";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { address, connectionState, disconnectWallet, isOnBradbury, switchToBradbury } = useWallet();

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("pointerdown", closeOnPointerDown);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("pointerdown", closeOnPointerDown);
    };
  }, [open]);

  if (!address) return null;

  const isSwitching = connectionState === "switching";
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="account-menu" ref={wrapperRef}>
      <button
        className="connect-button account-menu__trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={address}
      >
        {shortenAddress(address)} <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="account-menu__popover" id={menuId} role="menu" aria-label="Connected wallet account">
          <span className="technical-label">Connected account</span>
          <strong className="account-menu__address">{shortenAddress(address)}</strong>
          <span className={`account-menu__network${isOnBradbury ? "" : " account-menu__network--warning"}`}>
            <i /> {isOnBradbury ? "Bradbury Testnet" : "Wrong network"}
          </span>
          <div className="account-menu__actions">
            {!isOnBradbury && (
              <button type="button" role="menuitem" onClick={() => void switchToBradbury()} disabled={isSwitching}>
                <RefreshCw size={15} aria-hidden="true" /> {isSwitching ? "Switching network" : "Switch to Bradbury"}
              </button>
            )}
            <button type="button" role="menuitem" onClick={() => void copyAddress()}>
              {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? "Copied" : "Copy address"}
            </button>
            <button
              className="account-menu__disconnect"
              type="button"
              role="menuitem"
              onClick={() => {
                disconnectWallet();
                setOpen(false);
              }}
            >
              <LogOut size={15} aria-hidden="true" /> Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
