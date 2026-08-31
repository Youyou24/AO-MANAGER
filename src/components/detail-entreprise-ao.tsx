"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  calculerNotations,
  classesNoteTechnique,
  classesScoreGlobal,
  CATEGORIES_DOCUMENTS,
  formatterNombre,
  formaterTaille,
  libelleCategorie,
  montantCaution,
  TAUX_CAUTION,
} from "@/lib/score";
import {
  iconeFichier,
  type AppelOffreDetailDTO,
  type CandidatureDTO,
  type CritereDTO,
  type DocumentDTO,
} from "@/lib/types";
import { formaterDate } from "@/lib/statuts";

type NoteLocale = { note: number | ""; commentaire: string };

export function DetailEntrepriseAO({ appelOffreId, entrepriseId }: { appelOffreId: number; entrepriseId: number }) {
  const router = useRouter();
  const [ao, setAo] = useState<AppelOffreDetailDTO | null>(null);
  const [candidature, setCandidature] = useState<CandidatureDTO | null>(null);
  const [criteres, setCriteres] = useState<CritereDTO[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const [modeEdition, setModeEdition] = useState(false);
  const [enCoursEnvoi, setEnCoursEnvoi] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offreTexte, setOffreTexte] = useState("");
  const [enregistrementOffre, setEnregistrementOffre] = useState(false);
  const [cautionTexte, setCautionTexte] = useState("");
  const [enregistrementCaution, setEnregistrementCaution] = useState(false);

  const [categorieUpload, setCategorieUpload] = useState("technique");
  const [survolDrag, setSurvolDrag] = useState(false);
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [dateLimiteDepassee, setDateLimiteDepassee] = useState(false);
  const inputFichier = useRef<HTMLInputElement>(null);

  const [notesLocales, setNotesLocales] = useState<Record<number, NoteLocale>>({});
  const sauvegardes = useRef(new Map<number, NoteLocale>());
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  const charger = useCallback(async () => {
    try {
      const [repAo, repCriteres] = await Promise.all([
        fetch(`/api/appelsoffres/${appelOffreId}`),
        fetch("/api/criteres"),
      ]);
      if (repAo.status === 404) throw new Error("Appel d'offres introuvable");
      if (!repAo.ok || !repCriteres.ok) throw new Error("Erreur serveur");
      const donnees: AppelOffreDetailDTO = await repAo.json();
      const candidate = donnees.candidatures.find((c) => c.entrepriseId === entrepriseId);
      if (!candidate) throw new Error("Candidature introuvable");
      setAo(donnees);
      setCandidature(candidate);
      setDateLimiteDepassee(
        donnees.dateLimite ? new Date(donnees.dateLimite).getTime() < Date.now() : false
      );
      setOffreTexte(candidate.offreFinanciere != null ? String(candidate.offreFinanciere) : "");
      setCautionTexte(candidate.cautionMontant != null ? String(candidate.cautionMontant) : "");
      setCriteres(await repCriteres.json());
      setNotesLocales(
        Object.fromEntries(
          candidate.evaluations.map((e) => [
            e.critereId,
            { note: e.note, commentaire: e.commentaire ?? "" },
          ])
        )
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setChargement(false);
    }
  }, [appelOffreId, entrepriseId]);

  useEffect(() => {
    const minuteurDemarrage = setTimeout(charger, 0);
    return () => {
      clearTimeout(minuteurDemarrage);
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [charger]);

  const evaluationsVivantes = useMemo(
    () =>
      Object.entries(notesLocales)
        .filter(([, n]) => n.note !== "")
        .map(([critereId, n]) => ({ critereId: Number(critereId), note: Number(n.note) })),
    [notesLocales]
  );

  const notationVivante = useMemo(() => {
    if (!ao) return null;
    const notations = calculerNotations(
      criteres,
      ao.candidatures.map((c) => ({
        id: c.id,
        entrepriseId: c.entrepriseId,
        offreFinanciere: c.offreFinanciere,
        evaluations:
          c.entrepriseId === entrepriseId ? evaluationsVivantes : c.evaluations,
      }))
    );
    return notations.find((n) => n.entrepriseId === entrepriseId) ?? null;
  }, [ao, criteres, evaluationsVivantes, entrepriseId]);

  function planifierSauvegarde(critereId: number, valeur: NoteLocale) {
    setNotesLocales((prev) => ({ ...prev, [critereId]: valeur }));
    sauvegardes.current.set(critereId, valeur);
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(async () => {
      const enAttente = new Map(sauvegardes.current);
      sauvegardes.current.clear();
      for (const [critereCourant, valeurCourante] of enAttente) {
        await fetch("/api/evaluations", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            appelOffreId,
            entrepriseId,
            critereId: critereCourant,
            note: valeurCourante.note === "" ? null : valeurCourante.note,
            commentaire: valeurCourante.commentaire,
          }),
        });
      }
    }, 600);
  }

  async function enregistrerOffre() {
    if (!candidature) return;
    setEnregistrementOffre(true);
    setMessage(null);
    try {
      const montant = offreTexte.trim() === "" ? null : Number(offreTexte.replace(/\s/g, ""));
      if (montant != null && (!Number.isFinite(montant) || montant < 0)) {
        setMessage("Montant invalide.");
        return;
      }
      const reponse = await fetch(
        `/api/appelsoffres/${appelOffreId}/candidatures/${candidature.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offreFinanciere: montant }),
        }
      );
      if (!reponse.ok) throw new Error("Échec de l'enregistrement du montant");
      setMessage(montant != null ? "Montant de l'offre enregistré." : "Montant effacé.");
      await charger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnregistrementOffre(false);
    }
  }

  function appliquerCautionAuto(montant: string) {
    const offre = Number(montant.replace(/\s/g, ""));
    const auto = montantCaution(Number.isFinite(offre) ? offre : null);
    if (auto != null) setCautionTexte(String(Math.round(auto * 100) / 100));
  }

  async function enregistrerCaution() {
    if (!candidature) return;
    setEnregistrementCaution(true);
    setMessage(null);
    try {
      const montant = cautionTexte.trim() === "" ? null : Number(cautionTexte.replace(/\s/g, ""));
      if (montant != null && (!Number.isFinite(montant) || montant < 0)) {
        setMessage("Montant de la caution invalide.");
        return;
      }
      const reponse = await fetch(
        `/api/appelsoffres/${appelOffreId}/candidatures/${candidature.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cautionMontant: montant }),
        }
      );
      if (!reponse.ok) throw new Error("Échec de l'enregistrement de la caution");
      setMessage(montant != null ? "Caution de soumission enregistrée." : "Caution effacée.");
      await charger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnregistrementCaution(false);
    }
  }

  async function envoyerFichiers(fichiers: FileList | File[]) {
    if (!fichiers || (fichiers instanceof FileList && fichiers.length === 0)) return;
    setEnCoursEnvoi(true);
    setMessage(null);
    try {
      const corps = new FormData();
      corps.append("appelOffreId", String(appelOffreId));
      corps.append("entrepriseId", String(entrepriseId));
      corps.append("categorie", categorieUpload);
      for (const fichier of Array.from(fichiers)) corps.append("fichiers", fichier);
      const reponse = await fetch("/api/documents", { method: "POST", body: corps });
      const donnees = await reponse.json().catch(() => ({}));
      if (!reponse.ok) throw new Error(donnees.erreur ?? "Échec de l'import");
      setMessage(`${donnees.length} document(s) importé(s).`);
      await charger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setEnCoursEnvoi(false);
      if (inputFichier.current) inputFichier.current.value = "";
    }
  }

  async function supprimerDocument(doc: DocumentDTO) {
    if (!confirm(`Supprimer « ${doc.nomFichier} » ?`)) return;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    await charger();
  }

  async function retirerCandidature() {
    if (!candidature) return;
    if (!confirm(`Retirer « ${candidature.entreprise.nom} » de cet appel d'offres ?`)) return;
    await fetch(`/api/appelsoffres/${appelOffreId}/candidatures/${candidature.id}`, {
      method: "DELETE",
    });
    router.push(`/appelsoffres/${appelOffreId}`);
  }

  async function enregistrerInfos(formData: FormData) {
    if (!candidature) return;
    const corps = Object.fromEntries(formData.entries());
    const reponse = await fetch(`/api/entreprises/${entrepriseId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corps),
    });
    const donnees = await reponse.json().catch(() => ({}));
    if (!reponse.ok) {
      setMessage(donnees.erreur ?? "Échec de la mise à jour");
      return;
    }
    setModeEdition(false);
    await charger();
  }

  if (chargement) {
    return <p className="py-16 text-center text-sm text-slate-400">Chargement…</p>;
  }
  if (erreur || !candidature || !ao) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-red-400">{erreur ?? "Erreur inconnue"}</p>
        <Link href={`/appelsoffres/${appelOffreId}`} className="text-sm text-emerald-400 hover:underline">
          ← Retour à l&apos;appel d&apos;offres
        </Link>
      </div>
    );
  }

  const entreprise = candidature.entreprise;
  const documentsAffiches = candidature.documents.filter(
    (d) => !filtreCategorie || d.categorie === filtreCategorie
  );

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/appelsoffres/${appelOffreId}`}
        className="w-fit text-sm text-slate-400 transition hover:text-emerald-400"
      >
        ← {ao.titre}
      </Link>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {modeEdition ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  enregistrerInfos(new FormData(e.currentTarget));
                }}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              >
                {[
                  { nom: "nom", libelle: "Nom *", defaut: entreprise.nom },
                  { nom: "secteur", libelle: "Secteur", defaut: entreprise.secteur ?? "" },
                  { nom: "contact", libelle: "Contact", defaut: entreprise.contact ?? "" },
                  { nom: "email", libelle: "Email", defaut: entreprise.email ?? "" },
                  {
                    nom: "telephone",
                    libelle: "Téléphone",
                    defaut: entreprise.telephone ?? "",
                  },
                ].map((champ) => (
                  <label key={champ.nom} className="flex flex-col gap-1 text-sm">
                    <span className="text-slate-300">{champ.libelle}</span>
                    <input
                      name={champ.nom}
                      defaultValue={champ.defaut}
                      required={champ.nom === "nom"}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                  </label>
                ))}
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  <span className="text-slate-300">Description</span>
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={entreprise.description ?? ""}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                  />
                </label>
                <div className="flex gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
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
              <>
                <h1 className="truncate text-2xl font-semibold text-white">{entreprise.nom}</h1>
                <dl className="mt-3 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Secteur</dt>
                    <dd className="text-slate-200">{entreprise.secteur ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Contact</dt>
                    <dd className="text-slate-200">{entreprise.contact ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
                    <dd className="truncate text-slate-200">{entreprise.email ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Téléphone</dt>
                    <dd className="text-slate-200">{entreprise.telephone ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Date de dépôt</dt>
                    <dd className="text-slate-200">{formaterDate(candidature.dateDepot)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Date limite</dt>
                    <dd
                      className={
                        dateLimiteDepassee
                          ? "font-medium text-red-400"
                          : "text-slate-200"
                      }
                    >
                      {formaterDate(ao.dateLimite)}
                    </dd>
                  </div>
                </dl>
                {entreprise.description && (
                  <p className="mt-3 max-w-2xl text-sm text-slate-400">
                    {entreprise.description}
                  </p>
                )}
              </>
            )}
          </div>

          {!modeEdition && (
            <div className="flex flex-col items-end gap-3">
              <div className="flex flex-col items-end gap-2">
                <div
                  className={`inline-flex flex-col items-center rounded-xl px-5 py-4 ${classesScoreGlobal(notationVivante?.ng ?? null)}`}
                >
                  <span className="text-[10px] font-medium uppercase tracking-widest opacity-80">
                    Note globale
                  </span>
                  <span className="font-mono text-3xl font-bold leading-tight">
                    {notationVivante?.ng != null ? formatterNombre(notationVivante.ng) : "—"}
                    <span className="text-base font-normal opacity-70"> / 200</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span
                    className={`rounded-full px-2.5 py-0.5 font-mono ring-1 ring-inset ${classesNoteTechnique(
                      notationVivante?.nt ?? null
                    )}`}
                  >
                    Nt {formatterNombre(notationVivante?.nt ?? null)} / 110
                  </span>
                  <span className="rounded-full bg-slate-800 px-2.5 py-0.5 font-mono text-slate-300 ring-1 ring-inset ring-slate-700">
                    Nf {formatterNombre(notationVivante?.nf ?? null)} / 90
                  </span>
                </div>
                {notationVivante?.elimine && (
                  <p className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-400 ring-1 ring-inset ring-red-500/30">
                    Éliminé — offre technique &lt; 70 pts, offre financière non examinée
                  </p>
                )}
                <p className="text-xs text-slate-400">
                  {criteres.filter((c) =>
                    evaluationsVivantes.some((e) => e.critereId === c.id)
                  ).length}
                  /{criteres.length} critères évalués
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-300">Offre financière HT (€)</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={offreTexte}
                      onBlur={() => appliquerCautionAuto(offreTexte)}
                      onChange={(e) => setOffreTexte(e.target.value)}
                      placeholder="Ex : 12500000"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={enregistrerOffre}
                      disabled={enregistrementOffre || !candidature}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {enregistrementOffre ? "…" : "OK"}
                    </button>
                  </div>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-slate-300">
                    Caution de soumission (€) — {String(Math.round(TAUX_CAUTION * 100))}% de
                    l&apos;offre
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={cautionTexte}
                      onChange={(e) => setCautionTexte(e.target.value)}
                      placeholder="Ex : 125000"
                      className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={() => appliquerCautionAuto(offreTexte)}
                      title="Calculer automatiquement = 1% de l'offre"
                      className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
                    >
                      1%
                    </button>
                    <button
                      onClick={enregistrerCaution}
                      disabled={enregistrementCaution || !candidature}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {enregistrementCaution ? "…" : "OK"}
                    </button>
                  </div>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setModeEdition(true)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
                >
                  Modifier
                </button>
                <button
                  onClick={retirerCandidature}
                  className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 transition hover:bg-red-500/10"
                >
                  Retirer de l&apos;appel d&apos;offres
                </button>
              </div>
            </div>
          )}
        </div>
        {message && (
          <p className="mt-4 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {message}
          </p>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-1 text-lg font-semibold text-white">Documents</h2>
        <p className="mb-4 text-sm text-slate-400">
          Importez le dossier technique, financier ou administratif — tous les formats sont
          acceptés.
        </p>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <select
            value={categorieUpload}
            onChange={(e) => setCategorieUpload(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          >
            {CATEGORIES_DOCUMENTS.map((c) => (
              <option key={c.valeur} value={c.valeur}>
                Catégorie : {c.libelle}
              </option>
            ))}
          </select>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setSurvolDrag(true);
          }}
          onDragLeave={() => setSurvolDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSurvolDrag(false);
            envoyerFichiers(e.dataTransfer.files);
          }}
          onClick={() => inputFichier.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition ${
            survolDrag
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-slate-700 hover:border-slate-500 hover:bg-slate-950/50"
          }`}
        >
          <input
            ref={inputFichier}
            type="file"
            multiple
            hidden
            onChange={(e) => e.target.files && envoyerFichiers(e.target.files)}
          />
          <p className="text-3xl">📁</p>
          <p className="mt-2 text-sm font-medium text-slate-200">
            {enCoursEnvoi ? "Import en cours…" : "Glissez vos fichiers ici"}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            ou cliquez pour parcourir — PDF, Word, Excel, images, archives…
          </p>
        </div>

        {candidature.documents.length > 0 && (
          <>
            <div className="mt-5 mb-2 flex flex-wrap gap-2">
              <button
                onClick={() => setFiltreCategorie("")}
                className={`rounded-full px-3 py-1 text-xs transition ${
                  filtreCategorie === ""
                    ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30"
                    : "bg-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Tous ({candidature.documents.length})
              </button>
              {CATEGORIES_DOCUMENTS.map((c) => {
                const nb = candidature.documents.filter((d) => d.categorie === c.valeur).length;
                return (
                  <button
                    key={c.valeur}
                    onClick={() => setFiltreCategorie(c.valeur)}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      filtreCategorie === c.valeur
                        ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200"
                    } ${nb === 0 ? "opacity-40" : ""}`}
                  >
                    {c.libelle} ({nb})
                  </button>
                );
              })}
            </div>

            <ul className="divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800">
              {documentsAffiches.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 bg-slate-950 px-4 py-3">
                  <span className="text-xl">{iconeFichier(doc.nomFichier, doc.typeMime)}</span>
                  <a
                    href={`/api/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 flex-1 truncate text-sm text-slate-200 hover:text-emerald-400"
                    title={doc.nomFichier}
                  >
                    {doc.nomFichier}
                  </a>
                  <span className="hidden shrink-0 rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400 sm:block">
                    {libelleCategorie(doc.categorie)}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {formaterTaille(doc.tailleOctets)}
                  </span>
                  <a
                    href={`/api/documents/${doc.id}?telecharger=1`}
                    className="shrink-0 rounded-lg border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-emerald-500 hover:text-emerald-400"
                  >
                    ⬇ Télécharger
                  </a>
                  <button
                    onClick={() => supprimerDocument(doc)}
                    className="shrink-0 rounded-lg border border-red-500/30 px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="mb-1 text-lg font-semibold text-white">Évaluation par critères</h2>
        <p className="mb-4 text-sm text-slate-400">
          Attribuez une note de 0 au maximum de points de chaque critère. La note technique
          (Nt /110) est la somme des notes, la note financière (Nf /90) est calculée à partir
          du montant de l&apos;offre.
        </p>

        {criteres.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-700 py-8 text-center text-sm text-slate-400">
            Aucun critère défini.{" "}
            <Link href="/criteres" className="text-emerald-400 hover:underline">
              Créez vos critères d&apos;évaluation →
            </Link>
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {criteres.map((critere) => {
              const locale: NoteLocale =
                notesLocales[critere.id] ?? { note: "", commentaire: "" };
              const noteNum = locale.note === "" ? null : Number(locale.note);
              return (
                <div
                  key={critere.id}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium text-slate-100">{critere.nom}</span>
                      {critere.description && (
                        <p className="text-xs text-slate-500">{critere.description}</p>
                      )}
                    </div>
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                      {critere.maxPoints} pts max
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={critere.maxPoints}
                      step={0.5}
                      value={locale.note === "" ? 0 : locale.note}
                      onChange={(e) =>
                        planifierSauvegarde(critere.id, {
                          ...locale,
                          note: Number(e.target.value),
                        })
                      }
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-slate-700 accent-emerald-500"
                    />
                    <input
                      type="number"
                      min={0}
                      max={critere.maxPoints}
                      step={0.5}
                      value={locale.note}
                      placeholder="—"
                      onChange={(e) =>
                        planifierSauvegarde(critere.id, {
                          ...locale,
                          note:
                            e.target.value === ""
                              ? ""
                              : Math.max(0, Math.min(critere.maxPoints, Number(e.target.value))),
                        })
                      }
                      className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-center text-sm text-white outline-none focus:border-emerald-500"
                    />
                    <span className="w-14 text-right text-xs text-slate-500">
                      / {critere.maxPoints}
                    </span>
                  </div>
                  <input
                    value={locale.commentaire}
                    placeholder="Commentaire (facultatif)…"
                    onChange={(e) =>
                      planifierSauvegarde(critere.id, { ...locale, commentaire: e.target.value })
                    }
                    className="mt-2 w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-xs text-slate-400 outline-none placeholder:text-slate-600 hover:border-slate-700 focus:border-emerald-500"
                  />
                  {noteNum != null && (
                    <p className="mt-1 px-2 text-[11px] text-slate-600">
                      Note attribuée : {formatterNombre(noteNum)} / {critere.maxPoints}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}