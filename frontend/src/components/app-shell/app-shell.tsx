"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, ClipboardList, FileSearch, LayoutDashboard, Menu, ShieldCheck, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { AccountMenu } from "@/components/app-shell/account-menu";
import { OmniMark } from "@/components/ui/omni-mark";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { useWallet } from "@/components/wallet/wallet-provider";

const navItems = [
  [LayoutDashboard, "Overview", "/app"],
  [ShieldCheck, "Vaults", "#vaults"],
  [ClipboardList, "Spend Requests", "#requests"],
  [FileSearch, "Mandates", "#mandates"],
  [FileSearch, "Evidence", "#evidence"],
  [ChevronRight, "Activity", "#activity"],
  [BookOpen, "Documentation", "#documentation"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const { address, connectionState, isOnBradbury, connectWallet } = useWallet();
  const isConnecting = connectionState === "connecting";
  const needsBradbury = Boolean(address) && !isOnBradbury;
  const nav = <nav className="app-sidebar__nav" aria-label="Application navigation">{navItems.map(([Icon, label, href], index) => { const NavIcon = Icon as typeof LayoutDashboard; return <Link href={href as string} className={index === 0 ? "is-active" : ""} key={label as string} onClick={() => setMobileOpen(false)}><NavIcon size={18} /><span>{label as string}</span></Link>; })}</nav>;
  return <div className="app-shell">
    <aside className="app-sidebar"><OmniMark compact /><div className="app-sidebar__divider" />{nav}<div className="app-sidebar__foot"><span><i /> Bradbury Testnet</span><Link href="/">Return to site <ChevronRight size={14} /></Link></div></aside>
    <header className="app-topbar"><button className="app-mobile-trigger" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><span className="app-topbar__crumb">Workspace <ChevronRight size={14} /> Overview</span><div><span className={`network-indicator${needsBradbury ? " network-indicator--required" : ""}`}><i /> {needsBradbury ? "Bradbury Testnet required" : "Bradbury Testnet"}</span><ThemeSwitcher />{!address && <button className="connect-button" onClick={() => void connectWallet()} disabled={isConnecting}>{isConnecting ? "Connecting wallet" : "Connect wallet"}</button>}{address && <AccountMenu />}</div></header>
    <AnimatePresence>{mobileOpen && <motion.div className="app-mobile-nav" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div><OmniMark /><button onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>{nav}</motion.div>}</AnimatePresence>
    <main className="app-content">{children}</main>
  </div>;
}
