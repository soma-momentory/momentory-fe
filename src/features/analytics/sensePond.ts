import type { Track } from "./client";

export type SensePondStepName = "see" | "hear" | "feel";

/**
 * 감각연못 한 판의 계측 — 단계마다 걸린 시간과, 그 안에서 **가장 오래 멈춘 간격**.
 *
 * 화면은 시간을 재지 않는다(`features/rest/model/sensePond.ts` 「세는 것은 찾은 개수뿐이다」).
 * 여기서 재는 시간은 사용자에게 보이지 않는 계측이고, 놀이 규칙에는 아무 영향이 없다.
 *
 * ## 왜 가장 긴 간격인가
 *
 * 한 단계가 오래 걸린 것만으로는 **천천히 둘러본 것**(의도한 쉼)과 **어디를 눌러야 할지
 * 몰라 멈춘 것**(화면 문제)을 가를 수 없다. 간격이 고르면 앞의 것이고, 한 번 길게
 * 멈췄다가 몰아 누르면 뒤의 것에 가깝다. 손짓마다 이벤트를 보내지 않고 단계 완료에
 * 가장 긴 간격 하나만 싣는다.
 *
 * ## 꾹 누르기를 일찍 뗀 횟수
 *
 * 감각 단계는 톡이 아니라 잠시 누르고 있기다. 다 채우기 전에 손을 떼면 화면이 「조금 더
 * 오래」를 다시 말한다. 이 횟수가 쌓이면 손짓 자체가 어려운 것이므로, 단계 완료와 이탈에
 * 함께 싣는다. 톡 단계에서는 늘 0 이다.
 *
 * ## 전면에 있던 시간만 센다
 *
 * 둘러보는 동안 화면이 자동으로 잠기면 앱은 `inactive`·`background` 로 간다. 그
 * 시간까지 세면 잠금 설정이 체류 시간을 정한다. `pause`·`resume` 사이의 시간은 빼고,
 * 모든 값은 이 전면 시계로 잰다.
 */
export function createSensePondTracker(track: Track, now: () => number) {
  let banked = 0;
  let since: number | null = now();
  const clock = () => banked + (since == null ? 0 : now() - since);

  // 첫 단계가 서기 전(시작 화면)에는 비어 있다 — 이때는 놀이가 시작되지 않았다
  let step: SensePondStepName | null = null;
  let stepAt = 0;
  let lastAt = 0;
  let longest = 0;
  let found = 0;
  let holdCancels = 0;
  // 끝까지 갔거나 떠났다 — 그 뒤로는 아무것도 보내지 않는다
  let over = false;

  return {
    /** 새 단계가 화면에 섰다. 단계 시간은 여기서부터 잰다. 첫 단계면 전체 시간도 여기서부터다 */
    show(next: SensePondStepName) {
      if (over) return;
      if (step == null) {
        banked = 0;
        if (since != null) since = now();
      }
      step = next;
      stepAt = lastAt = clock();
      longest = 0;
      found = 0;
      holdCancels = 0;
    },
    /** 감각 하나를 찾았다. 목표를 채운 뒤의 손짓은 화면처럼 세지 않는다 */
    find(goal: number, last: boolean) {
      if (over || step == null || found >= goal) return;
      const at = clock();
      longest = Math.max(longest, at - lastAt);
      lastAt = at;
      found += 1;
      if (found < goal) return;
      track("sense_pond_step_completed", {
        step,
        duration_ms: at - stepAt,
        longest_gap_ms: longest,
        hold_cancels: holdCancels,
      });
      if (!last) return;
      over = true;
      track("sense_pond_finished", { duration_ms: at });
    },
    /** 잠시 누르기를 다 채우기 전에 손을 뗐다 */
    holdCancel() {
      if (!over) holdCancels += 1;
    },
    pause() {
      if (since == null) return;
      banked += now() - since;
      since = null;
    },
    resume() {
      if (since == null) since = now();
    },
    /** 끝내지 않고 화면을 떠났다. 끝까지 간 판과 시작하기 전에는 보내지 않는다 */
    leave() {
      if (over || step == null) return;
      over = true;
      track("sense_pond_exited", { step, found, hold_cancels: holdCancels, duration_ms: clock() });
    },
  };
}
