// Diagrama de arquitetura em grade: grupos, nós e conexões ortogonais.
// Entrada: grupos desenham a borda, nós crescem do centro coluna a coluna, conexões
// desenham o traço; depois, pacotes neon percorrem as conexões com `flow: true`.
import { h, svgEl, icon, fitGroup, warn } from "../dom.js";
import { sp, clamp, STD, UI } from "../motion.js";
import { header } from "./header.js";

const PACKET_SPEED = 300; // px/s

function route(a, b, nw, nh) {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  if (Math.abs(dx) > 1) {
    const s = Math.sign(dx);
    const x1 = a.cx + (s * nw) / 2;
    const x2 = b.cx - s * (nw / 2 + 6);
    const y1 = a.cy;
    const y2 = b.cy;
    const dir = s > 0 ? 0 : 180;
    if (Math.abs(dy) < 1) return { d: `M ${x1} ${y1} H ${x2}`, lx: (x1 + x2) / 2, ly: y1, end: [x2, y2], dir, gap: Math.abs(x2 - x1) };
    const mx = (x1 + x2) / 2;
    const sy = Math.sign(dy);
    const r = Math.min(20, Math.abs(dy) / 2, Math.abs(mx - x1));
    const d =
      `M ${x1} ${y1} H ${mx - s * r} Q ${mx} ${y1} ${mx} ${y1 + sy * r} ` +
      `V ${y2 - sy * r} Q ${mx} ${y2} ${mx + s * r} ${y2} H ${x2}`;
    return { d, lx: mx, ly: (y1 + y2) / 2, end: [x2, y2], dir, gap: Infinity };
  }
  const s = Math.sign(dy);
  const y1 = a.cy + (s * nh) / 2;
  const y2 = b.cy - s * (nh / 2 + 6);
  return { d: `M ${a.cx} ${y1} V ${y2}`, lx: a.cx, ly: (y1 + y2) / 2, end: [a.cx, y2], dir: s > 0 ? 90 : -90, gap: Infinity };
}

