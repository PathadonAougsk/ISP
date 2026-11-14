import type { Metadata } from "next";
import { notoSansThai, anuphan } from "@/app/font";
import "@/app/globals.css";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import SettingsProvider from "@/components/setting-provider";
import CacheInitializer from "@/components/cache-init";

type LayoutProps = {
  children: React.ReactNode;
};

export const metadata: Metadata = {
  title: "Labrador",
  description: "Labrador task and ticket management",
};

export default function RootLayout({ children }: LayoutProps) {
  return (
    <html
      lang="en"
      className={`${notoSansThai.variable} ${anuphan.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="h-screen overflow-hidden flex flex-row"
      >
        <SettingsProvider>
          <CacheInitializer />
          <Sidebar />

          <div className="flex flex-1 min-w-0 h-screen flex-col">
            <Topbar />

            <main className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
              {children}
            </main>
          </div>
        </SettingsProvider>
      </body>
    </html>
  );
}
