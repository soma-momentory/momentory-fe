import { onForeground } from "@/lib/appState";
import { clock, msUntilNextDay } from "@/lib/clock";

/**
 * **하루가 넘어간 순간** — 새벽 4:00 이다(`RULES.md` 「불변 규칙」 · 자정이 아니다).
 *
 * 「지금이 무슨 날인가」의 정본은 언제나 `clock.today()` 다. 여기가 하는 것은
 * **그 값이 바뀌었다고 알려 주는 것**뿐이라, 날짜를 따로 들고 있지 않다 —
 * 두 곳이 날짜를 들면 어느 쪽이 맞는지 알 수 없게 된다.
 *
 * ## 두 갈래로 안다 — 하나만으로는 못 잡는다
 *
 * | 어떤 경우                          | 무엇이 잡나                      |
 * | ---------------------------------- | -------------------------------- |
 * | 앱을 켠 채로 4:00 을 넘겼다        | 경계까지 걸어 둔 타이머          |
 * | 백그라운드에 있는 동안 넘어갔다    | 포그라운드 복귀(`onForeground`)  |
 *
 * 타이머 하나로는 안 된다 — 백그라운드에서는 JS 타이머가 제때 깨지 않는다(iOS 는
 * 스레드가 멈춘다). 반대로 복귀만 보면 **밤새 앱을 켜 둔 사람**의 화면이 4:00 을
 * 넘겨도 어제에 머문다. 그래서 둘 다 걸고, **어느 쪽으로 깨든 날짜를 다시 읽어
 * 비교한다** — 늦게 깨는 것은 문제가 되지 않는다.
 *
 * 깨어난 김에 다음 경계로 타이머를 다시 건다. 「경계 위에서 깼는데 기기 시계가
 * 아직 3:59:59.9」인 경우를 피하려고 **1초 더 뒤에** 깨운다.
 */
export function onDayChange(handler: (today: string) => void): () => void {
  let current = clock.today();
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = () => {
    if (timer != null) clearTimeout(timer);
    timer = setTimeout(check, msUntilNextDay(clock.now()) + 1_000);
  };

  const check = () => {
    const today = clock.today();
    if (today !== current) {
      current = today;
      handler(today);
    }
    // 늦게 깼든 제때 깼든 다음 경계는 다시 계산한다
    schedule();
  };

  schedule();
  const stopForeground = onForeground(check);

  return () => {
    if (timer != null) clearTimeout(timer);
    timer = null;
    stopForeground();
  };
}
