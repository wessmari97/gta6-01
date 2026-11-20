# Solmar — an open-world crime game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun · gta6-01 · rank](https://make.fun/badge/gta6-01/wessmari97/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun · gta6-01 · reward](https://make.fun/badge/gta6-01/wessmari97/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

Solmar is a complete open-world crime game in the spirit of GTA 6, built
for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01) — $1,666
over 100 places. It plays offline in a desktop browser from static files,
with no network requests and no libraries: every line of the city, the
cars, the police and the story is drawn and written in code.

If you want to try make.fun yourself, here is my referral link:
https://make.fun/r/jrnh2cfm

## The game

You are Rio, a driver for hire in Solmar, a sun-soaked coastal city.
Mara, the fixer, has six jobs for you: pick up fares, run packages,
borrow cars, lose the police, and make the final sunset delivery.
Complete them all to become a Solmar legend. Your progress and cash are
saved in the browser, so you can pick up where you left off.

- **A city to explore:** a procedural grid city with districts — Downtown,
  Old Town, the Marina beach, Northside and East Industrial — plus parks,
  a pier and the sea.
- **On foot and by car:** walk and run, punch, steal any car and drive it.
  Traffic drives the roads and pedestrians walk the sidewalks.
- **Wanted system:** stealing, hitting people and attacking cops raises
  your stars. Foot cops and patrol cars chase you; stay out of sight and
  the heat cools off. Get caught and it is BUSTED; run out of health and
  it is WASTED.
- **Missions and story:** six jobs with objectives, map markers, time
  limits and cash rewards, and a save that keeps your cash and progress.
- **HUD and minimap:** health, cash, wanted stars, the current objective,
  your speed, the time of day, and a live minimap of the city.
- **Sound:** every effect is synthesised with WebAudio — engine hum,
  sirens, pickups and jingles. No audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move on foot, drive the car |
| Shift | Run |
| E | Steal a car / get out of a car |
| Space / J | Punch |
| P / Esc | Pause |
| Enter | Start, continue, try again |
| M | Next mission |

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Files

- `game/` — the playable game: `index.html` and its modules under `src/`
  (city, player, cars, police, pedestrians, missions, rendering, HUD,
  audio, input and the screenshot staging).
- `main.ts` — the entry program: it copies `game/` and `screenshots/`
  to the output directory and writes the judge's dossier.
- `screenshots/` — four real renders of the game: the start screen,
  driving, a police chase and a mission.
- `serve.ts` — a tiny static server for local play.
- `vendor/makefun-game.ts` — the make.fun dossier library, unchanged.

## Screenshots

The four screenshots are staged with `?shot=start|drive|chase|mission`
(plus `&seed=N` for a fixed city), so each one is a real frame of the
game playing itself.
