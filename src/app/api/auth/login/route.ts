import { NextResponse } from "next/server";
import { AUTH_PASSWORD, COOKIE_NOM, creerJeton, OPTIONS_COOKIE } from "@/lib/auth";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erreur: "Corps de requête invalide" }, { status: 400 });
  }

  const motDePasse = typeof body.motDePasse === "string" ? body.motDePasse : "";
  if (!AUTH_PASSWORD || motDePasse !== AUTH_PASSWORD) {
    return NextResponse.json({ erreur: "Mot de passe incorrect" }, { status: 401 });
  }

  const reponse = NextResponse.json({ ok: true });
  reponse.cookies.set(COOKIE_NOM, creerJeton(), OPTIONS_COOKIE);
  return reponse;
}