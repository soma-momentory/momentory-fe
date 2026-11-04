import { storage } from "@/features/rest/data/deviceStorage";

/**
 * 「한 주에 3일 이상…」 안내를 보여 준 주를 기기에 기억한다. 일기가 적은 주가 흔한 사람에게 매주 보이면 숙제처럼
 * 읽히므로, 처음 두 주만 보여 준다. 같은 주를 다시 열면 그 주에는 계속 보인다.
 * 저장소를 못 읽으면 보여 주지 않는다 — 조용한 쪽으로 닫는다.
 */
const KEY = "momentory.report.threeDayHintWeeks";
const HINT_WEEKS = 2;

export async function takeThreeDayHint(week: string): Promise<boolean> {
  try {
    const raw = await storage().getItem(KEY);
    const parsed: unknown = raw == null ? [] : JSON.parse(raw);
    const weeks = Array.isArray(parsed)
      ? parsed.filter((w): w is string => typeof w === "string")
      : [];
    if (weeks.includes(week)) return true;
    if (weeks.length >= HINT_WEEKS) return false;
    await storage().setItem(KEY, JSON.stringify([...weeks, week]));
    return true;
  } catch {
    return false;
  }
}

export async function clearThreeDayHint(): Promise<void> {
  try {
    await storage().removeItem(KEY);
  } catch {
    // 지우지 못해도 다음 사람에게 안내가 덜 보일 뿐이다
  }
}
