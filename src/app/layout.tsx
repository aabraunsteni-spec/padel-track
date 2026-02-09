import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "PADEL. | Ranking de Amigos",
  description: "Estadísticas oficiales, ranking y resultados de nuestra liga de pádel.",
  openGraph: {
    title: "PADEL. | Ranking Oficial",
    description: "Fijate quién es el #1 del ranking esta semana.",
    images: ["/og-image.jpg"], 
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#020617] text-white`}
      >
        {children}
      </body>
    </html>
  );
}