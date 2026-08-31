export type CritereDTO = {
  id: number;
  nom: string;
  description: string | null;
  maxPoints: number;
};

export type EvaluationDTO = {
  id: number;
  note: number;
  commentaire: string | null;
  appelOffreId: number;
  entrepriseId: number;
  critereId: number;
  updatedAt: string;
};

export type DocumentDTO = {
  id: number;
  nomFichier: string;
  tailleOctets: number;
  typeMime: string | null;
  categorie: string;
  appelOffreId: number;
  entrepriseId: number;
  createdAt: string;
};

export type EntrepriseDTO = {
  id: number;
  nom: string;
  secteur: string | null;
  contact: string | null;
  email: string | null;
  telephone: string | null;
  description: string | null;
  createdAt: string;
};

export type CandidatureDTO = {
  id: number;
  entrepriseId: number;
  statut: string;
  offreFinanciere: number | null;
  cautionMontant: number | null;
  dateDepot: string | null;
  createdAt: string;
  entreprise: EntrepriseDTO;
  evaluations: { critereId: number; note: number; commentaire: string | null }[];
  documents: DocumentDTO[];
};

export type AppelOffreDTO = {
  id: number;
  titre: string;
  reference: string | null;
  description: string | null;
  dateLimite: string | null;
  statut: string;
  createdAt: string;
  updatedAt: string;
  _count: { candidatures: number; documents: number };
};

export type AppelOffreDetailDTO = Omit<AppelOffreDTO, "_count"> & {
  _count: { candidatures: number; documents: number };
  candidatures: CandidatureDTO[];
};

export function iconeFichier(nomFichier: string, typeMime?: string | null): string {
  const extension = nomFichier.split(".").pop()?.toLowerCase() ?? "";
  if (typeMime?.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(extension))
    return "🖼️";
  if (extension === "pdf") return "📕";
  if (["doc", "docx", "odt", "rtf", "txt", "md"].includes(extension)) return "📄";
  if (["xls", "xlsx", "ods", "csv"].includes(extension)) return "📊";
  if (["ppt", "pptx", "odp"].includes(extension)) return "📽️";
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension)) return "🗜️";
  return "📎";
}