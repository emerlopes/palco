// Cabeçalho comum: rótulo (kicker) com traço neon, título com entrada por máscara e subtítulo.
import { h, maskWords } from "../dom.js";
import { sp, clamp, UI, STD, HEAVY } from "../motion.js";

const WORD_GAP = 0.045;

export function header(spec, root, { big = false } = {}) {
  const head = h("header", "head" + (big ? " head-big" : ""));
  let kickBar, kickText;
  if (spec.kicker) {
    const kick = h("div", "kicker");
    kickBar = h("span", "kicker-bar");
    kickText = h("span", "kicker-text", spec.kicker);
    kick.append(kickBar, kickText);
    head.append(kick);
  }
  const title = h(big ? "h1" : "h2", "title");
  const words = maskWords(title, spec.title);
  head.append(title);
  const line = big ? h("div", "title-line") : null;
  if (line) head.append(line);
  const sub = spec.subtitle ? h("p", "subtitle", spec.subtitle) : null;
  if (sub) head.append(sub);
  root.append(head);

  const tWords = 0.2;
  const tSub = tWords + words.length * WORD_GAP + 0.15;
  return {
    el: head,
    end: tSub + 0.6,
    seek(t) {
      if (kickBar) {
        kickBar.style.transform = `scaleX(${sp(t - 0.05, UI)})`;
        const k = sp(t - 0.12, STD);
        kickText.style.opacity = clamp(k * 1.5);
        kickText.style.transform = `translateX(${(1 - k) * -24}px)`;
      }
      // Curso de 150% da linha: descendentes não escapam da máscara.
      words.forEach((w, j) => {
        const p = sp(t - tWords - j * WORD_GAP, HEAVY);
        w.style.transform = `translateY(${(1 - p) * 150}%)`;
      });
      if (line) line.style.transform = `scaleX(${sp(t - tSub + 0.1, HEAVY)})`;
      if (sub) {
        const p = sp(t - tSub, STD);
        sub.style.opacity = clamp(p * 1.4);
        sub.style.transform = `translateY(${(1 - p) * 24}px)`;
      }
    },
  };
}
