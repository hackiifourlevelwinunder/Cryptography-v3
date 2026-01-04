const express = require("express");
const crypto = require("crypto");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const RESET_HOUR = 5;
const RESET_MIN = 30;
const SERVER_SEED = "PRIVATE_DAILY_SERVER_SEED";

let history = [];

function getIST() {
  const now = new Date();
  return new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
}

function getGameDate(now) {
  const reset = new Date(now);
  reset.setHours(RESET_HOUR, RESET_MIN, 0, 0);
  if (now < reset) now.setDate(now.getDate() - 1);
  return now.toISOString().slice(0, 10).replace(/-/g, "");
}

function getRoundIndex(now) {
  const reset = new Date(now);
  reset.setHours(RESET_HOUR, RESET_MIN, 0, 0);
  if (now < reset) reset.setDate(reset.getDate() - 1);
  return Math.floor((now - reset) / 60000);
}

function getPeriod(now) {
  return `${getGameDate(now)}100010000${getRoundIndex(now)}`;
}

function generateNumber(period) {
  const hash = crypto
    .createHash("sha256")
    .update(SERVER_SEED + "|" + period)
    .digest("hex");

  return parseInt(hash.substring(0, 8), 16) % 10;
}

app.get("/api/result", (req, res) => {
  const now = getIST();
  const seconds = now.getSeconds();
  const period = getPeriod(now);
  const number = generateNumber(period);

  if (!history.find(h => h.period === period)) {
    history.unshift({
      period,
      number,
      time: now.toLocaleTimeString("en-IN")
    });
    history = history.slice(0, 20);
  }

  res.json({
    period,
    number,
    preview: seconds >= 30,
    seconds,
    history
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log("RNG Server Running");
});
