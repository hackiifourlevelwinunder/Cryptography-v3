import crypto from "crypto";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());

// ===== PATH FIX =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== STATIC PUBLIC FOLDER =====
app.use(express.static(path.join(__dirname, "public")));

// ===== CONFIG =====
const SECRET_KEY = process.env.SECRET_KEY || "CHANGE_THIS_SECRET_KEY";
const RESET_HOUR = 5;
const RESET_MIN = 30;

// ===== STATE =====
let currentRound = null;
let history = [];

// ===== IST TIME =====
function getIST() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
}

// ===== PERIOD LOGIC =====
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

// ===== CRYPTOGRAPHY RNG (FRESH EVERY ROUND) =====
function generateRound() {
  const { period, roundIndex } = getPeriodData();

  const seed = crypto
    .createHash("sha256")
    .update(SECRET_KEY + period + roundIndex)
    .digest("hex");

  const number = parseInt(seed.slice(0, 12), 16) % 10;

  const data = {
    period,
    number,
    time: getIST().toISOString()
  };

  history.unshift(data);
  history = history.slice(0, 20);
  currentRound = data;
}

// ===== INIT + LOOP =====
generateRound();
setInterval(generateRound, 60000);

// ===== API =====
app.get("/state", (req, res) => {
  const { period, secondsLeft } = getPeriodData();
  res.json({
    date: getIST().toISOString().slice(0, 10),
    time: getIST().toLocaleTimeString(),
    countdown: secondsLeft,
    period,
    number: currentRound.number,
    history
  });
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("CRYPTO RNG SERVER RUNNING");
});
