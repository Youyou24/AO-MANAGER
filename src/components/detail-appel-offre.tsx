"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ScoreBadge } from "@/components/score-badge";
import {
  calculerNotations,
  formatterNombre,
  type NotationCandidature,
} from "@/lib/score";
import type {
  AppelOffreDetailDTO,
  CritereDTO,
  CandidatureDTO,
  EntrepriseDTO,
} from "@/lib/types";
import {
  classesBadgeAo,
  classesBadgeCandidature,
  formaterDate,
  libelleStatutAo,
  libelleStatutCandidature,
  STATUTS_AO,
  STATUTS_CANDIDATURE,
} from "@/lib/statuts";

const CHAMPS_AJOUT = [
  { nom: "nom", libelle: "Nom de l'entreprise *", type: "text", requis: true },
  { nom: "secteur", libelle: "Secteur d'activité", type: "text", requis: false },
  { nom: "contact", libelle: "Personne de contact", type: "text", requis: false },
  { nom: "email", libelle: "Email", type: "email", requis: false },
  { nom: "telephone", libelle: "Téléphone", type: "tel", requis: false },
] as const;

export function DetailAppelOffre({ id }: { id: number }) {
  const [ao, setAo] = useState<AppelOffreDetailDTO | null>(null);
  const [criteres, setCriteres] = useState<CritereDTO[]>([]);
  const [entreprises, setEntreprises] = useState<EntrepriseDTO[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [modeEdition, setModeEdition] = useState(false);
  const [enCours, setEnCours] = useState(false);

  const [recherche, setRecherche] = useState("");
  const [secteurFiltre, setSecteurFiltre] = useState("");
  const [statutFiltre, setStatutFiltre] = useState("");
  const [masquerArchives, setMasquerArchives] = useState(true);
  const [tri, setTri] = useState<"score" | "nom" | "recent">("score");

  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [modeNouvelle, setModeNouvelle] = useState(false);
  const [entrepriseChoisie, setEntrepriseChoisie] = useState("");
  const [messageAjout, setMessageAjout] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const [repAo, repCriteres, repEntreprises] = await Promise.all([
        fetch(`/api/appelsoffres/${id}`),
        fetch("/api/criteres"),
        fetch("/api/entreprises"),
      ]);
      if (repAo.status === 404) throw new Error("Appel d'offres introuvable");
      if (!repAo.ok || !repCriteres.ok || !repEntreprises.ok) throw new Error();
      setAo(await repAo.json());
      setCriteres(await repCriteres.json());
      setEntreprises(await repEntreprises.json());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur serveur");
    } finally {
      setChargement(false);
    }
  }, [id]);

  useEffect(() => {
    const minuteur = setTimeout(charger, 0);
    return () => clearTimeout(minuteur);
  }, [charger]);

  const maxPointsTotal = useMemo(
    () => criteres.reduce((s, c) => s + c.maxPoints, 0),
    [criteres]
  );

  const candidatures = useMemo(() => ao?.candidatures ?? [], [ao]);

  const notations = useMemo(
    () =>
      new Map<number, NotationCandidature>(
        calculerNotations(criteres, candidatures).map((n) => [n.id, n])
      ),
    [criteres, candidatures]
  );

  const secteurs = useMemo(
    () =>
      Array.from(
        new Set(
          candidatures
            .map((c) => c.entreprise.secteur?.trim())
            .filter((s): s is string => !!s)
        )
      ).sort((a, b) => a.localeCompare(b, "fr")),
    [candidatures]
  );

  const candidaturesFiltrees = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    let liste = candidatures.filter((c) => {
      if (masquerArchives && c.statut === "archive") return false;
      if (statutFiltre && c.statut !== statutFiltre) return false;
      const e = c.entreprise;
      if (
        q &&
        !e.nom.toLowerCase().includes(q) &&
        !(e.secteur ?? "").toLowerCase().includes(q) &&
        !(e.contact ?? "").toLowerCase().includes(q)
      )
        return false;
      if (secteurFiltre && e.secteur !== secteurFiltre) return false;
      return true;
    });
    liste = [...liste].sort((a, b) => {
      if (tri === "nom") return a.entreprise.nom.localeCompare(b.entreprise.nom, "fr");
      if (tri === "recent") return b.createdAt.localeCompare(a.createdAt);
      const sa = notations.get(a.id)?.ng ?? -1;
      const sb = notations.get(b.id)?.ng ?? -1;
      return sb - sa || a.entreprise.nom.localeCompare(b.entreprise.nom, "fr");
    });
    return liste;
  }, [candidatures, notations, recherche, secteurFiltre, statutFiltre, masquerArchives, tri]);

  const disponibles = useMemo(() => {
    const deja = new Set(candidatures.map((c) => c.entrepriseId));
    return entreprises.filter((e) => !deja.has(e.id)).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  }, [entreprises, candidatures]);

  async function recharger() {
    await charger();
  }

  async function enregistrerInfos(formData: FormData) {
    if (!ao) return;
    setEnCours(true);
    setMessage(null);
    try {
      const corps = Object.fromEntries(formData.entries());
      const reponse = await fetch(`/api/appelsoffres/${ao.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const donnees = await reponse.json().catch(() => ({}));
      if (!reponse.ok) throw new Error(donnees.erreur ?? "Échec de la mise à jour");
      setModeEdition(false);
      await recharger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(false);
    }
  }

  async function ajouterCandidature(entrepriseId: number) {
    setEnCours(true);
    setMessageAjout(null);
    try {
      const reponse = await fetch(`/api/appelsoffres/${id}/candidatures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entrepriseId }),
      });
      const donnees = await reponse.json().catch(() => ({}));
      if (!reponse.ok) throw new Error(donnees.erreur ?? "Échec de l'ajout");
      setEntrepriseChoisie("");
      await recharger();
    } catch (e) {
      setMessageAjout(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(false);
    }
  }

  async function creerEtAjouter(formData: FormData) {
    setEnCours(true);
    setMessageAjout(null);
    try {
      const corps = Object.fromEntries(formData.entries());
      const reponse = await fetch("/api/entreprises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corps),
      });
      const donnees = await reponse.json().catch(() => ({}));
      if (!reponse.ok) throw new Error(donnees.erreur ?? "Échec de la création");
      await ajouterCandidature(donnees.id);
    } catch (e) {
      setMessageAjout(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCours(false);
    }
  }

  async function changerStatutCandidature(c: CandidatureDTO, statut: string) {
    await fetch(`/api/appelsoffres/${id}/candidatures/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statut }),
    });
    await recharger();
  }

  async function retirer(c: CandidatureDTO) {
    if (!confirm(`Retirer « ${c.entreprise.nom} » de cet appel d'offres ? Ses documents et notes seront supprimés.`))
      return;
    await fetch(`/api/appelsoffres/${id}/candidatures/${c.id}`, { method: "DELETE" });
    await recharger();
  }

  async function archiverNonRetenues() {
    const aArchiver = candidatures.filter((c) => c.statut !== "retenue" && c.statut !== "archive");
    if (aArchiver.length === 0) return;
    if (!confirm(`Archiver les ${aArchiver.length} candidature(s) non retenue(s) ?`)) return;
    for (const c of aArchiver) {
      await fetch(`/api/appelsoffres/${id}/candidatures/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statut: "archive" }),
      });
    }
    await recharger();
  }

  if (chargement) {
    return <p className="py-16 text-center text-sm text-slate-400">Chargement…</p>;
  }
  if (erreur || !ao) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-red-400">{erreur ?? "Erreur inconnue"}</p>
        <Link href="/" className="text-sm text-emerald-400 hover:underline">
          ← Retour aux appels d&apos;offres
        </Link>
      </div>
    );
  }

  const nbRetenues = candidatures.filter((c) => c.statut === "retenue").length;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/" className="w-fit text-sm text-slate-400 transition hover:text-emerald-400">
        ← Appels d&apos;offres
      </Link>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        {modeEdition ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              enregistrerInfos(new FormData(e.currentTarget));
            }}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">Titre *</span>
              <input
                name="titre"
                required
                defaultValue={ao.titre}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">Référence</span>
              <input
                name="reference"
                defaultValue={ao.reference ?? ""}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">Date limite</span>
              <input
                name="dateLimite"
                type="date"
                defaultValue={ao.dateLimite ? ao.dateLimite.slice(0, 10) : ""}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-slate-300">Statut</span>
              <select
                name="statut"
                defaultValue={ao.statut}
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
                defaultValue={ao.description ?? ""}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
              />
            </label>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={enCours}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Enregistrer
              </button>
              <button
                type="button"
                onClick={() => setModeEdition(false)}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
              >
                Annuler
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold text-white">{ao.titre}</h1>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${classesBadgeAo(ao.statut)}`}
                >
                  {libelleStatutAo(ao.statut)}
                </span>
              </div>
              <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                {ao.reference && (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Référence</dt>
                    <dd className="text-slate-200">{ao.reference}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Date limite</dt>
                  <dd className="text-slate-200">{formaterDate(ao.dateLimite)}</dd>
                </div>
              </dl>
              {ao.description && (
                <p className="mt-3 max-w-2xl text-sm text-slate-400">{ao.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <a
                href={`/api/appelsoffres/${ao.id}/export`}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
              >
                ⬇ Exporter CSV
              </a>
              <Link
                href={`/appelsoffres/${ao.id}/comparaison`}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
              >
                Comparer
              </Link>
              <button
                onClick={() => setModeEdition(true)}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
              >
                Modifier
              </button>
            </div>
          </div>
        )}
        {modeEdition && message && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{message}</p>
        )}
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Candidatures</p>
          <p className="mt-1 text-2xl font-semibold text-white">{ao._count.candidatures}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Retenues</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-400">{nbRetenues}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Documents</p>
          <p className="mt-1 text-2xl font-semibold text-white">{ao._count.documents}</p>
        </div>
        <div
          className={`rounded-xl border p-4 ${
            maxPointsTotal === 110
              ? "border-slate-800 bg-slate-900"
              : "border-amber-500/40 bg-amber-500/5"
          }`}
        >
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Max points offre technique
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {maxPointsTotal}<span className="text-base font-normal text-slate-400"> / 110</span>
          </p>
          {maxPointsTotal !== 110 && (
            <Link href="/criteres" className="text-xs text-amber-400 hover:underline">
              Ajuster →
            </Link>
          )}
        </div>
      </div>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-medium text-white">Candidatures</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setAjoutOuvert((v) => !v);
                setModeNouvelle(false);
              }}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500"
            >
              + Ajouter une entreprise
            </button>
            <button
              onClick={archiverNonRetenues}
              disabled={candidatures.filter((c) => c.statut !== "retenue" && c.statut !== "archive").length === 0}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              🗄 Archiver les non-retenues
            </button>
          </div>
        </div>

        {ajoutOuvert && (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4">
            {modeNouvelle ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  creerEtAjouter(new FormData(e.currentTarget));
                }}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
              >
                {CHAMPS_AJOUT.map((champ) => (
                  <label key={champ.nom} className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-300">{champ.libelle}</span>
                    <input
                      name={champ.nom}
                      type={champ.type}
                      required={champ.requis}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                  </label>
                ))}
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-300">Description</span>
                  <textarea
                    name="description"
                    rows={1}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <button
                    type="submit"
                    disabled={enCours}
                    className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Créer + ajouter
                  </button>
                  <button
                    type="button"
                    onClick={() => setModeNouvelle(false)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (entrepriseChoisie) ajouterCandidature(Number(entrepriseChoisie));
                }}
                className="flex flex-wrap items-center gap-3"
              >
                {disponibles.length > 0 ? (
                  <>
                    <select
                      value={entrepriseChoisie}
                      onChange={(e) => setEntrepriseChoisie(e.target.value)}
                      required
                      className="min-w-60 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    >
                      <option value="">Choisir une entreprise…</option>
                      {disponibles.map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.nom}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={enCours || !entrepriseChoisie}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Ajouter
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">
                    Toutes les entreprises enregistrées participent déjà à cet appel d&apos;offres.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => setModeNouvelle(true)}
                  className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                >
                  + Créer une nouvelle entreprise
                </button>
              </form>
            )}
            {messageAjout && (
              <p className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {messageAjout}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher (nom, secteur, contact)…"
            className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          <select
            value={secteurFiltre}
            onChange={(e) => setSecteurFiltre(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="">Tous les secteurs</option>
            {secteurs.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={statutFiltre}
            onChange={(e) => setStatutFiltre(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="">Tous les statuts</option>
            {STATUTS_CANDIDATURE.map((s) => (
              <option key={s.valeur} value={s.valeur}>
                {s.libelle}
              </option>
            ))}
          </select>
          <select
            value={tri}
            onChange={(e) => setTri(e.target.value as typeof tri)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            <option value="score">Trier : score décroissant</option>
            <option value="nom">Trier : nom A→Z</option>
            <option value="recent">Trier : plus récentes</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={masquerArchives}
              onChange={(e) => setMasquerArchives(e.target.checked)}
              className="accent-emerald-500"
            />
            Masquer les archivées
          </label>
        </div>

        {candidaturesFiltrees.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-800 py-12 text-center text-sm text-slate-400">
            Aucune candidature à afficher pour ce filtre.
          </p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-3 text-center font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Entreprise</th>
                  <th className="px-4 py-3 font-medium">Secteur</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 text-center font-medium">Documents</th>
                  <th className="px-4 py-3 text-right font-medium">Offre (€ HT)</th>
                  <th className="px-4 py-3 text-right font-medium">Caution (€)</th>
                  <th className="px-4 py-3 text-right font-medium">Note /200</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {candidaturesFiltrees.map((c, index) => {
                  const notation = notations.get(c.id);
                  return (
                    <tr key={c.id} className="transition hover:bg-slate-900/60">
                      <td className="px-3 py-3 text-center font-mono text-xs text-slate-500">
                        {notation?.ng != null ? (
                          <span className="font-medium text-emerald-400">{index + 1}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/appelsoffres/${id}/entreprises/${c.entrepriseId}`}
                          className="font-medium text-emerald-400 hover:underline"
                        >
                          {c.entreprise.nom}
                        </Link>
                        {c.entreprise.contact && (
                          <p className="text-xs text-slate-500">{c.entreprise.contact}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-300">
                        {c.entreprise.secteur ?? <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs ${classesBadgeCandidature(c.statut)}`}
                        >
                          {libelleStatutCandidature(c.statut)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">
                        {c.documents.length}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {notation?.offreFinanciere != null
                          ? formatterNombre(notation.offreFinanciere, 0)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-300">
                        {c.cautionMontant != null ? formatterNombre(c.cautionMontant, 0) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ScoreBadge
                          nt={notation?.nt ?? null}
                          nf={notation?.nf ?? null}
                          ng={notation?.ng ?? null}
                          elimine={notation?.elimine ?? false}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {c.statut !== "retenue" && (
                            <button
                              onClick={() => changerStatutCandidature(c, "retenue")}
                              className="rounded-lg border border-emerald-500/30 px-2 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10"
                            >
                              Retenir
                            </button>
                          )}
                          {c.statut !== "ecartee" && (
                            <button
                              onClick={() => changerStatutCandidature(c, "ecartee")}
                              className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                            >
                              Écarter
                            </button>
                          )}
                          {c.statut !== "archive" ? (
                            <button
                              onClick={() => changerStatutCandidature(c, "archive")}
                              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                            >
                              Archiver
                            </button>
                          ) : (
                            <button
                              onClick={() => changerStatutCandidature(c, "en_cours")}
                              className="rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
                            >
                              Réactiver
                            </button>
                          )}
                          <button
                            onClick={() => retirer(c)}
                            title="Retirer de l'appel d'offres"
                            className="rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}