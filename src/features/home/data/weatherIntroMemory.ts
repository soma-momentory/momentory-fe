import { storage } from "@/features/rest/data/deviceStorage";

/**
 * 홈 날씨 첫 안내(HW-3)를 **이 사용자가 이미 봤는지** 기기에 기억한다 (계획 §4.5).
 *
 * **사용자별로 격리한다**(`UX_STRUCTURE.md` A-11 · V-10) — 키에 `userId` 가 들어간다. 그래서 로그아웃은
 * 지우지 않는다: 같은 사람이 다시 들어오면 안내가 되풀이되지 않고, 다른 사람은 키가 달라 첫 안내를 받는다.
 * 탈퇴 때는 그 사람의 키를 지운다(`clearWeatherIntroMemory` — 연결은 `auth.ts` 몫 · 후속).
 *
 * `userId` 를 모르면 부르는 쪽(`useHomeWeather`)이 **읽지도 쓰지도 않는다** — 시그니처가 `number` 만 받는다.
 * 기기 기억은 쉼터와 같은 `deviceStorage.ts` 를 지난다. **던지지 않는다.**
 */
const keyOf = (userId: number) => `home.weatherIntro.v1.${userId}`;

/** 봤으면 `true`. **못 읽으면 `true`** — 묻지 않는 쪽이 안전하다(같은 안내가 들어올 때마다 뜨지 않게) */
export async function readWeatherIntroSeen(userId: number): Promise<boolean> {
  try {
    return (await storage().getItem(keyOf(userId))) != null;
  } catch {
    return true;
  }
}

export async function markWeatherIntroSeen(userId: number): Promise<void> {
  try {
    await storage().setItem(keyOf(userId), "1");
  } catch {
    // 못 남기면 다음 포커스에 한 번 더 뜰 수 있다 — 그 정도다
  }
}

/** 탈퇴 때 그 사용자의 기록만 지운다 — 다른 사용자의 키는 남는다 */
export async function clearWeatherIntroMemory(userId: number): Promise<void> {
  try {
    await storage().removeItem(keyOf(userId));
  } catch {
    // 못 지워도 남는 것은 「안내를 봤다」 한 칸이다
  }
}
