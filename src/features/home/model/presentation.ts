import type { Schedule } from "./types";

/** 목록에 보이는 일정 — 캘린더 원본에서 숨긴 줄은 세지 않는다. */
export const visibleSchedules = (schedules: readonly Schedule[]) =>
  schedules.filter((schedule) => !schedule.hidden);

/** 다섯 줄까지 접는 것은 디자인 토큰이 아니라 홈의 제품 규칙이다. */
export const MAX_VISIBLE_SCHEDULES = 5;

/**
 * 「3개 남음」 — **남은(미완료) 수**다(`DESIGN.md` 「홈」).
 *
 * 마친 수를 세면 「얼마나 해냈는가」가 되고, 남은 수를 세면 「무엇이 남았는가」가
 * 된다. 진행률·배지를 만들지 않는다는 규칙(`12.md`)은 그대로다 — 다 마쳤을 때도
 * 점수 대신 **끝났다는 사실**만 말한다.
 */
export const remainingLabel = (schedules: readonly Schedule[]) => {
  const left = visibleSchedules(schedules).filter((schedule) => !schedule.done).length;
  return left > 0 ? `${left}개 남음` : "모두 완료";
};
