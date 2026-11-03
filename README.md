# guesstok

A guessing game for TikTok Live: a 3D item is shown as a blocky picture that sharpens every few seconds, and viewers type what it is.

## Run

No install needed beyond Node:

    npm start

Open http://localhost:8080/ for the stream view. Open http://localhost:8080/?dev=1 to get a dev panel (guess box, Like and Gift buttons) so you can test without TikTok.

`npm test` runs the unit tests.

## Add an item

1. Drop the `.glb` into a pack folder under `models/`.
2. Add an entry to `src/items.json`: `id`, `name`, `answers` (accepted spellings), `difficulty` (`easy`, `medium` or `hard`), `file` (path relative to `models/`) and `pack`.

A model that fails to load is skipped and the game picks another item.

## Credits

Model credits live in `src/credits.js` and `CREDITS.md`. CC-BY authors must also be credited in the stream bio (the line is at the bottom of `CREDITS.md`).
