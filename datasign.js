// ============================================================================
// DATA SIGNS · WAY 2 "FIELDS" (Kimmie's choice, 2026-11-25)
// The 88 numbers draw the sign on the same 7 × 7 grid, like fields on a punch card:
//   rows 1–3 = hand 1 · rows 5–7 = hand 2
//   columns 2–6 = thumb, index, middle, ring, pinky (taller bar = finger reaches further from the wrist)
//   column 1 = spread change · column 7 = shakiness
// ============================================================================

function wayFields(vec) {
  const g = Array.from({ length: 7 }, () => ".......".split(""));
  if (!vec) return g.map((r) => r.join(""));
  [[0, 0], [1, 4]].forEach(([hi, base]) => {
    const h = vec.slice(hi * 42, (hi + 1) * 42);
    if (!h.some((v) => Math.abs(v) > 1e-9)) return;
    [4, 8, 12, 16, 20].forEach((tip, f) => {
      const ext = Math.hypot(h[2 * tip], h[2 * tip + 1]);        // tip distance from wrist (hand-size units)
      const lvl = Math.max(1, Math.min(3, Math.round((ext - 0.6) / 0.4)));
      for (let k = 0; k < lvl; k++) g[base + 2 - k][1 + f] = "X";
    });
  });
  const col = (c, val, scale) => {
    const n = Math.max(0, Math.min(7, Math.round(Math.abs(val) * scale)));
    for (let k = 0; k < n; k++) g[6 - k][c] = "X";
  };
  col(0, vec[84], 6);    // spread change
  col(6, vec[87], 2.5);  // shakiness
  return g.map((r) => r.join(""));
}

// Most typical recording of a sign (closest to the average) — used when there is no live hand (test strips)
const _typicalCache = {};
function typicalVector(label) {
  if (_typicalCache[label]) return _typicalCache[label];
  const xs = (typeof trainingData !== "undefined" ? trainingData : []).filter((s) => s.label === label).map((s) => s.vector);
  if (!xs.length) return null;
  const n = xs[0].length, mean = new Array(n).fill(0);
  xs.forEach((v) => v.forEach((x, i) => (mean[i] += x / xs.length)));
  let best = xs[0], bd = Infinity;
  xs.forEach((v) => { let d = 0; for (let i = 0; i < n; i++) d += (v[i] - mean[i]) ** 2; if (d < bd) { bd = d; best = v; } });
  return (_typicalCache[label] = best);
}
