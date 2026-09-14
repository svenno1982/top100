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

const themeScript = `
  try {
    const savedTheme = localStorage.getItem("top100-theme");

    const validThemes = [
      "dark",
      "light",
      "rebel-blue",
      "purple",
      "ember"
    ];

    if (savedTheme && validThemes.includes(savedTheme)) {
      document.documentElement.dataset.theme = savedTheme;
    }
  } catch {
    document.documentElement.dataset.theme = "dark";
  }
`;

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
      data-theme="dark"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: themeScript,
          }}
        />
      </head>

      <body className="flex min-h-full flex-col bg-neutral-950 text-white">
        <TopNavigation />

        {children}
      </body>
    </html>
  );
}