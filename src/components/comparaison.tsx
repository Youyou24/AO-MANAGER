"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ScoreBadge } from "@/components/score-badge";
import { calculerNotations, formatterNombre } from "@/lib/score";
import type { AppelOffreDetailDTO, CandidatureDTO, CritereDTO } from "@/lib/types";
import { classesBadgeCandidature, libelleStatutCandidature } from "@/lib/statuts";

export function Comparaison({ id }: { id: number }) {
  const [ao, setAo] = useState<AppelOffreDetailDTO | null>(null);
  const [criteres, setCriteres] = useState<CritereDTO[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [masquerArchives, setMasquerArchives] = useState(true);

  useEffect(() => {
    const minuteur = setTimeout(async () => {
      try {
        const [repAo, repCriteres] = await Promise.all([
          fetch(`/api/appelsoffres/${id}`),
          fetch("/api/criteres"),
        ]);
        if (repAo.status === 404) throw new Error("Appel d'offres introuvable");
        if (!repAo.ok || !repCriteres.ok) throw new Error();
        setAo(await repAo.json());
        setCriteres(await repCriteres.json());
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Erreur serveur");
      } finally {
        setChargement(false);
      }
    }, 0);
    return () => clearTimeout(minuteur);
  }, [id]);

  const candidatures = useMemo(() => {
    let liste = ao?.candidatures ?? [];
    if (masquerArchives) liste = liste.filter((c) => c.statut !== "archive");
    const notations = new Map(
      calculerNotations(criteres, liste).map((n) => [n.id, n])
    );
    return [...liste].sort((a, b) => {
      const sa = notations.get(a.id)?.ng ?? -1;
      const sb = notations.get(b.id)?.ng ?? -1;
      return sb - sa || a.entreprise.nom.localeCompare(b.entreprise.nom, "fr");
    });
  }, [ao, criteres, masquerArchives]);

  const notations = useMemo(() => {
    const liste = ao?.candidatures ?? [];
    return new Map(calculerNotations(criteres, liste).map((n) => [n.id, n]));
  }, [ao, criteres]);

  if (chargement) {
    return <p className="py-16 text-center text-sm text-slate-400">Chargement…</p>;
  }
  if (erreur || !ao) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-red-400">{erreur ?? "Erreur inconnue"}</p>
        <Link href={`/appelsoffres/${id}`} className="text-sm text-emerald-400 hover:underline">
          ← Retour à l&apos;appel d&apos;offres
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/appelsoffres/${id}`}
        className="w-fit text-sm text-slate-400 transition hover:text-emerald-400"
      >
        ← {ao.titre}
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Comparaison des candidatures</h1>
          <p className="mt-1 text-sm text-slate-400">
            Notes par critère, scores pondérés et statut de chaque entreprise.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={masquerArchives}
              onChange={(e) => setMasquerArchives(e.target.checked)}
              className="accent-emerald-500"
            />
            Masquer les archivées
          </label>
          <a
            href={`/api/appelsoffres/${id}/export`}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
          >
            ⬇ Exporter CSV
          </a>
        </div>
      </div>

      {candidatures.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-800 py-16 text-center text-sm text-slate-400">
          Aucune candidature à comparer.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="max-w-[220px] px-4 py-3 font-medium">Entreprise</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Offre (€)</th>
                {criteres.map((c) => (
                  <th key={c.id} className="px-3 py-3 text-center font-medium" title={c.description ?? ""}>
                    {c.nom}
                    <span className="block text-[10px] font-normal text-slate-500">
                      {c.maxPoints} pts
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right font-medium">Note /200</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950">
              {candidatures.map((c: CandidatureDTO) => {
                const notesMap = new Map(c.evaluations.map((e) => [e.critereId, e.note]));
                const notation = notations.get(c.id);
                return (
                  <tr key={c.id} className="transition hover:bg-slate-900/60">
                    <td className="max-w-[220px] px-4 py-3">
                      <Link
                        href={`/appelsoffres/${id}/entreprises/${c.entrepriseId}`}
                        className="font-medium text-emerald-400 hover:underline"
                      >
                        {c.entreprise.nom}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs ${classesBadgeCandidature(c.statut)}`}
                      >
                        {libelleStatutCandidature(c.statut)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-300">
                      {notation?.offreFinanciere != null
                        ? formatterNombre(notation.offreFinanciere, 0)
                        : "—"}
                    </td>
                    {criteres.map((crit) => {
                      const note = notesMap.get(crit.id);
                      const ratio = note != null ? note / crit.maxPoints : null;
                      const convient =
                        ratio == null
                          ? "text-slate-600"
                          : ratio >= 0.7
                            ? "text-emerald-400"
                            : ratio >= 0.5
                              ? "text-amber-400"
                              : "text-red-400";
                      return (
                        <td key={crit.id} className="px-3 py-3 text-center">
                          <span className={`font-mono ${convient}`}>
                            {note != null ? formatterNombre(note) : "—"}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-right">
                      <ScoreBadge
                        nt={notation?.nt ?? null}
                        nf={notation?.nf ?? null}
                        ng={notation?.ng ?? null}
                        elimine={notation?.elimine ?? false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}