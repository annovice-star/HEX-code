import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "立方匯 · 深圳多语言服务指引",
  description: "面向港商、外商与人才的深圳多语言指引、资料分享与服务咨询。",
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
