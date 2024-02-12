import "./globals.css";
import type { Metadata } from "next";
import { Martian_Mono } from "next/font/google";

const martianMono = Martian_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Tictactoe Redux: P2P Recursive Proof with Websocket",
  description: "Part of Mina Puzzles series: P2P Tictactoe game with recursive proof via Websocket powered by Ably",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={martianMono.className}>{children}</body>
    </html>
  );
}
