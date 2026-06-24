import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bounty Hunter",
  description: "全プラットフォームの賞金機会を一括スキャン",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen font-mono">{children}</body>
    </html>
  );
}
