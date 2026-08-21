import { AppState, type AppStateStatus } from "react-native";

/**
 * 앱이 **앞으로 돌아온 순간** — `AppState` 를 보는 곳은 여기 하나다.
 *
 * `notifications.ts`·`calendar.ts` 와 같은 자리다: 플랫폼의 말을 우리 말로 바꿔
 * 준다. 부르는 쪽은 「백그라운드였다가 돌아왔다」만 알면 되고, 그것을 어떤 상태
 * 전이로 알아내는지는 여기서만 안다.
 *
 * ## 왜 「active 로 바뀌었다」가 아니라 「active 가 아니었다가 active 가 됐다」인가
 *
 * 두 OS 의 전이가 다르다:
 *
 * ```
 * iOS      active → inactive → background → inactive → active
 * Android  active → background → active            (inactive 가 없는 기기가 있다)
 * ```
 *
 * 그래서 **`background` 만 보면 iOS 를 놓치고**(돌아올 때 직전 상태가 `inactive`
 * 다), `active` 만 보면 이미 앞에 있는 앱에 대고 계속 부른다. 「앞에 없었다가
 * 앞에 왔다」 하나로 두 OS 를 함께 덮는다.
 *
 * ⚠ 대가: iOS 에서 알림 센터를 내렸다 올리는 것처럼 **`background` 까지 가지 않는
 * 잠깐의 `inactive`** 도 한 번 부른다. 이걸 걸러내려면 「진짜 background 였는가」를
 * 기억해야 하는데, 그러면 `background` 를 안 주는 기기에서 **영영 안 부르는**
 * 쪽으로 틀린다. 덜 부르는 것보다 더 부르는 쪽이 안전한 일에만 이걸 쓴다 —
 * 캘린더 화해가 그렇다(기기 조회 0.2초 · 바뀐 게 없으면 서버를 부르지 않는다).
 */
export function onForeground(handler: () => void): () => void {
  let previous: AppStateStatus = AppState.currentState;

  const subscription = AppState.addEventListener("change", (next) => {
    const before = previous;
    previous = next;
    if (next !== "active" || before === "active") return;
    handler();
  });

  return () => subscription.remove();
}
