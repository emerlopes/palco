// Linha do tempo de evolução: marcos com estado (ícone + texto), progresso neon até o marco atual.
import { h, icon, warn } from "../dom.js";
import { sp, clamp, STD, HEAVY, UI } from "../motion.js";
import { header } from "./header.js";

export const STATUS = {
  done: { text: "Concluído", icon: "check" },
  doing: { text: "Em andamento", icon: "clock" },
  risk: { text: "Em risco", icon: "triangle-alert" },
  next: { text: "Planejado", icon: null },
};

const DOT_Y = 96; // centro do marco dentro do bloco (ver .tl-dot)
const BLOCK_H = 420; // altura útil de data + marco + texto

export function buildTimeline(spec, root, index) {
  const hd = header(spec, root);
  const body = h("div", "body timeline");
  root.append(body);
  const W = body.clientWidth;
  const n = spec.items.length;
  const step = W / n;
  const x0 = step / 2;
  // Bloco centralizado um pouco acima do meio da área.
  const top = Math.max(0, (body.clientHeight - BLOCK_H) * 0.4);
  const AXIS_Y = top + DOT_Y;

  const track = h("div", "tl-track");
  Object.assign(track.style, { left: x0 + "px", width: W - step + "px", top: AXIS_Y + "px" });
  body.append(track);

  // Progresso até o último marco concluído ou em andamento.
  let last = -1;
  spec.items.forEach((it, i) => {
    if (it.status !== "next") last = i;
  });
  const progress = h("div", "tl-progress");
  Object.assign(progress.style, { left: x0 + "px", width: Math.max(0, last) * step + "px", top: AXIS_Y + "px" });
  body.append(progress);

  const t0 = hd.end - 0.3;
  const items = spec.items.map((it, i) => {
    const col = h("div", "tl-item is-" + it.status);
    Object.assign(col.style, { left: i * step + "px", width: step + "px", top: top + "px" });
    const date = h("div", "tl-date", it.date);
    const dot = h("div", "tl-dot");
    const st = STATUS[it.status];
    if (st.icon) dot.append(icon(st.icon, 30));
    const text = h("div", "tl-text");
    text.append(h("div", "tl-label", it.label));
    if (it.detail) text.append(h("div", "tl-detail", it.detail));
    const pill = h("div", "tl-status");
    if (st.icon) pill.append(icon(st.icon, 22));
    pill.append(h("span", null, st.text));
    text.append(pill);
    col.append(date, dot, text);
    body.append(col);
    const detail = text.querySelector(".tl-detail");
    if (detail && detail.scrollHeight > detail.clientHeight + 1) warn(index, `detalhe do marco "${it.label}" passou de 3 linhas`);
    return { date, dot, text, t: t0 + 0.35 + i * 0.16 };
  });

  const tEnd = t0 + 0.35 + n * 0.16 + 0.8;
  return {
    duration: tEnd + 0.4,
    seek(t) {
      hd.seek(t);
      track.style.transform = `scaleX(${sp(t - t0, STD)})`;
      progress.style.transform = `scaleX(${sp(t - t0 - 0.3, HEAVY)})`;
      for (const it of items) {
        const p = sp(t - it.t, UI);
        it.dot.style.transform = `translate(-50%, -50%) scale(${clamp(p, 0, 1.2)})`;
        const q = sp(t - it.t - 0.1, STD);
        it.text.style.opacity = clamp(q * 1.5);
        it.text.style.transform = `translateY(${(1 - q) * 28}px)`;
        it.date.style.opacity = clamp(q * 1.5);
        it.date.style.transform = `translateY(${(1 - q) * -16}px)`;
      }
    },
  };
}
