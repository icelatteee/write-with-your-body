// ============================================================================
// STEP 1: MEDIAPIPE HANDS CAPTURE, VIDEO/WEBCAM TRAINER & KNN CLASSIFIER
// ============================================================================

let compiledStrip = [];   // what the person has WRITTEN (shown as symbols)
let compiledVecs = [];    // the 88 numbers at the moment each sign locked in (null for test strips)
let runStrip = null;      // what was last RUN in Hydra (null = nothing run yet)
let trainerMode = false;  // T toggles trainer controls; visitors never see them
let lockFlash = 0;        // frames of white border after a sign locks in
let trainingData = [];
let isRecording = false;
let latestHands = [];
let motionHistory = [];
let currentPrediction = null;
let holdFrames = 0;
const LOCK_THRESHOLD = 28;

let videoEl;
const selectEl = document.getElementById("gesture-select");
const recordBtn = document.getElementById("btn-record");

// Populate gesture dropdown
Object.keys(SYMBOLS).forEach((key) => {
  const opt = document.createElement("option");
  opt.value = key;
  opt.textContent = `${SYMBOLS[key].cat} // ${key}`;
  selectEl.appendChild(opt);
});

// UI Controls
recordBtn.addEventListener("mousedown", () => setRecording(true));
recordBtn.addEventListener("mouseup", () => setRecording(false));
recordBtn.addEventListener("mouseleave", () => setRecording(false));

document.getElementById("btn-undo").onclick = () => undoLast();
document.getElementById("btn-clear").onclick = () => clearStrip();
document.getElementById("btn-run").onclick = () => runProgram();
document.getElementById("btn-output").onclick = () => openOutputWindow();

function undoLast() {
  compiledStrip.pop();
  compiledVecs.pop();
  compileAndRender();
}

function clearStrip() {
  compiledStrip = [];
  compiledVecs = [];
  compileAndRender();
}

// Second window: output.html (projector) listens on this channel
const outputChannel = new BroadcastChannel("gesture-hydra");
outputChannel.onmessage = (e) => {
  // A newly opened output window asks for the program that is currently running
  if (e.data && e.data.type === "hello" && runStrip) {
    outputChannel.postMessage({ type: "run", strip: runStrip });
  playScore();
  }
};

function openOutputWindow() {
  window.open("output.html", "gesture-hydra-output", "width=1280,height=720");
}

// WRITE → RUN: the strip only reaches Hydra when the person chooses to run it
function runProgram() {
  runHydraPipeline(compiledStrip);
  runStrip = [...compiledStrip];
  outputChannel.postMessage({ type: "run", strip: runStrip });
  updateRunStatus();
  const wrap = document.getElementById("hydra-canvas").parentElement;
  wrap.classList.add("just-ran");
  setTimeout(() => wrap.classList.remove("just-ran"), 350);
}

function updateRunStatus() {
  const el = document.getElementById("run-status");
  // The status label was removed from the layout; the RUN button shows it instead
  document.getElementById("btn-run").classList.toggle(
    "needs-run",
    compiledStrip.length > 0 && !(runStrip && runStrip.length === compiledStrip.length &&
      runStrip.every((t, i) => t === compiledStrip[i]))
  );
  if (!el) return;
  const same = runStrip && runStrip.length === compiledStrip.length &&
               runStrip.every((t, i) => t === compiledStrip[i]);
  el.classList.remove("stale", "ran");
  if (compiledStrip.length === 0 && !runStrip) {
    el.textContent = "NOTHING WRITTEN YET";
  } else if (same) {
    el.textContent = "RUNNING IN HYDRA";
    el.classList.add("ran");
  } else {
    el.textContent = "NOT RUN YET · PRESS RUN ▶";
    el.classList.add("stale");
  }
}

function setTrainerMode(on) {
  trainerMode = on;
  document.body.classList.toggle("trainer", on);
  if (!on) setRecording(false);
}

// Load the trained gestures automatically (needs Live Server, not file://)
function autoLoadModel() {
  const badge = document.getElementById("camera-status");
  fetch("gestures.json")
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      trainingData = data;
      document.getElementById("sample-counter").textContent = `SAMPLES: ${trainingData.length}`;
      badge.textContent = `READY · ${trainingData.length} TRAINED SAMPLES`;
    })
    .catch(() => {
      badge.textContent = "NO MODEL LOADED · PRESS T → LOAD JSON";
    });
}

document.getElementById("btn-export").onclick = () => {
  const blob = new Blob([JSON.stringify(trainingData)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "gestures.json";
  a.click();
};

document.getElementById("json-upload").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    trainingData = JSON.parse(ev.target.result);
    document.getElementById("sample-counter").textContent = `SAMPLES: ${trainingData.length}`;
  };
  reader.readAsText(file);
};

