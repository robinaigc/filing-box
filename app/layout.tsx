import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "财报盒子",
  description: "搜索上市公司官方财报，并提供下载或官方来源入口。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
