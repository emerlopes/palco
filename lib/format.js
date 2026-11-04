// Formatação pt-BR dos valores. Monetário em centavos inteiros (BRL).

const nf = (opts) => new Intl.NumberFormat("pt-BR", opts);

export function defaultDecimals(item) {
  if (item.decimals != null) return item.decimals;
  return item.format === "pct" || item.format === "decimal" ? 1 : 0;
}

/** Formata `v` no formato do item: int, decimal, pct, ms, brl (centavos). */
export function formatValue(v, item) {
  const d = defaultDecimals(item);
  const compact = item.compact ? { notation: "compact", maximumFractionDigits: 1, minimumFractionDigits: 0 } : null;
  switch (item.format ?? "int") {
    case "brl": {
      const reais = v / 100;
      if (compact) return "R$ " + nf(compact).format(reais);
      return nf({ style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(reais);
    }
    case "pct":
      return nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(v) + "%";
    case "ms":
      return nf({ maximumFractionDigits: 0 }).format(v) + " ms";
    case "decimal":
      return nf({ minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
    default:
      if (compact) return nf(compact).format(v);
      return nf({ maximumFractionDigits: 0 }).format(v);
  }
}

/**
 * Variação contra o período anterior. pct compara em pontos percentuais; o resto, em %.
 * Retorna { text, dir: 'up'|'down'|'flat', good: true|false|null }.
 */
export function delta(item) {
  if (item.prev == null) return null;
  const better = item.better ?? "up";
  let diff, text;
  if (item.format === "pct") {
    diff = item.value - item.prev;
    const d = Math.max(defaultDecimals(item), 1);
    text = nf({ minimumFractionDigits: d, maximumFractionDigits: d, signDisplay: "exceptZero" }).format(diff) + " p.p.";
  } else {
    if (item.prev === 0) return null;
    diff = (item.value - item.prev) / Math.abs(item.prev);
    text = nf({ minimumFractionDigits: 1, maximumFractionDigits: 1, signDisplay: "exceptZero" }).format(diff * 100) + "%";
  }
  const rounded = Number(text.replace(/[^\d,-]/g, "").replace(",", "."));
  if (rounded === 0) return { text: "Estável", dir: "flat", good: null };
  const dir = diff > 0 ? "up" : "down";
  return { text, dir, good: dir === better };
}

/** Meta: atingida conforme `better`. */
export function goalStatus(item) {
  if (item.goal == null) return null;
  const better = item.better ?? "up";
  const ok = better === "up" ? item.value >= item.goal : item.value <= item.goal;
  return { ok, text: `Meta ${formatValue(item.goal, item)} · ${ok ? "atingida" : "não atingida"}` };
}
