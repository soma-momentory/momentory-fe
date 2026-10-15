import fs from 'node:fs';
import path from 'node:path';
import { isProtectedPath } from '../lib/scope.mjs';

const ID = /^[a-z][a-z0-9_-]{0,39}$/;

function filePath(value) {
  return (
    typeof value === 'string' &&
    value !== '' &&
    !path.posix.isAbsolute(value) &&
    !value.includes('\\') &&
    !value.endsWith('/') &&
    path.posix.normalize(value) === value &&
    value.split('/').every((part) => part !== '.' && part !== '..') &&
    !value.startsWith('.git/') &&
    value !== '.git'
  );
}

/** Validate the entire plan before creating a branch or worktree. */
export function validatePlan(plan, protectedPaths) {
  if (
    !plan ||
    plan.schemaVersion !== 1 ||
    !Array.isArray(plan.tasks) ||
    plan.tasks.length < 1 ||
    plan.tasks.length > 100
  ) {
    throw new Error('schemaVersion 1 및 1~100개 tasks가 필요합니다.');
  }
  const ids = new Set();
  const owners = new Map();
  for (const task of plan.tasks) {
    if (!ID.test(task?.id ?? '') || ids.has(task.id))
      throw new Error(`Task id가 잘못되었거나 중복되었습니다: ${task?.id}`);
    ids.add(task.id);
    if (typeof task.requirement !== 'string' || !task.requirement.trim())
      throw new Error(`${task.id}: requirement가 필요합니다.`);
    if (!Array.isArray(task.allowedPaths) || task.allowedPaths.length === 0)
      throw new Error(`${task.id}: allowedPaths가 필요합니다.`);
    if (
      !Array.isArray(task.dependsOn ?? []) ||
      new Set(task.dependsOn ?? []).size !== (task.dependsOn ?? []).length
    )
      throw new Error(`${task.id}: dependsOn이 잘못되었습니다.`);
    for (const file of task.allowedPaths) {
      if (!filePath(file))
        throw new Error(
          `${task.id}: 정확한 파일 상대 경로만 허용합니다: ${file}`,
        );
      if (isProtectedPath(file, protectedPaths))
        throw new Error(`${task.id}: 보호 경로와 충돌합니다: ${file}`);
      if (owners.has(file))
        throw new Error(
          `${task.id}: ${owners.get(file)}와 허용 경로가 겹칩니다: ${file}`,
        );
      owners.set(file, task.id);
    }
  }
  const byId = new Map(plan.tasks.map((task) => [task.id, task]));
  const visited = new Set();
  const visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) throw new Error(`Task 의존성 순환: ${id}`);
    if (visited.has(id)) return;
    visiting.add(id);
    for (const dep of byId.get(id).dependsOn ?? []) {
      if (!byId.has(dep) || dep === id)
        throw new Error(`${id}: 알 수 없는 의존성 ${dep}`);
      visit(dep);
    }
    visiting.delete(id);
    visited.add(id);
  }
  for (const id of ids) visit(id);
  return {
    schemaVersion: 1,
    tasks: plan.tasks.map((task) => ({
      id: task.id,
      requirement: task.requirement.trim(),
      allowedPaths: [...task.allowedPaths],
      dependsOn: [...(task.dependsOn ?? [])],
    })),
  };
}

export function loadPlan(file, protectedPaths) {
  return validatePlan(
    JSON.parse(fs.readFileSync(file, 'utf8')),
    protectedPaths,
  );
}
