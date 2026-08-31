import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function PUT(request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

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
    const critere = await db.critere.update({
      where: { id },
      data: {
        nom,
        maxPoints,
        description:
          typeof body.description === "string" && body.description.trim()
            ? body.description.trim()
            : null,
      },
    });
    return NextResponse.json(critere);
  } catch {
    return NextResponse.json(
      { erreur: "Impossible de mettre à jour (nom déjà utilisé ?)" },
      { status: 409 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

  await db.critere.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
