// Runtime do deck: monta os slides, navega, abre o modo apresentador e expõe o contrato de render.
//
// Contrato (usado pelo render de vídeo e PNG):
//   window.palco = { ready, count, duration(i), seek(i, t), timeline(), frame(T), warnings }
//   Cada slide é função pura do tempo: seek(i, t) pinta o slide i no instante t (s).
//   Vídeo: timeline() dá o início e a duração de cada slide; frame(T) pinta o instante T
//   do vídeo, com a transição (faixa neon varrendo a tela) entre slides.
//   Com ?render na URL não há navegação, laço de animação nem interface.
//   Com ?play o deck toca sozinho como o vídeo (prévia do ritmo, sem render).
import { h, plain, warnings } from "./dom.js";
import { sp, STD } from "./motion.js";
import { buildTitle } from "./components/title.js";
import { buildKpi } from "./components/kpi.js";
import { buildDiagram } from "./components/diagram.js";
import { buildTimeline } from "./components/timeline.js";

const BUILDERS = { title: buildTitle, kpi: buildKpi, diagram: buildDiagram, timeline: buildTimeline };
const SETTLED = 1e4; // instante "fim da animação" (impressão, voltar slide, movimento reduzido)

const deck = JSON.parse(document.getElementById("deck-data").textContent);
const params = new URLSearchParams(location.search);
const RENDER = params.has("render");
const PLAY = params.has("play");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

const stage = document.querySelector(".stage");
const live = document.querySelector(".sr-live");
let slides = [];
let cur = 0;
let enteredAt = 0;

function buildSlide(spec, i) {
  const n = deck.slides.length;
  const el = h("section", "slide slide-" + spec.type);
  el.setAttribute("aria-roledescription", "slide");
  el.setAttribute("aria-label", `${i + 1} de ${n}`);
  const strip = h("div", "strip");
  const content = h("div", "slide-content");
  const foot = h("footer", "slide-foot");
  foot.append(h("span", "foot-name", deck.footer ?? plain(deck.title)), h("span", "foot-page", `${i + 1} / ${n}`));
  el.append(strip, content, foot);
  stage.append(el); // no DOM antes de montar: os componentes medem o layout
  const comp = BUILDERS[spec.type](spec, content, i);
  return {
    el,
    duration: comp.duration,
    title: plain(spec.title),
    notes: spec.notes ?? "",
    seek(t) {
      strip.style.transform = `scaleY(${sp(t, STD)})`;
      comp.seek(t);
    },
  };
}

function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  document.documentElement.style.setProperty("--fit", String(s));
}

function show(i, { animate = true } = {}) {
  cur = Math.max(0, Math.min(slides.length - 1, i));
  slides.forEach((s, j) => s.el.classList.toggle("is-current", j === cur));
  enteredAt = performance.now() - (animate && !reducedMotion ? 0 : SETTLED * 1000);
  slides[cur].seek((performance.now() - enteredAt) / 1000);
  if (!RENDER) {
    history.replaceState(null, "", "#" + (cur + 1));
    live.textContent = `Slide ${cur + 1} de ${slides.length}: ${slides[cur].title}`;
    presenter.update();
  }
}

const go = (delta) => {
  const next = cur + delta;
  if (next < 0 || next >= slides.length) return;
  // Avançar anima; voltar mostra o slide pronto (como no projetor).
  show(next, { animate: delta > 0 });
};

function loop() {
  slides[cur].seek((performance.now() - enteredAt) / 1000);
  requestAnimationFrame(loop);
}

// ---------- Vídeo: timeline e transição ----------
const WIPE = { k: 64, d: 16 }; // crítica: assenta em ~1 s, sem overshoot
const WIPE_DELAY = 0.2; // o conteúdo do slide novo começa depois que a faixa passa da margem
const DEFAULT_HOLD = 3;

/** Início e duração de cada slide no vídeo. Com música, cada slide dura um número inteiro de compassos. */
function timeline() {
  const v = deck.video ?? {};
  const bar = v.music && v.music !== "nenhuma" ? 240 / (v.bpm ?? 120) : 0;
  let start = 0;
  const slots = slides.map((s, i) => {
    let len = WIPE_DELAY + s.duration + (deck.slides[i].hold ?? v.hold ?? DEFAULT_HOLD);
    if (bar) len = Math.ceil(len / bar - 1e-9) * bar;
    const slot = { start, len };
    start += len;
    return slot;
  });
  return { total: start, slots, bar };
}

let tlCache = null;
const wipe = h("div", "wipe");

function frame(T) {
  tlCache ??= timeline();
  const { slots } = tlCache;
  let i = slots.length - 1;
  while (i > 0 && T < slots[i].start) i--;
  const u = T - slots[i].start;
  const p = i === 0 ? 1 : sp(u, WIPE);
  const inWipe = i > 0 && p < 0.998;
  slides.forEach((s, j) => {
    s.el.classList.toggle("is-current", j === i || (inWipe && j === i - 1));
    s.el.style.clipPath = "";
    s.el.style.zIndex = "";
  });
  const curSlide = slides[i];
  curSlide.seek(i === 0 ? u : u - WIPE_DELAY);
  if (inWipe) {
    const prev = slides[i - 1];
    prev.seek(T - slots[i - 1].start - (i - 1 === 0 ? 0 : WIPE_DELAY));
    curSlide.el.style.zIndex = "1";
    curSlide.el.style.clipPath = `inset(0 ${((1 - p) * 100).toFixed(3)}% 0 0)`;
    wipe.style.opacity = "1";
    wipe.style.transform = `translateX(${p * 1920 - 28}px)`;
  } else {
    wipe.style.opacity = "0";
  }
}

