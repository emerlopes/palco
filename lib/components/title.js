// Capa / abertura de seção: título grande, traço neon, subtítulo e linha de meta (data, time).
import { h } from "../dom.js";
import { sp, clamp, STD } from "../motion.js";
import { header } from "./header.js";

export function buildTitle(spec, root) {
  root.classList.add("cover");
  const hd = header(spec, root, { big: true });
  const meta = spec.meta ? h("p", "cover-meta", spec.meta) : null;
  if (meta) root.append(meta);
  const tMeta = hd.end - 0.2;
  return {
    duration: tMeta + 1,
    seek(t) {
      hd.seek(t);
      if (meta) {
        const p = sp(t - tMeta, STD);
        meta.style.opacity = clamp(p * 1.4);
        meta.style.transform = `translateX(${(1 - p) * -32}px)`;
      }
    },
  };
}
