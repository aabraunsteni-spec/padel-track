import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased bg-[#020617] text-white font-sans">
        {children}
      </body>
    </html>
  );
}
