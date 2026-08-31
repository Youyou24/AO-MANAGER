import { NextResponse } from "next/server";
import { COOKIE_NOM } from "@/lib/auth";

export async function POST() {
  const reponse = NextResponse.json({ ok: true });
  reponse.cookies.delete(COOKIE_NOM);
  return reponse;
}