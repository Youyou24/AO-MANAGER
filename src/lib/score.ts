// Référentiel d'évaluation conforme au DAO (PDF client) :
// notation sur 200 points = Offre technique (110 pts, 55%) + Offre financière (90 pts, 45%).
// Seuils & formules issus de la Section III du Dossier d'Appel d'Offres.

export const SEUIL_TECHNIQUE = 70; // en dessous => éliminé, offre financière non examinée
export const MAX_TECHNIQUE = 110;
export const MAX_FINANCIER = 90;
export const MAX_GLOBAL = 200;

// Caution de soumission = 1 % du montant de l'offre (Section I-a du DAO).
export const TAUX_CAUTION = 0.01;

export function montantCaution(offreFinanciere: number | null): number | null {
  if (offreFinanciere == null || !Number.isFinite(offreFinanciere) || offreFinanciere <= 0) {
    return null;
  }
  return offreFinanciere * TAUX_CAUTION;
}

export type ScoreTechnique = {
  note: number | null; // Nt sur 110
  pointsObtenus: number;
  pointsMaximum: number;
  criteresEvalues: number;
  criteresTotal: number;
};

export type ScoreFinancier = {
  note: number | null; // Nf sur 90
  moinsDisant: number | null;
};

export type ScoreGlobal = {
  nt: number | null;
  nf: number | null;
  ng: number | null; // Nt + Nf sur 200
  elimine: boolean; // Nt < 70
  complet: boolean; // note technique entièrement renseignée
};

// Nt = somme des notes attribuées, chaque note étant bornée au maxPoints du critère.
export function calculerNoteTechnique(
  criteres: { id: number; maxPoints: number }[],
  evaluations: { critereId: number; note: number }[]
): ScoreTechnique {
  const notesParCritere = new Map(
    evaluations.map((e) => [e.critereId, e.note])
  );
  let pointsObtenus = 0;
  let pointsMaximum = 0;
  let criteresEvalues = 0;

  for (const critere of criteres) {
    const note = notesParCritere.get(critere.id);
    pointsMaximum += critere.maxPoints;
    if (note != null && Number.isFinite(note)) {
      pointsObtenus += Math.min(Math.max(note, 0), critere.maxPoints);
      criteresEvalues += 1;
    }
  }

  if (criteres.length === 0) {
    return {
      note: null,
      pointsObtenus,
      pointsMaximum: 0,
      criteresEvalues,
      criteresTotal: 0,
    };
  }

  return {
    note: pointsObtenus,
    pointsObtenus,
    pointsMaximum,
    criteresEvalues,
    criteresTotal: criteres.length,
  };
}

// Nf = 90 x (offre la moins disante / offre considérée)
export function calculerNoteFinanciere(
  offreConsideree: number | null,
  moinsDisant: number | null
): ScoreFinancier {
  if (offreConsideree == null || offreConsideree <= 0 || moinsDisant == null || moinsDisant <= 0) {
    return { note: null, moinsDisant };
  }
  return {
    note: (MAX_FINANCIER * moinsDisant) / offreConsideree,
    moinsDisant,
  };
}

// NG = Nt + Nf ; un candidat est éliminé si sa note technique < 70.
export function calculerScoreGlobal(params: {
  criteres: { id: number; maxPoints: number }[];
  evaluations: { critereId: number; note: number }[];
  offreFinanciere: number | null;
  moinsDisant: number | null;
}): ScoreGlobal {
  const { criteres, evaluations, offreFinanciere, moinsDisant } = params;
  const technique = calculerNoteTechnique(criteres, evaluations);
  const nt = technique.note;
  const complet = nt != null && technique.criteresEvalues === technique.criteresTotal;

  let nf: number | null = null;
  if (nt != null && nt >= SEUIL_TECHNIQUE) {
    nf = calculerNoteFinanciere(offreFinanciere, moinsDisant).note;
  }

  let ng: number | null = null;
  if (nt != null && nf != null) ng = nt + nf;

  return {
    nt,
    nf,
    ng,
    elimine: nt != null && nt < SEUIL_TECHNIQUE,
    complet,
  };
}

