import { storage } from "@/features/rest/data/deviceStorage";

/**
 * 이 사용자가 **어느 앱 버전까지의 소식을 봤는지** 기기에 기억한다. 날씨 첫 안내(`weatherIntroMemory.ts`)처럼
 * 키에 `userId` 가 들어가므로 로그아웃해도 지우지 않는다. **던지지 않는다.**
 */
const keyOf = (userId: number) => `home.whatsNew.v1.${userId}`;

/** 본 버전. 기록이 없으면 `null`, **못 읽으면 `undefined`** */
export async function readWhatsNewSeen(userId: number): Promise<string | null | undefined> {
  try {
    return await storage().getItem(keyOf(userId));
  } catch {
    return undefined;
  }
}

export async function markWhatsNewSeen(userId: number, version: string): Promise<void> {
  try {
    await storage().setItem(keyOf(userId), version);
  } catch {
    // 못 남기면 다음 실행에 한 번 더 뜰 수 있다 — 그 정도다
  }
}
