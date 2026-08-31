import path from "node:path";

export function dossierUploads(): string {
  return path.join(process.cwd(), process.env.UPLOAD_DIR ?? "uploads");
}

export function cheminDocument(cheminStocke: string): string {
  return path.join(dossierUploads(), cheminStocke);
}
