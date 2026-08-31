import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NOM, verifierJeton } from "@/lib/auth";

export function proxy(requete: NextRequest) {
  const { pathname } = requete.nextUrl;
  const jeton = requete.cookies.get(COOKIE_NOM)?.value;

  if (verifierJeton(jeton)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ erreur: "Non authentifié" }, { status: 401 });
  }

  const url = new URL("/connexion", requete.url);
  if (pathname !== "/") url.searchParams.set("retour", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!api/auth|connexion|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|ico|jpg|jpeg|webp|txt)$).*)",
  ],
};