"use client";

import clsx from "clsx";
import type { IntelData } from "@/lib/analyzers/intel";
import type { Layer, LayerResult, Signal } from "@/lib/analyzers/types";
import { evaluateChecks, type CheckStatus } from "@/lib/checks";
import { fill, type Dict } from "@/i18n";
import { signalText } from "./Report";

// Shown only when they ran: not every link redirects, and the browser and brand check depend on the setup.
const ONLY_WHEN_RUN: Layer[] = ["render", "redirect", "visual"];

type RowStatus = CheckStatus | "pending";

interface Row {
  key: string;
  label: string;
  status: RowStatus;
  signals: Signal[];
}

const tone = (status: RowStatus, signals: Signal[]) =>
  status === "risk"
    ? Math.max(...signals.map((s) => s.weight)) >= 2
      ? "text-bad"
      : "text-warn"
    : status === "trust" || status === "pass"
      ? "text-ok"
      : status === "pending"
        ? "text-harpoon"
        : "text-dim";

/** Every check of a link scan with its outcome, like the technical report of Mailharpoon 1. */
export function CheckReport({ t, layers, done }: { t: Dict; layers: LayerResult[]; done: boolean }) {
  const c = t.checks;
  const byLayer = new Map(layers.map((l) => [l.layer, l]));
  const pending = (layer: Layer) => !done && !byLayer.has(layer);

  const intel = byLayer.get("intel")?.data as IntelData | undefined;
  const groups: { layer: Layer; rows: Row[] }[] = [
    {
      layer: "intel",
      rows: intel
        ? intel.sources.map((s) => ({
            key: s.name,
            label: fill(c.listed, { name: s.name }),
            status: s.status === "hit" ? "risk" : s.status === "clean" ? "pass" : "skipped",
            signals: s.status === "hit" ? (byLayer.get("intel")?.signals ?? []) : [],
          }))
        : [{ key: "intel", label: t.layerNames.intel, status: pending("intel") ? "pending" : "skipped", signals: [] }],
    },
    ...evaluateChecks(layers)
      .filter((g) => g.ran || !ONLY_WHEN_RUN.includes(g.layer) || (pending(g.layer) && g.layer === "render"))
      .map((g) => ({
        layer: g.layer,
        rows: g.rows.map((r) => ({
          key: r.id,
          label: c.items[r.id] ?? (r.signals[0] ? signalText(t, r.signals[0]) : r.id),
          status: (pending(g.layer) ? "pending" : r.status) as RowStatus,
          signals: r.signals,
        })),
      })),
  ];

  const rows = groups.flatMap((g) => g.rows).filter((r) => r.status !== "skipped" && r.status !== "pending");
  const label = (s: RowStatus) => (s === "pending" ? "…" : c.status[s]);

  return (
    <section className="tui mt-8" aria-labelledby="check-report">
      <h3 id="check-report" className="tui-title">
        {c.title}
      </h3>
      <p className="px-5 pt-7 text-sm text-muted sm:px-6">
        {done
          ? fill(c.lead, { total: rows.length, risk: rows.filter((r) => r.status === "risk").length, trust: rows.filter((r) => r.status === "trust").length })
          : c.running}
      </p>
      <div className="gap-x-8 p-5 sm:p-6 lg:columns-2">
        {groups.map((g) => (
          <div key={g.layer} className="mb-6 break-inside-avoid">
            <h4 className="label mb-2 border-b border-line pb-1.5 text-fg">{t.layerNames[g.layer]}</h4>
            <ul className="space-y-1.5 font-mono text-[12.5px]">
              {g.rows.map((r) => (
                <li key={r.key} className="grid grid-cols-[7.5rem_1fr] gap-2">
                  <span className={clsx("whitespace-nowrap", tone(r.status, r.signals))}>[{label(r.status)}]</span>
                  <span className={r.status === "skipped" || r.status === "none" ? "text-dim" : "text-fg"}>
                    {r.label}
                    {(r.status === "risk" || r.status === "trust") &&
                      r.signals.map((s, i) => (
                        <span key={`${s.id}-${i}`} className="mt-0.5 block font-sans text-[12.5px] leading-snug text-muted">
                          {signalText(t, s)}
                        </span>
                      ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
