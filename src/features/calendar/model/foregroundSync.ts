import { currentUserId } from "@/features/auth/model/auth";
import { useCalendarSync, type SyncOutcome } from "@/features/calendar/model/calendarSync";
import { useDay } from "@/features/home/model/day";
import { onForeground } from "@/lib/appState";

/**
 * 기기 캘린더 화해를 **언제 도는가** — 규칙은 `calendarSync.ts` 에 있고 여기는
 * 시점만 든다 (`docs/CALENDAR-PROBE.md` 「결정」 §10 의 표).
 *
 * | 시점                             | 부르는 곳                  |
 * | -------------------------------- | -------------------------- |
 * | `09` 에서 권한을 허용한 직후     | `app/(onboarding)/calendar.tsx` |
 * | 앱 콜드 스타트                   | `app/(tabs)/_layout.tsx`   |
 * | **백그라운드 → 포그라운드 복귀** | **여기** (`providers.tsx` 가 건다) |
 * | 04:00 하루 경계를 넘었을 때      | `features/home/model/dayRollover.ts` |
 *
 * ## 왜 복귀에도 돌아야 하는가
 *
 * **캘린더 앱에 일정을 적고 돌아온 직후가 바로 이것이다.** 콜드 스타트에만 걸어
 * 두면 우리 앱이 살아 있는 동안 캘린더에서 고친 것은 **앱을 껐다 켜야만** 들어온다.
 * 기기 캘린더는 변경을 알려주지 않고(`expo-calendar` 가 옵저버를 안 내보낸다)
 * 삭제는 어떤 API 로도 안 보이므로, **돌아올 때 다시 읽는 것 말고 방법이 없다.**
 *
 * 비싸지 않다 — 기기 조회는 실측 0.2초이고, 읽은 것이 지난번과 같으면 **서버는
 * 부르지 않는다**(해시 비교 · `calendarSync.ts`).
 *
 * ## 화면이 아니라 여기 하나에 건다
 *
 * `reminders.ts` 의 `startReminderSync` 와 같은 이유다 — 부르는 자리가 여럿이라
 * 화면마다 걸면 하나를 빠뜨린다. 그리고 이 구독은 탭 밖(회고·일기·마이)에 있는
 * 동안에도 살아 있어야 한다.
 */

/**
 * 한 번 화해하고, **서버가 실제로 바뀌었을 때만** 오늘 일정을 다시 받는다.
 *
 * **기다리게 하지 않는다** — 부르는 쪽은 `void` 로 던져 두고 자기 일을 한다.
 * 실패는 조용하고 다음 실행이 같은 것을 다시 보낸다(화해는 멱등이다 · `RULES.md` 4).
 *
 * 세션이 없으면 아무 일도 하지 않고 `null` 이다 — 로그인 전에도 이 구독은 살아 있다.
 * 결과를 돌려주는 것은 **일정을 이미 다시 받았는지** 부르는 쪽이 알아야 하기
 * 때문이다(`dayRollover.ts` 가 그것 때문에 두 번 조회하지 않는다).
 */
export async function syncDeviceCalendar(): Promise<SyncOutcome | null> {
  const userId = await currentUserId();
  if (userId == null) return null;

  const outcome = await useCalendarSync.getState().sync(userId);
  // `unchanged` 면 서버의 일정도 그대로다 — 조회를 한 번 더 할 이유가 없다
  if (outcome.kind === "synced") await useDay.getState().reload();
  return outcome;
}

/** 앱이 앞으로 돌아올 때마다 화해한다. 반환값은 구독 해제 */
export function startCalendarForegroundSync(): () => void {
  return onForeground(() => void syncDeviceCalendar());
}
