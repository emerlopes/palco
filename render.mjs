#!/usr/bin/env node
// Render do deck: vídeo MP4, PNG de slide único e conferência visual. Mesmo deck.json da apresentação.
//
//   node render.mjs <deck.json> --check                     → out/check/ (quadros, contact.png, avisos, determinismo)
//   node render.mjs <deck.json> --png [--slides 2,3] [--scale 2]   → out/slide-NN.png (estado final)
//   node render.mjs <deck.json> --video --draft             → out/video-draft.mp4 (30 fps, 960×540, rápido)
//   node render.mjs <deck.json> --video                     → out/video.mp4 (1920×1080, 60 fps, motion blur)
//   opções de vídeo: --from s --to s (trecho), --mudo (sem trilha), --out arquivo.mp4, --workers N
//   opção comum: --theme nome
//
// Playwright (Chromium headless) chama palco.frame(T) quadro a quadro e manda PNG ao ffmpeg por pipe.
// Tudo local: o deck abre de file:// e não acessa a rede.
import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { buildDeck } from "./build-deck.mjs";
import { renderScore } from "./lib/audio/score.mjs";
import { master, lufs } from "./lib/audio/master.mjs";

const W = 1920;
const H = 1080;

const argv = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : argv[i + 1];
};
const flag = (name) => argv.includes(`--${name}`);
const VALUE_OPTS = ["from", "to", "out", "workers", "theme", "slides", "scale"];
const deckFile = argv.find((a, i) => !a.startsWith("--") && !(i > 0 && VALUE_OPTS.includes(argv[i - 1].slice(2))));

function usage(msg) {
  console.error((msg ? "Erro: " + msg + "\n" : "") + "uso: node render.mjs <deck.json> --check | --png | --video [--draft]");
  process.exit(1);
}
if (!deckFile) usage("informe o deck.json");
const mode = ["check", "png", "video"].filter(flag);
if (mode.length !== 1) usage("escolha um modo: --check, --png ou --video");

