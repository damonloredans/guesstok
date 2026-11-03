# Guesstok: design

A web-based guessing game built to run on a TikTok Live stream. Viewers play through the live chat, likes and gifts. This document says what to build and why. Anything marked **(my call)** was decided by the writer, not by the owner, and should be checked.

## Intent and why

The owner watched an interactive TikTok Live quiz and loved it: a 3D object starts as a heavily pixelated image, sharpens in steps, viewers type guesses in chat, the fastest correct guesser wins the most points, and a leaderboard sits on screen. That game is a **reference only**. This project is the owner's own game with the same core loop, its own look, its own items, and its own use of likes and gifts.

The owner wants to build the actual gameplay first, as an ordinary web page, and connect TikTok Live to it afterwards.

## Goals

- A web page that runs the full game by itself: rounds, pixel reveal, guessing, scoring, leaderboard.
- Test it alone by typing guesses into a box. No stream needed.
- Game logic reads three kinds of event: a **guess** (user, text), **likes** (user, count) and a **gift** (user, count). Where the events come from is swappable, so a TikTok Live connector can be added later without changing the game.
- Looks good as a vertical (phone, 9:16) screen, so it can be captured into a TikTok Live (Live Studio or OBS window or browser capture).
- Items are 3D glTF models, so they are easy to swap, add and re-tier.

## Non-goals for the first version

- The TikTok Live connection itself.
- Accounts, logins, payments, moderation tools, a database or a server. (A browser-side store is enough for the daily leaderboard. **(my call)**)
- The reference game's "boss round every 7 rounds" and "champion" features. The owner did not ask for them.
- Sound, unless it is trivial.

## Anti-goals (what would make it a failure even if it runs)

- A near copy of the reference game's look or branding.
- Items that are unrecognisable even at the sharpest stage, so a round is unfair.
- Guess matching that is loose (accepts typos) or strict about the wrong things (rejects the plural).

## How a round works

All numbers are tunable settings in one place, not hard-coded.

- **Length:** 15 seconds. The picture sharpens every 3 seconds, so there are **5 stages**: heavily pixelated at 0s, almost clear at 12s. (Owner's numbers.)
- **The reveal:** the 3D model is rendered small and scaled up with no smoothing, so the visible squares are big pixels. It is not made of cubes. A whole-scene approach means every model gets the same reveal with no per-model preparation. How to do it is left to the builder. (Owner: "pixelated, not blocks".)
- **Guessing:** viewers type in chat and each guess floats over the item area. The answer is the item's name. Matching ignores case. A plural of the answer counts as correct. **Typos do not count.** Each item can carry extra accepted answers (for example "pillow" and "pillows"), editable in the item list.
- **Scoring:** the earlier the correct guess, the more points. **(my call)** 5, 4, 3, 2, 1 points for stages 1 to 5, all multiplied by the guesser's gift multiplier. Each viewer can win a round once.
- **End of round:** the answer is shown big with the list of who got it and their points, then a short pause (**(my call)**: about 5 seconds), then the next round. If nobody guessed, the answer is shown and the game moves on. **(my call)**
- **Difficulty:** items are tagged easy, medium or hard and start easy, getting harder as the round count rises. **(my call)** The owner will edit tags later.

## Likes and gifts (owner's design)

- **Likes** make the picture sharpen faster. The crowd's taps move the round to the next stage sooner. **(my call, for the detail)**: a stage advance needs a number of likes, set in the settings, in addition to the normal 3-second step. Points follow the stage, so sharpening early lowers the points available. This is intended.
- **Gifts** give the sender a personal multiplier. Each gift is **+1** and lasts **30 seconds on its own timer**. A viewer's multiplier is **1 + the number of their gifts sent in the last 30 seconds**. When a gift's 30 seconds pass, the multiplier drops by one. Example: one rose is x2 for 30 seconds. Four gifts sent in a row put them at x5, and it steps down by one as each expires.
- Every gift counts as +1 whatever it costs. **(my call)** There is **no cap** on the multiplier. **(my call)** The owner can change either later.

## Leaderboard

- Points add up across rounds for each viewer.
- The leaderboard **resets every 24 hours**. **(my call)**: reset at a fixed time of day, set in the settings. It does not roll per user.
- The current #1 for the day is always visible on screen, plus the winners of the last round.

## Look

- **Hologram scanner**: dark background, thin cyan lines, a feel like a scan coming into focus. The owner chose this as a **placeholder**. The owner will make their own mockup later and the look will be updated then. Keep colours, fonts and spacing in one theme file so this is a cheap change.
- Keep on-screen text readable on a phone: nothing under about 11px, and enough contrast on the dark background.

## Items and credits

The owner has downloaded these packs from Poly Pizza (`.glb`), about 485 models in total, which will be put in a `models/` folder in the repo:

| Pack | Author | Licence | Models |
|---|---|---|---|
| Food Kit | Kenney | not stated by owner, confirm | 148 |
| Ultimate Food Pack | Quaternius | not stated by owner, confirm | 50 |
| Ultimate House Interior Pack | Quaternius | not stated by owner, confirm | 82 |
| Animated Animal Pack | Quaternius | not stated by owner, confirm | 12 |
| Christmas Kit | MiniPoly | CC-BY | 11 |
| City Pack | J-Toastie | CC-BY | 57 |
| The Office Pack | dook | CC-BY | 125 |

- **Credits:** the owner asked for credit to live in the back-end code, so keep a credits file listing every pack, author and licence. CC-BY asks for credit where people can reasonably see it, so the owner should also put "Models by MiniPoly, J-Toastie and dook, via Poly Pizza" in the stream bio or title. The builder should tell the owner this.
- **Starter list:** build a first item list from the best-known objects (fruit, food, animals, vehicles, Christmas items, familiar office items) with a first easy, medium or hard tag for each. **(my call)** Leave out duplicate files (names ending in a random code), generic house parts (doors, windows, ceiling lights, drawers) and the **Gundam RX-78-2** model in the Office Pack, which is a franchise character. **(my call)**
- Animated animals can be shown in a still pose. Animation is not needed.
- The item list is plain data (name, accepted answers, difficulty, model file) so the owner can edit it without touching game code.

## Left to the builder

- Tools and structure: the stack, library versions, file layout. The writer's default is a plain web page using Three.js with as little tooling as possible. **(my call)** The owner said they are handing the technical choices over.
- How to build the pixel effect and how to load models.
- Tuning of all numbers: like thresholds, pauses, point values.
- How events reach the game (a small internal event interface is enough).
- A small test or self-check for the logic that is easy to get wrong: answer matching (case, plural, no typos), scoring with multipliers, and the gift-multiplier timing.

## Next step

When this design is approved, write an implementation plan.
