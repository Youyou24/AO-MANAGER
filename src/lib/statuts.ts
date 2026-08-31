export const STATUTS_AO = [
  { valeur: "brouillon", libelle: "Brouillon" },
  { valeur: "actif", libelle: "Actif" },
  { valeur: "cloture", libelle: "Clôturé" },
  { valeur: "archive", libelle: "Archivé" },
] as const;

export const STATUTS_CANDIDATURE = [
  { valeur: "en_cours", libelle: "En cours" },
  { valeur: "retenue", libelle: "Retenue" },
  { valeur: "ecartee", libelle: "Écartée" },
  { valeur: "archive", libelle: "Archivée" },
] as const;

export function libelleStatutAo(valeur: string): string {
  return STATUTS_AO.find((s) => s.valeur === valeur)?.libelle ?? valeur;
}

export function libelleStatutCandidature(valeur: string): string {
  return STATUTS_CANDIDATURE.find((s) => s.valeur === valeur)?.libelle ?? valeur;
}

export function classesBadgeAo(statut: string): string {
  switch (statut) {
    case "actif":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30";
    case "cloture":
      return "bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-500/30";
    case "archive":
      return "bg-slate-800 text-slate-400 ring-1 ring-inset ring-slate-700";
    default:
      return "bg-amber-500/15 text-amber-300 ring-1 ring-inset ring-amber-500/30";
  }
}

export function classesBadgeCandidature(statut: string): string {
  switch (statut) {
    case "retenue":
      return "bg-emerald-500/15 text-emerald-300 ring-1 ring-inset ring-emerald-500/30";
    case "ecartee":
      return "bg-red-500/15 text-red-300 ring-1 ring-inset ring-red-500/30";
    case "archive":
      return "bg-slate-800 text-slate-400 ring-1 ring-inset ring-slate-700";
    default:
      return "bg-slate-700/50 text-slate-300 ring-1 ring-inset ring-slate-600";
  }
}

export function formaterDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}