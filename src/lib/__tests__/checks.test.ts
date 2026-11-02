import { describe, expect, it } from "vitest";
import type { LayerResult } from "../analyzers/types";
import { evaluateChecks } from "../checks";

const layer = (name: LayerResult["layer"], signals: [string, number][] = [], status: LayerResult["status"] = "ok"): LayerResult => ({
  layer: name,
  status,
  ms: 1,
  signals: signals.map(([id, weight]) => ({ layer: name, id, weight, severity: "info" })),
});

describe("evaluateChecks", () => {
  const groups = evaluateChecks([
    layer("lexical", [["ip_host", 2.2], ["ml_domain", -1.1]]),
    layer("brand"),
    { ...layer("network", [["tls_valid", -0.5]]), data: { resolves: true, tls: {} } },
    { ...layer("reputation"), data: { ageDays: null } },
    layer("page", [["tech_new_trick", 1]]),
    layer("ai", [], "skipped"),
  ]);
  const row = (layer: string, id: string) => groups.find((g) => g.layer === layer)!.rows.find((r) => r.id === id)!;

  it("marks findings, passed checks and trust signals", () => {
    expect(row("lexical", "ip").status).toBe("risk");
    expect(row("lexical", "at").status).toBe("pass");
    expect(row("lexical", "model").status).toBe("trust");
    expect(row("network", "tls").status).toBe("trust");
  });
  it("says a trust-only check does not apply instead of passing it", () => {
    expect(row("brand", "official").status).toBe("none");
  });
  it("marks checks of layers that did not run", () => {
    expect(row("ai", "ai").status).toBe("skipped");
    expect(row("reputation", "age").status).toBe("skipped");
    expect(row("reputation", "hold").status).toBe("pass");
  });
  it("keeps findings that are not in the catalogue", () => {
    expect(row("page", "tech_new_trick").status).toBe("risk");
  });
});
