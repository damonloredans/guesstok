import settings from './settings.js';
import { createBus } from './events.js';
import { createGiftBook } from './score.js';
import { createRound, createPicker, roundKind } from './round.js';
import { createLeaderboard, browserStore } from './leaderboard.js';
import { createPixelView } from './pixel.js';
import { createUi } from './ui.js';
import { createAudio } from './audio.js';

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
const store = browserStore();
const leaderboard = createLeaderboard(store);
const ROUND_KEY = 'guesstok.round';

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

const view = createPixelView(ui.stage);
const audio = createAudio();
const picker = createPicker(items);
let live = null; // { round, item, startedAt } while a round is running, else null

bus.on('guess', safe((e) => {
  const user = str(e?.user, MAX_USER);
  const text = str(e?.text, MAX_TEXT);
  if (!live || !user || !text) return;
  const now = Math.max(Date.now(), live.startedAt);
  const multiplier = giftBook.multiplier(user, now);
  ui.floatGuess(user, text, multiplier);
  audio.guess();
  const { correct, points } = live.round.guess({ user, text, now, multiplier });
  if (correct) {
    audio.correct();
    leaderboard.add(user, points, now);
    refreshBoard();
  }
}));
bus.on('like', safe((e) => {
  if (isCount(e?.count)) view.boostSpin(e.count);
}));
bus.on('gift', safe((e) => {
  const user = str(e?.user, MAX_USER);
  if (!user || !isCount(e?.count)) return;
  const now = Date.now();
  giftBook.add(user, e.count, now);
  ui.showGift(user, giftBook.multiplier(user, now), settings.giftSeconds);
  audio.gift();
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
  const zoom = roundKind(roundNumber) === 'zoom';
  const startedAt = Date.now();
  const round = createRound({ item, startedAt, settings });
  ui.showRound(roundNumber, zoom ? 'zoom' : item.difficulty);
  view.start({ startedAt, zoom });
  audio.roundStart();
  if (zoom) audio.zoomStart();
  live = { round, item, startedAt };

  let shown = 0;
  while (!round.isOver(Date.now())) {
    await sleep(TICK_MS);
    try {
      const stage = round.stage(Date.now());
      if (stage !== shown) {
        shown = stage;
        audio.sharpen();
      }
    } catch (err) { console.error(err); }
  }
  live = null;
  view.reveal(); // whole item sharp, and a zoom round pulls back out
  if (zoom) audio.reveal();
  if (!round.winners.length) audio.timeUp();
  ui.showResult(item.name, round.winners);
  await sleep(settings.pauseSeconds * 1000);
}

// The round number keeps counting across page reloads, so a long stream can read "Round 251".
// Start somewhere else with ?round=11 (handy for testing a zoom round).
const asked = Number(new URLSearchParams(location.search).get('round'));
let n = Number.isInteger(asked) && asked > 0 ? asked : Number(store.get(ROUND_KEY)) || 1;
for (; ; n++) {
  store.set(ROUND_KEY, String(n));
  try { await playRound(n); } catch (err) { live = null; console.error(err); await sleep(FAIL_WAIT_MS); }
}
