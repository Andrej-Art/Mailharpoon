// Renders scene.html to an MP4 with a German voice-over and simple sound effects.
// Usage: node promo/short/render.mjs [--stills 2,8,14] [--out promo/short/out/short.mp4]
// Needs Google Chrome and an ffmpeg binary (FFMPEG env var, or ffmpeg on PATH); the voice is
// macOS `say` with the German voice "Anna".
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
const FFMPEG = process.env.FFMPEG || "ffmpeg";
const FPS = 30, DURATION = 36;
const out = resolve(opt("--out", join(here, "out", "short.mp4")));
const work = join(here, "out", "work");
mkdirSync(work, { recursive: true });

// Voice-over lines and when they start (seconds).
const VO = [
  [0.4, "Sie lauern überall. In Ihrem Postfach und in Ihren SMS."],
  [5.3, "Eine angebliche Paketgebühr. Ein gesperrtes Konto. Eine Bank, die keine ist."],
  [11.8, "Aber nicht mit dem Captain."],
  [17.4, "Mailharpoon prüft verdächtige Links, Nachrichten und sogar Screenshots in Sekunden."],
  [25.4, "Erst prüfen, dann klicken."],
  [31.6, "Mailharpoon punkt com. Kostenlos und ohne Anmeldung."],
];

// Sound effects as ffmpeg lavfi sources: [start, source].
const thunder = "anoisesrc=color=brown:duration=2.5:amplitude=1,lowpass=f=300,afade=t=in:d=0.05,afade=t=out:st=0.3:d=2.2,volume=2.2";
const whoosh = "anoisesrc=color=pink:duration=0.5:amplitude=0.8,bandpass=f=1400:width_type=h:w=1800,afade=t=in:d=0.25,afade=t=out:st=0.25:d=0.25";
const thud = "sine=frequency=65:duration=0.4,afade=t=out:st=0:d=0.4,volume=2.5";
const pop = "anoisesrc=color=white:duration=0.18:amplitude=0.7,highpass=f=1800,afade=t=out:st=0:d=0.18";
const ding = "sine=frequency=1320:duration=0.7,afade=t=out:st=0:d=0.7,volume=0.6";
const SFX = [
  [11.05, thunder], [11.5, thunder],
  ...[17.6, 19.3, 21.0].flatMap((at) => [[at, whoosh], [at + 0.45, thud], [at + 0.8, pop]]),
  [23.4, ding], [27.4, thud], [31.1, whoosh],
];
// Ocean bed for the whole short and a slow drum pulse while the captain is on stage.
const ocean = `anoisesrc=color=pink:duration=${DURATION}:amplitude=0.5,lowpass=f=600,volume='0.5+0.35*sin(2*PI*t/5)':eval=frame,volume=0.5`;
const drums = "sine=frequency=55:duration=0.22,afade=t=out:st=0:d=0.22,apad=whole_dur=0.5,aloop=loop=39:size=24000,volume=1.6";

async function frames(times, onFrame) {
  const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--allow-file-access-from-files"] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });
  await page.goto("file://" + join(here, "scene.html"), { waitUntil: "networkidle0" });
  await page.evaluate(() => window.ready);
  for (const t of times) await onFrame(t, Buffer.from(await page.evaluate((t) => window.frame(t), t), "base64"));
  await browser.close();
}

const stills = opt("--stills");
if (stills) {
  await frames(stills.split(",").map(Number), async (t, jpg) => writeFileSync(join(work, `still-${t}.jpg`), jpg));
  console.log("stills written to", work);
  process.exit(0);
}

// 1) Video: frames are piped straight into ffmpeg, nothing large touches the disk.
const video = join(work, "video.mp4");
const enc = spawn(FFMPEG, ["-y", "-f", "image2pipe", "-c:v", "mjpeg", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20", video], { stdio: ["pipe", "ignore", "inherit"] });
const total = FPS * DURATION;
const times = Array.from({ length: total }, (_, i) => i / FPS);
let n = 0;
await frames(times, async (_t, jpg) => {
  if (!enc.stdin.write(jpg)) await new Promise((r) => enc.stdin.once("drain", r));
  if (++n % 90 === 0) console.log(`frame ${n}/${total}`);
});
enc.stdin.end();
await new Promise((r) => enc.on("close", r));

// 2) Voice-over clips.
const voFiles = VO.map(([, text], i) => {
  const f = join(work, `vo${i}.aiff`);
  execFileSync("say", ["-v", "Anna", "-r", "175", "-o", f, text]);
  return f;
});

// 3) Mix voice, effects, ocean and drums, then put it under the video.
const filters = [], labels = [];
const argsIn = ["-i", video];
let idx = 1;
const push = (spec, start, gain) => {
  if (spec.lavfi) argsIn.push("-f", "lavfi", "-i", spec.lavfi);
  else argsIn.push("-i", spec.file);
  const ms = Math.round(start * 1000);
  filters.push(`[${idx}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${gain},adelay=${ms}|${ms}[a${idx}]`);
  labels.push(`[a${idx}]`);
  idx++;
};
VO.forEach(([start], i) => push({ file: voFiles[i] }, start, 1.8));
SFX.forEach(([start, src]) => push({ lavfi: src }, start, 0.9));
push({ lavfi: ocean }, 0, 0.6);
push({ lavfi: drums }, 11.2, 0.5);
filters.push(`${labels.join("")}amix=inputs=${labels.length}:normalize=0:duration=longest,alimiter=limit=0.9,atrim=0:${DURATION}[aout]`);
mkdirSync(dirname(out), { recursive: true });
execFileSync(FFMPEG, ["-y", ...argsIn, "-filter_complex", filters.join(";"), "-map", "0:v", "-map", "[aout]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", out], { stdio: ["ignore", "ignore", "inherit"] });
console.log("done:", out);
