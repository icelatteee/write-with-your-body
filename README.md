
## What's in the folder

| File | What it does |
|---|---|
| `index.html` | **Laptop screen**: full-screen camera, your line of signs, UNDO / CLEAR / RUN |
| `output.html` | **Big screen**: the Hydra visuals, full screen |
| `gestures.json` | the trained model (19,380 recordings, 27 words). Loads by itself |
| `sketch.js` | camera, hand tracking, recognising words, buttons and keys |
| `hydra_interpreter.js` | **what each word means**: word → Hydra code. The grammar lives here |
| `datasign.js` | draws each sign from the hand's 88 numbers (way 2 · fields) |
| `symbols-punch.js` · `score.js` | draws the line of signs on the grid |
| `symbols.js` | the word list and its three kinds (object / value / motion) |
| `style.css` · `stage.css` | layout |

---

## Before you start

- **You need internet.** p5.js, MediaPipe and Hydra load from the web. If the table has no Wi-Fi, use a phone hotspot.
- **Open it with a local server, not by double-clicking.** The browser blocks the camera and `gestures.json` from a plain file. In VS Code, use **Live Server**: right-click `index.html` → *Open with Live Server*.
- Use **Chrome**, and allow camera access when it asks.
- `gestures.json` is 25 MB, so give it a few seconds to load the first time.

## Setting up the two screens

1. Plug in the second screen and set it to **Extend** (not Mirror): System Settings → Displays.
2. Open `index.html` with Live Server on the laptop.
3. Press **O** to open the output window. Drag it onto the big screen, then click it (or press **F**) to go full screen.
4. Click back on the laptop window and press **F** to make the camera full screen.

The two windows talk to each other on their own. If the output window is opened later, it picks up the last line you RAN.

## How to use it

1. Stand so **both hands are in the camera**. White dots appear on your hands.
2. Make a gesture and **hold it still** until the bar in the top-left fills (about 1 second). The camera flashes and the sign appears in the line.
3. Drop your hands, then make the next gesture. To use the same word twice, drop your hands in between.
4. Build a sentence: **object → value → motion** (e.g. CIRCLE · A FEW · RIPPLING).
5. Press **RUN** (or Enter). The big screen updates. Nothing changes until you press RUN.

## Keys

**Laptop (`index.html`)**

| Key | Does |
|---|---|
| Enter | RUN: send the line to the big screen |
| Backspace | UNDO: remove the last sign |
| C | CLEAR: start a new line |
| F | full screen on / off |
| O | open the output window |
| G | grid behind the signs on / off |
| T | trainer panel (for you, not visitors) |
| Space | record training data (only works with the trainer panel open) |

**Big screen (`output.html`)**

| Key | Does |
|---|---|
| click or F | full screen |
| H | hide / show the code overlay |

## If something goes wrong

| Problem | Try |
|---|---|
| Black screen, no camera | Check it was opened with Live Server and camera access was allowed. Close other apps using the camera (Zoom, FaceTime) |
| Top-left says "NO MODEL LOADED" | Not opened through Live Server, or `gestures.json` is missing. It should say "READY · 19380 TRAINED SAMPLES" |
| Wrong word keeps coming up | Change the hand slightly and hold again; step back so both hands are fully in frame; add more light |
| Big screen doesn't change | Press RUN. If it still doesn't, close the output window and press O again |
| Nothing loads at all | No internet (the libraries load from the web) |

**Backup:** keep a screen recording of sign → RUN → visuals on the laptop in case the camera or Wi-Fi fails on the day.
