import type { Metadata } from "next";
import { notoSansThai, anuphan } from "@/app/font";
import "@/app/globals.css";

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
      <body suppressHydrationWarning>
        <main className="flex-1 h-dvh overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}
