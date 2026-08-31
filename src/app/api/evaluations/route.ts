import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide" }, { status: 400 });
  }

  const appelOffreId = Number(body.appelOffreId);
  const entrepriseId = Number(body.entrepriseId);
  const critereId = Number(body.critereId);

  if (
    !Number.isInteger(appelOffreId) ||
    !Number.isInteger(entrepriseId) ||
    !Number.isInteger(critereId)
  ) {
    return NextResponse.json({ erreur: "Identifiants invalides" }, { status: 400 });
  }

  const candidature = await db.candidature.findUnique({
    where: { appelOffreId_entrepriseId: { appelOffreId, entrepriseId } },
  });
  if (!candidature) {
    return NextResponse.json(
      { erreur: "Cette entreprise ne candidate pas à cet appel d'offres" },
      { status: 404 }
    );
  }

  const critere = await db.critere.findUnique({ where: { id: critereId } });
  if (!critere) {
    return NextResponse.json({ erreur: "Critère introuvable" }, { status: 404 });
  }

  const noteBrute = body.note;

  // Note vide => suppression de l'évaluation existante
  if (noteBrute === null || noteBrute === "" || noteBrute === undefined) {
    await db.evaluation.deleteMany({
      where: { appelOffreId, entrepriseId, critereId },
    });
    return new NextResponse(null, { status: 204 });
  }

  const note = Number(noteBrute);
  if (!Number.isFinite(note) || note < 0 || note > critere.maxPoints) {
    return NextResponse.json(
      { erreur: `La note doit être comprise entre 0 et ${critere.maxPoints}` },
      { status: 400 }
    );
  }
  const commentaire =
    typeof body.commentaire === "string" && body.commentaire.trim()
      ? body.commentaire.trim()
      : null;

  const existing = await db.evaluation.findUnique({
    where: {
      appelOffreId_entrepriseId_critereId: { appelOffreId, entrepriseId, critereId },
    },
  });

  const evaluation = existing
    ? await db.evaluation.update({
        where: { id: existing.id },
        data: { note, commentaire },
      })
    : await db.evaluation.create({
        data: { note, commentaire, appelOffreId, entrepriseId, critereId },
      });

  return NextResponse.json(evaluation);
}