import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";
import { PinsHydrator } from "@/components/pins/PinsHydrator";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { SearchBox } from "@/components/search/SearchBox";
import { ThemeScript } from "@/components/settings/ThemeScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Raven",
  description: "Offline-capable notes — Branch → Year → Subject → Chapter",
  icons: { icon: "/icon.png", apple: "/icon-512.png" },
  openGraph: { title: "Raven", description: "Offline-capable notes — Branch → Year → Subject → Chapter", images: ["/og.png"] },
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
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground">
          Skip to content
        </a>
        <SettingsProvider>
          <PinsHydrator />
          <header className="sticky top-0 z-40 flex h-12 sm:h-14 items-center justify-between gap-2 sm:gap-3 border-b bg-background/80 px-3 sm:px-4 backdrop-blur sm:px-6">
            <a href="/" className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <img src="/icon-512.png" alt="Raven" width={28} height={28} className="h-6 w-6 sm:h-7 sm:w-7 rounded-md object-contain" />
              <span className="hidden sm:inline text-sm font-semibold tracking-tight">Raven</span>
            </a>
            <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-2">
              <div className="w-full max-w-[180px] sm:max-w-md">
                <SearchBox />
              </div>
            </div>
            <SettingsDrawer />
          </header>
          {children}
          <InstallPrompt />
        </SettingsProvider>
      </body>
    </html>
  );
}
