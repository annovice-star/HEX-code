import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "立方匯 · APEC 深圳信息精选",
  description: "面向 APEC 来深商务人士与国际访客的多语言信息精选，汇总深圳产业、经贸及城市生活资讯，附来源链接。",
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
