// Dapur Kilat — hand-in program (Node 22, standard library only).
// It gathers the entry: game/ and screenshots/ copied beside this file into
// /output, plus the dossier the judge reads, built from those very files by
// the kit's vendored library. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's own caps, so a hand-in that would fail them fails here first:
// at most 4 screenshots, each at most 256 KiB; game/ at most 993 entries and
// 48 MiB in all, no path under it over 1000 bytes. /output itself caps at
// 1000 entries and 64 MiB, which game/, screenshots/ and dossier.json share.
const DOSSIER_OPTIONS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

const gameDir = join(repoRoot, 'game');
if (!existsSync(join(gameDir, 'index.html'))) fail('game/index.html is missing');
cpSync(gameDir, join(outDir, 'game'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotsDir)) {
  const shots = readdirSync(shotsDir).filter((name) => !name.startsWith('.'));
  if (shots.length < 3 || shots.length > 4) fail(`screenshots/ holds ${shots.length} images, need 3 or 4`);
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
} else {
  fail('screenshots/ is missing');
}

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, DOSSIER_OPTIONS));
console.log(`Dapur Kilat handed in to ${outDir}`);
