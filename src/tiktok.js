// Listens to the bridge (bridge.mjs) and passes its events to the game's bus. The bridge sends
// { type: 'guess' | 'like' | 'gift', user, text | count } as server-sent events; the handlers in main.js validate them.
const TYPES = ['guess', 'like', 'gift'];

export function connectTikTok(bus, url) {
  const source = new EventSource(url); // reconnects by itself if the bridge restarts
  source.onmessage = (m) => {
    try {
      const { type, ...payload } = JSON.parse(m.data);
      if (TYPES.includes(type)) bus.emit(type, payload);
    } catch (err) {
      console.error('bad message from the bridge', err);
    }
  };
  // the window title shows the state (in the taskbar, not on the stream)
  const title = (state) => { document.title = `guesstok - TikTok bridge ${state}`; };
  title('connecting');
  source.onopen = () => { title('connected'); console.info('connected to the TikTok bridge'); };
  source.onerror = () => { title('NOT connected'); console.warn(`cannot reach the TikTok bridge at ${url}: is "npm run bridge" running?`); };
  return source;
}
