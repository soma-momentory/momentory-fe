// @ts-check
import fs from 'node:fs';
import path from 'node:path';

/**
 * harness/prompts/<name>.md의 `{{key}}`를 값으로 바꾼다. 값이 없는 placeholder가 있으면 예외를 던진다.
 * @param {string} harnessDir
 * @param {string} name
 * @param {Record<string, string>} vars
 */
export function renderPrompt(
  harnessDir,
  name,
  vars,
  promptDir = path.join(harnessDir, 'prompts'),
) {
  const template = fs.readFileSync(path.join(promptDir, `${name}.md`), 'utf8');
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!(key in vars)) {
      throw new Error(`prompt ${name}: ${key} 값이 없습니다.`);
    }
    return vars[key];
  });
}
