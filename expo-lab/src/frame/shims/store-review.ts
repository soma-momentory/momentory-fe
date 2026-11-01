/**
 * `expo-store-review` 심 — 스토어 별점 창은 Lab 에 없다. 「요청했다」까지만 흘려보낸다
 * (앱은 창이 실제로 떴는지 원래 모른다 — `src/features/rest/data/storeReview.ts`).
 */
export async function isAvailableAsync(): Promise<boolean> {
  return true;
}

export async function hasAction(): Promise<boolean> {
  return true;
}

export async function requestReview(): Promise<void> {
  if (__DEV__) console.info("[lab-frame] 스토어 별점 창 요청 — Lab 에서는 띄우지 않는다");
}

export function storeUrl(): string | null {
  return null;
}
