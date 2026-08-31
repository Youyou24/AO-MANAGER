import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STATUTS_AO } from "@/lib/statuts";

const STATUTS_VALIDES: string[] = STATUTS_AO.map((s) => s.valeur);

export async function GET() {
  const appelsoffres = await db.appelOffre.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      candidatures: { select: { statut: true } },
      documents: { select: { id: true } },
    },
  });
  const resultat = appelsoffres.map((ao) => {
    const { candidatures, documents, ...infos } = ao;
    return {
      ...infos,
      _count: { candidatures: candidatures.length, documents: documents.length },
    };
  });
  return NextResponse.json(resultat);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide" }, { status: 400 });
  }

  const titre = typeof body.titre === "string" ? body.titre.trim() : "";
  if (!titre) {
    return NextResponse.json({ erreur: "Le titre est obligatoire" }, { status: 400 });
  }
  const statut = STATUTS_VALIDES.includes(String(body.statut)) ? String(body.statut) : "brouillon";

  let dateLimite: Date | null = null;
  if (typeof body.dateLimite === "string" && body.dateLimite.trim()) {
    const d = new Date(body.dateLimite);
    if (!Number.isNaN(d.getTime())) dateLimite = d;
  }

  try {
    const ao = await db.appelOffre.create({
      data: {
        titre,
        reference:
          typeof body.reference === "string" && body.reference.trim()
            ? body.reference.trim()
            : null,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null,
        dateLimite,
        statut,
      },
    });
    return NextResponse.json(ao, { status: 201 });
  } catch {
    return NextResponse.json(
      { erreur: "Un appel d'offres portant ce titre existe déjà" },
      { status: 409 }
    );
  }
}