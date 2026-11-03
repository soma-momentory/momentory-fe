import { syncDeviceCalendar } from "@/features/calendar/model/foregroundSync";
import { requestCalendarAccess, type CalendarAccess } from "@/lib/calendar";

import { saveCalendarLinked } from "./basicInfo";
import { useProfile } from "./settings";

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

let adopting: Promise<unknown> | null = null;

/**
 * 기기 권한은 허용인데 서버 값만 「연결 안 함」이면 **서버 값을 기기에 맞춘다**(2026-09-28).
 *
 * iOS 는 설정 앱에서 개인정보 권한을 바꾸면 **그 앱을 종료시킨다.** 그래서 「기기 설정으로
 * 보냈다가 돌아오면 잇는다」를 앱 메모리에 기억해 두는 방식은 동작하지 않았다 — 다시 열린
 * 앱은 보낸 적이 있다는 것을 모르고, 사용자는 이미 허용하고 온 것을 한 번 더 눌러야 했다
 * (실기기에서 확인). 그 사이 동기화는 OS 권한만 보고 이미 일정을 가져오고 있어서, 마이는
 * 「연결 안 함」인데 홈에는 캘린더 일정이 있는 어긋난 상태였다.
 *
 * 그래서 「어디서 왔는가」가 아니라 **지금 어떤가**를 본다. 모멘토리를 거치지 않고 iOS
 * 설정에서 직접 켠 경우도 같이 맞춰진다. 권한 창을 띄우지 않고, 동기화도 새로 걸지 않는다
 * (이미 돌고 있다). 실패는 조용하다 — 다음에 들어오거나 앞으로 돌아올 때 다시 맞춘다.
 */
export function adoptGrantedCalendar(access: CalendarAccess): Promise<unknown> {
  const { calendarLinked, nickname } = useProfile.getState();
  if (!access.granted || calendarLinked) return Promise.resolve();
  // 닉네임이 비었으면 프로필을 아직 못 받은 것이다 — `false` 는 「연결 안 함」이 아니라 「모름」이고,
  // 이 저장은 프로필을 통째로 덮어쓰는 PUT 이라 빈 값이 서버로 간다. 다음에 들어올 때 다시 맞춘다
  if (!nickname) return Promise.resolve();
  // 들어오기와 앞으로 돌아오기가 겹쳐도 한 번만 보낸다
  adopting ??= saveCalendarLinked().finally(() => {
    adopting = null;
  });
  return adopting;
}
