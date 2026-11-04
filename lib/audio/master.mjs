// Master: limitador nos transientes, loudnorm em duas passadas (modo linear) e ajuste fino
// para cravar o alvo (padrão −14 LUFS, pico −1,5 dBTP). Mesma receita do estúdio da Clitag.
import { execFileSync, spawnSync } from "node:child_process";
import { rmSync, renameSync } from "node:fs";

const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-nostats", "-loglevel", "error", ...args], { stdio: ["ignore", "ignore", "inherit"] });
// Medições saem no stderr do ffmpeg.
const measure = (args) => spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8" }).stderr;

/** Loudness integrada (LUFS) de um arquivo de áudio ou vídeo. */
export function lufs(file) {
  const out = measure(["-i", file, "-af", "ebur128", "-f", "null", "-"]);
  const m = [...out.matchAll(/^\s*I:\s*(-?[\d.]+) LUFS/gm)];
  if (!m.length) throw new Error("não consegui medir a loudness de " + file);
  return Number(m.at(-1)[1]);
}

export function master(input, output, target = -14) {
  const pre = output + ".pre.wav";
  ff(["-y", "-i", input, "-af", "volume=-5dB,alimiter=limit=0.5:attack=1:release=40:level=disabled", "-c:a", "pcm_f32le", pre]);
  const json = measure(["-i", pre, "-af", `loudnorm=I=${target}:TP=-1.5:LRA=11:print_format=json`, "-f", "null", "-"]);
  const m = JSON.parse(json.slice(json.lastIndexOf("{"), json.lastIndexOf("}") + 1));
  const lin = `loudnorm=I=${target}:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const norm = output + ".norm.wav";
  ff(["-y", "-i", pre, "-af", lin, "-ar", "48000", "-c:a", "pcm_s24le", norm]);
  // O loudnorm linear para a poucos décimos do alvo: ajuste fino com ganho fixo.
  const gain = target - lufs(norm);
  ff(["-y", "-i", norm, "-af", `volume=${gain.toFixed(2)}dB`, "-c:a", "pcm_s24le", output + ".tmp.wav"]);
  renameSync(output + ".tmp.wav", output);
  rmSync(pre, { force: true });
  rmSync(norm, { force: true });
  return lufs(output);
}

