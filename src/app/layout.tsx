import type { Metadata, Viewport } from "next";
import { Fraunces, Manrope } from "next/font/google";
import "./globals.css";

const display = Fraunces({ variable: "--font-display-face", subsets: ["latin"], axes: ["opsz", "SOFT"] });
const body = Manrope({ variable: "--font-body", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hisab — personal finance, made mindful",
  description: "A private, offline-first expense tracker with budgets, bills, goals and an on-device smart assistant.",
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: light)", color: "#f6faf8" }, { media: "(prefers-color-scheme: dark)", color: "#0f1714" }] };

const themeScript = `try{var s=JSON.parse(localStorage.getItem('hisab-ui')||'{}').state||{};var t=s.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');if(s.accent!=null)document.documentElement.style.setProperty('--accent-h',s.accent)}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body className={`${display.variable} ${body.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
