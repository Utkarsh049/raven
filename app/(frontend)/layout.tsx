import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";
import { PinsHydrator } from "@/components/pins/PinsHydrator";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Raven",
  description: "Offline-capable notes — Branch → Year → Subject → Chapter",
};

export const viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col">
        <SettingsProvider>
          <PinsHydrator />
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur sm:px-6">
            <a href="/" className="text-sm font-semibold tracking-tight">
              Raven
            </a>
            <SettingsDrawer />
          </header>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
