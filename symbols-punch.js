// ============================================================================
// PUNCH-CARD SYMBOLS (2026-11-25 draft, after Kimmie's Week 11 moodboard:
// punch card, graphic scores, game grid). Each sign = a small card.
//  · header zone: O / V / M — the punched slot tells the CATEGORY
//  · body: 7 × 7 punch positions; X = punched hole, . = unpunched (printed digit)
//    The holes draw what the sign MEANS (shape / count / direction of movement).
// ============================================================================

const PUNCH = {
  // ---------- OBJECTS: the holes draw the shape ----------
  CIRCLE: [
    "..XXX..",
    ".X...X.",
    "X.....X",
    "X.....X",
    "X.....X",
    ".X...X.",
    "..XXX..",
  ],
  TRIANGLE: [
    "...X...",
    "...X...",
    "..X.X..",
    "..X.X..",
    ".X...X.",
    ".X...X.",
    "XXXXXXX",
  ],
  RECTANGLE: [
    ".......",
    "XXXXXXX",
    "X.....X",
    "X.....X",
    "X.....X",
    "XXXXXXX",
    ".......",
  ],
  LINE: [
    ".......",
    ".......",
    ".......",
    "XXXXXXX",
    ".......",
    ".......",
    ".......",
  ],
  QUARTER_CIRCLE: [
    "XXX....",
    "X..X...",
    "X...X..",
    "X....X.",
    "X.....X",
    "X.....X",
    "XXXXXXX",
  ],
  BLOB: [
    ".XX....",
    "XXXXX..",
    ".XXXXXX",
    "..XXXX.",
    ".XXXXX.",
    "XXXX...",
    ".X.....",
  ],

  // ---------- VALUES: count / amount you can see ----------
  DOUBLE: [            // two of the same
    ".......",
    ".......",
    "XX...XX",
    "XX...XX",
    ".......",
    ".......",
    ".......",
  ],
  LESSER: [            // stepping down: less and less
    "X......",
    "XX.....",
    "XXX....",
    "XXXX...",
    "XXXXX..",
    ".......",
    ".......",
  ],
  A_FEW: [             // three, scattered
    ".......",
    ".X.....",
    ".......",
    "....X..",
    ".......",
    "..X....",
    ".......",
  ],
  A_LOT: [             // punched everywhere
    "X.X.X.X",
    ".X.X.X.",
    "X.X.X.X",
    ".X.X.X.",
    "X.X.X.X",
    ".X.X.X.",
    "X.X.X.X",
  ],
  HALF: [              // one side punched out (no middle line, 2026-11-25)
    "XXX....",
    "XXX....",
    "XXX....",
    "XXX....",
    "XXX....",
    "XXX....",
    "XXX....",
  ],

  // ---------- MOTIONS: the holes show the movement ----------
  SHRINKING: [         // pulled in to the centre
    "X..X..X",
    ".......",
    "..XXX..",
    "X.XXX.X",
    "..XXX..",
    ".......",
    "X..X..X",
  ],
  COLLAPSING: [        // falling and piling up at the bottom
    "...X...",
    ".......",
    ".X...X.",
    ".......",
    "X.X.X.X",
    "XXXXXXX",
    "XXXXXXX",
  ],
  FLOWY: [             // a wave
    ".......",
    "..X....",
    ".X.X...",
    "X...X.X",
    ".....X.",
    ".......",
    ".......",
  ],
  RANDOM: [            // no pattern
    "X....X.",
    "...X...",
    ".X....X",
    "....X..",
    "X.X....",
    ".....X.",
    "..X...X",
  ],
  RIPPLING: [          // rings going outwards
    ".X.X.X.",
    "X.....X",
    "..XXX..",
    "X.X.X.X",
    "..XXX..",
    "X.....X",
    ".X.X.X.",
  ],
  RIGID: [             // a fixed frame
    "XXXXXXX",
    "X..X..X",
    "X..X..X",
    "XXXXXXX",
    "X..X..X",
    "X..X..X",
    "XXXXXXX",
  ],
};

