import settings from './settings.js';
import { createBus } from './events.js';
import { createGiftBook } from './score.js';
import { createRound, createPicker } from './round.js';
import { createLeaderboard, browserStore } from './leaderboard.js';
import { createPixelView } from './pixel.js';
import { createUi } from './ui.js';

const BOARD_ROWS = 5;
const TICK_MS = 100;
const MAX_USER = 40;
const MAX_TEXT = 100;
const FAILS_BEFORE_WAIT = 5; // after this many failed loads in a row, wait between attempts
const FAIL_WAIT_MS = 1000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isCount = (n) => Number.isInteger(n) && n > 0;
const str = (s, max) => (typeof s === 'string' ? s.trim().slice(0, max) : '');
// Wraps a handler so one throwing listener cannot affect the others or the loop.
const safe = (fn) => (arg) => {
  try { fn(arg); } catch (err) { console.error(err); }
};

const root = document.getElementById('app');
const bus = createBus();
const ui = createUi(root, bus);
const giftBook = createGiftBook();
const leaderboard = createLeaderboard(browserStore());

function fatal(message) {
  root.replaceChildren(Object.assign(document.createElement('p'), { className: 'hud-fatal', textContent: message }));
}

const refreshBoard = () => ui.showBoard(leaderboard.top(BOARD_ROWS, Date.now()));

let items = [];
try {
  items = await (await fetch('src/items.json')).json();
} catch (err) {
  console.error(err);
}
if (!Array.isArray(items) || !items.length) {
  fatal('No items to play: src/items.json is missing, empty or unreadable.');
  throw new Error('no items');
}

const view = createPixelView(ui.canvas);
const picker = createPicker(items);
let live = null; // { round, item, startedAt } while a round is running, else null

bus.on('guess', safe((e) => {
  const user = str(e?.user, MAX_USER);
  const text = str(e?.text, MAX_TEXT);
  if (!live || !user || !text) return;
  ui.floatGuess(user, text);
  const now = Math.max(Date.now(), live.startedAt);
  const { points } = live.round.guess({ user, text, now, multiplier: giftBook.multiplier(user, now) });
  if (points > 0) {
    leaderboard.add(user, points, now);
    refreshBoard();
  }
}));
bus.on('like', safe((e) => {
  if (live && isCount(e?.count)) live.round.addLikes(e.count);
}));
bus.on('gift', safe((e) => {
  const user = str(e?.user, MAX_USER);
  if (user && isCount(e?.count)) giftBook.add(user, e.count, Date.now());
}));

async function loadItem(roundNumber) {
  for (let fails = 0; ; fails++) {
    const item = picker.next(roundNumber);
    try {
      await view.show(item.file);
      return item;
    } catch (err) {
      console.warn(`could not load ${item.file}`, err);
      if (fails + 1 >= FAILS_BEFORE_WAIT) await sleep(FAIL_WAIT_MS);
    }
  }
}

async function playRound(roundNumber) {
  refreshBoard(); // also picks up the daily reset
  const item = await loadItem(roundNumber);
  const startedAt = Date.now();
  const round = createRound({ item, startedAt, settings });
  ui.showRound(roundNumber, item.difficulty);
  view.setStage(0);
  ui.setStage(0, settings.stages);
  live = { round, item, startedAt };

  let shown = 0;
  while (!round.isOver(Date.now())) {
    await sleep(TICK_MS);
    try {
      const stage = round.stage(Date.now());
      if (stage !== shown) {
        shown = stage;
        view.setStage(stage);
        ui.setStage(stage, settings.stages);
      }
    } catch (err) { console.error(err); }
  }
  live = null;
  ui.showResult(item.name, round.winners);
  await sleep(settings.pauseSeconds * 1000);
}

for (let n = 1; ; n++) {
  try { await playRound(n); } catch (err) { live = null; console.error(err); await sleep(FAIL_WAIT_MS); }
}
