import baseSettings from './settings.js';
import { isCorrect } from './match.js';
import { pointsFor } from './score.js';

export function createRound({ item, startedAt, settings }) {
  let likes = 0;
  const winners = [];
  const endsAt = startedAt + settings.roundSeconds * 1000;

  const stage = (now) =>
    Math.min(
      settings.stages - 1,
      Math.floor((now - startedAt) / settings.stageSeconds / 1000) + Math.floor(likes / settings.likesPerStage),
    );
  const isOver = (now) => now >= endsAt;

  return {
    stage,
    isOver,
    winners,
    addLikes(count) {
      likes += count;
    },
    guess({ user, text, now, multiplier }) {
      if (isOver(now) || !isCorrect(text, item)) return { correct: false, points: 0 };
      if (winners.some((w) => w.user === user)) return { correct: true, points: 0 };
      const s = stage(now);
      const points = pointsFor(s, multiplier);
      winners.push({ user, points, stage: s });
      return { correct: true, points };
    },
  };
}

export function createPicker(items, rng = Math.random) {
  let last = null;
  return {
    next(roundNumber) {
      const { pool } = baseSettings.difficultyRamp.find((r) => roundNumber <= r.upToRound);
      let eligible = items.filter((i) => pool.includes(i.difficulty));
      if (!eligible.length) eligible = items; // empty tier: fall back rather than throw
      if (eligible.length > 1) eligible = eligible.filter((i) => i !== last);
      last = eligible[Math.floor(rng() * eligible.length)];
      return last;
    },
  };
}
