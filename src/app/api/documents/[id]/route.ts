import { readFile, unlink } from "node:fs/promises";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cheminDocument } from "@/lib/stockage";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

  const document = await db.document.findUnique({ where: { id } });
  if (!document)
    return NextResponse.json({ erreur: "Document introuvable" }, { status: 404 });

  let contenu: Buffer;
  try {
    contenu = await readFile(cheminDocument(document.cheminStocke));
  } catch {
    return NextResponse.json({ erreur: "Fichier manquant sur le disque" }, { status: 410 });
  }

  const telecharger = new URL(request.url).searchParams.get("telecharger") === "1";
  const nomUtf8 = encodeURIComponent(document.nomFichier);

  return new Response(new Blob([new Uint8Array(contenu)]), {
    headers: {
      "Content-Type": document.typeMime ?? "application/octet-stream",
      "Content-Disposition": `${telecharger ? "attachment" : "inline"}; filename*=UTF-8''${nomUtf8}`,
      "Content-Length": String(contenu.byteLength),
    },
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (!id) return NextResponse.json({ erreur: "Identifiant invalide" }, { status: 400 });

  const document = await db.document.findUnique({ where: { id } });
  if (!document)
    return NextResponse.json({ erreur: "Document introuvable" }, { status: 404 });

  await unlink(cheminDocument(document.cheminStocke)).catch(() => {});
  await db.document.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
