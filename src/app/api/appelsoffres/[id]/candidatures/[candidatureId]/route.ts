import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { db } from "@/lib/db";
import { cheminDocument } from "@/lib/stockage";

type Params = { params: Promise<{ id: string; candidatureId: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const STATUTS_VALIDES = ["en_cours", "retenue", "ecartee", "archive"];

export async function PATCH(request: Request, { params }: Params) {
  const { id: rawAo, candidatureId: rawCandidature } = await params;
  const appelOffreId = parseId(rawAo);
  const candidatureId = parseId(rawCandidature);
  if (!appelOffreId || !candidatureId)
    return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide" }, { status: 400 });
  }

  const data: {
    statut?: string;
    offreFinanciere?: number | null;
    cautionMontant?: number | null;
  } = {};

  const ao = await db.appelOffre.findUnique({ where: { id: appelOffreId }, select: { dateLimite: true } });
  const horsDelai = !!ao?.dateLimite && new Date(ao.dateLimite).getTime() < Date.now();

  // Seul le statut (retenue/écartée/archivée) reste modifiable après la date limite.
  const modifieChiffre = body.offreFinanciere !== undefined || body.cautionMontant !== undefined;
  if (horsDelai && modifieChiffre) {
    return NextResponse.json(
      { erreur: "Dépôt hors délai : les montants d'offre ne peuvent plus être modifiés" },
      { status: 400 }
    );
  }

  if (body.statut !== undefined) {
    const statut = String(body.statut);
    if (!STATUTS_VALIDES.includes(statut)) {
      return NextResponse.json({ erreur: "Statut invalide" }, { status: 400 });
    }
    data.statut = statut;
  }

  if (body.offreFinanciere !== undefined) {
    if (body.offreFinanciere === null || body.offreFinanciere === "") {
      data.offreFinanciere = null;
    } else {
      const montant = Number(body.offreFinanciere);
      if (!Number.isFinite(montant) || montant < 0) {
        return NextResponse.json({ erreur: "Montant invalide" }, { status: 400 });
      }
      data.offreFinanciere = montant;
    }
  }

  if (body.cautionMontant !== undefined) {
    if (body.cautionMontant === null || body.cautionMontant === "") {
      data.cautionMontant = null;
    } else {
      const montant = Number(body.cautionMontant);
      if (!Number.isFinite(montant) || montant < 0) {
        return NextResponse.json({ erreur: "Montant de la caution invalide" }, { status: 400 });
      }
      data.cautionMontant = montant;
    }
  }

  const candidature = await db.candidature.findFirst({
    where: { id: candidatureId, appelOffreId },
  });
  if (!candidature)
    return NextResponse.json({ erreur: "Candidature introuvable" }, { status: 404 });

  const miseAJour = await db.candidature.update({
    where: { id: candidatureId },
    data,
  });
  return NextResponse.json(miseAJour);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: rawAo, candidatureId: rawCandidature } = await params;
  const appelOffreId = parseId(rawAo);
  const candidatureId = parseId(rawCandidature);
  if (!appelOffreId || !candidatureId)
    return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

  const candidature = await db.candidature.findFirst({
    where: { id: candidatureId, appelOffreId },
  });
  if (!candidature)
    return NextResponse.json({ erreur: "Candidature introuvable" }, { status: 404 });

  const documents = await db.document.findMany({
    where: { appelOffreId, entrepriseId: candidature.entrepriseId },
    select: { cheminStocke: true },
  });

  await db.evaluation.deleteMany({
    where: { appelOffreId, entrepriseId: candidature.entrepriseId },
  });
  await db.document.deleteMany({
    where: { appelOffreId, entrepriseId: candidature.entrepriseId },
  });
  await db.candidature.delete({ where: { id: candidatureId } });

  for (const doc of documents) {
    await unlink(cheminDocument(doc.cheminStocke)).catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}