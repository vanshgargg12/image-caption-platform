import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Image Caption Platform",
  description: "Upload images and receive AI-generated captions",
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
