import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let child = null;
let stopping = false;

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopping = true;
    if (child && child.exitCode === null) child.kill(signal);
  });
}

function run(command, args, cwd) {
  return new Promise((resolve) => {
    if (stopping) return resolve(143);
    child = spawn(command, args, { cwd, stdio: 'inherit' });
    child.once('error', (error) => {
      console.error(error.message);
      resolve(1);
    });
    child.once('exit', (code) => {
      child = null;
      resolve(code ?? 1);
    });
  });
}

const root = process.cwd();
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const resume = process.argv[2] === '--resume';
const coreArgs = resume
  ? ['harness/run.mjs', '--resume', process.argv[3]]
  : ['harness/run.mjs', process.argv[2]];
for (const dir of [root]) {
  if (
    !fs.existsSync(path.join(dir, 'package-lock.json')) ||
    fs.existsSync(path.join(dir, 'node_modules'))
  )
    continue;
  console.log(`[parallel] 의존성 설치: ${path.relative(root, dir) || '.'}`);
  const code = await run(npm, ['ci'], dir);
  if (code !== 0) process.exit(code);
}
if (stopping) process.exit(143);
process.exit(await run(process.execPath, coreArgs, root));
