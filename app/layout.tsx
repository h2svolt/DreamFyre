import type { Metadata } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/oxanium";
import "./globals.css";

export const metadata: Metadata = {
  title: "DreamFyre — Casino Player Portal",
  description: "Casino accounts, wallet, payments and rewards in one secure player portal.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DreamFyre",
  },
  icons: {
    icon: "/dreamfyre-mark-v2.webp",
    shortcut: "/dreamfyre-mark-v2.webp",
    apple: "/dreamfyre-mark-v2.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
