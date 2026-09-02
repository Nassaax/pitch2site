import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pitch2Site — Générateur de landing page IA",
  description:
    "Décris ton produit, génère une landing page complète et un kit de contenu en quelques secondes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
