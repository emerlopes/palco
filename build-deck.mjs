#!/usr/bin/env node
// Gera um deck.html autossuficiente (fontes, estilos, script e dados embutidos) a partir de um deck.json.
//
//   node build-deck.mjs <deck.json> [--theme claro] [--out caminho/deck.html]
//
// Sem dependências e sem rede: o HTML abre direto do disco (file://), offline.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateDeck, validateTheme } from "./lib/validate.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// Ordem importa: cada arquivo só usa o que veio antes.
const SCRIPTS = [
  "lib/motion.js",
  "lib/icons.js",
  "lib/dom.js",
  "lib/format.js",
  "lib/components/header.js",
  "lib/components/title.js",
  "lib/components/kpi.js",
  "lib/components/diagram.js",
  "lib/components/timeline.js",
  "lib/runtime.js",
];

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--theme") args.theme = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else args._.push(argv[i]);
  }
  return args;
}

/** Erro de build com a lista de problemas (o CLI imprime; o render.mjs repassa). */
export class BuildError extends Error {
  constructor(lines) {
    super(["Erro:", ...lines.map((l) => "  - " + l)].join("\n"));
    this.lines = lines;
  }
}

function fail(lines) {
  throw new BuildError(lines);
}

function readJson(file, what) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    fail([`não consegui ler ${what} ${file}: ${e.message}`]);
  }
}

/** Junta os módulos em um script só: remove import/export (os nomes são únicos entre arquivos). */
function bundle() {
  const parts = SCRIPTS.map((rel) => {
    const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
    return `// ---- ${rel}\n` + src.replace(/^import[^;]+;\s*$/gm, "").replace(/^export (?=const|function|let|class)/gm, "");
  });
  return `(() => {\n"use strict";\n${parts.join("\n")}\n})();`;
}

function themeCss(theme) {
  const faces = theme.font.files
    .map((f) => {
      const data = fs.readFileSync(path.join(ROOT, f.file)).toString("base64");
      return `@font-face{font-family:"${theme.font.family}";font-style:normal;font-weight:${f.weight};font-display:block;src:url(data:font/woff2;base64,${data}) format("woff2");unicode-range:${f.unicodeRange};}`;
    })
    .join("\n");
  const vars = Object.entries(theme.colors)
    .map(([k, v]) => `--c-${k}:${v};`)
    .join("");
  return `${faces}\n:root{--font:"${theme.font.family}";${vars}}`;
}

/** JSON seguro dentro de <script>. */
const safeJson = (obj) =>
  JSON.stringify(obj)
    .replace(/</g, "\\u003c")
    .replace(/[\u2028\u2029]/g, (c) => "\\u" + c.charCodeAt(0).toString(16));

const escHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Gera o deck.html e retorna { out, deck, theme }. Lança BuildError se o deck ou o tema forem inválidos. */
export function buildDeck(deckFile, opts = {}) {
  const deckPath = path.resolve(deckFile);
  const deck = readJson(deckPath, "o deck");
  const errors = validateDeck(deck);
  if (errors.length) fail(errors);

  const themeName = opts.theme ?? deck.theme ?? "claro";
  if (!/^[\w-]+$/.test(themeName)) fail([`nome de tema inválido: ${themeName}`]);
  const themeFile = [path.join(ROOT, "themes", `${themeName}.json`), path.join(ROOT, "themes", "local", `${themeName}.json`)].find((f) =>
    fs.existsSync(f),
  );
  if (!themeFile) fail([`tema "${themeName}" não encontrado em themes/ nem em themes/local/`]);
  const theme = readJson(themeFile, "o tema");
  const themeErrors = validateTheme(theme, (f) => fs.existsSync(path.join(ROOT, f)));
  if (themeErrors.length) fail(themeErrors);

  const css = themeCss(theme) + "\n" + fs.readFileSync(path.join(ROOT, "lib/deck.css"), "utf8");
  const presenterCss = fs.readFileSync(path.join(ROOT, "lib/presenter.css"), "utf8");
  const title = deck.title.replace(/\[\[(.+?)\]\]/g, "$1");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="palco">
<title>${escHtml(title)}</title>
<style>
${css}
</style>
<style id="presenter-css" media="not all">
${presenterCss}
</style>
</head>
<body>
<main class="stage" aria-label="${escHtml(title)}"></main>
<div class="sr-live" aria-live="polite"></div>
<div class="hint">→ avançar · ← voltar · F tela cheia · P apresentador · R repetir</div>
<script type="application/json" id="deck-data">${safeJson(deck)}</script>
<script>
${bundle()}
</script>
</body>
</html>
`;
  const out = path.resolve(opts.out ?? path.join(path.dirname(deckPath), "deck.html"));
  fs.writeFileSync(out, html);
  return { out, deck, theme: themeName, size: html.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = parseArgs(process.argv.slice(2));
  try {
    if (args._.length !== 1) fail(["uso: node build-deck.mjs <deck.json> [--theme claro] [--out deck.html]"]);
    const r = buildDeck(args._[0], { theme: args.theme, out: args.out });
    console.log(`ok: ${path.relative(process.cwd(), r.out)} (${r.deck.slides.length} slides, tema ${r.theme}, ${(r.size / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
