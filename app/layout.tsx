import type { Metadata } from "next";
import { Inter } from 'next/font/google'

import "./globals.css";

export const metadata: Metadata = {
  title: "ITBA PI - Data structure visualization",
  description: "Visualization tool for the Imperative Programming (72.31) course at ITBA",
};
const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className}`}>
        {children}
      </body>
    </html>
  );
}
