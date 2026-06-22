import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import SandboxLab from "@/components/SandboxLab";

export const metadata: Metadata = {
  title: "AI Localization Academy",
  description: "Interactive learning platform and playground for AI localization and LLM orchestration.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-container">
          <header className="nav-header">
            <div className="nav-container">
              <Link href="/" className="nav-brand">
                <span>🎓 AI Localization Academy</span>
              </Link>
              <nav className="nav-links">
                <Link href="/" className="nav-link">
                  Dashboard
                </Link>
                <Link href="/academy" className="nav-link">
                  Academy
                </Link>
                <Link href="/settings" className="nav-link">
                  Prompts Settings
                </Link>
              </nav>
            </div>
          </header>
          
          <main className="main-content">
            {children}
          </main>
          
          {/* Floating Interactive Sandbox Drawer */}
          <SandboxLab />
        </div>
      </body>
    </html>
  );
}
