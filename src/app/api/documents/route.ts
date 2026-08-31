import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dossierUploads } from "@/lib/stockage";
import { CATEGORIES_DOCUMENTS } from "@/lib/score";

const TAILLE_MAX = 100 * 1024 * 1024; // 100 Mo

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ erreur: "Requête multipart invalide" }, { status: 400 });
  }

  const entrepriseId = Number(formData.get("entrepriseId"));
  const appelOffreId = Number(formData.get("appelOffreId"));
  const categorieBrute = String(formData.get("categorie") ?? "autre");
  const categorie = CATEGORIES_DOCUMENTS.some((c) => c.valeur === categorieBrute)
    ? categorieBrute
    : "autre";

  if (!Number.isInteger(entrepriseId) || entrepriseId <= 0) {
    return NextResponse.json({ erreur: "Entreprise invalide" }, { status: 400 });
  }
  if (!Number.isInteger(appelOffreId) || appelOffreId <= 0) {
    return NextResponse.json({ erreur: "Appel d'offres invalide" }, { status: 400 });
  }
  const entreprise = await db.entreprise.findUnique({ where: { id: entrepriseId } });
  if (!entreprise)
    return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });
  const candidature = await db.candidature.findUnique({
    where: { appelOffreId_entrepriseId: { appelOffreId, entrepriseId } },
  });
  if (!candidature) {
    return NextResponse.json(
      { erreur: "Cette entreprise ne candidate pas à cet appel d'offres" },
      { status: 404 }
    );
  }

  const fichiers = formData.getAll("fichiers").filter((f): f is File => f instanceof File);
  if (fichiers.length === 0) {
    return NextResponse.json({ erreur: "Aucun fichier reçu" }, { status: 400 });
  }

  const dossier = dossierUploads();
  await mkdir(dossier, { recursive: true });

  const crees: { id: number; nomFichier: string }[] = [];
  for (const fichier of fichiers) {
    if (fichier.size > TAILLE_MAX) {
      return NextResponse.json(
        { erreur: `« ${fichier.name} » dépasse la taille maximale de 100 Mo` },
        { status: 413 }
      );
    }

    const extension = path.extname(fichier.name).slice(0, 20);
    const cheminStocke = `${randomUUID()}${extension}`;
    const buffer = Buffer.from(await fichier.arrayBuffer());
    await writeFile(path.join(dossier, cheminStocke), buffer);

    const document = await db.document.create({
      data: {
        nomFichier: fichier.name,
        cheminStocke,
        tailleOctets: fichier.size,
        typeMime: fichier.type || "application/octet-stream",
        categorie,
        appelOffreId,
        entrepriseId,
      },
    });
    crees.push({ id: document.id, nomFichier: document.nomFichier });
  }

  return NextResponse.json(crees, { status: 201 });
}
