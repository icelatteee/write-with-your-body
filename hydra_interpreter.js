// ============================================================================
// STEP 2: SYMBOL CODE STRIP -> HYDRA SHADER COMPILER
// ============================================================================

const hydraCanvas = document.getElementById("hydra-canvas");
const hydra = new Hydra({
  canvas: hydraCanvas,
  width: hydraCanvas.width,
  height: hydraCanvas.height,
  detectAudio: false,
  makeGlobal: true
});

const HYDRA_MAP = {
  // OBJECTS -> Base Source Generators
  CIRCLE:         { type: "object", code: "shape(64, 0.3, 0.01)", fn: () => shape(64, 0.3, 0.01) },
  QUARTER_CIRCLE: { type: "object", code: "shape(64, 0.35, 0.01).mask(shape(4, 0.5, 0.01).scroll(0.25, -0.25))", fn: () => shape(64, 0.35, 0.01).mask(shape(4, 0.5, 0.01).scroll(0.25, -0.25)) },
  LINE:           { type: "object", code: "shape(2, 0.03, 0.005)", fn: () => shape(2, 0.03, 0.005) },
  TRIANGLE:       { type: "object", code: "shape(3, 0.35, 0.01)", fn: () => shape(3, 0.35, 0.01) },
  RECTANGLE:      { type: "object", code: "shape(4, 0.35, 0.01)", fn: () => shape(4, 0.35, 0.01) },
  BLOB:           { type: "object", code: "noise(3, 0.25).thresh(0.5, 0.05)", fn: () => noise(3, 0.25).thresh(0.5, 0.05) },

  // VALUES -> Spatial Repetition & Scaling
  DOUBLE:         { type: "value", code: ".repeat(2, 1)", fn: (s) => s.repeat(2, 1) },
  LESSER:         { type: "value", code: ".scale(0.45)", fn: (s) => s.scale(0.45) },
  A_FEW:          { type: "value", code: ".repeat(2, 2)", fn: (s) => s.repeat(2, 2) },
  A_LOT:          { type: "value", code: ".repeat(6, 6)", fn: (s) => s.repeat(6, 6) },
  HALF:           { type: "value", code: ".mask(shape(2, 0.5, 0.01).scrollY(0.25))", fn: (s) => s.mask(shape(2, 0.5, 0.01).scrollY(0.25)) },

  // MOTIONS -> Time-Based Modulators & Distortions
  SHRINKING:      { type: "motion", code: ".scale(() => 0.25 + 0.75 * Math.abs(Math.sin(time * 0.8)))", fn: (s) => s.scale(() => 0.25 + 0.75 * Math.abs(Math.sin(time * 0.8))) },
  COLLAPSING:     { type: "motion", code: ".scale(1, () => 0.08 + 0.92 * Math.abs(Math.cos(time)), 1)", fn: (s) => s.scale(1, () => 0.08 + 0.92 * Math.abs(Math.cos(time)), 1) },
  FLOWY:          { type: "motion", code: ".modulate(osc(4, 0.25, 0), 0.18)", fn: (s) => s.modulate(osc(4, 0.25, 0), 0.18) },
  RANDOM:         { type: "motion", code: ".modulate(noise(6, 0.9), 0.25)", fn: (s) => s.modulate(noise(6, 0.9), 0.25) },
  RIPPLING:       { type: "motion", code: ".modulateScale(osc(14, 0.35, 0), 0.2)", fn: (s) => s.modulateScale(osc(14, 0.35, 0), 0.2) },
  RIGID:          { type: "motion", code: ".pixelate(18, 18)", fn: (s) => s.pixelate(18, 18) }
};

for (let n = 1; n <= 10; n++) {
  HYDRA_MAP[`DIGIT_${n}`] = {
    type: "value",
    code: `.repeat(${n}, 1)`,
    fn: (s) => s.repeat(n, 1)
  };
}

function renderStripDOM(strip) {
  const container = document.getElementById("symbol-strip");
  container.innerHTML = "";

  if (strip.length === 0) {
    container.innerHTML = `<span class="empty-hint">STRIP EMPTY — SIGN A GESTURE OR SELECT A TEST STRIP ABOVE</span>`;
    return;
  }

  strip.forEach((name) => {
    const entry = SYMBOLS[name];
    if (!entry) return;

    const card = document.createElement("div");
    card.className = "glyph-card";

    const c = document.createElement("canvas");
    const cell = 12;
    c.width = 5 * cell;
    c.height = 5 * cell;
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#111111";
    for (let r = 0; r < 5; r++) {
      for (let col = 0; col < 5; col++) {
        const mode = entry.grid[r][col];
        const x = col * cell;
        const y = r * cell;
        if (mode === 1) {
          ctx.fillRect(x, y, cell, cell);
        } else if (mode === 2) {
          const s = cell / 2;
          ctx.fillRect(x, y, s, s);
          ctx.fillRect(x + s, y + s, s, s);
        } else if (mode === 3) {
          const s = cell / 4;
          for (let i = 0; i < 4; i++) {
            for (let j = 0; j < 4; j++) {
              if ((i + j) % 2 === 0) ctx.fillRect(x + i * s, y + j * s, s, s);
            }
          }
        }
      }
    }

    const tag = document.createElement("div");
    tag.className = "glyph-tag";
    tag.textContent = name;

    const cat = document.createElement("div");
    cat.className = "glyph-cat";
    cat.textContent = entry.cat;

    card.appendChild(c);
    card.appendChild(tag);
    card.appendChild(cat);
    container.appendChild(card);
  });
}

// Runs the strip LEFT TO RIGHT, in the order it was signed (decided 2026-11-25).
// Each symbol acts on everything before it, so a different order = a different visual.
//   object  -> starts the picture (a later object is ADDED on top of what's there)
//   value   -> changes everything so far (repeat / scale / mask)
//   motion  -> moves everything so far
// If the strip doesn't start with an object, it starts from a circle.
function runHydraPipeline(strip) {
  const codeEl = document.getElementById("hydra-code-output");

  // Empty program = blank screen
  if (strip.length === 0) {
    solid(0, 0, 0).out();
    if (codeEl) codeEl.textContent = "// nothing written yet";
    return;
  }

  let stream = null;
  let code = "";

  strip.forEach((token) => {
    const item = HYDRA_MAP[token];
    if (!item) return;

    if (item.type === "object") {
      if (!stream) {
        stream = item.fn();
        code = item.code;
      } else {
        stream = stream.add(item.fn());
        code += `\n  .add(${item.code})`;
      }
    } else {
      if (!stream) {
        stream = HYDRA_MAP.CIRCLE.fn();
        code = HYDRA_MAP.CIRCLE.code;
      }
      stream = item.fn(stream);
      code += `\n  ${item.code}`;
    }
  });

  if (!stream) {
    solid(0, 0, 0).out();
    if (codeEl) codeEl.textContent = "// nothing written yet";
    return;
  }

  stream.out();
  if (codeEl) codeEl.textContent = code + "\n  .out()";
}

// Same reading as runHydraPipeline, but only returns the code text (for print pages)
function hydraCodeFor(strip) {
  let code = "";
  let started = false;
  strip.forEach((token) => {
    const item = HYDRA_MAP[token];
    if (!item) return;
    if (item.type === "object") {
      code += started ? `\n  .add(${item.code})` : item.code;
      started = true;
    } else {
      if (!started) { code = HYDRA_MAP.CIRCLE.code; started = true; }
      code += `\n  ${item.code}`;
    }
  });
  return started ? code + "\n  .out()" : "// nothing written";
}
