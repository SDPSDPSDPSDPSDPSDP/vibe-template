const { spawnSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const path = require('path');

const input = JSON.parse(readFileSync(0, 'utf8'));
const file = input.tool_input && input.tool_input.file_path;
const root = input.cwd;
const eslint = path.join(root, 'node_modules', '.bin', 'eslint');

// Projects without local ESLint or non-JS files are out of scope for this hook.
if (!file || !/\.(c|m)?(j|t)sx?$/.test(file) || !existsSync(eslint)) process.exit(0);

const run = spawnSync(`"${eslint}" --fix --format compact "${file}"`, { cwd: root, shell: true, encoding: 'utf8' });
if (run.status === 0) process.exit(0);

process.stderr.write(`ESLint errors remain after --fix in ${file}. Fix them:\n${run.stdout}${run.stderr}`);
process.exit(2);
