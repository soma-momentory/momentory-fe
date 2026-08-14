import type { SyncEvent, SyncRange } from "@/features/calendar/model/types";

/**
 * 내용 해시 — **「보낼 것이 있나」를 서버에 묻지 않고 판정한다.**
 *
 * 기기에서 3개월을 읽는 데 실측 229ms 이고 그건 어차피 매번 한다(앱이 꺼져 있는
 * 동안의 변경은 읽어 봐야만 안다 · `CALENDAR-PROBE.md` §10). 아끼는 것은 **서버
 * 왕복**이다 — 바뀐 게 없으면 아예 부르지 않는다.
 *
 * ## 왜 원본 객체를 stringify 하지 않는가
 *
 * `expo-calendar` 가 주는 객체에는 우리가 안 쓰는 값이 잔뜩 있다 —
 * `instanceId`(회차마다 달라지고 **volatile**) · `alarms` · `organizerEmail` ·
 * 플랫폼 전용 필드. 그걸 해싱하면 **화면에 아무 변화가 없는데도 매번 다른 해시**가
 * 나와서, 해시가 하는 일이 없어진다.
 *
 * 그래서 입력은 **정규화가 끝난 결과**(`SyncEvent[]`)뿐이다. 아래 넷이 바뀌어도
 * 해시는 그대로여야 한다:
 *
 * - 객체 키 순서 — 우리가 문자열을 직접 조립하므로 애초에 무관하다
 * - 조회 순서 — `normalizeOccurrences` 가 안정 정렬을 마친 뒤에 들어온다
 * - 안 쓰는 플랫폼 전용 필드 — 애초에 `SyncEvent` 에 없다
 * - 캘린더 내부 메타데이터 — 같다
 */

/**
 * cyrb128 — 32비트 넷을 굴려 **128비트**를 만든다.
 *
 * `expo-crypto` 를 이번 작업 때문에 새로 넣지 않는다(네이티브 재빌드가 따라온다).
 * 32비트 해시로는 부족한데, **충돌의 결과가 「동기화를 통째로 건너뛴다」**라서다 —
 * 사용자가 캘린더를 고쳤는데 앱이 영영 모르는 상태가 된다. 128비트면 그 확률이
 * 실질적으로 0 이다.
 *
 * 암호학적 해시가 아니다. 여기서 막으려는 것은 **공격이 아니라 우연**이다.
 */
export const cyrb128 = (input: string): string => {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;

  for (let i = 0; i < input.length; i += 1) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }

  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);

  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h2) >>> 0]
    .map((n) => n.toString(16).padStart(8, "0"))
    .join("");
};

/**
 * 길이를 앞에 붙여 잇는다 — **구분자만 쓰면 경계가 흐려진다.**
 *
 * `"ab" + ":" + "c"` 와 `"a" + ":" + "bc"` 가 같은 문자열이 되는 것을 막는다.
 * 제목에는 무엇이든 들어올 수 있으므로(콜론·줄바꿈·이모지) 구분자로는 부족하다.
 */
const join = (...parts: string[]) => parts.map((p) => `${p.length}:${p}`).join("");

/**
 * 스냅샷 해시. **범위가 입력에 들어간다** — 창이 달마다 밀리므로
 * 「같은 내용, 다른 범위」를 같다고 읽으면 새 달의 일정이 영영 안 올라간다.
 *
 * 정렬은 여기서 하지 않는다. **이미 정렬된 것이 들어온다고 본다**
 * (`normalizeOccurrences` 의 책임) — 여기서 또 정렬하면 어느 쪽이 정본인지
 * 알 수 없게 된다.
 */
export const snapshotHash = (range: SyncRange, events: SyncEvent[]): string =>
  cyrb128(join(range.from, range.to, ...events.flatMap((e) => [e.externalId, e.date, e.title])));
