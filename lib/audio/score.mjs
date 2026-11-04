// Trilha "suave" sintetizada em código (sem arquivo de música): piano, baixo e mallet
// em Ré maior, um acorde por compasso, e um sopro em cada transição de slide.
// Determinística (ruído com semente). Receitas de timbre e reverb vindas do estúdio da Clitag.
import { writeFileSync } from "node:fs";
import { mulberry32 } from "../motion.js";

export const RATE = 48000;

const midi = (n) => 440 * 2 ** ((n - 69) / 12);
// I–V–vi–IV em Ré; o último compasso resolve em Ré.
const D = [50, 57, 62, 66, 69];
const A = [45, 57, 61, 64, 69];
const Bm = [47, 54, 59, 62, 66];
const G = [43, 55, 59, 62, 67];
const LOOP = [D, A, Bm, G];

function mallet(note, dur, vel) {
  const f = midi(note);
  const b = new Float32Array(Math.round(dur * RATE));
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    const a = Math.min(1, t / 0.002);
    b[i] =
      vel *
      a *
      (Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.42) +
        0.28 * Math.sin(2 * Math.PI * f * 3.93 * t) * Math.exp(-t / 0.06) +
        0.06 * Math.sin(2 * Math.PI * f * 9.2 * t) * Math.exp(-t / 0.02));
  }
  return b;
}

function piano(note, dur, vel) {
  const f = midi(note);
  const b = new Float32Array(Math.round(dur * RATE));
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    const a = Math.min(1, t / 0.006);
    const rel = t > dur - 0.25 ? (dur - t) / 0.25 : 1;
    let v = 0;
    for (let n = 1; n <= 6; n++) v += (Math.sin(2 * Math.PI * f * n * (1 + 0.0007 * n) * t) / n ** 1.6) * Math.exp(-t * (0.9 + n * 0.9));
    b[i] = vel * a * rel * v;
  }
  return b;
}

function bass(note, dur, vel) {
  const f = midi(note);
  const b = new Float32Array(Math.round(dur * RATE));
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    const a = Math.min(1, t / 0.008);
    const rel = t > dur - 0.08 ? (dur - t) / 0.08 : 1;
    b[i] = vel * a * rel * (Math.sin(2 * Math.PI * f * t) + 0.18 * Math.sin(4 * Math.PI * f * t)) * Math.exp(-t / 0.9);
  }
  return b;
}

function bandpass(x, freqAt, q) {
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const w = (2 * Math.PI * freqAt(i / RATE)) / RATE;
    const alpha = Math.sin(w) / (2 * q);
    const a0 = 1 + alpha;
    const y = (alpha / a0) * x[i] + (-alpha / a0) * x2 - ((-2 * Math.cos(w)) / a0) * y1 - ((1 - alpha) / a0) * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = y;
    x[i] = y;
  }
  return x;
}

/** Sopro de transição; o pico fica `peak` segundos depois do início. */
function whoosh(seed, gain, dur = 0.55, peak = 0.32) {
  const rnd = mulberry32(seed);
  const b = new Float32Array(Math.ceil(dur * RATE));
  for (let i = 0; i < b.length; i++) b[i] = rnd() * 2 - 1;
  bandpass(b, (t) => 350 + 2600 * Math.exp(-(((t - peak) / 0.16) ** 2)), 0.9);
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE;
    const env = t < peak ? (t / peak) ** 2 : Math.exp(-(t - peak) / 0.09);
    b[i] *= gain * 0.9 * env;
  }
  return b;
}

function reverb(x, seedDelay) {
  const out = new Float32Array(x.length);
  for (const d0 of [1557, 1617, 1491, 1422]) {
    const d = d0 + seedDelay;
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < x.length; i++) {
      const y = buf[idx];
      buf[idx] = x[i] + y * 0.72;
      out[i] += y * 0.25;
      idx = (idx + 1) % d;
    }
  }
  for (const d of [225, 556]) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const b = buf[idx];
      const y = -out[i] + b;
      buf[idx] = out[i] + b * 0.5;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  }
  return out;
}

