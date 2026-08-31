import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { BoutonDeconnexion } from "@/components/bouton-deconnexion";
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
  title: "AO Manager — Appels d'offres",
  description:
    "Importez les dossiers techniques et financiers des entreprises, appliquez vos critères et obtenez leur score.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-slate-100">
              <span className="flex size-7 items-center justify-center rounded-md bg-emerald-500/15 text-sm ring-1 ring-inset ring-emerald-500/30">
                📋
              </span>
              AO&nbsp;Manager
            </Link>
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Tableau de bord
              </Link>
              <Link
                href="/criteres"
                className="rounded-md px-3 py-1.5 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                Critères
              </Link>
              <span className="mx-1 h-5 w-px bg-slate-800" />
              <BoutonDeconnexion />
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
          AO Manager — tri et évaluation des appels d&apos;offres
        </footer>
      </body>
    </html>
  );
}
