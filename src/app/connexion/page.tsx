"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function FormulaireConnexion() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const retour = searchParams.get("retour") ?? "/";

  const [motDePasse, setMotDePasse] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function connecter() {
    setEnCours(true);
    setErreur(null);
    try {
      const reponse = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motDePasse }),
      });
      if (!reponse.ok) {
        const donnees = await reponse.json().catch(() => ({}));
        throw new Error(donnees.erreur ?? "Connexion refusée");
      }
      router.push(retour);
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-6 py-12">
      <div className="text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-500/15 text-2xl ring-1 ring-inset ring-emerald-500/30">
          📋
        </span>
        <h1 className="mt-4 text-xl font-semibold text-white">AO Manager</h1>
        <p className="mt-1 text-sm text-slate-400">
          Accès réservé à l&apos;équipe d&apos;évaluation.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          connecter();
        }}
        className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Mot de passe</span>
          <input
            type="password"
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
            autoFocus
            required
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
          />
        </label>
        {erreur && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{erreur}</p>
        )}
        <button
          type="submit"
          disabled={enCours}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {enCours ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="text-center text-xs text-slate-600">
        Mot de passe configurable via la variable AUTH_PASSWORD.
      </p>
    </div>
  );
}

export default function Connexion() {
  return (
    <Suspense fallback={null}>
      <FormulaireConnexion />
    </Suspense>
  );
}