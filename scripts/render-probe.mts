// Dev helper: render one URL and print what the rendered check found.
// Usage: npx tsx scripts/render-probe.mts <url>
import { writeFileSync } from "node:fs";
import { analyzePage } from "../src/lib/analyzers/page";
import { analyzeRender } from "../src/lib/analyzers/render";
import { parseTarget } from "../src/lib/analyzers/url";

const t = parseTarget(process.argv[2]);
const page = await analyzePage(t);
const r = await analyzeRender(t, page);
const { screenshot, page: rp, ...rest } = r.data ?? ({} as never);
console.log(JSON.stringify({ status: r.status, note: r.note, ms: r.ms, ...rest, forms: rp?.forms, signals: r.signals.map((s) => `${s.id} ${s.weight} ${JSON.stringify(s.params ?? {})}`) }, null, 2));
if (screenshot && process.argv[3]) writeFileSync(process.argv[3], Buffer.from(screenshot.split(",")[1], "base64"));
process.exit(0);
