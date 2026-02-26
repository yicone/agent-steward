import "highlight.js/styles/github-dark.css";
import "./globals.css";

export const metadata = {
  title: "Agent Storage Manager",
  description: "Local UI for Antigravity/Windsurf conversation history"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