// NUMBERS 1–10: exactly that many holes, in rows of five, so you can count them
(function makeDigits() {
  for (let n = 1; n <= 10; n++) {
    const rows = Array.from({ length: 7 }, () => ".......".split(""));
    const top = Math.min(n, 5), bottom = Math.max(0, n - 5);
    const place = (count, row) => {
      const start = 1 + Math.floor((5 - count) / 2);
      for (let i = 0; i < count; i++) rows[row][start + i] = "X";
    };
    if (bottom === 0) place(top, 3);
    else { place(top, 2); place(bottom, 4); }
    PUNCH[`DIGIT_${n}`] = rows.map((r) => r.join(""));
  }
})();

const PUNCH_ZONE = { OBJECT: 0, VALUE: 1, MOTION: 2 };
const PUNCH_ZONE_LABELS = ["O", "V", "M"];

// Draws one sign as a punch card. u = size of one punch position in px.
// stepNo (optional) is printed under the card like a card's column number.
function drawPunchCard(name, u = 10, stepNo = null) {
  const entry = SYMBOLS[name];
  const rows = PUNCH[name];
  const dpr = window.devicePixelRatio || 1;
  const pad = Math.round(u * 0.7);
  const rowH = Math.round(u * 1.25);
  const zoneH = Math.round(u * 1.6);
  const footH = stepNo !== null ? Math.round(u * 1.2) : 0;
  const W = pad * 2 + 7 * u;
  const H = pad + zoneH + 7 * rowH + pad + footH;

  const c = document.createElement("canvas");
  c.width = W * dpr; c.height = H * dpr;
  c.style.width = W + "px"; c.style.height = H + "px";
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);

  const PAPER = getComputedStyle(document.documentElement).getPropertyValue("--card").trim() || "#efebe1";
  const INK = "#111111";
  const PRINT = "rgba(17,17,17,0.38)";

  // card with a clipped top-left corner
  const cut = u;
  const cardH = H - footH;
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.moveTo(cut, 0); ctx.lineTo(W, 0); ctx.lineTo(W, cardH); ctx.lineTo(0, cardH); ctx.lineTo(0, cut);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();

  const font = (px, w = 400) => `${w} ${px}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";

  // category zone: O V M, the punched one is the category
  const zoneY = pad;
  const zoneSlots = [1.5, 3.5, 5.5];
  zoneSlots.forEach((col, i) => {
    const cx = pad + col * u;
    const cy = zoneY + zoneH / 2 - 1;
    if (entry && PUNCH_ZONE[entry.cat] === i) {
      ctx.fillStyle = INK;
      ctx.fillRect(cx - u * 0.6, cy - u * 0.45, u * 1.2, u * 0.9);
      ctx.fillStyle = PAPER;
      ctx.font = font(Math.max(6, u * 0.6), 700);
      ctx.fillText(PUNCH_ZONE_LABELS[i], cx, cy + 0.5);
    } else {
      ctx.fillStyle = PRINT;
      ctx.font = font(Math.max(6, u * 0.6));
      ctx.fillText(PUNCH_ZONE_LABELS[i], cx, cy + 0.5);
    }
  });
  ctx.strokeStyle = PRINT;
  ctx.beginPath(); ctx.moveTo(pad * 0.5, zoneY + zoneH); ctx.lineTo(W - pad * 0.5, zoneY + zoneH); ctx.stroke();

  // body: punched holes + printed row digits
  const bodyY = zoneY + zoneH + Math.round(u * 0.3);
  if (rows) {
    rows.forEach((line, r) => {
      line.split("").forEach((ch, col) => {
        const cx = pad + col * u + u / 2;
        const cy = bodyY + r * rowH + rowH / 2;
        if (ch === "X") {
          ctx.fillStyle = INK;
          ctx.fillRect(cx - u * 0.3, cy - rowH * 0.38, u * 0.6, rowH * 0.76);
        } else if (ch === "|") {
          ctx.fillStyle = INK;
          ctx.fillRect(cx - 0.75, cy - rowH / 2, 1.5, rowH);
        } else {
          ctx.fillStyle = PRINT;
          ctx.font = font(Math.max(5, u * 0.5));
          ctx.fillText(String(r + 1), cx, cy);
        }
      });
    });
  }

  // column number under the card
  if (stepNo !== null) {
    ctx.fillStyle = INK;
    ctx.font = font(Math.max(7, u * 0.7), 700);
    ctx.fillText(String(stepNo).padStart(2, "0"), W / 2, cardH + footH / 2 + 1);
  }
  return c;
}

// ============================================================================
// THE WHOLE LINE AS ONE GRID: only black punched boxes on a plain grid.
// Names on top, one 7-column section per sign. Extra empty grid fills the
// rest of the bar, so it reads as one continuous line. (2026-11-25, v2)
// ============================================================================
function drawPunchStrip(strip, u = 10, minWidth = 0, opts = {}) {
  const blockW = 7 * u;
  const rowH = Math.round(u * 1.2);
  const labelH = opts.noLabel ? 0 : Math.round(u * 2.4);   // names on top
  const gridTop = labelH;
  const gridRows = 7;                   // 7 body rows (category row removed 2026-11-25)
  const H = gridTop + gridRows * rowH + Math.round(u * 0.8);
  const trailing = opts.trailing === undefined ? 1 : opts.trailing;   // empty sections after the last sign
  const blocks = Math.max(strip.length + trailing, Math.ceil(minWidth / blockW));
  const W = blocks * blockW;
  const dpr = window.devicePixelRatio || 1;

  const c = document.createElement("canvas");
  c.width = W * dpr; c.height = H * dpr;
  c.style.width = W + "px"; c.style.height = H + "px";
  const ctx = c.getContext("2d");
  ctx.scale(dpr, dpr);

  // white on the live camera (2026-11-25)
  const INK = opts.ink || "#ffffff";
  const GRID = opts.grid || "rgba(255,255,255,0.22)";
  const GRID_BLOCK = opts.gridBlock || "rgba(255,255,255,0.5)";
  const font = (px, w = 400) => `${w} ${px}px ui-monospace, SFMono-Regular, Menlo, monospace`;

  // the grid: one cell per punch position, slightly darker between signs
  // (opts.showGrid === false → no grid, only the boxes)
  ctx.lineWidth = 1;
  if (opts.showGrid !== false) {
  for (let col = 0; col <= blocks * 7; col++) {
    const x = col * u + 0.5;
    ctx.strokeStyle = col % 7 === 0 ? GRID_BLOCK : GRID;
    ctx.beginPath(); ctx.moveTo(x, gridTop); ctx.lineTo(x, gridTop + gridRows * rowH); ctx.stroke();
  }
  for (let r = 0; r <= gridRows; r++) {
    const y = gridTop + r * rowH + 0.5;
    ctx.strokeStyle = GRID;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  }

  for (let b = 0; b < strip.length; b++) {
    const name = strip[b];
    const entry = SYMBOLS[name];
    // opts.patterns[b] overrides the designed sign (used for data signs)
    const rows = (opts.patterns && opts.patterns[b]) || PUNCH[name];
    const x0 = b * blockW;

    // name on top: "01 CIRCLE"
    ctx.fillStyle = INK;
    if (!opts.noLabel) {
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = font(Math.max(7, u * 0.7), 700);
    ctx.fillText(String(b + 1).padStart(2, "0"), x0 + 2, labelH * 0.32);
    ctx.font = font(Math.max(7, u * 0.75));
    ctx.fillText(name.replace("DIGIT_", "").replace("_", " "), x0 + 2, labelH * 0.72);
    }

    // body: punched boxes fill their grid cell
    if (rows) {
      rows.forEach((line, r) => {
        line.split("").forEach((ch, col) => {
          const x = x0 + col * u, y = gridTop + r * rowH;
          ctx.fillStyle = INK;
          // full cell, so neighbouring boxes join into one solid shape
          if (ch === "X") ctx.fillRect(x, y, u + 0.5, rowH + 0.5);
          else if (ch === "|") ctx.fillRect(x + u / 2 - 0.75, y, 1.5, rowH);
        });
      });
    }

    // newest sign: bar under its section
    if (b === strip.length - 1 && opts.newestBar !== false) {
      ctx.fillStyle = INK;
      ctx.fillRect(x0 + 1, gridTop + gridRows * rowH + 3, blockW - 1, 3);
    }
  }
  return c;
}
