"use client";

import { useRouter } from "next/navigation";

export function BoutonDeconnexion() {
  const router = useRouter();

  async function deconnecter() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/connexion");
    router.refresh();
  }

  return (
    <button
      onClick={deconnecter}
      className="rounded-md px-3 py-1.5 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
    >
      Déconnexion
    </button>
  );
}