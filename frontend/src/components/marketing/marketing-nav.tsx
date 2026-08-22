"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { OmniMark } from "@/components/ui/omni-mark";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";

const links = [
  ["Product", "#product"],
  ["How it works", "#how-it-works"],
  ["Security", "#security"],
  ["Documentation", "#documentation"],
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <header className="marketing-header">
      <nav className="marketing-nav" aria-label="Main navigation">
        <OmniMark />
        <div className="marketing-nav__links">
          {links.map(([label, href]) => <a href={href} key={href}>{label}</a>)}
        </div>
        <ThemeSwitcher className="marketing-nav__theme" />
        <Link className="button button--dark marketing-nav__launch" href="/app">Launch App <span>↗</span></Link>
        <button className="nav-menu-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "Close menu" : "Open menu"}>
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div id="mobile-menu" className="mobile-menu" initial={reduceMotion ? false : { opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}>
            {links.map(([label, href]) => <a onClick={() => setOpen(false)} href={href} key={href}>{label}</a>)}
            <ThemeSwitcher className="mobile-menu__theme" />
            <Link onClick={() => setOpen(false)} className="button button--dark" href="/app">Launch App <span>↗</span></Link>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
