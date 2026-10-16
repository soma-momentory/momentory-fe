/**
 * 알림 항목의 `link` 가 갈 수 있는 **앱 안의 자리** — 허용 목록 하나다(계획 §5.2 · §5.3).
 *
 * BE DB는 `/`로 시작하고 `//`·역슬래시가 없는 내부 경로를 허용하지만, 그 조건만 믿고 라우터에
 * 그대로 넘기지 않는다. 운영자가 DB 에 적은 문자열 하나가 앱의 아무 화면(회고 한가운데 ·
 * 온보딩)으로나 사용자를 떨어뜨릴 수 있기 때문이다. 그래서 **여기 적힌 것과 글자 그대로
 * 같은 것만** 통과시키고 나머지는 `null` — 항목은 남고 누를 곳이 없을 뿐이다.
 *
 * - 초기 넷은 계획 §5.3 의 예시 그대로다(결정 D2 · 2026-10-16). 늘리는 것은 BE 와 운영 공지가
 *   정해질 때다.
 * - `/rest` 처럼 그룹이 겹치는 맨 경로는 받지 않는다 — `(tabs)/rest` 와 `rest/` 스택이 같은
 *   이름을 쓴다(`PRODUCT.md` #42 (2)). 그룹을 붙인 이름만 적는다.
 * - 쿼리 · 조각 · 스킴 · 앞뒤 공백도 정확 일치에서 떨어진다 — 따로 걸러 낼 규칙을 두지 않는다.
 */
export const INBOX_LINKS = [
  "/(tabs)/rest",
  "/(tabs)/report",
  "/(tabs)/archive",
  "/my/profile",
] as const;

/** expo-router `Href` 로 그대로 넘길 수 있는 리터럴 — 화면이 캐스팅하지 않는다 */
export type InboxLink = (typeof INBOX_LINKS)[number];

const ALLOWED: ReadonlySet<string> = new Set(INBOX_LINKS);

/** 허용 목록과 **정확히 같을 때만** 그 경로, 아니면 `null`. 던지지 않는다 */
export function toAllowedLink(raw: unknown): InboxLink | null {
  if (typeof raw !== "string") return null;
  return ALLOWED.has(raw) ? (raw as InboxLink) : null;
}
