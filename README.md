[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun · gta6-01 · rank](https://make.fun/badge/gta6-01/wessmari97/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![make.fun · gta6-01 · reward](https://make.fun/badge/gta6-01/wessmari97/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# Solmar — open-world crime game

Rio is a driver for hire in Solmar, a sun-soaked coastal city. Steal cars, outrun the police, and finish six jobs for Mara — from a first fare at the Marina to one last warehouse run. A 2D top-down open-world crime game that runs offline in a desktop browser, built for the [make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01).

## What is in the city

- A procedural grid city with five districts (Old Town, Marina, Downtown, Palms, Harbor), parks, parking lots, a beach and the sea.
- On foot: walk, run, punch. In a car: steal it, drive it, wreck it — and watch the wanted stars climb.
- Traffic and pedestrians, parked cars to steal, and a wanted system: foot cops grab Rio and patrol cars ram his ride, and the heat only fades when he lays low.
- Six story missions with map markers, objectives, timers and cash rewards, from a first fare to one last warehouse run.
- A HUD with health, cash, wanted stars, a minimap, speed and the in-game clock — plus a start screen, pause, Busted/Wasted screens and a localStorage save.

## Controls

- **WASD / Arrows** — move on foot, drive in a car
- **Shift** — run
- **Space / J** — punch
- **E** — steal a car / climb out
- **P / Esc** — pause
- **M** — skip the current job (no reward)
- **Enter** — start / retry

## Play it

Serve `game/` locally and open it in a desktop browser:

```sh
node serve.ts
# then open http://localhost:8080
```

No build step, no network request, no library — plain static files and WebAudio-synthesised sound.

## Screenshots

Four frames from the game live in `screenshots/` (the first is the cover): the title screen over the city, driving on the Marina road, a three-star police chase downtown, and a mission on foot.

## About this entry

Built for the make.fun bounty [gta6-01](https://make.fun/bounty/gta6-01) — make an open-world crime game in the spirit of GTA 6. New to make.fun? Start here: https://make.fun/r/jrnh2cfm
