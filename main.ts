// Solmar — the handoff program for make.fun gta6-01. Node 22, standard
// library only. The game itself is the static files under game/ (an
// index.html plus its modules; no build step, no network request). This
// program copies game/ and screenshots/ into the output directory and
// writes the dossier the judge reads, through the vendored make.fun
// library.
//
// Local run:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The grader provides /output; anywhere else, MAKEFUN_OUTPUT_DIR stands in.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty: at most 4 screenshots of 256 KiB,
// at most 993 files and 48 MiB under game/, and a dossier text of 160 KiB.
const LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function handOver() {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(join(root, 'screenshots'))) {
    cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  }
  const dossier = buildDossier(outDir, LIMITS);
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

handOver();
