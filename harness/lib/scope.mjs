// @ts-check
import path from 'node:path';

// Claude 변경 파일의 범위 검사 (D8). Git으로 계산한 변경 목록만 사용한다.

/** @typedef {import('./git.mjs').FileChange} FileChange */

const PROTECTED_FILES = new Set([
  'CLAUDE.md',
  'AGENTS.md',
  'tasks/TASK_TEMPLATE.md',
]);

const MIGRATION_FILE = /^supabase\/migrations\/[^/]+\.sql$/;

const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/** @param {string} file @param {string[]} [protectedPaths] */
export function isProtectedPath(file, protectedPaths) {
  if (protectedPaths)
    return protectedPaths.some((rule) =>
      rule.endsWith('*')
        ? file.startsWith(rule.slice(0, -1)) ||
          file.split('/').at(-1)?.startsWith(rule.slice(0, -1))
        : rule.endsWith('/')
          ? file.startsWith(rule)
          : file === rule,
    );
  return (
    file.startsWith('harness/') ||
    PROTECTED_FILES.has(file) ||
    path.posix.basename(file).startsWith('.env')
  );
}

/** @param {string} file @param {string} [migrationDir] */
export function isMigrationFile(file, migrationDir) {
  if (migrationDir !== undefined)
    return (
      Boolean(migrationDir) &&
      file.startsWith(`${migrationDir}/`) &&
      file.endsWith('.sql')
    );
  return MIGRATION_FILE.test(file);
}

/**
 * @param {FileChange[]} changes
 * @param {import('./project.mjs').ProjectSettings} [project]
 * @returns {{ protectedViolations: FileChange[], newMigrations: string[] }}
 */
export function classifyChanges(changes, project) {
  const protectedViolations = changes.filter(
    (change) =>
      isProtectedPath(change.path, project?.protectedPaths) ||
      // 기존 migration은 이미 수동 적용되었을 수 있으므로 수정 / 삭제하지 않는다.
      (isMigrationFile(change.path, project?.migrationDir) &&
        change.status !== 'A'),
  );
  const newMigrations = changes
    .filter(
      (change) =>
        change.status === 'A' &&
        isMigrationFile(change.path, project?.migrationDir),
    )
    .map((change) => change.path);

  return { protectedViolations, newMigrations };
}

/**
 * package.json의 의존성 필드가 바뀌었는지 확인한다. 파싱할 수 없으면 바뀐 것으로 본다.
 * @param {string | null} baseText
 * @param {string | null} currentText
 */
export function dependenciesChanged(baseText, currentText) {
  try {
    const base = JSON.parse(baseText ?? '{}');
    const current = JSON.parse(currentText ?? '{}');
    return DEPENDENCY_FIELDS.some(
      (field) =>
        JSON.stringify(base[field] ?? null) !==
        JSON.stringify(current[field] ?? null),
    );
  } catch {
    return true;
  }
}
