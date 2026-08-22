import { WalletProvider } from "@/components/wallet/wallet-provider";

export default function WorkspaceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <WalletProvider>{children}</WalletProvider>;
}
