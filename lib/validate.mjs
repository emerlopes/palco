// Validação do deck.json e do tema, com mensagens em pt-BR apontando o caminho do erro.
// Roda no build (Node); o runtime confia no que passou por aqui.
import { ICONS } from "./icons.js";

const TYPES = ["title", "kpi", "diagram", "timeline"];
const FORMATS = ["int", "decimal", "pct", "ms", "brl"];
const STATUSES = ["done", "doing", "risk", "next"];

const isStr = (v) => typeof v === "string" && v.trim() !== "";
const isNum = (v) => typeof v === "number" && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);

export function validateDeck(deck) {
  const err = [];
  const need = (cond, msg) => {
    if (!cond) err.push(msg);
    return cond;
  };
  if (!need(deck && typeof deck === "object", "o deck precisa ser um objeto JSON")) return err;
  need(isStr(deck.title), "deck.title: obrigatório (texto)");
  if (deck.footer != null) need(isStr(deck.footer), "deck.footer: precisa ser texto");
  if (!need(Array.isArray(deck.slides) && deck.slides.length > 0, "deck.slides: lista com pelo menos 1 slide")) return err;

  deck.slides.forEach((s, i) => {
    const at = `slides[${i}]`;
    if (!need(s && TYPES.includes(s.type), `${at}.type: use ${TYPES.join(", ")}`)) return;
    need(isStr(s.title), `${at}.title: obrigatório`);
    if (s.notes != null) need(typeof s.notes === "string", `${at}.notes: precisa ser texto`);
    if (isStr(s.title)) {
      const words = s.title.replace(/\[\[|\]\]/g, "").split(/\s+/).filter(Boolean).length;
      need(words <= (s.type === "title" ? 10 : 14), `${at}.title: ${words} palavras; corte para no máximo ${s.type === "title" ? 10 : 14}`);
      need((s.title.match(/\[\[/g) ?? []).length <= 1, `${at}.title: no máximo um [[destaque]]`);
    }
    const v = { kpi: kpi, diagram: diagram, timeline: timeline }[s.type];
    if (v) v(s, at, need);
  });
  return err;
}

function kpi(s, at, need) {
  if (!need(Array.isArray(s.items) && s.items.length >= 1 && s.items.length <= 6, `${at}.items: de 1 a 6 indicadores`)) return;
  s.items.forEach((it, j) => {
    const p = `${at}.items[${j}]`;
    need(isStr(it.label), `${p}.label: obrigatório`);
    need(isNum(it.value), `${p}.value: número obrigatório`);
    if (it.format != null) need(FORMATS.includes(it.format), `${p}.format: use ${FORMATS.join(", ")}`);
    if (it.format === "brl") need(isInt(it.value), `${p}.value: em brl o valor é em centavos inteiros`);
    if (it.prev != null) need(isNum(it.prev), `${p}.prev: precisa ser número`);
    if (it.goal != null) need(isNum(it.goal), `${p}.goal: precisa ser número`);
    if (it.better != null) need(["up", "down"].includes(it.better), `${p}.better: use up ou down`);
    if (it.decimals != null) need(isInt(it.decimals) && it.decimals >= 0 && it.decimals <= 3, `${p}.decimals: inteiro de 0 a 3`);
  });
}

function diagram(s, at, need) {
  const okCols = need(isInt(s.cols) && s.cols >= 1 && s.cols <= 6, `${at}.cols: inteiro de 1 a 6`);
  const okRows = need(isInt(s.rows) && s.rows >= 1 && s.rows <= 4, `${at}.rows: inteiro de 1 a 4`);
  const okGrid = okCols && okRows;
  if (!need(Array.isArray(s.nodes) && s.nodes.length > 0, `${at}.nodes: lista obrigatória`)) return;
  const inGrid = (pt) => Array.isArray(pt) && pt.length === 2 && isInt(pt[0]) && isInt(pt[1]) && pt[0] >= 0 && pt[1] >= 0 && pt[0] < s.cols && pt[1] < s.rows;
  const ids = new Set();
  const cells = new Set();
  s.nodes.forEach((n, j) => {
    const p = `${at}.nodes[${j}]`;
    if (need(isStr(n.id), `${p}.id: obrigatório`)) {
      need(!ids.has(n.id), `${p}.id: "${n.id}" repetido`);
      ids.add(n.id);
    }
    need(isStr(n.label), `${p}.label: obrigatório`);
    if (okGrid && need(inGrid(n.at), `${p}.at: [coluna, linha] dentro da grade ${s.cols}×${s.rows} (começa em 0)`)) {
      const key = n.at.join(",");
      need(!cells.has(key), `${p}.at: célula [${key}] já ocupada`);
      cells.add(key);
    }
    if (n.icon != null) need(n.icon in ICONS, `${p}.icon: "${n.icon}" não existe em lib/icons.js`);
    if (n.kind != null) need(n.kind === "external", `${p}.kind: só "external"`);
  });
  (s.groups ?? []).forEach((g, j) => {
    const p = `${at}.groups[${j}]`;
    need(isStr(g.label), `${p}.label: obrigatório`);
    if (okGrid)
      need(
        inGrid(g.from) && inGrid(g.to) && g.from[0] <= g.to[0] && g.from[1] <= g.to[1],
        `${p}: from e to são [coluna, linha] na grade, com from no canto de cima à esquerda`,
      );
  });
  (s.edges ?? []).forEach((e, j) => {
    const p = `${at}.edges[${j}]`;
    need(ids.has(e.from), `${p}.from: nó "${e.from}" não existe`);
    need(ids.has(e.to), `${p}.to: nó "${e.to}" não existe`);
    need(e.from !== e.to, `${p}: conexão de um nó com ele mesmo`);
    if (e.style != null) need(e.style === "dashed", `${p}.style: só "dashed"`);
  });
}

function timeline(s, at, need) {
  if (!need(Array.isArray(s.items) && s.items.length >= 2 && s.items.length <= 6, `${at}.items: de 2 a 6 marcos`)) return;
  s.items.forEach((it, j) => {
    const p = `${at}.items[${j}]`;
    need(isStr(it.date), `${p}.date: obrigatório (ex.: "Ago", "Q3", "Sprint 12")`);
    need(isStr(it.label), `${p}.label: obrigatório`);
    need(STATUSES.includes(it.status), `${p}.status: use ${STATUSES.join(", ")}`);
  });
}

const HEX = /^#[0-9a-f]{6}$/i;
const COLOR_KEYS = [
  "bg",
  "surface",
  "ink",
  "muted",
  "line",
  "line-strong",
  "edge",
  "structure-tint",
  "letterbox",
  "accent",
  "accent-light",
  "accent-deep",
  "accent-strong",
  "accent-tint",
  "accent-glow",
  "good",
  "bad",
  "warn",
  "warn-tint",
];

export function validateTheme(theme, exists) {
  const err = [];
  if (!theme?.font?.family || !Array.isArray(theme.font.files) || !theme.font.files.length) err.push("tema: font.family e font.files obrigatórios");
  else
    theme.font.files.forEach((f, i) => {
      if (!exists(f.file)) err.push(`tema: font.files[${i}].file "${f.file}" não existe`);
      if (!/^[\w\s,+-]+$/.test(f.unicodeRange ?? "")) err.push(`tema: font.files[${i}].unicodeRange inválido`);
      if (!/^\d{3}( \d{3})?$/.test(f.weight ?? "")) err.push(`tema: font.files[${i}].weight inválido (ex.: "400" ou "200 800")`);
    });
  for (const k of COLOR_KEYS) {
    const v = theme?.colors?.[k];
    if (v == null) err.push(`tema: colors.${k} obrigatório`);
    else if (k !== "accent-glow" && !HEX.test(v)) err.push(`tema: colors.${k} precisa ser #RRGGBB`);
    else if (k === "accent-glow" && !/^rgba?\([\d\s.,]+\)$/.test(v)) err.push("tema: colors.accent-glow precisa ser rgba(...)");
  }
  if (!/^[\w\s-]+$/.test(theme?.font?.family ?? "")) err.push("tema: font.family só com letras, números e espaço");
  return err;
}
