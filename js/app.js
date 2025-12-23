import { mapTextBlocks, detectBlockId } from "./lines.js";
import { downloadJSON } from "./report.js";

const $ = (id) => document.getElementById(id);

let started = false;
let reading = false;
let readStartTs = null;

let samples = [];              // gaze samples
let blocks = [];               // text blocks (p elements)
let lastBlock = null;
let lineChanges = 0;
let lineBack = 0;
let lineSkip = 0;

const dot = $("dot");
const statusEl = $("status");
const overlay = $("calibOverlay");

function setStatus(msg){ statusEl.textContent = msg; }

function updateUI(){
  $("nSamples").textContent = String(samples.length);
  $("tRead").textContent = readStartTs ? (((Date.now()-readStartTs)/1000).toFixed(1) + " sn") : "-";
  $("nLineChanges").textContent = String(lineChanges);
  $("nLineBack").textContent = String(lineBack);
  $("nLineSkip").textContent = String(lineSkip);
  $("last5").textContent = JSON.stringify(samples.slice(-5), null, 2);

  $("btnCalib").disabled = !started;
  $("btnReadStart").disabled = !started || reading;
  $("btnReadStop").disabled = !reading;
  $("btnDownload").disabled = samples.length === 0;
}

async function startWebcam(){
  if (started) return;
  setStatus("Webcam başlatılıyor... (izin isteyebilir)");
  // Metin bloklarını (p) haritala
  blocks = mapTextBlocks("readingBox");

  webgazer
    .setGazeListener((data) => {
      if (!data) return;
      const x = data.x, y = data.y;

      // kırmızı nokta
      dot.style.transform = `translate(${x}px, ${y}px)`;

      if (!reading) return;

      const t = Date.now();
      const blockId = detectBlockId(y, blocks);

      if (blockId !== null) {
        if (lastBlock !== null && blockId !== lastBlock) {
          lineChanges += 1;
          if (blockId < lastBlock) lineBack += 1;
          if (blockId > lastBlock + 1) lineSkip += 1;
        }
        lastBlock = blockId;
      }

      samples.push({
        t,
        x: Math.round(x),
        y: Math.round(y),
        blockId,
        w: window.innerWidth,
        h: window.innerHeight
      });

      if (samples.length > 5000) samples.shift();
      updateUI();
    })
    .begin();

  webgazer.showVideoPreview(false).showPredictionPoints(false).applyKalmanFilter(true);

  started = true;
  setStatus("Webcam hazır. Kalibrasyon önerilir.");
  updateUI();
}

function startReading(){
  reading = true;
  samples = [];
  lastBlock = null;
  lineChanges = 0; lineBack = 0; lineSkip = 0;
  readStartTs = Date.now();
  // tekrar haritala (scroll/resize olmuş olabilir)
  blocks = mapTextBlocks("readingBox");
  setStatus("Okuma başladı.");
  updateUI();
}

function stopReading(){
  reading = false;
  const dur = (Date.now()-readStartTs)/1000;
  setStatus(`Okuma bitti. Süre: ${dur.toFixed(1)} sn`);
  updateUI();
}

// 9 nokta kalibrasyon
const points = [
  [0.15,0.15],[0.5,0.15],[0.85,0.15],
  [0.15,0.5 ],[0.5,0.5 ],[0.85,0.5 ],
  [0.15,0.85],[0.5,0.85],[0.85,0.85]
];

function runCalibration(){
  if (!started) return;
  setStatus("Kalibrasyon: Her noktaya 5 kez tıklayın.");
  overlay.style.display = "flex";
  overlay.innerHTML = "";
  let idx = 0;
  let clicks = 0;

  const place = () => {
    overlay.innerHTML = "";
    const [px, py] = points[idx];
    const p = document.createElement("div");
    p.className = "calibPoint";
    p.style.left = (px * window.innerWidth) + "px";
    p.style.top = (py * window.innerHeight) + "px";
    p.title = `Nokta ${idx+1}/9 (tık: ${clicks}/5)`;

    p.addEventListener("click", () => {
      clicks += 1;
      webgazer.recordScreenPosition(px * window.innerWidth, py * window.innerHeight, "click");
      if (clicks >= 5) {
        idx += 1;
        clicks = 0;
        if (idx >= points.length) {
          overlay.style.display = "none";
          setStatus("Kalibrasyon tamamlandı. Okumayı başlatabilirsiniz.");
          updateUI();
          return;
        }
      }
      place();
    });

    overlay.appendChild(p);
  };

  place();
}

function download(){
  const payload = {
    meta: {
      createdAt: new Date().toISOString(),
      note: "Okuma Seyri demo verisi. Tanı amaçlı değildir."
    },
    reading: {
      durationSec: readStartTs ? (Date.now()-readStartTs)/1000 : null,
      sampleCount: samples.length,
      lineChanges, lineBack, lineSkip
    },
    samples
  };
  downloadJSON(payload, "okumaseyri_demo.json");
}

// Bind
$("btnStart").addEventListener("click", startWebcam);
$("btnCalib").addEventListener("click", runCalibration);
$("btnReadStart").addEventListener("click", startReading);
$("btnReadStop").addEventListener("click", stopReading);
$("btnDownload").addEventListener("click", download);

updateUI();
