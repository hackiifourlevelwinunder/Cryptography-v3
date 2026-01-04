import crypto from "crypto";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());

// ===== PATH SETUP =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// ===== CONFIG =====
const SECRET_KEY = process.env.SECRET_KEY || "CHANGE_THIS_SECRET_KEY";
const RESET_HOUR = 5;
const RESET_MIN = 30;

// ===== STATE =====
let currentRound = null;   // screen par dikhne wala (FINAL)
let pendingRound = null;   // hidden RNG (next)
let history = [];

// ===== IST TIME =====
function getIST() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

// ===== PERIOD LOGIC =====
// YYYYMMDD100010000 + (minute + 1)
function getPeriodData() {
  const now = getIST();

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const resetMinutes = RESET_HOUR * 60 + RESET_MIN;

  const roundIndex =
    minutesNow >= resetMinutes
      ? minutesNow - resetMinutes + 1
      : 1440 - resetMinutes + minutesNow + 1;

  const base = `${y}${m}${d}100010000`;
  const period = base + String(roundIndex).padStart(3, "0");

  const secondsLeft = 60 - now.getSeconds();

  return { period, roundIndex, secondsLeft };
}

// ===== HIGH FREQUENCY CRYPTO RNG =====
function generatePendingRound() {
  const { period, roundIndex } = getPeriodData();

  const seed = crypto
    .createHash("sha256")
    .update(SECRET_KEY + period + roundIndex)
    .digest("hex");

  const number = parseInt(seed.slice(0, 12), 16) % 10;

  pendingRound = {
    period,
    number,
    time: getIST().toISOString()
  };
}

// ===== TIMER CONTROL (FINAL RULE) =====
setInterval(() => {
  const sec = getIST().getSeconds();

  // 00 sec → next round RNG generate (HIDDEN)
  if (sec === 0) {
    generatePendingRound();
  }

  // 45 sec → previous = FINAL (freeze)
  if (sec === 45 && pendingRound) {
    currentRound = pendingRound;
  }

  // 59 sec → history ADD (LOCK)
  if (sec === 59 && currentRound) {
    history.unshift(currentRound);
    history = history.slice(0, 20);
  }
}, 1000);

// ===== API =====
app.get("/state", (req, res) => {
  const { period, secondsLeft } = getPeriodData();

  res.json({
    date: getIST().toISOString().slice(0, 10),
    time: getIST().toLocaleTimeString(),
    countdown: secondsLeft,
    period,
    number: currentRound ? currentRound.number : "-",
    history
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("CRYPTO RNG FINAL (45s FREEZE, 59s HISTORY) RUNNING");
});
