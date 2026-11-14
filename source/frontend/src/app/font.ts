import { Noto_Sans_Thai, Anuphan } from "next/font/google";

export const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
});

export const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["thai", "latin"],
});
