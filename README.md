# guesstok

A guessing game for TikTok Live: a 3D item starts as a very pixelated picture and sharpens as a line sweeps down it, and viewers type what it is. The first correct guess wins the round.

## Run

No install needed beyond Node:

    npm start

Open http://localhost:8080/ for the stream view. Open http://localhost:8080/?dev=1 to get a dev panel (guess box, Like and Gift buttons) so you can test without TikTok.

The round number keeps counting across page reloads (it is saved in the browser), so a long stream reads "Round 251". Add `?round=11` to the address to start from a particular round, for example to see a zoom round.

`npm test` runs the unit tests.

## How a round plays

- 45 seconds, sharpening every 5 seconds (9 steps). The first correct guess ends the round and wins 9 points down to 1, depending on how early it is, times the winner's gift multiplier. The answer stays up for 3 seconds.
- Difficulty follows a loop of 10 rounds (easy x4, medium x1, easy x2, medium x2, hard x1), then a zoom round: the item stays zoomed in until someone answers or time runs out, then pulls back.
- Likes make the item spin faster for a moment. Each gift adds +1 to the sender's multiplier for 30 seconds; a notice appears on screen and the multiplier shows next to their guesses.
- The leaderboard resets every 24 hours.

Every number above lives in `src/settings.js`, including the difficulty pattern.

## Sound

Sound effects are made in code (`src/audio.js`), so there are no files to add. For music, put a file at `audio/bgm.mp3` (the path is `audio.bgmUrl` in `src/settings.js`). Without one the game is silent.

To make the effects fit the music, set `audio.rootHz` in `src/settings.js` to your music's key note (A = 440, C = 261.6, D = 293.7, E = 329.6, G = 392) and adjust `bgmVolume` and `sfxVolume`.

Music needs a licence that allows streaming, and TikTok can mute copyrighted tracks. Places to look for music you can use:
- Pixabay Music (pixabay.com/music): free to use, check each track's licence.
- Free Music Archive (freemusicarchive.org): filter by licence. CC0 needs no credit.
- Kevin MacLeod, incompetech.com: free, but CC-BY, so credit him in the stream bio.
- Your own music, or tracks from a library you pay for (Epidemic Sound, Artlist).

In a normal browser sound starts after the first click on the page. OBS and TikTok Live Studio browser sources usually start it by themselves.

## Add an item

1. Drop the `.glb` into a pack folder under `models/`.
2. Add an entry to `src/items.json`: `id`, `name`, `answers` (accepted spellings), `difficulty` (`easy`, `medium` or `hard`), `file` (path relative to `models/`) and `pack`.

A model that fails to load is skipped and the game picks another item.

## Credits

Model credits live in `src/credits.js` and `CREDITS.md`. CC-BY authors must also be credited in the stream bio (the line is at the bottom of `CREDITS.md`).
