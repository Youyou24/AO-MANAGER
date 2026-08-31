"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { AppelOffreDTO } from "@/lib/types";
import {
  classesBadgeAo,
  formaterDate,
  libelleStatutAo,
  STATUTS_AO,
} from "@/lib/statuts";

export default function Page() {
  const [appelsoffres, setAppelsoffres] = useState<AppelOffreDTO[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [filtreStatut, setFiltreStatut] = useState("");
  const [formulaireOuvert, setFormulaireOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);

  async function charger() {
    try {
      const reponse = await fetch("/api/appelsoffres");
      if (!reponse.ok) throw new Error();
      setAppelsoffres(await reponse.json());
    } catch {
      setErreur("Impossible de charger les appels d'offres.");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    const minuteur = setTimeout(charger, 0);
    return () => clearTimeout(minuteur);
  }, []);

  const filtres = useMemo(() => {
    let liste = appelsoffres.filter((ao) => !filtreStatut || ao.statut === filtreStatut);
    if (!filtreStatut) liste = liste.filter((ao) => ao.statut !== "archive");
    return liste;
  }, [appelsoffres, filtreStatut]);

  async function creer(formData: FormData) {
    setEnCours(true);
    setMessage(null);
    try {
      const corps = Object.fromEntries(formData.entries());
      const reponse = await fetch("/api/appelsoffres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const donnees = await reponse.json().catch(() => ({}));
      if (!reponse.ok) throw new Error(donnees.erreur ?? "Échec de la création");
      setFormulaireOuvert(false);
      await charger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(false);
    }
  }

  async function changerStatut(ao: AppelOffreDTO, statut: string) {
    await fetch(`/api/appelsoffres/${ao.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titre: ao.titre,
        reference: ao.reference,
        description: ao.description,
        dateLimite: ao.dateLimite,
        statut,
      }),
    });
    await charger();
  }

  async function supprimer(ao: AppelOffreDTO) {
    if (!confirm(`Supprimer « ${ao.titre} » et toutes les candidatures associées ?`)) return;
    await fetch(`/api/appelsoffres/${ao.id}`, { method: "DELETE" });
    await charger();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Appels d&apos;offres</h1>
          <p className="mt-1 text-sm text-slate-400">
            Pilotez vos appels d&apos;offres : candidatures, évaluations et classement.
          </p>
        </div>
        <button
          onClick={() => setFormulaireOuvert((v) => !v)}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
        >
          {formulaireOuvert ? "Annuler" : "+ Nouvel appel d'offres"}
        </button>
      </div>

      {formulaireOuvert && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            creer(new FormData(e.currentTarget));
          }}
          className="grid grid-cols-1 gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">Titre *</span>
            <input
              name="titre"
              required
              placeholder="Ex : Marché de rénovation 2026"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">Référence</span>
            <input
              name="reference"
              placeholder="Ex : AO-2026-012"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">Date limite</span>
            <input
              name="dateLimite"
              type="date"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-slate-300">Statut</span>
            <select
              name="statut"
              defaultValue="actif"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            >
              {STATUTS_AO.map((s) => (
                <option key={s.valeur} value={s.valeur}>
                  {s.libelle}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-4">
            <span className="text-slate-300">Description</span>
            <textarea
              name="description"
              rows={2}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
          </label>
          {message && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400 sm:col-span-2 lg:col-span-4">
              {message}
            </p>
          )}
          <div className="flex justify-end sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={enCours}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {enCours ? "Création…" : "Créer l'appel d'offres"}
            </button>
          </div>
        </form>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filtreStatut}
          onChange={(e) => setFiltreStatut(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        >
          <option value="">Tous (hors archivés)</option>
          <option value="archive">Archivés uniquement</option>
          {STATUTS_AO.map((s) => (
            <option key={s.valeur} value={s.valeur}>
              {s.libelle}
            </option>
          ))}
        </select>
      </div>

      {chargement ? (
        <p className="py-12 text-center text-sm text-slate-400">Chargement…</p>
      ) : erreur ? (
        <p className="rounded-xl bg-red-500/10 px-4 py-6 text-center text-red-400">{erreur}</p>
      ) : filtres.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 py-16 text-center text-sm text-slate-400">
          Aucun appel d&apos;offres à afficher. Créez votre premier appel d&apos;offres.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtres.map((ao) => (
            <div
              key={ao.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/appelsoffres/${ao.id}`}
                  className="text-lg font-semibold text-white transition hover:text-emerald-400"
                >
                  {ao.titre}
                </Link>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${classesBadgeAo(ao.statut)}`}
                >
                  {libelleStatutAo(ao.statut)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                {ao.reference && <span>{ao.reference}</span>}
                <span>📅 {formaterDate(ao.dateLimite)}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-slate-300">
                  <strong className="font-mono text-white">{ao._count.candidatures}</strong>{" "}
                  candidatures
                </span>
                <span className="text-slate-300">
                  <strong className="font-mono text-white">{ao._count.documents}</strong>{" "}
                  documents
                </span>
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2">
                <Link
                  href={`/appelsoffres/${ao.id}`}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
                >
                  Ouvrir →
                </Link>
                {ao.statut === "archive" ? (
                  <button
                    onClick={() => changerStatut(ao, "brouillon")}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Réactiver
                  </button>
                ) : (
                  <button
                    onClick={() => changerStatut(ao, "archive")}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Archiver
                  </button>
                )}
                <button
                  onClick={() => supprimer(ao)}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}