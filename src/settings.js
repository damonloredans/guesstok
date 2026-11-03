export default {
  roundSeconds: 45,
  stageSeconds: 5,
  stages: 9, // roundSeconds / stageSeconds
  pointsByStage: [9, 8, 7, 6, 5, 4, 3, 2, 1],
  giftSeconds: 30,
  maxMultiplier: 100, // a gift adds +1 per coin it costs (a rose 1, a finger heart 5); the multiplier stops here
  pauseSeconds: 3, // how long the answer stays up before the next round
  leaderboardResetHour: 0,
  pixelWidths: [8, 12, 16, 24, 32, 48, 72, 112, 192], // render width per stage, one entry per stage
  // Difficulty of each round in a repeating loop. 'zoom' is a zoomed-in round whose item comes from zoomTier.
  pattern: ['easy', 'easy', 'easy', 'easy', 'medium', 'easy', 'easy', 'medium', 'medium', 'hard', 'zoom'],
  zoomTier: 'medium',
  zoom: 2.5, // camera zoom in a zoom round, until the reveal
  // Likes make the item spin faster for a moment.
  spin: { base: 0.6, perLike: 0.05, max: 8, decaySeconds: 3 }, // radians per second
  // Sound. rootHz is the note the sound effects are built around: set it to your music's key note so they match.
  audio: { bgmUrl: 'audio/bgm.mp3', bgmVolume: 0.25, sfxVolume: 0.5, rootHz: 440 },
};
