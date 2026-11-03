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
    const user = d.user?.uniqueId;
    if (!user || !d.comment) return;
    console.log(`bridge: chat @${user}: ${d.comment}`);
    send({ type: 'guess', user, text: d.comment });
  });
  connection.on(WebcastEvent.LIKE, (d) => {
    const user = d.user?.uniqueId;
    if (user && d.likeCount > 0) send({ type: 'like', user, count: d.likeCount });
  });
  connection.on(WebcastEvent.GIFT, (d) => {
    const user = d.user?.uniqueId;
    if (!user) return;
    let gifts; // how many gifts this event adds
    if (d.giftDetails?.giftType === 1) {
      const key = `${user}:${d.giftId}`;
      gifts = d.repeatCount - (streaks.get(key) ?? 0);
      if (d.repeatEnd) streaks.delete(key);
      else streaks.set(key, d.repeatCount);
    } else gifts = d.repeatCount || 1;
    // a gift adds one multiplier point per coin it costs: a rose 1, a finger heart 5
    const coins = d.giftDetails?.diamondCount > 0 ? d.giftDetails.diamondCount : 1;
    if (gifts <= 0) return;
    console.log(`bridge: gift from @${user}: ${gifts} x ${coins} coin(s)`);
    send({ type: 'gift', user, count: gifts * coins });
  });

  connection.on(ControlEvent.ERROR, ({ info }) => console.error('bridge: error:', info));
  connection.on(ControlEvent.DISCONNECTED, () => retryLater('disconnected from TikTok'));
  connection.on(WebcastEvent.STREAM_END, () => console.log('bridge: the live stream ended'));

  connection
    .connect()
    .then((state) => console.log(`bridge: connected to @${username}'s live (room ${state.roomId})`))
    .catch((err) => retryLater(`could not connect to @${username} (${err?.message ?? err}); is the stream live?`));
}

connect();
