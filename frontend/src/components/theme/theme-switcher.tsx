"use client";

import { Check, LaptopMinimal, Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { type ThemePreference, useTheme } from "./theme-provider";

const options: Array<{ value: ThemePreference; label: string; description: string; Icon: typeof Sun }> = [
  { value: "system", label: "System", description: "Match your device", Icon: LaptopMinimal },
  { value: "light", label: "Light", description: "Warm ivory workspace", Icon: Sun },
  { value: "dark", label: "Dark", description: "Deep graphite workspace", Icon: Moon },
];

export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { theme, resolvedTheme, setTheme } = useTheme();
  const CurrentIcon = theme === "system" ? LaptopMinimal : resolvedTheme === "dark" ? Moon : Sun;

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

  return (
    <div className={`theme-switcher ${className}`} ref={wrapperRef}>
      <button
        className="theme-switcher__trigger"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Change color theme"
      >
        <CurrentIcon size={16} aria-hidden="true" />
        <span className="theme-switcher__trigger-label">Theme</span>
      </button>
      {open && (
        <div className="theme-switcher__menu" id={menuId} role="menu" aria-label="Color theme">
          {options.map(({ value, label, description, Icon }) => {
            const active = theme === value;
            return (
              <button
                key={value}
                type="button"
                className={`theme-switcher__option ${active ? "is-active" : ""}`}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => {
                  setTheme(value);
                  setOpen(false);
                }}
              >
                <Icon size={16} aria-hidden="true" />
                <span><b>{label}</b><small>{description}</small></span>
                {active && <Check size={15} aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
