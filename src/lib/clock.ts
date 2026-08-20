/**
 * 시각의 단일 공급자 — **날짜·시각이 필요한 곳은 전부 이 모듈을 지난다.**
 *
 * `new Date()` 와 샘플 날짜가 화면·store 에 흩어져 있으면 실제 날짜 · 타임존 ·
 * 04:00 하루 경계 · 테스트 고정 시각을 적용할 때 수정 지점이 많아진다
 * (`docs/CODE-REVIEW.md` P2). 그래서 공급자를 하나로 모으고 갈아끼울 수 있게 둔다.
 *
 * - `SystemClock` — 운영 시각. **하루는 새벽 4:00 에 넘어간다**(`RULES.md`)
 * - `SampleClock` — 테스트·화면 데모의 고정 하루(2026-07-27)
 * - `fixedClock(iso)` — 테스트별 고정 시각(TestClock)
 */
export type Clock = {
  now(): Date;
  /** 오늘 — `YYYY-MM-DD`. **자정이 아니라 새벽 4:00 에 넘어간다** */
  today(): string;
};

/** 하루의 경계 — 새벽 4:00(`RULES.md` 「불변 규칙」). 자정이 아니다 */
export const DAY_BOUNDARY_HOUR = 4;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 그 시각이 속하는 「하루」 — 새벽 3:59 는 어제, 4:00 부터 오늘이다.
 * 한국은 서머타임이 없어 로컬 시각에서 4시간을 빼는 계산이 안전하다.
 */
export function dayFrom(at: Date): string {
  const shifted = new Date(at.getTime() - DAY_BOUNDARY_HOUR * 60 * 60 * 1000);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

/** 운영 시각 — 기기 시계 그대로, 하루 경계만 4:00 으로 옮긴다 */
export const SystemClock: Clock = {
  now: () => new Date(),
  today: () => dayFrom(new Date()),
};

/**
 * 샘플 하루 — **면접 스터디가 있는 날**(스키마 `meta.sampleData`).
 * 홈·보관함·리포트가 같은 하루를 봐야 하므로 값이 여기 한 곳에 있다.
 */
export const SAMPLE_TODAY = "2026-07-27";

/**
 * 화면 데모의 시계 — **하루는 고정이고 시·분·초만 실제**를 따른다.
 *
 * 날짜(2026-07-27)는 샘플 데이터와 맞아야 해서 고정한다. `now()` 까지 기기
 * 날짜를 쓰면 새 기록의 `date` 는 7/27 인데 `createdAt`·`doneAt` 은 다른 날이
 * 되는 어긋남이 생긴다 — 그래서 타임스탬프의 날짜도 샘플 하루로 옮기고,
 * 시각만 실제를 따라 기록 사이의 순서·간격은 진짜처럼 남긴다.
 *
 * 지키는 불변식은 `dayFrom(now()) === today()` 다 — 오전 0~3시는 04:00 경계
 * 기준으로 아직 「어제」에 속하므로, 그 시각이 샘플 하루에 속하려면 달력
 * 날짜를 **다음 날(7/28)** 로 잡아야 한다.
 */
export const SampleClock: Clock = {
  now: () => {
    const [y = 2026, m = 1, d = 1] = SAMPLE_TODAY.split("-").map(Number);
    const at = new Date();
    const day = at.getHours() < DAY_BOUNDARY_HOUR ? d + 1 : d;
    // Date 생성자가 달·해 넘김을 맞춰준다 — 7/31 + 1 도 8/1 이 된다
    return new Date(y, m - 1, day, at.getHours(), at.getMinutes(), at.getSeconds());
  },
  today: () => SAMPLE_TODAY,
};

/** 테스트 고정 시각 — `today()` 는 4:00 경계를 지나 계산된다 */
export const fixedClock = (iso: string): Clock => {
  const at = new Date(iso);
  return {
    now: () => new Date(at),
    today: () => dayFrom(at),
  };
};

/**
 * 운영·개발 빌드는 기기 시각을 쓴다. Jest 만 기존 샘플 데이터와 무관한 테스트가
 * 흔들리지 않도록 고정 하루에서 시작하고, 필요한 테스트가 `fixedClock` 을 심는다.
 */
let active: Clock = process.env.NODE_ENV === "test" ? SampleClock : SystemClock;

/** 시계를 갈아끼운다 — 테스트가 `fixedClock` 을 심을 때 쓴다 */
export const setClock = (next: Clock) => {
  active = next;
};

/**
 * 날짜·시각이 필요한 곳이 실제로 부르는 것. `active` 를 늦게 읽으므로
 * import 시점이 아니라 **호출 시점**의 시계를 쓴다.
 */
export const clock: Clock = {
  now: () => active.now(),
  today: () => active.today(),
};
