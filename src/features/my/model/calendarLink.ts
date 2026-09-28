import { syncDeviceCalendar } from "@/features/calendar/model/foregroundSync";
import { requestCalendarAccess } from "@/lib/calendar";

import { saveCalendarLinked } from "./basicInfo";

/**
 * 마이에서 캘린더를 잇는 결과 — 화면은 이것만 보고 무엇을 말할지 정한다.
 *
 * - `linked` — 권한을 받았고 서버에도 남겼다
 * - `declined` — 방금 다이얼로그에서 거부했다(다시 물을 수 있는 기기)
 * - `blocked` — 이미 거부돼 다시 물을 수 없다. 기기 설정에서 켜는 수밖에 없다
 * - `failed` — 권한은 받았는데 서버에 남기지 못했다. 동기화는 이미 시작했다
 */
export type CalendarLinkResult =
  | { kind: "linked"; granted: true }
  | { kind: "declined" | "blocked"; granted: false }
  | { kind: "failed"; granted: true; message: string };

/**
 * 권한을 묻고, 받으면 첫 적재를 시작한 뒤 서버에 연결을 남긴다.
 *
 * **동기화를 서버 저장보다 먼저 시작한다.** 기기 캘린더 화해는 OS 권한만 보고 돌기
 * 때문에(`foregroundSync.ts`), 저장이 실패해도 일정은 들어온다. 온보딩 `09` 와 같이
 * 기다리지 않는다 — 실패해도 다음 실행이 같은 것을 다시 보낸다.
 */
export async function linkCalendar(): Promise<CalendarLinkResult> {
  const access = await requestCalendarAccess();
  if (!access.granted) {
    return { kind: access.canAskAgain ? "declined" : "blocked", granted: false };
  }

  void syncDeviceCalendar();
  const saved = await saveCalendarLinked();
  return saved.ok
    ? { kind: "linked", granted: true }
    : { kind: "failed", granted: true, message: saved.message };
}
