import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TopNavigation } from "@/components/TopNavigation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "My Top 100",
    template: "%s | My Top 100",
  },
  description:
    "My definitive rankings of albums, films and songs.",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-neutral-950 text-white">
        <TopNavigation />

        {children}
      </body>
    </html>
  );
}