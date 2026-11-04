// Ajudantes de DOM. Texto vindo do deck entra sempre por textContent, nunca por innerHTML.
import { ICONS } from "./icons.js";

const SVGNS = "http://www.w3.org/2000/svg";

export function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function svgEl(tag, attrs = {}) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

/** Ícone Lucide da biblioteca fixa (ICONS); o nome é validado no build. */
export function icon(name, size = 32, cls = "") {
  const s = svgEl("svg", {
    viewBox: "0 0 24 24",
    width: size,
    height: size,
    fill: "none",
    stroke: "currentColor",
    "stroke-width": 2,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    class: ("ico " + cls).trim(),
    "aria-hidden": "true",
  });
  s.innerHTML = ICONS[name] ?? "";
  return s;
}

/** Remove a marcação [[destaque]]. */
export const plain = (text) => String(text ?? "").replace(/\[\[(.+?)\]\]/g, "$1");

/**
 * Escreve `text` em `el` palavra por palavra, cada uma dentro de uma máscara
 * (span.w > span.wi), para a entrada por máscara. [[x]] vira destaque.
 * Retorna os span.wi na ordem de leitura.
 */
export function maskWords(el, text) {
  const out = [];
  String(text ?? "")
    .split(/\[\[(.+?)\]\]/)
    .forEach((part, i) => {
      for (const word of part.split(/\s+/).filter(Boolean)) {
        if (out.length) el.append(document.createTextNode(" "));
        const w = h("span", "w" + (i % 2 ? " hl" : ""));
        const wi = h("span", "wi", word);
        w.append(wi);
        el.append(w);
        out.push(wi);
      }
    });
  return out;
}

/** Reduz a fonte de `el` até caber na largura (sem quebrar linha). Retorna false se não coube. */
export function fitWidth(el, minPx) {
  let size = parseFloat(getComputedStyle(el).fontSize);
  while (el.scrollWidth > el.clientWidth + 1 && size > minPx) {
    size -= 1;
    el.style.fontSize = size + "px";
  }
  return el.scrollWidth <= el.clientWidth + 1;
}

/** Ajusta cada elemento para caber e iguala o grupo ao menor tamanho (hierarquia consistente). */
export function fitGroup(els, minPx, onFail) {
  let min = Infinity;
  for (const el of els) {
    if (!fitWidth(el, minPx)) onFail?.(el);
    min = Math.min(min, parseFloat(getComputedStyle(el).fontSize));
  }
  for (const el of els) el.style.fontSize = min + "px";
}

/** Avisos de layout (texto que não coube etc.), lidos na verificação: window.palco.warnings. */
export const warnings = [];
export function warn(slideIndex, msg) {
  const m = `slide ${slideIndex + 1}: ${msg}`;
  warnings.push(m);
  console.warn("[palco] " + m);
}