/**
 * Gera a trilha para a timeline do vídeo ({ total, slots, bar }) e grava WAV float em `path`.
 * As trocas de slide caem no tempo 1 de um compasso (a timeline já arredonda para compassos).
 */
export function renderScore(tl, path, bpm = 120) {
  const N = Math.round(tl.total * RATE);
  const music = { L: new Float32Array(N), R: new Float32Array(N) };
  const fx = { L: new Float32Array(N), R: new Float32Array(N) };
  const add = (bus, start, buf, gain = 1, pan = 0) => {
    const i0 = Math.round(start * RATE);
    const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4);
    const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4);
    for (let i = 0; i < buf.length; i++) {
      const j = i0 + i;
      if (j < 0 || j >= N) continue;
      bus.L[j] += buf[i] * gl;
      bus.R[j] += buf[i] * gr;
    }
  };
  const beat = 60 / bpm;
  const bar = beat * 4;
  const bars = Math.round(tl.total / bar);

  for (let k = 0; k < bars; k++) {
    const t0 = k * bar;
    const last = k === bars - 1;
    const ch = last ? D : LOOP[k % 4];
    for (const n of ch.slice(1)) add(music, t0, piano(n, last ? bar : bar - 0.02, 0.26));
    if (k >= 1) {
      if (last) add(music, t0, bass(ch[0] - 12, bar - 0.05, 0.55));
      else for (let s = 0; s < 2; s++) add(music, t0 + s * 2 * beat, bass(ch[0] - 12, 2 * beat - 0.05, 0.5));
    }
    // Arpejo leve em semínimas, só no meio (fica fora do primeiro e do último compasso).
    if (k >= 1 && !last) [1, 2, 3, 4].forEach((idx, s) => add(music, t0 + s * beat, mallet(ch[idx] + 12, 0.7, 0.18), 1, s % 2 ? 0.3 : -0.3));
    if (last) [74, 78, 81].forEach((n, i) => add(music, t0 + i * beat, mallet(n, 1.4, 0.26 - i * 0.04), 1, (i - 1) * 0.25));
  }
  // Sopro em cada transição: pico ~0,25 s depois do início do slide, quando a faixa cruza o meio.
  tl.slots.slice(1).forEach((s, i) => add(fx, s.start - 0.07, whoosh(100 + i, 0.7)));

  const wetL = reverb(music.L, 0);
  const wetR = reverb(music.R, 23);
  const L = new Float32Array(N);
  const R = new Float32Array(N);
  const fade = Math.round(1.5 * RATE);
  for (let i = 0; i < N; i++) {
    const g = i > N - fade ? (N - i) / fade : 1;
    L[i] = (music.L[i] * 0.8 + wetL[i] * 0.22 + fx.L[i] * 0.8) * g;
    R[i] = (music.R[i] * 0.8 + wetR[i] * 0.22 + fx.R[i] * 0.8) * g;
  }
  writeWavFloat(path, [L, R]);
}

function writeWavFloat(path, chans) {
  const n = chans[0].length;
  const data = Buffer.alloc(n * chans.length * 4);
  for (let i = 0; i < n; i++) for (let c = 0; c < chans.length; c++) data.writeFloatLE(chans[c][i], (i * chans.length + c) * 4);
  const head = Buffer.alloc(44);
  head.write("RIFF", 0);
  head.writeUInt32LE(36 + data.length, 4);
  head.write("WAVEfmt ", 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(3, 20); // IEEE float
  head.writeUInt16LE(chans.length, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * chans.length * 4, 28);
  head.writeUInt16LE(chans.length * 4, 32);
  head.writeUInt16LE(32, 34);
  head.write("data", 36);
  head.writeUInt32LE(data.length, 40);
  writeFileSync(path, Buffer.concat([head, data]));
}
