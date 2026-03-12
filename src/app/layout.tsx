import type { Metadata } from "next";
import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bodyFont = IBM_Plex_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const headingFont = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Apartman Gelir Gider Paneli",
  description:
    "7 dairelik apartmanlar icin Supabase tabanli gelir gider ve aidat takip paneli.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body className={`${bodyFont.variable} ${headingFont.variable} antialiased`}>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