export function buildDiagram(spec, root, index) {
  const hd = header(spec, root);
  const body = h("div", "body diagram");
  root.append(body);
  const W = body.clientWidth;
  const H = body.clientHeight;
  const C = spec.cols;
  const R = spec.rows;
  const cw = W / C;
  const ch = H / R;
  const labeled = (spec.edges ?? []).some((e) => e.label);
  const nw = Math.min(340, cw - (labeled ? 132 : 64));
  const nh = Math.min(132, ch - 64);

  const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: "diagram-svg", "aria-hidden": "true" });
  const gLayer = svgEl("g");
  const eLayer = svgEl("g");
  const pLayer = svgEl("g");
  svg.append(gLayer, eLayer, pLayer);
  body.append(svg);

  const tBase = hd.end - 0.4;

  const groups = (spec.groups ?? []).map((g, i) => {
    const x = g.from[0] * cw + 18;
    const y = g.from[1] * ch + 18;
    const w = (g.to[0] - g.from[0] + 1) * cw - 36;
    const hh = (g.to[1] - g.from[1] + 1) * ch - 36;
    const rect = svgEl("rect", { x, y, width: w, height: hh, rx: 26, class: "group-rect" });
    gLayer.append(rect);
    const len = 2 * (w + hh);
    rect.style.strokeDasharray = `${len}`;
    const label = h("div", "group-label", g.label);
    label.style.left = x + 32 + "px";
    label.style.top = y + "px";
    body.append(label);
    return { rect, label, len, t: tBase + i * 0.12 };
  });

  const nodes = {};
  for (const n of spec.nodes) {
    const cx = (n.at[0] + 0.5) * cw;
    const cy = (n.at[1] + 0.5) * ch;
    const el = h("div", "node" + (n.kind === "external" ? " node-ext" : "") + (n.highlight ? " node-hl" : ""));
    Object.assign(el.style, { left: cx - nw / 2 + "px", top: cy - nh / 2 + "px", width: nw + "px", height: nh + "px" });
    if (n.icon) {
      const ib = h("div", "node-icon");
      ib.append(icon(n.icon, 30));
      el.append(ib);
    }
    const tx = h("div", "node-text");
    const label = h("div", "node-label", n.label);
    tx.append(label);
    let sub = null;
    if (n.sub) {
      sub = h("div", "node-sub", n.sub);
      tx.append(sub);
    }
    el.append(tx);
    body.append(el);
    nodes[n.id] = { el, label, sub, cx, cy, t: tBase + 0.25 + n.at[0] * 0.2 + n.at[1] * 0.06 };
  }

  const all = Object.values(nodes);
  fitGroup(all.map((n) => n.label), 22, (el) => warn(index, `rótulo do nó "${el.textContent}" não coube`));
  const subs = all.map((n) => n.sub).filter(Boolean);
  if (subs.length) fitGroup(subs, 20, (el) => warn(index, `descrição "${el.textContent}" não coube no nó`));

  let tEdgesEnd = tBase + 1;
  const edges = (spec.edges ?? []).map((e, i) => {
    const a = nodes[e.from];
    const b = nodes[e.to];
    const r = route(a, b, nw, nh);
    const path = svgEl("path", { d: r.d, class: "edge" + (e.style === "dashed" ? " edge-dashed" : "") });
    eLayer.append(path);
    const len = path.getTotalLength();
    if (e.style !== "dashed") path.style.strokeDasharray = `${len}`;
    const head = svgEl("path", {
      d: "M -14 -8 L 0 0 L -14 8",
      class: "edge-head",
      transform: `translate(${r.end[0]} ${r.end[1]}) rotate(${r.dir})`,
    });
    eLayer.append(head);
    let label = null;
    if (e.label) {
      label = h("div", "edge-label", e.label);
      label.style.left = r.lx + "px";
      label.style.top = r.ly + "px";
      body.append(label);
      if (label.offsetWidth > r.gap - 12) warn(index, `rótulo "${e.label}" da conexão ${e.from}→${e.to} é maior que o espaço entre os nós`);
    }
    let packet = null;
    if (e.flow) {
      packet = svgEl("circle", { r: 7, class: "packet" });
      pLayer.append(packet);
    }
    const t = Math.max(a.t, b.t) + 0.3;
    tEdgesEnd = Math.max(tEdgesEnd, t + 0.9);
    return { path, head, label, packet, len, t, phase: i * 0.37 };
  });

  return {
    duration: tEdgesEnd + 0.6,
    seek(t) {
      hd.seek(t);
      for (const g of groups) {
        const p = sp(t - g.t, STD);
        g.rect.style.strokeDashoffset = `${g.len * (1 - p)}`;
        g.rect.style.fillOpacity = clamp(p);
        g.label.style.opacity = clamp((p - 0.4) / 0.4);
      }
      for (const id in nodes) {
        const n = nodes[id];
        const p = sp(t - n.t, STD);
        n.el.style.opacity = clamp(p * 1.8);
        n.el.style.transform = `scale(${0.86 + 0.14 * p})`;
      }
      for (const e of edges) {
        const p = clamp(sp(t - e.t, STD));
        if (e.path.style.strokeDasharray) e.path.style.strokeDashoffset = `${e.len * (1 - p)}`;
        else e.path.style.opacity = p;
        e.head.style.opacity = clamp((p - 0.85) / 0.15);
        if (e.label) {
          const q = sp(t - e.t - 0.35, UI);
          e.label.style.opacity = clamp(q * 1.5);
          e.label.style.transform = `translate(-50%, -50%) scale(${0.8 + 0.2 * q})`;
        }
        if (e.packet) {
          // Pacote: posição função pura do tempo, com fase por conexão.
          const tf = t - e.t - 0.9;
          if (tf < 0) {
            e.packet.style.opacity = 0;
          } else {
            const cycle = e.len * 1.7;
            const s = (tf * PACKET_SPEED + e.phase * cycle) % cycle;
            if (s > e.len) {
              e.packet.style.opacity = 0;
            } else {
              const pt = e.path.getPointAtLength(s);
              e.packet.setAttribute("cx", pt.x);
              e.packet.setAttribute("cy", pt.y);
              e.packet.style.opacity = clamp(Math.min(s, e.len - s) / 24) * clamp(tf / 0.3);
            }
          }
        }
      }
    },
  };
}