let built;
try {
  built = buildDeck(deckFile, { theme: opt("theme") });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
const OUT = path.join(path.dirname(built.out), "out");
fs.mkdirSync(OUT, { recursive: true });
const URL_RENDER = pathToFileURL(built.out).href + "?render";

const browser = await chromium.launch({ args: ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb"] });
const pageErrors = [];

async function openPage(scale = 1) {
  const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: scale });
  const page = await context.newPage();
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("console", (m) => m.type() === "error" && pageErrors.push(m.text()));
  await page.goto(URL_RENDER);
  await page.evaluate(() => window.palco.ready);
  const client = await context.newCDPSession(page);
  return { context, page, client };
}

async function shot(p) {
  const { data } = await p.client.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
  return Buffer.from(data, "base64");
}
const seekSettled = (p, i) => p.page.evaluate((i) => window.palco.seek(i, window.palco.duration(i) + 2), i);
const sha = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

function ffmpeg(args) {
  const proc = spawn("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((ok, fail) => proc.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg saiu com ${code}`)))));
  return { proc, done };
}
async function write(proc, buf) {
  if (!proc.stdin.write(buf)) await new Promise((ok) => proc.stdin.once("drain", ok));
}
const COLOR = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"];
const pad2 = (n) => String(n).padStart(2, "0");

// ---------------------------------------------------------------- --check
async function check() {
  const dir = path.join(OUT, "check");
  fs.mkdirSync(dir, { recursive: true });
  for (const f of fs.readdirSync(dir)) if (f.endsWith(".png")) fs.rmSync(path.join(dir, f));
  const p = await openPage(0.5);
  const n = await p.page.evaluate(() => window.palco.count);
  const times = [0.5, 1.2, "final"];
  for (let i = 0; i < n; i++) {
    for (const [k, t] of times.entries()) {
      if (t === "final") await seekSettled(p, i);
      else await p.page.evaluate(([i, t]) => window.palco.seek(i, t), [i, t]);
      fs.writeFileSync(path.join(dir, `s${pad2(i + 1)}-${k}.png`), await shot(p));
    }
  }
  const warnings = await p.page.evaluate(() => window.palco.warnings);
  const tl = await p.page.evaluate(() => window.palco.timeline());
  // Folha de contato: uma linha por slide, colunas = instantes (0,5 s · 1,2 s · final).
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-pattern_type", "glob", "-i", path.join(dir, "s*.png"), "-vf", `scale=640:-1,tile=3x${n}:padding=8:color=white`, "-frames:v", "1", path.join(dir, "contact.png")]);

  // Determinismo: o mesmo instante do vídeo (meio da primeira transição) em duas páginas novas.
  const T = tl.slots.length > 1 ? tl.slots[1].start + 0.3 : 1;
  const hashes = [];
  for (let k = 0; k < 2; k++) {
    const q = await openPage(1);
    await q.page.evaluate((T) => window.palco.frame(T), T);
    hashes.push(sha(await shot(q)));
    await q.context.close();
  }
  await p.context.close();

  console.log(`slides: ${n} · vídeo: ${tl.total.toFixed(1)} s`);
  console.log(`folha de contato: ${path.relative(process.cwd(), path.join(dir, "contact.png"))}`);
  console.log(`avisos de layout: ${warnings.length ? "\n  - " + warnings.join("\n  - ") : "nenhum"}`);
  console.log(`erros na página: ${pageErrors.length ? "\n  - " + pageErrors.join("\n  - ") : "nenhum"}`);
  console.log(`determinismo (T=${T.toFixed(2)} s): ${hashes[0] === hashes[1] ? "ok" : "FALHOU"} ${hashes[0].slice(0, 12)}`);
  return warnings.length || pageErrors.length || hashes[0] !== hashes[1] ? 1 : 0;
}

// ---------------------------------------------------------------- --png
async function png() {
  const scale = Number(opt("scale", "1"));
  if (![1, 2].includes(scale)) usage("--scale aceita 1 (1920×1080) ou 2 (3840×2160)");
  const p = await openPage(scale);
  const n = await p.page.evaluate(() => window.palco.count);
  const list = opt("slides") ? opt("slides").split(",").map(Number) : Array.from({ length: n }, (_, i) => i + 1);
  for (const s of list) if (!(s >= 1 && s <= n)) usage(`--slides: o deck tem ${n} slides`);
  // Imagem parada: sem os pacotes (ficariam parados no meio da seta).
  await p.page.evaluate(() => document.documentElement.classList.add("is-still"));
  for (const s of list) {
    await seekSettled(p, s - 1);
    const file = path.join(OUT, `slide-${pad2(s)}.png`);
    fs.writeFileSync(file, await shot(p));
    console.log(path.relative(process.cwd(), file));
  }
  await p.context.close();
  return pageErrors.length ? 1 : 0;
}

// ---------------------------------------------------------------- --video
async function video() {
  const draft = flag("draft");
  const fps = draft ? 30 : 60;
  const sub = draft ? 1 : 4; // subquadros misturados (motion blur)
  const probe = await openPage(1);
  const tl = await probe.page.evaluate(() => window.palco.timeline());
  await probe.context.close();
  const from = Number(opt("from", "0"));
  const to = Math.min(tl.total, Number(opt("to", String(tl.total))));
  if (!(to > from)) usage("--from precisa ser menor que --to");
  const out = path.resolve(opt("out", path.join(OUT, draft ? "video-draft.mp4" : "video.mp4")));

  const music = !flag("mudo") && (built.deck.video?.music ?? "nenhuma") !== "nenhuma";
  let audio = null;
  if (music) {
    const mix = path.join(OUT, "audio-mix.wav");
    audio = path.join(OUT, "audio.wav");
    renderScore(tl, mix, built.deck.video?.bpm ?? 120);
    const measured = master(mix, audio);
    fs.rmSync(mix);
    console.log(`trilha: ${tl.total.toFixed(1)} s, ${measured.toFixed(1)} LUFS`);
  }

  const first = Math.round(from * fps);
  const last = Math.round(to * fps);
  const workers = Number(opt("workers", String(Math.max(2, Math.min(6, Math.floor(os.cpus().length / 2))))));
  const per = Math.ceil((last - first) / workers);
  const tmp = path.join(OUT, `.seg-${process.pid}`);
  fs.mkdirSync(tmp, { recursive: true });
  const started = Date.now();
  let doneFrames = 0;

  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const a = first + w * per;
    const b = Math.min(last, a + per);
    if (a >= b) continue;
    jobs.push(
      (async () => {
        const p = await openPage(1);
        const seg = path.join(tmp, `${pad2(w)}.mp4`);
        const blur = sub > 1 ? `tmix=frames=${sub},select='eq(mod(n\\,${sub})\\,${sub - 1})',setpts=N/(${fps}*TB),` : "";
        const size = draft ? "scale=960:540:flags=bicubic," : "";
        const ff = ffmpeg([
          "-f", "image2pipe", "-framerate", String(fps * sub), "-i", "-",
          "-vf", `${blur}${size}scale=out_color_matrix=bt709:out_range=tv:flags=bicubic,format=yuv420p`,
          "-r", String(fps), "-c:v", "libx264", "-preset", draft ? "veryfast" : "slow", "-crf", draft ? "22" : "16",
          "-threads", "2", ...COLOR, seg,
        ]);
        for (let n = a; n < b; n++) {
          for (let j = 0; j < sub; j++) {
            const t = sub > 1 ? (n + (j - (sub - 1) / 2) / sub) / fps : n / fps;
            await p.page.evaluate((T) => window.palco.frame(T), Math.max(0, t));
            await write(ff.proc, await shot(p));
          }
          doneFrames++;
          if (doneFrames % 60 === 0) {
            const rate = doneFrames / ((Date.now() - started) / 1000);
            process.stdout.write(`\r${doneFrames}/${last - first} quadros · ${rate.toFixed(1)} q/s   `);
          }
        }
        ff.proc.stdin.end();
        await ff.done;
        await p.context.close();
        return seg;
      })(),
    );
  }
  const segs = (await Promise.all(jobs)).sort();
  fs.writeFileSync(path.join(tmp, "list.txt"), segs.map((s) => `file '${s}'`).join("\n"));
  const audioArgs = audio ? ["-ss", String(from), "-t", String(to - from), "-i", audio, "-map", "0:v", "-map", "1:a", "-c:a", "aac", "-b:a", "256k", "-ar", "48000", "-shortest"] : [];
  const mux = ffmpeg(["-f", "concat", "-safe", "0", "-i", path.join(tmp, "list.txt"), ...audioArgs, "-c:v", "copy", "-movflags", "+faststart", out]);
  mux.proc.stdin.end();
  await mux.done;
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${path.relative(process.cwd(), out)} · ${(to - from).toFixed(1)} s · ${((Date.now() - started) / 1000).toFixed(0)} s de render`);
  if (audio) console.log(`loudness no MP4: ${lufs(out).toFixed(1)} LUFS`);
  if (pageErrors.length) console.log("erros na página:\n  - " + pageErrors.join("\n  - "));
  return pageErrors.length ? 1 : 0;
}

let code = 1;
try {
  code = await { check, png, video }[mode[0]]();
} finally {
  await browser.close();
}
process.exit(code);
