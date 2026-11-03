// Reads a TikTok LIVE stream's chat, gifts and likes and passes them to the game page as server-sent events.
//   npm run bridge -- yourusername      (the streamer must be live)
// The game page connects with http://localhost:8080/?tiktok=1. Unofficial: tiktok-live-connector reverse-engineers TikTok's
// live feed, so it can stop working when TikTok changes something. It only reads; it never sends anything to TikTok.
import http from 'node:http';
import { TikTokLiveConnection, WebcastEvent, ControlEvent } from 'tiktok-live-connector';

const username = (process.argv[2] ?? process.env.TIKTOK_USER ?? '').replace(/^@/, '');
if (!username) {
  console.error('Usage: npm run bridge -- <tiktok username>   (the name in tiktok.com/@name/live)');
  process.exit(1);
}
const PORT = Number(process.env.PORT) || 8081;
const RETRY_MS = 10_000; // wait before reconnecting, so TikTok does not rate-limit us
const KEEPALIVE_MS = 15_000;

// TikTok sends two layouts of the same messages (the library's older one and a newer one): chat text is `comment` or
// `content`, a viewer's id is `userId` or `id`, a gift's details are `giftDetails` (giftType) or `gift` (type), and a
// like's count is `likeCount` or `count`. The helpers below read either.
// A viewer's name: the @name when TikTok gives it, else the display name, nickname or id. The same function is used for
// chat, gifts and likes, so one viewer keeps one name (their multiplier is looked up by it).
const who = (u) => u?.uniqueId || u?.displayId || u?.nickname || String(u?.userId || u?.id || '');
// How long ago TikTok stamped a message, so a slow game can be told from a slow TikTok feed.
const age = (d) => {
  const t = Number(d?.common?.createTime);
  return t > 0 ? ` (${((Date.now() - t) / 1000).toFixed(1)}s after TikTok sent it)` : '';
};
const json = (o) => JSON.stringify(o, (_, v) => (typeof v === 'bigint' ? v.toString() : v)); // ids can be BigInt

const clients = new Set(); // game pages listening for events
const send = (event) => {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) res.write(line);
};

http
  .createServer((req, res) => {
    if (req.url !== '/events') return res.writeHead(404).end();
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' });
    res.write(': connected\n\n');
    clients.add(res);
    console.log(`bridge: a game window connected (${clients.size} open)`);
    req.on('close', () => {
      clients.delete(res);
      console.log(`bridge: a game window disconnected (${clients.size} open)`);
    });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`bridge: serving events at http://localhost:${PORT}/events`));
setInterval(() => { for (const res of clients) res.write(': keepalive\n\n'); }, KEEPALIVE_MS);

// gift streaks: while a viewer holds the gift button, TikTok repeats the event with a rising repeatCount.
// We count each new gift as it arrives, so the multiplier starts at once; the closing repeatEnd event adds nothing.
const streaks = new Map(); // "user:giftId" -> repeatCount already counted

let retrying = false;
function retryLater(why) {
  if (retrying) return;
  retrying = true;
  console.log(`bridge: ${why}; trying again in ${RETRY_MS / 1000}s`);
  setTimeout(() => { retrying = false; connect(); }, RETRY_MS);
}

function connect() {
  const connection = new TikTokLiveConnection(username, {}); // the library crashes without an options object, despite its docs

  connection.on(WebcastEvent.CHAT, (d) => {
    const user = who(d.user);
    const text = d.comment || d.content;
    if (!user || !text) return console.log('bridge: could not use this chat message:', json(d).slice(0, 500));
    console.log(`bridge: chat @${user}: ${text}${age(d)}`);
    send({ type: 'guess', user, text });
  });
  connection.on(WebcastEvent.LIKE, (d) => {
    const count = Number(d.likeCount ?? d.count);
    if (!(count > 0)) return;
    // likes only spin the item, so a hidden viewer name does not matter
    console.log(`bridge: like x${count} from @${who(d.user) || 'someone'}${age(d)}`);
    send({ type: 'like', user: who(d.user) || 'viewer', count });
  });
  connection.on(WebcastEvent.GIFT, (d) => {
    const user = who(d.user);
    if (!user) return;
    const details = d.giftDetails ?? d.gift;
    let gifts; // how many gifts this event adds
    if ((details?.giftType ?? details?.type) === 1 || details?.combo === true) { // a gift that can be sent in a streak
      const key = `${user}:${d.giftId}`;
      gifts = d.repeatCount - (streaks.get(key) ?? 0);
      if (d.repeatEnd) streaks.delete(key);
      else streaks.set(key, d.repeatCount);
    } else gifts = d.repeatCount || 1;
    // a gift adds one multiplier point per coin it costs: a rose 1, a finger heart 5
    const coins = Number(details?.diamondCount) > 0 ? Number(details.diamondCount) : 1;
    if (gifts <= 0) return;
    console.log(`bridge: gift from @${user}: ${gifts} x ${coins} coin(s)${age(d)}`);
    send({ type: 'gift', user, count: gifts * coins });
  });

  // every 15s, say what TikTok sent, so a silent connection can be told from a broken listener
  let seen = {};
  const beat = setInterval(() => {
    const kinds = Object.entries(seen).map(([k, n]) => `${k} x${n}`).join(', ');
    console.log(`bridge: from TikTok in the last ${KEEPALIVE_MS / 1000}s: ${kinds || 'nothing'}`);
    seen = {};
  }, KEEPALIVE_MS);
  connection.on(ControlEvent.DECODED_DATA, (kind, data) => {
    seen[kind] = (seen[kind] ?? 0) + 1;
    if (kind === 'WebcastChatMessage') console.log('bridge: raw chat message:', json(data).slice(0, 600)); // shows the shape if names are missing
  });
  connection.on(ControlEvent.WEBSOCKET_CONNECTED, () => console.log('bridge: TikTok websocket open'));

  connection.on(ControlEvent.ERROR, ({ info }) => console.error('bridge: error:', info));
  connection.on(ControlEvent.DISCONNECTED, () => { clearInterval(beat); retryLater('disconnected from TikTok'); });
  connection.on(WebcastEvent.STREAM_END, () => console.log('bridge: the live stream ended'));

  connection
    .connect()
    .then((state) => console.log(`bridge: connected to @${username}'s live (room ${state.roomId})`))
    .catch((err) => { clearInterval(beat); retryLater(`could not connect to @${username} (${err?.message ?? err}); is the stream live?`); });
}

connect();
