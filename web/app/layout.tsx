import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lumora",
  description: "Lumora memory galaxies",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Script src="/shared/js/sc-widget-audio.js" strategy="beforeInteractive" />
        {children}
      </body>
    </html>
  );
}
