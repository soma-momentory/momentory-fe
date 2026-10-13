import { track } from "@/features/analytics";
import { useDiary } from "@/features/diary/model/diary";

import { storage } from "./deviceStorage";

/**
 * 스토어 별점 창(iOS `SKStoreReviewController` · 안드로이드 Play 인앱 리뷰) 요청 (2026-10-13 · 사용자와 정함).
 *
 * **회고를 한 번 이상 마친 사람이 쉼터를 끝까지 하고 「나아졌어요」를 고른 채 나왔을 때** 묻는다. 회고를 막
 * 마친 자리는 피한다 — 힘든 하루를 털어놓은 직후이고, 쉼터로 넘어가면 쉼 추천 시트도 뜬다. 쉼을 마치고
 * 나오는 때라야 추천 시트와 겹치지 않고, 스스로 나아졌다고 답한 순간이다.
 *
 * - 한 번 요청하면 120일 동안 다시 묻지 않는다. 창을 실제로 띄울지는 애플 · 구글이 정하고(iOS 1년 3번),
 *   떴는지 · 별점을 남겼는지 앱은 모른다. 그래서 계측도 「요청했다」까지다.
 * - 「앱이 마음에 드세요?」를 먼저 묻고 좋다는 사람만 보내는 방식은 두 스토어 모두 금지다 — 쓰지 않는다.
 * - 위기 안내가 나온 날은 묻지 않는다 — 대화(`retro/talk`)가 그때 **요청한 것과 같은 모양으로** 시각을
 *   적어 120일을 미룬다. 저장된 값을 봐도 위기 안내가 있었는지 알 수 없게(`recommendMemory.ts` 와 같은 결).
 *
 * 네이티브 모듈은 쓸 때 불러온다(`deviceStorage.ts` 와 같은 이유 — 모듈이 없는 옛 개발 빌드).
 * 로그아웃해도 지우지 않는다 — 기기 하나에 얼마나 자주 묻는가의 문제라서다. **던지지 않는다.**
 */
const KEY = "momentory.store-review";
const GAP_MS = 120 * 24 * 60 * 60 * 1000;
/** 쉼터 탭으로 돌아오는 전환이 끝난 뒤에 띄운다 */
const SETTLE_MS = 800;

type StoreReview = typeof import("expo-store-review");

/** 마지막 요청 시각으로 지금 물어도 되는가 — 읽을 수 없는 값이면 묻지 않는다 */
export const reviewDue = (raw: string | null, now: number) => {
  if (raw == null) return true;
  const last = Number(raw);
  return Number.isFinite(last) && now - last >= GAP_MS;
};

/** 위기 안내가 뜬 대화가 부른다 — 요청한 것과 같은 모양으로 남겨 120일을 미룬다 */
export async function postponeStoreReview(now = Date.now()): Promise<void> {
  try {
    await storage().setItem(KEY, String(now));
  } catch {
    // 못 남기면 그날 「나아졌어요」를 골랐을 때 한 번 물을 수 있다 — 창은 스토어가 또 거른다
  }
}

/** 쉼터를 「나아졌어요」로 마치고 나올 때 부른다(`useRestRecord`) */
export async function maybeRequestStoreReview(now = Date.now()): Promise<void> {
  if (useDiary.getState().diaries.length === 0) return;
  try {
    if (!reviewDue(await storage().getItem(KEY), now)) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const review = require("expo-store-review") as StoreReview;
    if (!(await review.isAvailableAsync())) return;
    // 창보다 먼저 적는다 — 창이 떠 있는 동안 다른 쉼터를 마쳐도 두 번 묻지 않게
    await storage().setItem(KEY, String(now));
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    await review.requestReview();
    track("store_review_requested", {});
  } catch {
    // 묻지 못한 것뿐이다
  }
}
