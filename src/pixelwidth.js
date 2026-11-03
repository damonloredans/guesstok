import settings from './settings.js';

export function pixelWidthFor(stage) {
  const w = settings.pixelWidths;
  return w[Math.min(Math.max(stage, 0), w.length - 1)];
}
