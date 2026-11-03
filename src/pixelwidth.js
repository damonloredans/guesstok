import settings from './settings.js';

export function pixelWidthFor(stage) {
  const { pixelWidths } = settings;
  return pixelWidths[Math.min(Math.max(stage, 0), pixelWidths.length - 1)];
}

// Where a round is in its sharpening: the picture is at `stage`, and a wipe line is sweeping down it,
// making the part it has passed look like `next`. The last stage has no wipe (next === stage).
export function wipeState(elapsedMs, stageMs, stages) {
  const e = Math.max(0, elapsedMs);
  const stage = Math.min(stages - 1, Math.floor(e / stageMs));
  if (stage === stages - 1) return { stage, next: stage, progress: 0 };
  return { stage, next: stage + 1, progress: (e % stageMs) / stageMs };
}
