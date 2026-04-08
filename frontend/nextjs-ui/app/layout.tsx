import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mjolnir",
  description: "Operational visibility for your security and system logs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
