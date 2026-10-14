// @ts-check
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// 하네스가 Claude / Codex의 보고를 믿지 않고 직접 확인하기 위한 Git 조회.
// 읽기 명령만 사용한다.

/** @typedef {import('./process.mjs').Runner} Runner */

/**
 * @typedef {object} FileChange
 * @property {string} status `A`(추가 / untracked), `M`(수정), `D`(삭제) 등 git name-status 첫 글자
 * @property {string} path 저장소 루트 기준 경로 (`/` 구분)
 */

const GIT_TIMEOUT_MS = 60_000;

/**
 * @param {Runner} runner
 * @param {string} root
 * @param {string[]} args
 * @param {boolean} [allowFail]
 */
async function git(runner, root, args, allowFail = false) {
  const result = await runner('git', ['-c', 'core.quotepath=false', ...args], {
    cwd: root,
    timeoutMs: GIT_TIMEOUT_MS,
  });
  if (result.code !== 0 && !allowFail) {
    const detail = result.spawnError ?? result.stderr.trim();
    throw new Error(`git ${args.join(' ')} 실패: ${detail}`);
  }
  return result;
}

/**
 * @param {Runner} runner
 * @param {string} root
 */
export async function isGitRepo(runner, root) {
  const result = await git(
    runner,
    root,
    ['rev-parse', '--is-inside-work-tree'],
    true,
  );
  return result.code === 0 && result.stdout.trim() === 'true';
}

/**
 * HEAD commit. 커밋이 없으면 null.
 * @param {Runner} runner
 * @param {string} root
 */
export async function getHead(runner, root) {
  const result = await git(
    runner,
    root,
    ['rev-parse', '--verify', 'HEAD'],
    true,
  );
  return result.code === 0 ? result.stdout.trim() : null;
}

/**
 * `git status --porcelain` 줄 목록. 비어 있으면 clean.
 * @param {Runner} runner
 * @param {string} root
 */
export async function getStatusLines(runner, root) {
  const result = await git(runner, root, ['status', '--porcelain=v1', '-uall']);
  return parseStatusLines(result.stdout);
}

/** @param {string} stdout */
export function parseStatusLines(stdout) {
  return stdout.split(/\r?\n/).filter((line) => line.trim() !== '');
}

/**
 * `git diff --name-status -z` 출력 파싱. rename / copy는 원본 삭제 + 새 파일 추가로 나눈다.
 * @param {string} stdout
 * @returns {FileChange[]}
 */
export function parseNameStatusZ(stdout) {
  const tokens = stdout.split('\0').filter((token) => token !== '');
  /** @type {FileChange[]} */
  const changes = [];

  for (let i = 0; i < tokens.length;) {
    const status = tokens[i][0];
    if (status === 'R' || status === 'C') {
      if (status === 'R') changes.push({ status: 'D', path: tokens[i + 1] });
      changes.push({ status: 'A', path: tokens[i + 2] });
      i += 3;
    } else {
      changes.push({ status, path: tokens[i + 1] });
      i += 2;
    }
  }
  return changes;
}

/**
 * baseHead 대비 변경 파일 (tracked 변경 + untracked 파일).
 * @param {Runner} runner
 * @param {string} root
 * @param {string} baseHead
 * @returns {Promise<FileChange[]>}
 */
export async function getChangedFiles(runner, root, baseHead) {
  const tracked = await git(runner, root, [
    'diff',
    '--name-status',
    '-z',
    baseHead,
  ]);
  const untracked = await git(runner, root, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
  ]);

  const changes = parseNameStatusZ(tracked.stdout);
  for (const file of untracked.stdout.split('\0')) {
    if (file !== '') changes.push({ status: 'A', path: file });
  }
  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

/**
 * working tree 상태 hash. Codex 리뷰 전후로 비교해 파일 수정 여부를 확인한다.
 * @param {Runner} runner
 * @param {string} root
 * @param {string} baseHead
 */
export async function snapshotWorkingTree(runner, root, baseHead) {
  const hash = createHash('sha256');
  const status = await git(runner, root, ['status', '--porcelain=v1', '-uall']);
  const diff = await git(runner, root, ['diff', '--binary', baseHead]);
  const untracked = await git(runner, root, [
    'ls-files',
    '--others',
    '--exclude-standard',
    '-z',
  ]);

  hash.update(status.stdout).update('\0').update(diff.stdout);
  for (const file of untracked.stdout.split('\0').filter(Boolean).sort()) {
    hash.update('\0').update(file).update('\0');
    try {
      hash.update(fs.readFileSync(path.join(root, file)));
    } catch {
      hash.update('<unreadable>');
    }
  }
  return hash.digest('hex');
}

/**
 * 특정 revision의 파일 내용. 없으면 null.
 * @param {Runner} runner
 * @param {string} root
 * @param {string} revision
 * @param {string} file
 */
export async function showFileAt(runner, root, revision, file) {
  const result = await git(runner, root, ['show', `${revision}:${file}`], true);
  return result.code === 0 ? result.stdout : null;
}
