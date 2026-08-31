import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const criteres = await db.critere.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(criteres);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide" }, { status: 400 });
  }

  const nom = typeof body.nom === "string" ? body.nom.trim() : "";
  const maxPoints = Number(body.maxPoints);

  if (!nom) {
    return NextResponse.json({ erreur: "Le nom du critère est obligatoire" }, { status: 400 });
  }
  if (!Number.isFinite(maxPoints) || maxPoints <= 0 || maxPoints > 110) {
    return NextResponse.json(
      { erreur: "Le nombre de points doit être compris entre 0 et 110" },
      { status: 400 }
    );
  }

  try {
    const critere = await db.critere.create({
      data: {
        nom,
        maxPoints,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null,
      },
    });
    return NextResponse.json(critere, { status: 201 });
  } catch {
    return NextResponse.json(
      { erreur: "Un critère portant ce nom existe déjà" },
      { status: 409 }
    );
  }
}
