import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "CrewTracker - Sistem Pelacakan Waktu Kerja Tim",
  description: "Sistem pelacakan waktu kerja tim yang modern dan mudah digunakan",
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
