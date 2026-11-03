import baseSettings from './settings.js';
import { isCorrect } from './match.js';
import { pointsFor } from './score.js';
import { wipeState } from './pixelwidth.js';

// The first correct guess ends the round and is its only winner.
export function createRound({ item, startedAt, settings }) {
  let ended = false;
  const winners = [];
  const endsAt = startedAt + settings.roundSeconds * 1000;

  const stage = (now) => wipeState(now - startedAt, settings.stageSeconds * 1000, settings.stages).stage;
  const isOver = (now) => ended || now >= endsAt;

  return {
    stage,
    isOver,
    winners,
    guess({ user, text, now, multiplier }) {
      if (isOver(now) || !isCorrect(text, item)) return { correct: false, points: 0 };
      const s = stage(now);
      const points = pointsFor(s, multiplier);
      winners.push({ user, points, stage: s, multiplier });
      ended = true;
      return { correct: true, points };
    },
  };
}

// 'easy' | 'medium' | 'hard' | 'zoom' for a 1-based round number, from the repeating pattern.
export const roundKind = (roundNumber) => baseSettings.pattern[(roundNumber - 1) % baseSettings.pattern.length];

function shuffled(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Each difficulty is a shuffled deck: every item comes up once before any repeats, then it reshuffles.
export function createPicker(items, rng = Math.random) {
  const decks = new Map(); // tier -> items not yet played in the current shuffle
  let last = null;
  return {
    next(roundNumber) {
      const kind = roundKind(roundNumber);
      const tier = kind === 'zoom' ? baseSettings.zoomTier : kind;
      let deck = decks.get(tier);
      if (!deck?.length) {
        let pool = items.filter((i) => i.difficulty === tier);
        if (!pool.length) pool = items; // empty tier: fall back rather than throw
        deck = shuffled(pool, rng);
        // the next pick is the end of the deck: never the item just played
        if (deck.length > 1 && deck.at(-1) === last) [deck[0], deck[deck.length - 1]] = [deck.at(-1), deck[0]];
        decks.set(tier, deck);
      }
      last = deck.pop();
      return last;
    },
  };
}
