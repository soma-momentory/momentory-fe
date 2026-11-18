import { isOlder, parseVersion } from "@/features/update/model/forceUpdate";

/**
 * 업데이트 소식 — **최신 버전의 소식 하나만** 둔다. 다음 출시 때는 여기의 버전과 글만 고친다.
 *
 * `version` 은 이 기능이 실제로 나가는 출시 번호다. 앱이 이 번호보다 낮으면 시트가 뜨지 않으므로,
 * 기능이 그 출시에서 빠지면 이 번호도 함께 옮긴다.
 */
export const WHATS_NEW = {
  version: "1.5.0",
  title: "바바의 4컷 그림일기",
  lines: [
    "일기를 쓰면 바바가 그 하루를 4컷으로 그려요",
    "다음 날 편지에서 그림을 볼 수 있어요",
    "마음에 드는 그림은 사진첩에 저장하거나 공유해 보세요",
  ],
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
