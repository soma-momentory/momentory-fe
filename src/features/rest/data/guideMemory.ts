import type { RestGuideContent } from "../model/restGuide";
import { storage } from "./deviceStorage";

/**
 * 쉼터 설명 카드를 **이미 본 쉼터**를 기기에 기억한다 (2026-10-12) — 쉼터 이름의 목록 하나뿐이다.
 *
 * 처음 들어간 쉼터에서만 카드가 저절로 뜨고, 그 뒤로는 「?」 원을 눌러야 다시 뜬다(`useRestGuide`).
 * 서버에 두지 않는 것은 「한 번 보여 줬나」가 기기 쪽 사정일 뿐이라서다 — 앱을 다시 깔면 한 번 더
 * 보는 정도는 괜찮다. **던지지 않는다.**
 */
const KEY = "momentory.rest-guide";

const readSeen = async (): Promise<string[] | null> => {
  try {
    const raw = await storage().getItem(KEY);
    if (raw == null) return [];
    const v: unknown = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return null;
  }
};

/** 못 읽으면 `null` — 부르는 쪽은 그때 **띄우지 않는다**(못 남기면 들어올 때마다 뜬다) */
export async function readGuideSeen(content: RestGuideContent): Promise<boolean | null> {
  const seen = await readSeen();
  return seen == null ? null : seen.includes(content);
}

export async function markGuideSeen(content: RestGuideContent): Promise<void> {
  try {
    const seen = (await readSeen()) ?? [];
    if (!seen.includes(content)) await storage().setItem(KEY, JSON.stringify([...seen, content]));
  } catch {
    // 못 남기면 다음에 한 번 더 뜨는 것뿐이다
  }
}

/** 로그아웃 · 탈퇴 때 지운다 — 다음 사람도 처음 들어간 쉼터에서 카드를 보게(`auth.ts`) */
export async function clearGuideMemory(): Promise<void> {
  try {
    await storage().removeItem(KEY);
  } catch {
    // 못 지워도 담긴 것은 쉼터 이름뿐이다 — 다음 사람에게 카드가 저절로 뜨지 않는 정도다
  }
}
