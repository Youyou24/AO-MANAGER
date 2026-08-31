import {
  classesNoteTechnique,
  classesScoreGlobal,
  formatterNombre,
} from "@/lib/score";

export function ScoreBadge({
  nt,
  nf,
  ng,
  elimine,
  taille = "sm",
}: {
  nt: number | null;
  nf: number | null;
  ng: number | null;
  elimine: boolean;
  taille?: "sm" | "lg";
}) {
  const padding = taille === "lg" ? "px-4 py-2 text-xl" : "px-2.5 py-1 text-sm";

  return (
    <div className="text-right">
      {ng != null ? (
        <span
          className={`inline-flex items-center rounded-lg font-mono font-semibold ${padding} ${classesScoreGlobal(ng)}`}
        >
          {formatterNombre(ng)} / 200
        </span>
      ) : (
        <span
          className={`inline-flex items-center rounded-lg font-mono ${padding} bg-zinc-700/50 text-zinc-400 ring-1 ring-inset ring-zinc-600`}
        >
          —
        </span>
      )}
      {taille === "lg" && (
        <div className="mt-1 flex flex-col items-end gap-0.5 text-xs text-slate-400">
          <span>Nt {nt != null ? formatterNombre(nt) : "—"} / 110</span>
          <span>Nf {nf != null ? formatterNombre(nf) : "—"} / 90</span>
          {elimine && (
            <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-medium text-red-400 ring-1 ring-inset ring-red-500/30">
              Éliminé (Nt &lt; 70)
            </span>
          )}
        </div>
      )}
      <span
        className={`hidden rounded-full px-2 py-0.5 font-mono text-[11px] ${classesNoteTechnique(nt)}`}
      >
        Nt {formatterNombre(nt)}
      </span>
    </div>
  );
}
