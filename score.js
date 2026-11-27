// ============================================================================
// SCORE: the written line drawn as ONE punch card (symbols-punch.js),
// read left to right. On RUN a playhead sweeps across it.
// ============================================================================

let scoreGrid = true; // G toggles the grid on the live screen

function renderScore(strip) {
  const sheet = document.getElementById("score-sheet");
  sheet.innerHTML = "";
  // fill at least the visible width so the grid runs the whole bar
  // DATA mode (index-data.html): each sign is drawn from the hand's own numbers (way 2 fields)
  const patterns = window.SIGN_MODE === "data"
    ? strip.map((t, i) => wayFields((typeof compiledVecs !== "undefined" && compiledVecs[i]) || typicalVector(t)))
    : null;
  sheet.appendChild(drawPunchStrip(strip, 11, sheet.clientWidth - 48, { showGrid: scoreGrid, patterns }));
  if (strip.length === 0) {
    const hint = document.createElement("div");
    hint.className = "score-empty";
    hint.textContent = "SIGN TO PUNCH THE CARD · HOLD EACH SIGN UNTIL THE BAR FILLS";
    sheet.appendChild(hint);
  }
  sheet.scrollLeft = sheet.scrollWidth; // keep the newest sign in view
}

// On RUN: a playhead reads the line left to right
function playScore() {
  const sheet = document.getElementById("score-sheet");
  sheet.style.setProperty("--line-width", sheet.scrollWidth + "px");
  sheet.classList.remove("playing");
  void sheet.offsetWidth; // restart the animation
  sheet.classList.add("playing");
}
