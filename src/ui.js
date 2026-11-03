// On-screen overlay. Viewer names and guesses come from live chat: they only ever go in via textContent.
const GUESS_MS = 4000; // how long a guess floats over the item
const MAX_GUESSES = 4; // cap so a flood of chat cannot cover the item
const DEV_LIKES = 25; // likesPerStage is 100, so one like per click could not exercise the stage step by hand

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function scoreRow(tag, user, points) {
  const row = el(tag);
  row.append(el('span', 'hud-name', user), el('span', 'hud-points', `${points} pts`));
  return row;
}

export function createUi(root, bus) {
  const round = el('span', 'hud-round');
  const difficulty = el('span', 'hud-difficulty');
  const header = el('header', 'hud-header');
  header.append(round, difficulty);

  const canvas = el('canvas');
  const guesses = el('div', 'hud-guesses');
  const view = el('div', 'hud-view');
  view.append(canvas, guesses);

  const meterBar = el('div', 'hud-meter-bar');
  const meterLabel = el('span', 'hud-meter-label');
  const meter = el('div', 'hud-meter');
  meter.append(meterBar, meterLabel);

  const result = el('section', 'hud-result');

  const board = el('ol', 'hud-board');
  const boardWrap = el('section', 'hud-board-wrap');
  boardWrap.append(el('h2', 'hud-board-title', 'Today'), board);

  root.append(header, view, meter, result, boardWrap);

  if (new URLSearchParams(location.search).get('dev') === '1') document.body.append(devPanel(bus));

  return {
    canvas,
    showRound(roundNumber, diff) {
      round.textContent = `Round ${roundNumber}`;
      difficulty.textContent = diff;
      result.replaceChildren();
    },
    // stage is 0-based, as round.stage() returns it: stage 0 fills the first segment
    setStage(stage, stages) {
      if (meterBar.children.length !== stages) {
        meterBar.replaceChildren(...Array.from({ length: stages }, () => el('span', 'hud-meter-seg')));
      }
      const filled = Math.min(Math.max(stage + 1, 0), stages);
      [...meterBar.children].forEach((seg, i) => seg.classList.toggle('is-on', i < filled));
      meterLabel.textContent = `Stage ${filled}/${stages}`;
    },
    floatGuess(user, text) {
      const g = el('div', 'hud-guess');
      g.append(el('span', 'hud-guess-user', user), el('span', 'hud-guess-text', text));
      g.style.animationDuration = `${GUESS_MS}ms`;
      guesses.append(g);
      while (guesses.children.length > MAX_GUESSES) guesses.firstElementChild.remove();
      setTimeout(() => g.remove(), GUESS_MS);
    },
    showResult(answer, winners) {
      const list = el('ul', 'hud-winners');
      if (winners.length) list.append(...winners.map((w) => scoreRow('li', w.user, `+${w.points}`)));
      else list.append(el('li', '', 'Nobody got it'));
      result.replaceChildren(el('p', 'hud-answer', answer), list);
    },
    showBoard(rows) {
      board.replaceChildren(
        ...rows.map((r, i) => {
          const row = scoreRow('li', r.user, r.points);
          row.prepend(el('span', 'hud-rank', `#${i + 1}`));
          if (i === 0) row.classList.add('is-top');
          return row;
        }),
      );
    },
  };
}

function devPanel(bus) {
  const panel = el('aside', 'dev-panel');
  panel.setAttribute('aria-label', 'Dev controls');

  const user = el('input');
  user.value = 'dev';
  const text = el('input');
  text.placeholder = 'guess + Enter';

  const userLabel = el('label', '', 'User');
  userLabel.append(user);
  const textLabel = el('label', '', 'Guess');
  textLabel.append(text);

  text.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing || !text.value.trim()) return;
    bus.emit('guess', { user: user.value, text: text.value });
    text.value = '';
  });

  const like = el('button', '', `Like x${DEV_LIKES}`);
  like.type = 'button';
  like.addEventListener('click', () => bus.emit('like', { user: user.value, count: DEV_LIKES }));
  const gift = el('button', '', 'Gift');
  gift.type = 'button';
  gift.addEventListener('click', () => bus.emit('gift', { user: user.value, count: 1 }));

  panel.append(userLabel, textLabel, like, gift);
  return panel;
}
