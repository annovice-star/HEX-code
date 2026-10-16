import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "立方匯 · APEC 深圳机遇",
  description: "从亚太视野，发现深圳机遇。APEC 资讯、立方匯观察与企业服务。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