// Plus petite offre financière parmi les candidatures techniquement qualifiées.
export function trouverMoinsDisant(
  candidatures: { nt: number | null; offreFinanciere: number | null }[]
): number | null {
  let min: number | null = null;
  for (const c of candidatures) {
    if (c.nt == null || c.nt < SEUIL_TECHNIQUE) continue;
    if (c.offreFinanciere == null || c.offreFinanciere <= 0) continue;
    if (min == null || c.offreFinanciere < min) min = c.offreFinanciere;
  }
  return min;
}

export type NotationCandidature = {
  id: number;
  entrepriseId: number;
  offreFinanciere: number | null;
  nt: number | null;
  nf: number | null;
  ng: number | null;
  elimine: boolean;
  complet: boolean;
};

// Calcule la notation 200 pts de toutes les candidatures d'un appel d'offres :
// determine la moins-disante parmi les techniquement qualifiees puis Nf et NG.
export function calculerNotations(
  criteres: { id: number; maxPoints: number }[],
  candidatures: {
    id: number;
    entrepriseId: number;
    offreFinanciere: number | null;
    evaluations: { critereId: number; note: number }[];
  }[]
): NotationCandidature[] {
  const techniques = new Map<number, ScoreTechnique>();
  for (const c of candidatures) {
    techniques.set(c.id, calculerNoteTechnique(criteres, c.evaluations));
  }

  const moinsDisant = trouverMoinsDisant(
    candidatures.map((c) => ({
      nt: techniques.get(c.id)?.note ?? null,
      offreFinanciere: c.offreFinanciere,
    }))
  );

  return candidatures.map((c) => {
    const technique = techniques.get(c.id)!;
    const global = calculerScoreGlobal({
      criteres,
      evaluations: c.evaluations,
      offreFinanciere: c.offreFinanciere,
      moinsDisant,
    });
    return {
      id: c.id,
      entrepriseId: c.entrepriseId,
      offreFinanciere: c.offreFinanciere,
      nt: technique.note,
      nf: global.nf,
      ng: global.ng,
      elimine: global.elimine,
      complet: global.complet,
    };
  });
}

export function classesNoteTechnique(nt: number | null): string {
  if (nt == null) return "bg-zinc-700/50 text-zinc-400 ring-1 ring-inset ring-zinc-600";
  if (nt >= SEUIL_TECHNIQUE)
    return "bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30";
  return "bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/30";
}

export function classesScoreGlobal(ng: number | null): string {
  if (ng == null) return "bg-zinc-700/50 text-zinc-400 ring-1 ring-inset ring-zinc-600";
  if (ng >= 140) return "bg-emerald-500/15 text-emerald-400 ring-1 ring-inset ring-emerald-500/30";
  if (ng >= 100) return "bg-amber-500/15 text-amber-400 ring-1 ring-inset ring-amber-500/30";
  return "bg-red-500/15 text-red-400 ring-1 ring-inset ring-red-500/30";
}

export function formatterNombre(n: number | null, dec = 2): string {
  if (n == null) return "—";
  return n.toFixed(dec).replace(".", ",");
}

export const CATEGORIES_DOCUMENTS = [
  { valeur: "technique", libelle: "Dossier technique" },
  { valeur: "financier", libelle: "Dossier financier" },
  { valeur: "administratif", libelle: "Administratif" },
  { valeur: "autre", libelle: "Autre" },
] as const;

export function libelleCategorie(valeur: string): string {
  return CATEGORIES_DOCUMENTS.find((c) => c.valeur === valeur)?.libelle ?? "Autre";
}

export function formaterTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  const ko = octets / 1024;
  if (ko < 1024) return `${ko.toFixed(1).replace(".", ",")} Ko`;
  const mo = ko / 1024;
  if (mo < 1024) return `${mo.toFixed(1).replace(".", ",")} Mo`;
  return `${(mo / 1024).toFixed(1).replace(".", ",")} Go`;
}
