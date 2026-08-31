import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { db } from "@/lib/db";
import { cheminDocument } from "@/lib/stockage";
import { STATUTS_AO } from "@/lib/statuts";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

const STATUTS_VALIDES: string[] = STATUTS_AO.map((s) => s.valeur);

export async function GET(_request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

  const ao = await db.appelOffre.findUnique({
    where: { id },
    include: {
      candidatures: {
        orderBy: { createdAt: "asc" },
        include: { entreprise: true },
      },
      _count: { select: { candidatures: true } },
    },
  });
  if (!ao) return NextResponse.json({ erreur: "Appel d'offres introuvable" }, { status: 404 });

  const [evaluations, documents] = await Promise.all([
    db.evaluation.findMany({
      where: { appelOffreId: id },
      select: { entrepriseId: true, critereId: true, note: true, commentaire: true },
    }),
    db.document.findMany({
      where: { appelOffreId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        nomFichier: true,
        tailleOctets: true,
        typeMime: true,
        categorie: true,
        createdAt: true,
        entrepriseId: true,
      },
    }),
  ]);

  const { candidatures, ...infos } = ao;
  const candidaturesEnrichies = candidatures.map((c) => ({
    ...c,
    evaluations: evaluations.filter((e) => e.entrepriseId === c.entrepriseId),
    documents: documents.filter((d) => d.entrepriseId === c.entrepriseId),
  }));
  return NextResponse.json({
    ...infos,
    _count: { candidatures: candidatures.length, documents: documents.length },
    candidatures: candidaturesEnrichies,
  });
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
    const ao = await db.appelOffre.update({
      where: { id },
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
    return NextResponse.json(ao);
  } catch {
    return NextResponse.json(
      { erreur: "Impossible de mettre à jour (titre déjà utilisé ?)" },
      { status: 409 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

  const documents = await db.document.findMany({
    where: { appelOffreId: id },
    select: { cheminStocke: true },
  });

  await db.appelOffre.delete({ where: { id } });

  for (const doc of documents) {
    await unlink(cheminDocument(doc.cheminStocke)).catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}