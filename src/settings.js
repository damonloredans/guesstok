export default {
  roundSeconds: 15,
  stageSeconds: 3,
  stages: 5,
  pointsByStage: [5, 4, 3, 2, 1],
  giftSeconds: 30,
  likesPerStage: 100, // placeholder, tune by feel
  pauseSeconds: 5,
  leaderboardResetHour: 0,
  pixelWidths: [12, 24, 48, 96, 192], // render width per stage
  difficultyRamp: [
    { upToRound: 5, pool: ['easy'] },
    { upToRound: 15, pool: ['easy', 'medium'] },
    { upToRound: Infinity, pool: ['medium', 'hard'] },
  ],
};
