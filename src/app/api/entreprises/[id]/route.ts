import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

  const entreprise = await db.entreprise.findUnique({
    where: { id },
    include: { documents: { orderBy: { createdAt: "desc" } }, evaluations: true },
  });
  if (!entreprise)
    return NextResponse.json({ erreur: "Entreprise introuvable" }, { status: 404 });

  return NextResponse.json(entreprise);
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
  if (!nom) {
    return NextResponse.json({ erreur: "Le nom est obligatoire" }, { status: 400 });
  }

  try {
    const entreprise = await db.entreprise.update({
      where: { id },
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
    return NextResponse.json(entreprise);
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

  await db.entreprise.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
