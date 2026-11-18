import { isOlder, parseVersion } from "@/features/update/model/forceUpdate";

/**
 * 업데이트 소식 — **최신 버전의 소식 하나만** 둔다. 다음 출시 때는 여기의 버전과 글만 고친다.
 *
 * `version` 은 이 기능이 실제로 나가는 출시 번호다. 앱이 이 번호보다 낮으면 공지가 뜨지 않으므로,
 * 기능이 그 출시에서 빠지면 이 번호도 함께 옮긴다.
 */
export const WHATS_NEW = {
  version: "1.5.0",
  message: "바바가 편지에\n네컷 그림일기를 그려줘요!",
} as const;

/**
 * 소식을 보여 줄 차례인가.
 *
 * `seenVersion` 이 `null` 이면 기록이 없는 기존 사용자라서 보여 준다(새 가입자는 온보딩을 마칠 때 기록이 생긴다).
 * `undefined`(못 읽음) · 형태가 틀린 값은 보여 주지 않는다 — 같은 안내가 들어올 때마다 뜨는 쪽이 더 나쁘다.
 */
export function shouldShowWhatsNew(appVersion: unknown, seenVersion: string | null | undefined) {
  const news = parseVersion(WHATS_NEW.version);
  const app = parseVersion(appVersion);
  if (news == null || app == null || isOlder(app, news)) return false;
  if (seenVersion === null) return true;
  const seen = parseVersion(seenVersion);
  return seen != null && isOlder(seen, news);
}
