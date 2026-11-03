import settings from './settings.js';

// Sound effects are synthesised here (no files), built around settings.audio.rootHz so they can match your music.
// Music: drop a file at settings.audio.bgmUrl (default audio/bgm.mp3); without one the game is just silent.
export function createAudio() {
  const { bgmUrl, bgmVolume, sfxVolume, rootHz } = settings.audio;
  const note = (semitones) => rootHz * 2 ** (semitones / 12); // semitones above (or below) the root note

  const ctx = new AudioContext();
  const sfx = ctx.createGain();
  sfx.gain.value = sfxVolume;
  sfx.connect(ctx.destination);

  const bgm = new Audio(bgmUrl);
  bgm.loop = true;
  bgm.volume = bgmVolume;

  // Browsers keep sound off until the page is clicked (OBS and Live Studio browser sources usually don't).
  const hint = Object.assign(document.createElement('p'), { textContent: 'Click anywhere to turn sound on' });
  hint.style.cssText = 'position:fixed;left:8px;bottom:8px;margin:0;padding:2px 6px;font:12px sans-serif;color:#dff7ff;background:#04090f;border:1px solid #3fe0ff;';
  // Without a click, ctx.resume() can stay pending forever, so wait for a click or key instead of awaiting it.
  const resume = () => ctx.resume();
  function started() {
    hint.remove();
    removeEventListener('pointerdown', resume);
    removeEventListener('keydown', resume);
    bgm.play().catch(() => {}); // no music file: nothing to play
  }
  ctx.addEventListener('statechange', () => { if (ctx.state === 'running') started(); });
  if (ctx.state === 'running') started();
  else {
    document.body.append(hint);
    addEventListener('pointerdown', resume);
    addEventListener('keydown', resume);
  }

  const on = () => ctx.state === 'running';

  function tone(freq, delay, dur, { type = 'sine', gain = 0.3, slideTo } = {}) {
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env).connect(sfx);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // filtered noise sweeping from one frequency to another
  function whoosh(fromHz, toHz, dur, gain = 0.4) {
    const t0 = ctx.currentTime;
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    buf.getChannelData(0).forEach((_, i, d) => { d[i] = Math.random() * 2 - 1; });
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(fromHz, t0);
    filter.frequency.exponentialRampToValueAtTime(toHz, t0 + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.4);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(env).connect(sfx);
    src.start(t0);
  }

  let lastGuess = 0;
  const play = (fn) => (...args) => { if (on()) fn(...args); };

  return {
    roundStart: play(() => { tone(note(0), 0, 0.15, { type: 'triangle' }); tone(note(7), 0.09, 0.2, { type: 'triangle' }); }),
    sharpen: play(() => tone(note(12), 0, 0.08, { type: 'square', gain: 0.06 })),
    correct: play(() => [0, 4, 7, 12].forEach((s, i) => tone(note(s), i * 0.08, 0.35, { type: 'triangle' }))),
    timeUp: play(() => tone(note(-5), 0, 0.6, { type: 'sawtooth', gain: 0.15, slideTo: note(-12) })),
    gift: play(() => [12, 16, 19, 24].forEach((s, i) => tone(note(s), i * 0.05, 0.25, { gain: 0.2 }))),
    guess: play(() => { // rate-limited so a flood of chat is not a buzz
      if (ctx.currentTime - lastGuess < 0.12) return;
      lastGuess = ctx.currentTime;
      tone(note(19), 0, 0.04, { gain: 0.05 });
    }),
    zoomStart: play(() => whoosh(300, 2500, 0.5)),
    reveal: play(() => whoosh(2500, 300, 0.5)),
  };
}
