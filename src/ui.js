// On-screen overlay. Viewer names and guesses come from live chat: they only ever go in via textContent.
const GUESS_MS = 4000; // how long a guess floats over the item
const MAX_GUESSES = 8; // cap so a flood of chat cannot cover the item
const GIFT_MS = 3500; // how long a gift notice stays
const MAX_GIFTS = 3;
const BANNER_HOLD_MS = 1400; // the round's difficulty or mode stays big in the middle this long
const BANNER_FLY_MS = 700; // then takes this long to shrink up into the header badge
const LOW_SECONDS = 10; // the timer is highlighted for the last this many seconds
const DEV_LIKES = 25; // one dev click stands in for a burst of likes, enough to see the item spin faster

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

function scoreRow(tag, user, points) {
  const row = el(tag);
  row.append(el('span', 'hud-name', user), el('span', 'hud-points', points));
  return row;
}

const between = (lo, hi) => lo + Math.random() * (hi - lo);

// Removes `node` after `ms` and keeps at most `max` of the container's children.
function show(container, node, ms, max) {
  container.append(node);
  while (container.children.length > max) container.firstElementChild.remove();
  setTimeout(() => node.remove(), ms);
}

export function createUi(root, bus) {
  const round = el('span', 'hud-round');
  const difficulty = el('span', 'hud-difficulty');
  const timer = el('span', 'hud-timer');
  const header = el('header', 'hud-header');
  header.append(round, timer, difficulty);

  // two canvases of the same scene (see pixel.js) and the wipe line between the sharp and the chunky part
  const base = el('canvas');
  const top = el('canvas', 'hud-top');
  const scan = el('div', 'hud-scan');
  const guesses = el('div', 'hud-guesses');
  const gifts = el('div', 'hud-gifts');
  const view = el('div', 'hud-view');
  view.append(base, top, scan, guesses, gifts);

  const result = el('section', 'hud-result');

  const board = el('ol', 'hud-board');
  const boardWrap = el('section', 'hud-board-wrap');
  boardWrap.append(el('h2', 'hud-board-title', 'Today'), board);

  const help = el('ul', 'hud-help'); // how viewers play, filled by showHelp
  root.append(header, view, result, boardWrap, help);

  if (new URLSearchParams(location.search).get('dev') === '1') document.body.append(devPanel(bus));

  // The round's difficulty or mode flashes big in the middle of the item, then shrinks and flies up into the header badge.
  let announcing = null; // { banner, timer, anim } for the one in progress
  function endAnnounce() {
    if (!announcing) return;
    clearTimeout(announcing.timer);
    announcing.anim?.cancel();
    announcing.banner.remove();
    announcing = null;
    difficulty.style.visibility = 'visible';
  }
  function announce(label, roundNumber) {
    endAnnounce();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // just the badge
    const banner = el('div', `hud-banner is-${label}`);
    banner.append(el('p', 'hud-banner-title', label === 'zoom' ? 'zoom round' : label), el('p', 'hud-banner-sub', `Round ${roundNumber}`));
    banner.style.left = `${view.offsetLeft + view.offsetWidth / 2}px`;
    banner.style.top = `${view.offsetTop + view.offsetHeight / 2}px`;
    root.append(banner);
    difficulty.style.visibility = 'hidden'; // the banner lands here
    const state = (announcing = { banner, timer: 0, anim: null });
    state.timer = setTimeout(() => {
      const from = banner.getBoundingClientRect();
      const to = difficulty.getBoundingClientRect();
      const dx = to.left + to.width / 2 - (from.left + from.width / 2);
      const dy = to.top + to.height / 2 - (from.top + from.height / 2);
      state.anim = banner.animate(
        [
          { transform: 'translate(-50%, -50%) scale(1)' },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${to.width / from.width})` },
        ],
        { duration: BANNER_FLY_MS, easing: 'ease-in-out', fill: 'forwards' },
      );
      state.anim.onfinish = () => { if (announcing === state) endAnnounce(); };
    }, BANNER_HOLD_MS);
  }

  return {
    stage: { base, top, scan },
    // the always-visible "how to play" line: what chat, gifts and taps do
    showHelp(giftSeconds) {
      const row = (key, text) => {
        const li = el('li');
        li.append(el('b', 'hud-help-key', key), ` ${text}`);
        return li;
      };
      help.replaceChildren(
        row('Chat', 'type your guess'),
        row('Gift', `+1 multiplier for ${giftSeconds}s`),
        row('Tap', 'spin the item faster'),
      );
    },
    showRound(roundNumber, label) {
      round.textContent = `Round ${roundNumber}`;
      difficulty.textContent = label === 'zoom' ? 'zoom round' : label;
      difficulty.className = `hud-difficulty is-${label}`; // easy, medium, hard or zoom: styled differently in theme.css
      announce(label, roundNumber);
      result.replaceChildren();
    },
    // seconds left in the round, or null to clear it; the last LOW_SECONDS get a frame as well as a stronger colour
    setTimer(seconds) {
      timer.textContent = seconds === null ? '' : `${seconds}s`;
      timer.classList.toggle('is-low', seconds !== null && seconds <= LOW_SECONDS);
    },
    // multiplier > 1 means the viewer has gifts running: shown next to their guess
    floatGuess(user, text, multiplier = 1) {
      const g = el('div', 'hud-guess');
      g.append(el('span', 'hud-guess-user', user), el('span', 'hud-guess-text', text));
      if (multiplier > 1) g.append(el('span', 'hud-guess-mult', `x${multiplier}`));
      g.style.setProperty('--x', `${between(2, 45)}%`);
      g.style.setProperty('--y', `${between(6, 80)}%`);
      g.style.animationDuration = `${GUESS_MS}ms`;
      show(guesses, g, GUESS_MS, MAX_GUESSES);
    },
    showGift(user, multiplier, seconds) {
      const g = el('div', 'hud-gift');
      g.append(el('span', 'hud-guess-user', user), el('span', '', `gift! x${multiplier} for ${seconds}s`));
      g.style.animationDuration = `${GIFT_MS}ms`;
      show(gifts, g, GIFT_MS, MAX_GIFTS);
    },
    showResult(answer, winners) {
      const list = el('ul', 'hud-winners');
      if (winners.length) {
        list.append(...winners.map((w) => scoreRow('li', w.user, `+${w.points} pts${w.multiplier > 1 ? ` (x${w.multiplier})` : ''}`)));
      } else list.append(el('li', '', 'Nobody got it'));
      result.replaceChildren(el('p', 'hud-answer', answer), list);
    },
    showBoard(rows) {
      board.replaceChildren(
        ...rows.map((r, i) => {
          const row = scoreRow('li', r.user, `${r.points} pts`);
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
