// Indicadores: cartões com contador, variação contra o período anterior e meta.
// Estado nunca só por cor: a variação tem seta + sinal, a meta tem ícone + texto.
import { h, icon, fitGroup, warn } from "../dom.js";
import { sp, clamp, STD, HEAVY, UI } from "../motion.js";
import { formatValue, delta, goalStatus } from "../format.js";
import { header } from "./header.js";

export function buildKpi(spec, root, index) {
  const hd = header(spec, root);
  const body = h("div", "body kpi-grid");
  const n = spec.items.length;
  body.style.gridTemplateColumns = `repeat(${n <= 4 ? n : 3}, 1fr)`;
  root.append(body);

  const t0 = hd.end - 0.3;
  const cards = spec.items.map((item, i) => {
    const card = h("div", "kpi-card");
    const label = h("div", "kpi-label", item.label);
    const value = h("div", "kpi-value", formatValue(item.value, item));
    card.append(label, value);

    let deltaEl = null;
    const d = delta(item);
    if (d) {
      deltaEl = h("div", "kpi-delta " + (d.good == null ? "is-flat" : d.good ? "is-good" : "is-bad"));
      const ic = d.dir === "flat" ? "minus" : d.dir === "up" ? "trending-up" : "trending-down";
      deltaEl.append(icon(ic, 30), h("strong", null, d.text));
      if (d.dir !== "flat") deltaEl.append(h("span", "kpi-compare", spec.compareLabel ?? "vs. semana anterior"));
      card.append(deltaEl);
    }
    let goalEl = null;
    const g = goalStatus(item);
    if (g) {
      goalEl = h("div", "kpi-goal " + (g.ok ? "is-good" : "is-warn"));
      goalEl.append(icon(g.ok ? "circle-check" : "triangle-alert", 26), h("span", null, g.text));
      card.append(goalEl);
    }
    if (item.note) card.append(h("div", "kpi-note", item.note));
    body.append(card);

    return { card, value, deltaEl, goalEl, item, t: t0 + i * 0.12 };
  });

  // Valores no mesmo tamanho em todos os cartões, fixado pelo texto final (o contador não pula).
  fitGroup(
    cards.map((c) => c.value),
    56,
    (el) => warn(index, `valor "${el.textContent}" não coube no cartão`),
  );

  const note = spec.source ? h("p", "source", spec.source) : null;
  if (note) root.append(note);
  const tEnd = t0 + n * 0.12 + 1.6;

  return {
    duration: tEnd + 0.4,
    seek(t) {
      hd.seek(t);
      for (const c of cards) {
        const p = sp(t - c.t, STD);
        c.card.style.opacity = clamp(p * 1.6);
        c.card.style.transform = `translateY(${(1 - p) * 56}px)`;
        // Contador: parte do valor anterior (ou de zero) com mola pesada, sem overshoot.
        const k = sp(t - c.t - 0.15, HEAVY);
        const from = c.item.prev ?? 0;
        c.value.textContent = formatValue(k >= 0.9995 ? c.item.value : from + (c.item.value - from) * k, c.item);
        for (const [el, dt] of [
          [c.deltaEl, 0.9],
          [c.goalEl, 1.05],
        ]) {
          if (!el) continue;
          const q = sp(t - c.t - dt, UI);
          el.style.opacity = clamp(q * 1.5);
          el.style.transform = `translateX(${(1 - q) * -20}px)`;
        }
      }
      if (note) note.style.opacity = clamp((t - tEnd + 0.8) / 0.4);
    },
  };
}