// ---------- Modo apresentador (janela separada, sem servidor) ----------
const presenter = {
  win: null,
  started: 0,
  open() {
    if (this.win && !this.win.closed) return this.win.focus();
    this.win = window.open("", "palco-apresentador", "width=980,height=720");
    if (!this.win) return;
    this.started = Date.now();
    const d = this.win.document;
    d.title = "Apresentador · " + plain(deck.title);
    const style = d.createElement("style");
    style.textContent = document.getElementById("presenter-css").textContent;
    d.head.append(style);
    d.body.innerHTML = "";
    const wrap = d.createElement("main");
    for (const cls of ["p-top", "p-title", "p-notes", "p-next", "p-actions"]) {
      const e = d.createElement("div");
      e.className = cls;
      wrap.append(e);
    }
    d.body.append(wrap);
    const actions = wrap.querySelector(".p-actions");
    for (const [label, delta] of [
      ["Anterior", -1],
      ["Próximo", 1],
    ]) {
      const b = d.createElement("button");
      b.textContent = label;
      b.addEventListener("click", () => go(delta));
      actions.append(b);
    }
    d.addEventListener("keydown", onKey);
    this.update();
    this.tick();
  },
  update() {
    if (!this.win || this.win.closed) return;
    const d = this.win.document;
    const s = slides[cur];
    d.querySelector(".p-title").textContent = s.title;
    d.querySelector(".p-notes").textContent = s.notes || "Sem notas neste slide.";
    const nx = slides[cur + 1];
    d.querySelector(".p-next").textContent = nx ? "Próximo: " + nx.title : "Último slide";
    this.tick();
  },
  tick() {
    if (!this.win || this.win.closed) return;
    const sec = Math.floor((Date.now() - this.started) / 1000);
    const mm = String(Math.floor(sec / 60)).padStart(2, "0");
    const ss = String(sec % 60).padStart(2, "0");
    this.win.document.querySelector(".p-top").textContent = `Slide ${cur + 1} de ${slides.length} · ${mm}:${ss}`;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), 1000);
  },
};

function onKey(e) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key;
  if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(k)) go(1);
  else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) go(-1);
  else if (k === "Home") show(0, { animate: false });
  else if (k === "End") show(slides.length - 1, { animate: false });
  else if (k === "f" || k === "F") document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  else if (k === "p" || k === "P") presenter.open();
  else if (k === "r" || k === "R") show(cur); // repetir a animação
  else return;
  e.preventDefault();
}

function wireUi() {
  addEventListener("keydown", onKey);
  addEventListener("resize", fit);
  addEventListener("hashchange", () => {
    const i = parseInt(location.hash.slice(1), 10) - 1;
    if (i >= 0 && i !== cur) show(i, { animate: false });
  });
  stage.addEventListener("click", (e) => {
    if (getSelection().toString()) return;
    go(e.clientX > innerWidth / 2 ? 1 : -1);
  });
  let x0 = null;
  addEventListener("touchstart", (e) => (x0 = e.touches[0].clientX), { passive: true });
  addEventListener("touchend", (e) => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
    x0 = null;
  });
  // Impressão / PDF: todos os slides no estado final, um por página.
  addEventListener("beforeprint", () => slides.forEach((s) => s.seek(SETTLED)));
  addEventListener("afterprint", () => show(cur, { animate: false }));
  const hint = document.querySelector(".hint");
  setTimeout(() => hint.classList.add("is-hidden"), 4000);
}

async function main() {
  await document.fonts.ready;
  await Promise.all([...document.images].map((im) => im.decode().catch(() => {})));
  fit();
  slides = deck.slides.map(buildSlide);
  stage.append(wipe);
  if (RENDER || PLAY) document.documentElement.classList.add("is-render");
  if (RENDER) {
    show(0, { animate: false });
    return;
  }
  if (PLAY) {
    const t0 = performance.now();
    const total = timeline().total;
    const tick = () => {
      const T = (performance.now() - t0) / 1000;
      frame(Math.min(T, total));
      if (T < total) requestAnimationFrame(tick);
    };
    addEventListener("resize", fit);
    requestAnimationFrame(tick);
    return;
  }
  wireUi();
  const start = parseInt(location.hash.slice(1), 10) - 1;
  show(start >= 0 ? start : 0, { animate: !(start > 0) });
  requestAnimationFrame(loop);
}

const ready = main();
window.palco = {
  ready,
  get count() {
    return slides.length;
  },
  duration: (i) => slides[i].duration,
  timeline: () => (tlCache ??= timeline()),
  frame,
  seek(i, t) {
    wipe.style.opacity = "0";
    if (i !== cur) {
      cur = i;
      slides.forEach((s, j) => s.el.classList.toggle("is-current", j === i));
    }
    slides[i].seek(t);
  },
  warnings,
};
