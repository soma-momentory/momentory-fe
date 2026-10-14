// @ts-check

export const USAGE = `사용법:
  npm run harness -- "<요구사항>"        새 실행
  npm run harness -- --resume [runId]   결정 대기 / 수동 검증 대기 run 재개
                                        (runId를 생략하면 재개할 run을 찾는다. 터미널에서는 남은 질문 / 확인 항목을 바로 입력)`;

/**
 * runId가 null이면 재개 가능한 run을 찾는다. (Task 010)
 * @typedef {{ mode: 'start', requirement: string }
 *   | { mode: 'resume', runId: string | null }
 *   | { mode: 'help', error: string | null }} ParsedArgs
 */

/**
 * @param {string[]} argv
 * @returns {ParsedArgs}
 */
export function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    return { mode: 'help', error: null };
  }

  if (argv[0] === '--resume') {
    if (argv.length > 2) {
      return {
        mode: 'help',
        error: '--resume에는 runId를 하나만 지정할 수 있습니다.',
      };
    }
    return { mode: 'resume', runId: argv[1] ?? null };
  }

  const unknown = argv.find((arg) => arg.startsWith('--'));
  if (unknown) {
    return { mode: 'help', error: `알 수 없는 옵션: ${unknown}` };
  }

  // 따옴표 없이 여러 단어로 입력해도 하나의 요구사항으로 합친다.
  const requirement = argv.join(' ').trim();
  if (requirement === '') {
    return { mode: 'help', error: '요구사항을 입력하세요.' };
  }
  return { mode: 'start', requirement };
}
