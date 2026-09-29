// Whole-project tsc is too slow per edit, so it runs once per turn on Stop.
const { spawnSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const path = require('path');

const input = JSON.parse(readFileSync(0, 'utf8'));
const root = input.cwd;
const tsc = path.join(root, 'node_modules', '.bin', 'tsc');

// Second Stop in a row means Claude already got one retry; blocking again risks an endless loop.
if (input.stop_hook_active || !existsSync(tsc) || !existsSync(path.join(root, 'tsconfig.json'))) process.exit(0);

const status = spawnSync('git status --porcelain', { cwd: root, shell: true, encoding: 'utf8' });
if (!/\.tsx?$/m.test(status.stdout)) process.exit(0);

const run = spawnSync(`"${tsc}" --noEmit`, { cwd: root, shell: true, encoding: 'utf8' });
if (run.status === 0) process.exit(0);

process.stderr.write(`tsc --noEmit fails. Fix before finishing:\n${run.stdout}${run.stderr}`);
process.exit(2);
