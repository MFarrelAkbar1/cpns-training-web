import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AppProviders } from "@/components/layout/app-providers";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

const description =
  "Latihan soal dan simulasi CAT SKD CPNS: 10 paket, 1.100 soal TWK, TIU, dan TKP lengkap dengan kunci, pembahasan, dan penilaian otomatis.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "CAT CPNS 2027 - Latihan dan Simulasi SKD", template: "%s | CAT CPNS 2027" },
  description,
  keywords: ["CPNS 2027", "SKD", "CAT CPNS", "simulasi CAT", "TWK", "TIU", "TKP", "latihan soal CPNS"],
  openGraph: { title: "CAT CPNS 2027", description, type: "website", locale: "id_ID" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#121824" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning className={`${jakarta.variable} ${jetbrains.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
