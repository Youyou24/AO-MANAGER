import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const entreprises = await db.entreprise.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      evaluations: { select: { critereId: true, note: true } },
      _count: { select: { documents: true } },
    },
  });
  return NextResponse.json(entreprises);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide" }, { status: 400 });
  }

  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  if (!nom) {
    return NextResponse.json({ erreur: "Le nom est obligatoire" }, { status: 400 });
  }

  try {
    const entreprise = await db.entreprise.create({
      data: {
        nom,
        secteur: typeof body.secteur === "string" && body.secteur.trim() ? body.secteur.trim() : null,
        contact: typeof body.contact === "string" && body.contact.trim() ? body.contact.trim() : null,
        email: typeof body.email === "string" && body.email.trim() ? body.email.trim() : null,
        telephone:
          typeof body.telephone === "string" && body.telephone.trim() ? body.telephone.trim() : null,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null,
      },
    });
    return NextResponse.json(entreprise, { status: 201 });
  } catch {
    return NextResponse.json(
      { erreur: "Une entreprise portant ce nom existe déjà" },
      { status: 409 }
    );
  }
}
