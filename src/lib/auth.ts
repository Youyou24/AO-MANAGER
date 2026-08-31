import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_NOM = "ao_session";

export const AUTH_SECRET = process.env.AUTH_SECRET ?? "";
export const AUTH_PASSWORD = process.env.AUTH_PASSWORD ?? "";

const DUREE_SESSION_MS = 30 * 24 * 60 * 60 * 1000;

function encU8(chaine: string): string {
  return Buffer.from(chaine, "utf8").toString("base64url");
}

function decU8(chaine: string): string {
  return Buffer.from(chaine, "base64url").toString("utf8");
}

function signer(corps: string): string {
  return createHmac("sha256", AUTH_SECRET).update(corps).digest("base64url");
}

export function creerJeton(): string {
  const corps = encU8(JSON.stringify({ exp: Date.now() + DUREE_SESSION_MS }));
  return `${corps}.${signer(corps)}`;
}

export function verifierJeton(jeton: string | undefined): boolean {
  if (!jeton || !AUTH_SECRET) return false;
  const point = jeton.indexOf(".");
  if (point <= 0) return false;
  const corps = jeton.slice(0, point);
  const signature = jeton.slice(point + 1);
  const attendue = signer(corps);
  const sigRecue = Buffer.from(signature);
  const sigAttendue = Buffer.from(attendue);
  if (sigRecue.length !== sigAttendue.length) return false;
  if (!timingSafeEqual(sigRecue, sigAttendue)) return false;
  try {
    const donnees = JSON.parse(decU8(corps)) as { exp: unknown };
    return typeof donnees.exp === "number" && donnees.exp > Date.now();
  } catch {
    return false;
  }
}

export const OPTIONS_COOKIE = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: 30 * 24 * 60 * 60,
};