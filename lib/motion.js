// Movimento em forma fechada: tudo é função pura do tempo (CLAUDE.md).

export const UI = { k: 320, d: 30 };
export const STD = { k: 170, d: 26 };
export const HEAVY = { k: 120, d: 24 };
// Texto que troca a cada tempo (letreiro): rápido e criticamente amortecido,
// porque texto não pode ter overshoot.
export const TEXT_FAST = { k: 320, d: 36 };

/** Resposta ao degrau de um oscilador amortecido (massa 1): 0 em t<=0, tende a 1. */
export function spring(t, k = STD.k, d = STD.d) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k);
  const zeta = d / (2 * w0);
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t));
  }
  if (Math.abs(zeta - 1) < 1e-9) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const r = Math.sqrt(zeta * zeta - 1);
  const s1 = -w0 * (zeta - r);
  const s2 = -w0 * (zeta + r);
  return 1 - (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1);
}

export const sp = (t, preset = STD) => spring(t, preset.k, preset.d);

/**
 * Valor com vários alvos: começa em keys[0][1] e soma uma mola por mudança.
 * keys: [[t, valor, preset?], ...] em ordem de tempo.
 */
export function track(t, keys, preset = STD) {
  let v = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [ti, vi, p] = keys[i];
    const prev = keys[i - 1][1];
    const pr = p ?? preset;
    v += (vi - prev) * spring(t - ti, pr.k, pr.d);
  }
  return v;
}

/** Opacidade de texto dentro de contêiner que muda: entra depois de `tin`, sai antes de `tout`. */
export function swapAlpha(t, tin, tout, ramp = 0.12) {
  if (t < tin || t > tout) return 0;
  return Math.min(1, (t - tin) / ramp, (tout - t) / ramp);
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, p) => a + (b - a) * p;
export const ramp = (t, t0, dur) => clamp((t - t0) / dur);

/** PRNG com semente (nunca Math.random no render). */
export function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruído suave determinístico (soma de senos com fases da semente) para deriva de câmera. */
export function drift(t, seed, amp = 1) {
  const rnd = mulberry32(seed);
  const a = rnd() * 6.28;
  const b = rnd() * 6.28;
  return amp * (0.6 * Math.sin(t * 0.9 + a) + 0.4 * Math.sin(t * 1.7 + b));
}
