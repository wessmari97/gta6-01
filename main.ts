// Solmar for gta6-01 (Node 22, standard library only). The entry is the
// static game in game/ beside this file: a browser loads game/index.html and
// its ES modules offline, with no library and no network request. This
// program hands it in: it copies game/ and screenshots/ into the output
// directory and writes dossier.json there, the summary the judge reads,
// using the vendored make.fun library.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const base = fileURLToPath(new URL('.', import.meta.url));
const dest = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(dest, { recursive: true });
cpSync(join(base, 'game'), join(dest, 'game'), { recursive: true });
mkdirSync(join(dest, 'screenshots'), { recursive: true });
if (existsSync(join(base, 'screenshots'))) {
  cpSync(join(base, 'screenshots'), join(dest, 'screenshots'), { recursive: true });
}

// The scorer's caps, as a guard so this program refuses an entry the scorer
// would refuse: at most 4 screenshots and none over 256 KiB, at most 993
// files in game/ and 48 MiB of game files in all, and no path under game/
// over 1000 bytes. Only the text cap shapes the dossier's bytes.
writeFileSync(
  join(dest, 'dossier.json'),
  buildDossier(dest, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
