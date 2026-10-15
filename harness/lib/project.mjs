// @ts-check
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { validateSchema } from './schema.mjs';

/**
 * @typedef {object} ProjectSettings
 * @property {number} schemaVersion
 * @property {string} coreVersion
 * @property {string} projectName
 * @property {string} repoRoot
 * @property {string} runCommand
 * @property {string} root
 * @property {string} taskDir
 * @property {string} taskTemplate
 * @property {string[]} entryDocs
 * @property {string[]} referenceDocs
 * @property {string} navigationDoc
 * @property {string} promptDir
 * @property {string} runsDir
 * @property {{ name: string, command: string, args: string[], timeoutMs?: number }[]} verification
 * @property {string[]} protectedPaths
 * @property {string} migrationDir
 * @property {string} migrationCheck
 * @property {string[]} dependencyFiles
 * @property {{ claude: { command: string, allowedTools: string[], disallowedTools: string[], configDir?: string }, codex: { command: string } }} ai
 */

const CORE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
export const CORE_VERSION = JSON.parse(
  fs.readFileSync(path.join(CORE_DIR, 'version.json'), 'utf8'),
).version;

/** @param {string} root @param {string} relative */
export function projectPath(root, relative) {
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.includes('\\') ||
    relative.endsWith('/') ||
    path.posix.normalize(relative) !== relative ||
    relative.split('/').some((part) => part === '..' || part === '.')
  ) {
    throw new Error(`프로젝트 상대 경로가 올바르지 않습니다: ${relative}`);
  }
  const resolved = path.resolve(root, relative);
  if (resolved === root || !resolved.startsWith(root + path.sep))
    throw new Error(`프로젝트 밖의 경로입니다: ${relative}`);
  return resolved;
}

/** @param {string} root @param {string} file */
function resolvesInside(root, file) {
  const realRoot = fs.realpathSync(root);
  const real = fs.realpathSync(file);
  return real === realRoot || real.startsWith(`${realRoot}${path.sep}`);
}

/** @param {string} harnessDir */
export function loadProject(harnessDir) {
  const file = path.join(harnessDir, 'project.json');
  if (!fs.existsSync(file))
    throw new Error(
      `프로젝트 설정이 없습니다: ${file}. init 명령으로 생성하세요.`,
    );
  /** @type {ProjectSettings} */
  let config;
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error(`프로젝트 설정 JSON을 읽을 수 없습니다: ${file}`);
  }
  const schema = JSON.parse(
    fs.readFileSync(
      path.join(harnessDir, 'schemas', 'project.schema.json'),
      'utf8',
    ),
  );
  const errors = validateSchema(schema, config);
  if (errors.length)
    throw new Error(`프로젝트 설정 오류 (${file}): ${errors.join('; ')}`);
  if (config.schemaVersion !== 1)
    throw new Error(`지원하지 않는 설정 버전: ${config.schemaVersion}`);
  if (config.coreVersion !== CORE_VERSION)
    throw new Error(
      `엔진 버전 불일치: 설정 ${config.coreVersion}, 설치 ${CORE_VERSION}`,
    );
  if (!config.projectName.trim())
    throw new Error('projectName은 비어 있을 수 없습니다.');
  if (!config.runCommand.trim())
    throw new Error('runCommand은 비어 있을 수 없습니다.');
  const root = path.resolve(harnessDir, config.repoRoot);
  if (path.resolve(root, 'harness') !== path.resolve(harnessDir))
    throw new Error('repoRoot는 이 harness가 설치된 Git 저장소여야 합니다.');
  const git = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (
    git.status !== 0 ||
    fs.realpathSync(path.resolve(git.stdout.trim())) !== fs.realpathSync(root)
  )
    throw new Error(`Git 저장소 루트가 아닙니다: ${root}`);
  /** @type {('taskDir' | 'taskTemplate' | 'navigationDoc' | 'promptDir' | 'runsDir')[]} */
  const paths = [
    'taskDir',
    'taskTemplate',
    'navigationDoc',
    'promptDir',
    'runsDir',
  ];
  for (const key of paths) projectPath(root, config[key]);
  /** @type {('taskDir' | 'promptDir')[]} */
  const directories = ['taskDir', 'promptDir'];
  for (const key of directories) {
    const location = projectPath(root, config[key]);
    if (!fs.existsSync(location))
      throw new Error(`프로젝트 경로가 없습니다: ${config[key]}`);
    if (!resolvesInside(root, location))
      throw new Error(`프로젝트 밖을 가리키는 경로입니다: ${config[key]}`);
  }
  const runsPath = projectPath(root, config.runsDir);
  let existingParent = runsPath;
  while (!fs.existsSync(existingParent) && existingParent !== root)
    existingParent = path.dirname(existingParent);
  if (!resolvesInside(root, existingParent))
    throw new Error(
      `프로젝트 밖을 가리키는 실행 기록 경로입니다: ${config.runsDir}`,
    );
  for (const doc of config.entryDocs) projectPath(root, doc);
  for (const doc of config.referenceDocs) projectPath(root, doc);
  for (const fileName of config.dependencyFiles) projectPath(root, fileName);
  if (config.migrationDir) projectPath(root, config.migrationDir);
  if (
    config.runsDir === 'harness' ||
    config.runsDir === config.taskDir ||
    config.taskDir.startsWith(`${config.runsDir}/`) ||
    config.promptDir.startsWith(`${config.runsDir}/`)
  )
    throw new Error('runsDir가 코드 또는 Task 경로와 겹칩니다.');
  const ignored = spawnSync(
    'git',
    ['check-ignore', '-q', '--', `${config.runsDir}/.probe`],
    { cwd: root },
  );
  if (ignored.status !== 0)
    throw new Error(
      `실행 기록 경로가 Git에서 제외되지 않습니다: ${config.runsDir}`,
    );
  if (!config.verification.length)
    throw new Error('verification 명령을 하나 이상 설정하세요.');
  if (
    new Set(
      config.verification.map((step) =>
        step.name.replace(/[^a-zA-Z0-9_-]/g, '-'),
      ),
    ).size !== config.verification.length
  )
    throw new Error('verification 로그 이름이 중복되었습니다.');
  for (const step of config.verification) {
    if (!step.name.trim() || !step.command.trim())
      throw new Error('verification name과 command는 비어 있을 수 없습니다.');
    if (step.timeoutMs !== undefined && step.timeoutMs <= 0)
      throw new Error(`verification timeoutMs는 양수여야 합니다: ${step.name}`);
  }
  for (const fileName of [
    ...config.entryDocs,
    ...config.referenceDocs,
    config.navigationDoc,
    config.taskTemplate,
  ]) {
    if (!fs.existsSync(projectPath(root, fileName)))
      throw new Error(`필수 프로젝트 파일이 없습니다: ${fileName}`);
    if (!resolvesInside(root, projectPath(root, fileName)))
      throw new Error(`프로젝트 밖을 가리키는 파일입니다: ${fileName}`);
  }
  for (const name of ['task', 'implement', 'fix', 'review', 're-review']) {
    if (!fs.existsSync(projectPath(root, `${config.promptDir}/${name}.md`)))
      throw new Error(
        `프로젝트 프롬프트가 없습니다: ${config.promptDir}/${name}.md`,
      );
  }
  return { ...config, root };
}
