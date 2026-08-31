import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calculerNoteTechnique,
  calculerScoreGlobal,
  formatterNombre,
  SEUIL_TECHNIQUE,
  trouverMoinsDisant,
} from "@/lib/score";
import { libelleStatutCandidature } from "@/lib/statuts";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function cell(value: unknown): string {
  const texte = value === null || value === undefined ? "" : String(value);
  if (/[;"\n]/.test(texte)) {
    return `"${texte.replace(/"/g, '""')}"`;
  }
  return texte;
}

export async function GET(_request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

  const ao = await db.appelOffre.findUnique({
    where: { id },
    include: {
      candidatures: {
        orderBy: { createdAt: "asc" },
        include: { entreprise: true },
      },
    },
  });
  if (!ao) return NextResponse.json({ erreur: "Appel d'offres introuvable" }, { status: 404 });

  const [criteres, evaluations, documents] = await Promise.all([
    db.critere.findMany({ orderBy: { createdAt: "asc" } }),
    db.evaluation.findMany({
      where: { appelOffreId: id },
      select: { entrepriseId: true, critereId: true, note: true },
    }),
    db.document.findMany({
      where: { appelOffreId: id },
      select: { entrepriseId: true, id: true },
    }),
  ]);

  type CandidatureAvecNote = {
    entreprise: (typeof ao.candidatures)[number]["entreprise"];
    statut: string;
    offreFinanciere: number | null;
    evalByCritere: { critereId: number; note: number }[];
    nbDocuments: number;
    nt: number | null;
    nf: number | null;
    ng: number | null;
    elimine: boolean;
  };

  const candidatures: CandidatureAvecNote[] = ao.candidatures.map((c) => {
    const evalByCritere = evaluations.filter((e) => e.entrepriseId === c.entrepriseId);
    const technique = calculerNoteTechnique(criteres, evalByCritere);
    return {
      entreprise: c.entreprise,
      statut: c.statut,
      offreFinanciere: c.offreFinanciere,
      evalByCritere,
      nbDocuments: documents.filter((d) => d.entrepriseId === c.entrepriseId).length,
      nt: technique.note,
      nf: null,
      ng: null,
      elimine: technique.note != null && technique.note < SEUIL_TECHNIQUE,
    };
  });

  const moinsDisant = trouverMoinsDisant(
    candidatures.map((c) => ({ nt: c.nt, offreFinanciere: c.offreFinanciere }))
  );

  for (const c of candidatures) {
    const global = calculerScoreGlobal({
      criteres,
      evaluations: c.evalByCritere,
      offreFinanciere: c.offreFinanciere,
      moinsDisant,
    });
    c.nf = global.nf;
    c.ng = global.ng;
  }

  const rangeParScore = (a: CandidatureAvecNote, b: CandidatureAvecNote) =>
    (b.ng ?? -1) - (a.ng ?? -1) || a.entreprise.nom.localeCompare(b.entreprise.nom, "fr");
  candidatures.sort(rangeParScore);

  const lignes: string[][] = [];
  const enTete = [
    "Rang",
    "Entreprise",
    "Secteur",
    "Contact",
    "Email",
    "Téléphone",
    "Statut",
    "Documents",
    "Offre financière (€)",
    "Note technique /110",
    "Éliminé (<70)",
    "Note financière /90",
    "Note globale /200",
    ...criteres.map((c) => `${c.nom} (/${c.maxPoints})`),
  ];
  lignes.push(enTete);

  candidatures.forEach((c, index) => {
    const notesParCritere = new Map(c.evalByCritere.map((e) => [e.critereId, e.note]));
    lignes.push([
      String(index + 1),
      c.entreprise.nom,
      c.entreprise.secteur ?? "",
      c.entreprise.contact ?? "",
      c.entreprise.email ?? "",
      c.entreprise.telephone ?? "",
      libelleStatutCandidature(c.statut),
      String(c.nbDocuments),
      c.offreFinanciere != null ? formatterNombre(c.offreFinanciere, 0) : "",
      c.nt != null ? formatterNombre(c.nt) : "",
      c.elimine ? "Oui" : "",
      c.nf != null ? formatterNombre(c.nf) : "",
      c.ng != null ? formatterNombre(c.ng) : "",
      ...criteres.map((crit) => {
        const note = notesParCritere.get(crit.id);
        return note != null ? formatterNombre(note) : "";
      }),
    ]);
  });

  const csv = "\uFEFF" + lignes.map((l) => l.map(cell).join(";")).join("\r\n");
  const nomFichier = encodeURIComponent(`classement-${ao.titre.replace(/\s+/g, "-")}.csv`);

  return new Response(new Blob([csv], { type: "text/csv;charset=utf-8" }), {
    headers: {
      "Content-Disposition": `attachment; filename*=UTF-8''${nomFichier}`,
    },
  });
}