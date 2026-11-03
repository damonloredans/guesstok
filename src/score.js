import settings from './settings.js';

export const pointsFor = (stage, multiplier) => settings.pointsByStage[stage] * multiplier;

export function createGiftBook() {
  const gifts = new Map(); // user -> gift timestamps (ms), one per gift

  // Drops expired gifts so the book cannot grow without bound.
  const live = (user, now) => {
    const kept = (gifts.get(user) ?? []).filter((t) => now - t < settings.giftSeconds * 1000);
    if (kept.length) gifts.set(user, kept);
    else gifts.delete(user);
    return kept;
  };

  return {
    add(user, count, now) {
      const kept = live(user, now);
      for (let i = 0; i < count; i++) kept.push(now);
      if (kept.length) gifts.set(user, kept);
    },
    multiplier: (user, now) => 1 + live(user, now).length,
  };
}
