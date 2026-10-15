// @ts-check

// 실행 진행 표시 (Task 007).
// TTY: 진행 중인 작업 줄을 덮어써서 경과 시간을 갱신한다.
// non-TTY / CI: 커서 제어 없이 append-only로 쓰고, 진행 이벤트 줄에 시각을 붙인다.

export const TTY_REFRESH_MS = 1_000;
export const PLAIN_HEARTBEAT_MS = 10_000;

const CLEAR_LINE = '\r\x1b[2K';

/** @param {number} value */
const pad = (value) => String(value).padStart(2, '0');

/**
 * 완료된 작업의 소요 시간. 예: `18s`, `1m 05s`, `1h 02m`
 * @param {number} ms
 */
export function formatDuration(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${pad(seconds % 60)}s`;
  return `${Math.floor(minutes / 60)}h ${pad(minutes % 60)}m`;
}

/**
 * 진행 중인 작업의 경과 시간. 예: `01:40`, `1:02:03`
 * @param {number} ms
 */
export function formatClock(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const clock = `${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`;
  return hours > 0 ? `${hours}:${clock}` : clock;
}

/**
 * 한 줄 요약. 줄바꿈을 공백으로 바꾸고 문자(code point) 단위로 자른다.
 * @param {string} text
 * @param {number} [max]
 */
export function summarize(text, max = 80) {
  const chars = Array.from(text.replace(/\s+/g, ' ').trim());
  return chars.length > max
    ? `${chars.slice(0, max - 1).join('')}…`
    : chars.join('');
}

/**
 * @typedef {object} Activity
 * @property {(text: string) => void} succeed
 * @property {(text: string) => void} warn
 * @property {(text: string) => void} fail
 */

/**
 * @typedef {object} Progress
 * @property {(message: string) => void} log 일반 메시지 (여러 줄 가능, 시각 없음)
 * @property {(title: string) => void} stage 단계 시작 줄
 * @property {(text: string) => void} step 진행 이벤트 줄
 * @property {(label: string) => Activity} start 오래 걸리는 작업 시작 + heartbeat. 한 번에 하나만 진행한다.
 * @property {() => void} stop 진행 중인 작업 표시를 결과 없이 정리한다.
 */

/**
 * @param {object} options
 * @param {boolean} options.tty
 * @param {(text: string) => void} options.write
 * @param {() => Date} [options.now]
 * @returns {Progress}
 */
export function createProgress({ tty, write, now = () => new Date() }) {
  /** @typedef {{ label: string, startedAt: number, timer: NodeJS.Timeout }} Current */
  /** @type {Current | null} */
  let current = null;

  /** @param {Current} activity */
  const elapsed = (activity) => now().getTime() - activity.startedAt;
  /** @param {Current} activity */
  const liveLine = (activity) =>
    `⏳ ${activity.label}... ${formatClock(elapsed(activity))}`;

  const stamp = () => {
    const date = now();
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  };
  /** @param {string} text */
  const event = (text) => write(tty ? `${text}\n` : `${stamp()} ${text}\n`);

  // TTY에서 진행 줄이 있으면 지우고 출력한 뒤 다시 그린다.
  /** @param {() => void} print */
  const above = (print) => {
    if (tty && current) write(CLEAR_LINE);
    print();
    if (tty && current) write(liveLine(current));
  };

  const clear = () => {
    if (!current) return;
    clearInterval(current.timer);
    if (tty) write(CLEAR_LINE);
    current = null;
  };

  return {
    log: (message) => above(() => write(`${message}\n`)),
    stage: (title) =>
      above(() => {
        write('\n');
        event(title);
      }),
    step: (text) => above(() => event(text)),
    stop: clear,

    start(label) {
      clear();
      /** @type {Current} */
      const activity = {
        label,
        startedAt: now().getTime(),
        timer: setInterval(
          () => {
            if (tty) write(`${CLEAR_LINE}${liveLine(activity)}`);
            else event(`… ${label} (${formatClock(elapsed(activity))})`);
          },
          tty ? TTY_REFRESH_MS : PLAIN_HEARTBEAT_MS,
        ),
      };
      activity.timer.unref();
      current = activity;
      if (tty) write(liveLine(activity));
      else event(`⏳ ${label}...`);

      /**
       * @param {string} symbol
       * @param {string} text
       */
      const finish = (symbol, text) => {
        // 이미 정리되었거나 다른 작업이 시작된 경우
        if (current !== activity) return;
        const took = formatDuration(elapsed(activity));
        clear();
        event(`${symbol} ${text} · ${took}`);
      };
      return {
        succeed: (text) => finish('✓', text),
        warn: (text) => finish('⚠', text),
        fail: (text) => finish('✗', text),
      };
    },
  };
}
