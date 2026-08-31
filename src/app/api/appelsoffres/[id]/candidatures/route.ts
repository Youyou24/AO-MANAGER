import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(request: Request, { params }: Params) {
  const { id: rawAo } = await params;
  const appelOffreId = parseId(rawAo);
  if (!appelOffreId)
    return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide" }, { status: 400 });
  }

  const entrepriseId = Number(body.entrepriseId);
  if (!Number.isInteger(entrepriseId) || entrepriseId <= 0) {
    return NextResponse.json({ erreur: "Entreprise invalide" }, { status: 400 });
  }

  const ao = await db.appelOffre.findUnique({ where: { id: appelOffreId } });
  if (!ao) {
    return NextResponse.json({ erreur: "Appel d'offres introuvable" }, { status: 404 });
  }
  const entreprise = await db.entreprise.findUnique({ where: { id: entrepriseId } });
  if (!entreprise) {
    return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });
  }

  // Conformité au DAO (Section I-a) : toute offre déposée hors délai est rejetée.
  if (ao.dateLimite && new Date(ao.dateLimite).getTime() < Date.now()) {
    return NextResponse.json(
      { erreur: "Dépôt hors délai : la date limite de dépôt est dépassée" },
      { status: 400 }
    );
  }

  const statut = ["en_cours", "retenue", "ecartee", "archive"].includes(String(body.statut))
    ? String(body.statut)
    : "en_cours";

  let offreFinanciere: number | null = null;
  const offreBrute = body.offreFinanciere;
  if (offreBrute !== null && offreBrute !== "" && offreBrute !== undefined) {
    const montant = Number(offreBrute);
    if (Number.isFinite(montant) && montant > 0) offreFinanciere = montant;
  }

  try {
    const candidature = await db.candidature.create({
      data: { appelOffreId, entrepriseId, statut, offreFinanciere, dateDepot: new Date() },
    });
    return NextResponse.json(candidature, { status: 201 });
  } catch {
    return NextResponse.json(
      { erreur: "Cette entreprise est déjà candidate à cet appel d'offres" },
      { status: 409 }
    );
  }
}