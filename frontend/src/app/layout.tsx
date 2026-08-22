import type { Metadata } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "OmniMandate — Intelligent treasury control",
  description:
    "Autonomous spending, bound by your mandate. Intelligent treasury control built on GenLayer.",
};

const themeInitializationScript = `(() => {
  try {
    const key = "omnimandate-theme";
    const stored = localStorage.getItem(key);
    const preference = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
    const resolved = preference === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : preference;
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.dataset.themePreference = preference;
    root.style.colorScheme = resolved;
  } catch {}
})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head><script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} /></head>
      <body className={`${display.variable} ${body.variable} ${mono.variable}`}><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
