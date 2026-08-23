"use client";

import Link from "next/link";
import {
  BookOpen,
  ChevronRight,
  ClipboardList,
  FileSearch,
  History,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { AccountMenu } from "@/components/app-shell/account-menu";
import { OmniMark } from "@/components/ui/omni-mark";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { useWallet } from "@/components/wallet/wallet-provider";

const navItems = [
  { Icon: LayoutDashboard, label: "Overview", href: "/app", section: "overview" },
  { Icon: ShieldCheck, label: "Vaults", href: "#vaults", section: "vaults" },
  { Icon: ClipboardList, label: "Spend Requests", href: "#requests", section: "requests" },
  { Icon: FileSearch, label: "Mandates", href: "#mandates", section: "mandates" },
  { Icon: FileSearch, label: "Evidence", href: "#evidence", section: "evidence" },
  { Icon: History, label: "Activity", href: "#activity", section: "activity" },
  { Icon: BookOpen, label: "Documentation", href: "#documentation", section: "documentation" },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const reduceMotion = useReducedMotion();
  const { address, connectionState, isOnBradbury, connectWallet } = useWallet();
  const isConnecting = connectionState === "connecting";
  const needsBradbury = Boolean(address) && !isOnBradbury;

  useEffect(() => {
    const sectionIds = navItems.map((item) => item.section);
    const syncHash = () => {
      const next = window.location.hash.replace(/^#/, "");
      if (next && sectionIds.includes(next as (typeof sectionIds)[number])) {
        setActiveSection(next);
      } else if (!next) {
        setActiveSection("overview");
      }
    };

    syncHash();
    window.addEventListener("hashchange", syncHash);

    const observed = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => right.intersectionRatio - left.intersectionRatio);
        const id = visible[0]?.target.id;
        if (id) setActiveSection(id);
      },
      {
        rootMargin: "-18% 0px -68% 0px",
        threshold: [0, 0.1, 0.25, 0.5],
      },
    );

    observed.forEach((element) => observer.observe(element));

    return () => {
      window.removeEventListener("hashchange", syncHash);
      observer.disconnect();
    };
  }, []);

  const activeLabel =
    navItems.find((item) => item.section === activeSection)?.label ?? "Overview";

  const nav = (
    <nav className="app-sidebar__nav" aria-label="Application navigation">
      {navItems.map(({ Icon, label, href, section }) => {
        const active = activeSection === section;
        return (
          <Link
            href={href}
            className={active ? "is-active" : ""}
            aria-current={active ? "page" : undefined}
            key={label}
            onClick={() => {
              setActiveSection(section);
              setMobileOpen(false);
            }}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="app-shell" data-workspace-view={activeSection}>
      <aside className="app-sidebar">
        <OmniMark compact />
        <div className="app-sidebar__divider" />
        {nav}
        <div className="app-sidebar__foot">
          <span><i /> Bradbury Testnet</span>
          <Link href="/">Return to site <ChevronRight size={14} /></Link>
        </div>
      </aside>

      <header className="app-topbar">
        <button
          className="app-mobile-trigger"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <span className="app-topbar__crumb">
          Workspace <ChevronRight size={14} /> {activeLabel}
        </span>
        <div>
          <span
            className={`network-indicator${needsBradbury ? " network-indicator--required" : ""}`}
          >
            <i /> {needsBradbury ? "Bradbury Testnet required" : "Bradbury Testnet"}
          </span>
          <ThemeSwitcher />
          {!address && (
            <button
              className="connect-button"
              onClick={() => void connectWallet()}
              disabled={isConnecting}
            >
              {isConnecting ? "Connecting wallet" : "Connect wallet"}
            </button>
          )}
          {address && <AccountMenu />}
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="app-mobile-nav"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div>
              <OmniMark />
              <button onClick={() => setMobileOpen(false)} aria-label="Close navigation">
                <X size={20} />
              </button>
            </div>
            {nav}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="app-content">{children}</main>
    </div>
  );
}
