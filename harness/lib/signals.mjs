// @ts-check

// 실행 중 SIGINT / SIGTERM 처리 (Task 007 D3, D4).
// 처리기를 등록하면 Node 기본 동작(즉시 종료)이 사라지므로, 정리가 끝나면 반드시 exit를 호출한다.
// Windows에서 외부 SIGTERM은 처리기를 실행하지 않고 즉시 종료된다. (하네스가 막을 수 없는 종료)

export const HANDLED_SIGNALS = /** @type {const} */ (['SIGINT', 'SIGTERM']);

/**
 * @param {object} options
 * @param {(signal: string) => Promise<number>} options.onSignal 정리 후 종료할 exit code를 반환한다.
 * @param {(code: number) => void} options.exit
 * @param {() => boolean} [options.allowImmediateExit] 정리 중 두 번째 신호로 즉시 종료해도 안전한지.
 *   false면 두 번째 신호를 무시하고 정리가 끝날 때까지 기다린다. (기본: 항상 즉시 종료)
 * @param {(signal: string) => void} [options.onExitBlocked] 두 번째 신호를 무시했을 때 호출
 * @param {import('node:events').EventEmitter} [options.target]
 * @returns {() => void} 처리기 해제
 */
export function installSignalHandlers({
  onSignal,
  exit,
  allowImmediateExit = () => true,
  onExitBlocked,
  target = process,
}) {
  let handling = false;
  let exited = false;

  /** @param {number} code */
  const exitOnce = (code) => {
    if (exited) return;
    exited = true;
    exit(code);
  };

  /** @param {string} signal */
  const handler = (signal) => {
    if (handling) {
      // 정리 중 두 번째 신호: 안전할 때만 기다리지 않고 종료한다.
      if (allowImmediateExit()) return exitOnce(1);
      onExitBlocked?.(signal);
      return;
    }
    handling = true;
    onSignal(signal).then(exitOnce, () => exitOnce(1));
  };

  for (const signal of HANDLED_SIGNALS) target.on(signal, handler);
  return () => {
    for (const signal of HANDLED_SIGNALS) target.off(signal, handler);
  };
}