// Train directly from uploaded MP4/WebM video clips
document.getElementById("video-upload").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const targetLabel = selectEl.value;
  const statusBadge = document.getElementById("camera-status");
  const url = URL.createObjectURL(file);

  const clipVideo = document.createElement("video");
  clipVideo.src = url;
  clipVideo.muted = true;
  clipVideo.playsInline = true;

  const videoHands = new Hands({
    locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });
  videoHands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.65,
    minTrackingConfidence: 0.6
  });

  let clipHistory = [];
  let addedCount = 0;

  videoHands.onResults((results) => {
    const hands = results.multiHandLandmarks || [];
    if (hands.length === 0) return;

    pushMotionFrame(clipHistory, hands);
    const vec = buildFeatureVector(hands, clipHistory);
    if (vec) {
      trainingData.push({ label: targetLabel, vector: vec });
      addedCount++;
      document.getElementById("sample-counter").textContent = `SAMPLES: ${trainingData.length}`;
    }
  });

  clipVideo.onloadeddata = () => {
    statusBadge.textContent = `EXTRACTING ${targetLabel}...`;
    clipVideo.play();

    const stepFrame = async () => {
      if (clipVideo.paused || clipVideo.ended) {
        statusBadge.textContent = `DONE: +${addedCount} SAMPLES FOR ${targetLabel}`;
        URL.revokeObjectURL(url);
        return;
      }
      await videoHands.send({ image: clipVideo });
      requestAnimationFrame(stepFrame);
    };
    stepFrame();
  };
};

function setRecording(state) {
  isRecording = state;
  recordBtn.classList.toggle("recording", state);
  recordBtn.textContent = state ? "RECORDING..." : "HOLD [SPACE] TO RECORD";
}

function setStrip(newStrip) {
  // Test strips only WRITE; they still need RUN like a signed strip
  compiledStrip = [...newStrip];
  compiledVecs = newStrip.map(() => null);
  compileAndRender();
}

function copyHydraCode() {
  const text = document.getElementById("hydra-code-output").textContent;
  navigator.clipboard.writeText(text);
}

// Writing only updates the symbols. Hydra waits for RUN.
function compileAndRender() {
  renderScore(compiledStrip);
  updateRunStatus();
}

window.addEventListener("keydown", (e) => {
  if (document.activeElement === selectEl) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (trainerMode) setRecording(true);   // visitors can't add training data by accident
  } else if (e.code === "Enter") {
    e.preventDefault();
    runProgram();
  } else if (e.code === "Backspace") {
    e.preventDefault();
    undoLast();
  } else if (e.code === "KeyC") {
    clearStrip();
  } else if (e.code === "KeyF") {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  } else if (e.code === "KeyG") {
    scoreGrid = !scoreGrid;
    renderScore(compiledStrip);
  } else if (e.code === "KeyO") {
    openOutputWindow();
  } else if (e.code === "KeyT") {
    setTrainerMode(!trainerMode);
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "Space") setRecording(false);
});

// ============================================================================
// P5.JS LIFECYCLE & MEDIAPIPE CAMERA LOOP
// ============================================================================

function setup() {
  pixelDensity(1);
  const cnv = createCanvas(windowWidth, windowHeight);  // full-screen camera
  cnv.parent("p5-mount");

  videoEl = createCapture(VIDEO, () => {
    document.getElementById("camera-status").textContent = "CAMERA ACTIVE";
  });
  videoEl.size(640, 400);
  videoEl.hide();

  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6
  });

  hands.onResults((results) => {
    latestHands = results.multiHandLandmarks || [];
    pushMotionFrame(motionHistory, latestHands);
  });

  const camera = new Camera(videoEl.elt, {
    onFrame: async () => {
      await hands.send({ image: videoEl.elt });
    },
    width: 640,
    height: 400
  });
  camera.start();

  compileAndRender();
  runHydraPipeline([]);   // start on a blank screen
  autoLoadModel();
}

