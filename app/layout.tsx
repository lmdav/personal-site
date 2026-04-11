import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Instrument_Serif } from "next/font/google";
import { SmoothScroll } from "@/components/smooth-scroll";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Liam Davis — Entrepreneur & AI Operator",
  description:
    "Entrepreneur and AI operator. Two revenue-generating businesses before twenty. Currently building Stayza, leading Red Bull Santa Cruz, and founder of the UCSC Venture Capital Club.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <body className="bg-black text-white font-sans">
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
