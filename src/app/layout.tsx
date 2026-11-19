import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque"; // same typeface as getcoy.com, self-hosted
import "./globals.css";

export const metadata: Metadata = {
  title: "Coy · Discover",
  description: "Swipe-based discovery with double-blind matching.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
