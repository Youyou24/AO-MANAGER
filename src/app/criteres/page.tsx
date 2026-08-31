"use client";

import { useEffect, useMemo, useState } from "react";
import type { CritereDTO } from "@/lib/types";

const MAX_TOTAL = 110;

export default function Page() {
  const [criteres, setCriteres] = useState<CritereDTO[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [enCours, setEnCours] = useState(false);
  const [editionId, setEditionId] = useState<number | null>(null);
  const [enCoursEdition, setEnCoursEdition] = useState(false);

  async function charger() {
    try {
      const reponse = await fetch("/api/criteres");
      if (!reponse.ok) throw new Error();
      setCriteres(await reponse.json());
    } catch {
      setErreur("Impossible de charger les critères.");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    const minuteur = setTimeout(charger, 0);
    return () => clearTimeout(minuteur);
  }, []);

  const totalPoints = useMemo(
    () => criteres.reduce((somme, c) => somme + c.maxPoints, 0),
    [criteres]
  );

  async function ajouter(formData: FormData) {
    setEnCours(true);
    setMessage(null);
    try {
      const corps = Object.fromEntries(formData.entries());
      const reponse = await fetch("/api/criteres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const donnees = await reponse.json().catch(() => ({}));
      if (!reponse.ok) throw new Error(donnees.erreur ?? "Échec de la création");
      await charger();
      setMessage(`Critère « ${donnees.nom} » créé.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(false);
    }
  }

  async function enregistrer(id: number, formData: FormData) {
    setEnCoursEdition(true);
    setMessage(null);
    try {
      const corps = Object.fromEntries(formData.entries());
      const reponse = await fetch(`/api/criteres/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const donnees = await reponse.json().catch(() => ({}));
      if (!reponse.ok) throw new Error(donnees.erreur ?? "Échec de la mise à jour");
      setEditionId(null);
      await charger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCoursEdition(false);
    }
  }

  async function supprimer(critere: CritereDTO) {
    if (
      !confirm(
        `Supprimer le critère « ${critere.nom} » ? Les notes associées seront perdues pour toutes les entreprises.`
      )
    )
      return;
    setMessage(null);
    const reponse = await fetch(`/api/criteres/${critere.id}`, { method: "DELETE" });
    if (!reponse.ok) {
      setMessage("Échec de la suppression.");
      return;
    }
    await charger();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Critères d&apos;évaluation</h1>
        <p className="mt-1 text-sm text-slate-400">
          Définissez les critères et leur nombre maximal de points. La note technique (Nt) est la
          somme des notes, sur un total de {MAX_TOTAL} points.
        </p>
      </div>

      {!chargement && criteres.length > 0 && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            totalPoints === MAX_TOTAL
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
              : "border-amber-500/40 bg-amber-500/5 text-amber-300"
          }`}
        >
          Total des points actuels : <strong className="font-mono">{totalPoints}</strong> /{" "}
          {MAX_TOTAL}{" "}
          {totalPoints === MAX_TOTAL ? (
            <span>— configuration conforme au référentiel ✓</span>
          ) : (
            <span>— ajustez les points pour atteindre {MAX_TOTAL} au total.</span>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ajouter(new FormData(e.currentTarget));
          e.currentTarget.reset();
        }}
        className="grid grid-cols-1 items-end gap-3 rounded-xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-[2fr_4fr_1fr_auto]"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Nom du critère *</span>
          <input
            name="nom"
            required
            placeholder="Ex : Expérience générale"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Description</span>
          <input
            name="description"
            placeholder="Ex : Références et réalisations similaires"
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-slate-300">Points max *</span>
          <input
            name="maxPoints"
            type="number"
            min={0.5}
            max={MAX_TOTAL}
            step={0.5}
            required
            defaultValue={15}
            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
          />
        </label>
        <button
          type="submit"
          disabled={enCours}
          className="h-[38px] rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          + Ajouter
        </button>
      </form>

      {message && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{message}</p>
      )}

      {chargement ? (
        <p className="py-12 text-center text-sm text-slate-400">Chargement…</p>
      ) : erreur ? (
        <p className="rounded-xl bg-red-500/10 px-4 py-6 text-center text-red-400">{erreur}</p>
      ) : criteres.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 py-16 text-center text-sm text-slate-400">
          Aucun critère défini. Le référentiel impose 13 critères techniques pour un total de{" "}
          {MAX_TOTAL} points.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {criteres.map((critere) => (
            <li key={critere.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
              {editionId === critere.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    enregistrer(critere.id, new FormData(e.currentTarget));
                  }}
                  className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_4fr_1fr_auto]"
                >
                  <input
                    name="nom"
                    required
                    defaultValue={critere.nom}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <input
                    name="description"
                    defaultValue={critere.description ?? ""}
                    placeholder="Description"
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <input
                    name="maxPoints"
                    type="number"
                    min={0.5}
                    max={MAX_TOTAL}
                    step={0.5}
                    required
                    defaultValue={critere.maxPoints}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-center text-sm text-white outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={enCoursEdition}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      OK
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditionId(null)}
                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-100">{critere.nom}</span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 font-mono text-xs font-medium ${
                          critere.maxPoints >= 15
                            ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}
                      >
                        {critere.maxPoints} pts
                      </span>
                    </div>
                    {critere.description && (
                      <p className="mt-0.5 text-xs text-slate-500">{critere.description}</p>
                    )}
                    <div className="mt-2 h-1 w-full max-w-md overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.min(100, (critere.maxPoints / MAX_TOTAL) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setEditionId(critere.id)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => supprimer(critere)}
                      className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
