import { useAuth } from "@/features/auth/model/auth";
import { syncDeviceCalendar } from "@/features/calendar/model/foregroundSync";
import { markDayChanged, useDay } from "@/features/home/model/day";
import { onDayChange } from "@/lib/dayChange";

/**
 * **새벽 4:00 에 하루가 넘어갈 때** 앱이 하는 일 — 한 곳에 모은다.
 *
 * 밤새 켜 둔 앱, 혹은 자정을 넘겨 백그라운드에 있던 앱은 4:00 이 지나도
 * **어제에 머물러 있었다**: 홈 상단이 어제 날짜를 말하고, 목록에는 어제 일정이
 * 남고, 캘린더 화해의 창(`syncWindow`)도 어제 기준이었다. 화면을 다시 열어야만
 * 맞춰지는 것은 「앱을 껐다 켜야 한다」와 같은 종류의 어긋남이다.
 *
 * ## 순서가 있다 — 화해 먼저, 하루치 조회는 그다음
 *
 * `docs/CALENDAR-PROBE.md` 「결정」 §8 이 정한 순서다. 나란히 부르면 **아직
 * 서버에 들어가지 않은 새 하루의 일정**을 조회하게 되어 홈이 잠깐 빈다.
 * 화해가 성공하면 그쪽이 이미 다시 받았으므로 **두 번 조회하지 않는다.**
 *
 * ## 로그인 전에는 아무것도 하지 않는다
 *
 * 이 구독은 앱 전체에 걸려 있어 로그인 화면에서도 살아 있다. 세션이 없는데
 * 조회를 보내면 실패할 요청 하나를 새벽에 던지는 것뿐이다.
 */
export function startDayRollover(): () => void {
  return onDayChange(() => {
    // 날짜를 든 화면부터 다시 그린다 — 서버를 기다리게 하지 않는다
    markDayChanged();
    if (useAuth.getState().status !== "authenticated") return;
    void refreshNewDay();
  });
}

async function refreshNewDay(): Promise<void> {
  // 창이 달을 넘어가면 화해가 새 범위를 통째로 다시 보낸다(`window.ts`)
  const outcome = await syncDeviceCalendar();
  // 화해가 「바뀌었다」로 끝났으면 그 안에서 이미 다시 받았다
  if (outcome?.kind !== "synced") await useDay.getState().reload();
}
