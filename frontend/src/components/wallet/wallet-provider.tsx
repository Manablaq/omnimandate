"use client";

import { createClient } from "genlayer-js";
import { isAddress, type Address } from "viem";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { testnetBradbury } from "@/lib/genlayer";

type Eip1193RequestArguments = {
  method: string;
  params?: unknown[] | Record<string, unknown>;
};

type Eip1193Event = "accountsChanged" | "chainChanged";

export type Eip1193Provider = {
  request: (arguments_: Eip1193RequestArguments) => Promise<unknown>;
  on?: (event: Eip1193Event, listener: (value: unknown) => void) => void;
  removeListener?: (event: Eip1193Event, listener: (value: unknown) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

export type WalletConnectionState = "disconnected" | "connecting" | "connected" | "switching" | "error";

export type GenLayerWriteClient = ReturnType<typeof createClient>;

type WalletContextValue = {
  address: Address | null;
  connectionState: WalletConnectionState;
  error: string | null;
  isWalletAvailable: boolean;
  isOnBradbury: boolean;
  writeClient: GenLayerWriteClient | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToBradbury: () => Promise<void>;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function firstWalletAddress(value: unknown): Address | null {
  if (!Array.isArray(value) || typeof value[0] !== "string" || !isAddress(value[0])) return null;
  return value[0] as Address;
}

function isBradburyChain(value: unknown) {
  return typeof value === "string" && Number.parseInt(value, 16) === testnetBradbury.id;
}

export function shortenAddress(address: Address) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<Address | null>(null);
  const [connectionState, setConnectionState] = useState<WalletConnectionState>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [isWalletAvailable, setIsWalletAvailable] = useState(false);
  const [isOnBradbury, setIsOnBradbury] = useState(false);
  const [writeClient, setWriteClient] = useState<GenLayerWriteClient | null>(null);
  const sessionConnected = useRef(false);

  const applyConnectedWallet = useCallback((nextAddress: Address, provider: Eip1193Provider, chainId: unknown) => {
    setAddress(nextAddress);
    setIsOnBradbury(isBradburyChain(chainId));
    setWriteClient(createClient({
      chain: testnetBradbury,
      account: nextAddress,
      provider,
    }));
    setConnectionState("connected");
    setError(null);
  }, []);

  const clearWalletSession = useCallback(() => {
    sessionConnected.current = false;
    setAddress(null);
    setIsOnBradbury(false);
    setWriteClient(null);
    setConnectionState("disconnected");
    setError(null);
  }, []);

  const connectWallet = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) {
      setIsWalletAvailable(false);
      setConnectionState("error");
      setError("No injected browser wallet was detected.");
      return;
    }

    setConnectionState("connecting");
    setError(null);

    try {
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const nextAddress = firstWalletAddress(accounts);
      if (!nextAddress) {
        clearWalletSession();
        setConnectionState("error");
        setError("The wallet did not provide a usable account.");
        return;
      }

      const chainId = await provider.request({ method: "eth_chainId" });
      sessionConnected.current = true;
      applyConnectedWallet(nextAddress, provider, chainId);
    } catch {
      sessionConnected.current = false;
      clearWalletSession();
      setConnectionState("error");
      setError("Wallet connection was not completed.");
    }
  }, [applyConnectedWallet, clearWalletSession]);

  const disconnectWallet = useCallback(() => {
    // Browser wallets do not expose a universal programmatic disconnect API.
    // This only clears OmniMandate's in-memory session.
    clearWalletSession();
  }, [clearWalletSession]);

  const switchToBradbury = useCallback(async () => {
    if (!writeClient || !address) return;

    setConnectionState("switching");
    setError(null);

    try {
      await writeClient.connect("testnetBradbury");
      const chainId = await window.ethereum?.request({ method: "eth_chainId" });
      setIsOnBradbury(isBradburyChain(chainId));
      setConnectionState("connected");
    } catch {
      setConnectionState("connected");
      setError("Switching to Bradbury Testnet was not completed. Use a GenLayer-compatible wallet and try again.");
    }
  }, [address, writeClient]);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    void Promise.resolve().then(() => setIsWalletAvailable(true));

    const handleAccountsChanged = async (accounts: unknown) => {
      const nextAddress = firstWalletAddress(accounts);
      if (!nextAddress) {
        clearWalletSession();
        return;
      }
      if (!sessionConnected.current) return;

      try {
        const chainId = await provider.request({ method: "eth_chainId" });
        applyConnectedWallet(nextAddress, provider, chainId);
      } catch {
        clearWalletSession();
      }
    };

    const handleChainChanged = (chainId: unknown) => {
      if (sessionConnected.current) setIsOnBradbury(isBradburyChain(chainId));
    };

    provider.on?.("accountsChanged", handleAccountsChanged);
    provider.on?.("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener?.("accountsChanged", handleAccountsChanged);
      provider.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [applyConnectedWallet, clearWalletSession]);

  const value = useMemo(() => ({
    address,
    connectionState,
    error,
    isWalletAvailable,
    isOnBradbury,
    writeClient,
    connectWallet,
    disconnectWallet,
    switchToBradbury,
  }), [
    address,
    connectWallet,
    connectionState,
    disconnectWallet,
    error,
    isOnBradbury,
    isWalletAvailable,
    switchToBradbury,
    writeClient,
  ]);

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) throw new Error("useWallet must be used within WalletProvider");
  return context;
}