function draw() {
  background(14);

  // Mirrored camera feed, scaled to cover the whole screen (grey via CSS)
  const vw = videoEl.width, vh = videoEl.height;
  const k = Math.max(width / vw, height / vh);
  const dw = vw * k, dh = vh * k;
  const ox = (width - dw) / 2, oy = (height - dh) / 2;
  push();
  translate(width, 0);
  scale(-1, 1);
  image(videoEl, ox, oy, dw, dh);
  pop();

  // Monochrome hand landmarks, mapped onto the full-screen image
  for (let hand of latestHands) {
    noStroke();
    fill(255);        // white hand points, same as the score
    for (let lm of hand) {
      circle(ox + (1 - lm.x) * dw, oy + lm.y * dh, 9);
    }
  }

  // Flash when a sign locks into the strip
  if (lockFlash > 0) {
    noFill();
    stroke(255, map(lockFlash, 0, 12, 0, 255));
    strokeWeight(10);
    rect(5, 5, width - 10, height - 10);
    lockFlash--;
  }

  // Recording border
  if (isRecording) {
    noFill();
    stroke(255);
    strokeWeight(6);
    rect(3, 3, width - 6, height - 6);
  }

  const vec = buildFeatureVector(latestHands, motionHistory);

  if (isRecording && vec) {
    trainingData.push({ label: selectEl.value, vector: vec });
    document.getElementById("sample-counter").textContent = `SAMPLES: ${trainingData.length}`;
  }

  // Live inference & lock progress
  const liveLabelEl = document.getElementById("live-label");
  const lockBarEl = document.getElementById("lock-bar");
  const lockPctEl = document.getElementById("lock-percent");

  if (!isRecording && vec && trainingData.length > 0) {
    const pred = predictGesture(vec);
    if (pred && pred.confidence > 0.65) {
      liveLabelEl.textContent = pred.label;
      if (currentPrediction === pred.label) {
        holdFrames++;
        if (holdFrames === LOCK_THRESHOLD) {
          compiledStrip.push(pred.label);
          compiledVecs.push(vec.slice());
          compileAndRender();
          lockFlash = 12;
        }
      } else {
        currentPrediction = pred.label;
        holdFrames = 0;
      }
    } else {
      currentPrediction = null;
      holdFrames = 0;
      liveLabelEl.textContent = "—";
    }
  } else {
    holdFrames = 0;
    liveLabelEl.textContent = isRecording ? `RECORDING ${selectEl.value}` : "—";
  }

  const pct = Math.min(100, Math.round((holdFrames / LOCK_THRESHOLD) * 100));
  lockBarEl.style.width = `${pct}%`;
  lockPctEl.textContent = `${pct}%`;
}

// ============================================================================
// FEATURE EXTRACTION & KNN CLASSIFIER
// ============================================================================

function pushMotionFrame(historyArr, hands) {
  let center = { x: 0.5, y: 0.5, spread: 0 };
  if (hands.length === 1) {
    center.x = hands[0][0].x;
    center.y = hands[0][0].y;
    center.spread = Math.hypot(hands[0][4].x - hands[0][8].x, hands[0][4].y - hands[0][8].y);
  } else if (hands.length === 2) {
    center.x = (hands[0][0].x + hands[1][0].x) / 2;
    center.y = (hands[0][0].y + hands[1][0].y) / 2;
    center.spread = Math.hypot(hands[0][0].x - hands[1][0].x, hands[0][0].y - hands[1][0].y);
  }
  historyArr.push(center);
  if (historyArr.length > 25) historyArr.shift();
}

function buildFeatureVector(hands, historyArr) {
  if (!hands || hands.length === 0) return null;
  let vec = [];

  for (let h = 0; h < 2; h++) {
    if (hands[h]) {
      let lm = hands[h];
      let wrist = lm[0];
      let scale = Math.max(0.01, Math.hypot(wrist.x - lm[9].x, wrist.y - lm[9].y));
      for (let i = 0; i < 21; i++) {
        vec.push((lm[i].x - wrist.x) / scale);
        vec.push((lm[i].y - wrist.y) / scale);
      }
    } else {
      for (let i = 0; i < 42; i++) vec.push(0);
    }
  }

  let dxTotal = 0, dyTotal = 0, dSpread = 0, jitter = 0;
  if (historyArr.length >= 2) {
    let first = historyArr[0];
    let last = historyArr[historyArr.length - 1];
    dSpread = (last.spread - first.spread) * 5.0;
    dyTotal = (last.y - first.y) * 5.0;
    for (let i = 1; i < historyArr.length; i++) {
      dxTotal += Math.abs(historyArr[i].x - historyArr[i - 1].x);
      jitter += Math.hypot(
        historyArr[i].x - historyArr[i - 1].x,
        historyArr[i].y - historyArr[i - 1].y
      );
    }
  }
  vec.push(dSpread, dyTotal, dxTotal * 2.0, jitter * 2.0);
  return vec;
}

function predictGesture(vec) {
  if (!vec || trainingData.length === 0) return null;
  let distances = trainingData.map((sample) => {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
      let diff = vec[i] - sample.vector[i];
      sum += diff * diff;
    }
    return { label: sample.label, dist: Math.sqrt(sum) };
  });

  distances.sort((a, b) => a.dist - b.dist);
  let topK = distances.slice(0, Math.min(3, distances.length));
  let counts = {};
  let bestLabel = topK[0].label;
  let maxCount = 0;

  for (let item of topK) {
    counts[item.label] = (counts[item.label] || 0) + 1;
    if (counts[item.label] > maxCount) {
      maxCount = counts[item.label];
      bestLabel = item.label;
    }
  }

  let confidence = Math.max(0, Math.min(1, 1 - topK[0].dist / 12.0));
  return { label: bestLabel, confidence };
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  renderScore(compiledStrip); // redraw the grid to the new width
}
