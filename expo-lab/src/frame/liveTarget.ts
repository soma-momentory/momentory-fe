/**
 * 셸이 고른 동적 id 를 **지금 프레임이 들고 있는 데이터**로 맞춘다.
 *
 * 셸은 id 를 데이터 세트의 *처음 시드*에서 고른다(`sampleParams`). 그런데 프레임을 쓰다 보면
 * (일정 추가 · 삭제 · 「하루 넘기기」 · 다른 날 저장된 데이터) 오늘 목록이 시드와 달라진다.
 * 일정 수정(`app/home/schedule/[id]`)은 그 id 를 오늘 목록에서 못 찾으면 **조용히 닫고 홈으로
 * 돌아간다** — 앱 규칙(RULES 5)이라 앱은 그대로 두고, Lab 이 옮기기 직전에 id 를 바꿔 낀다.
 */

type LiveSchedule = { id: string; hidden?: boolean; source?: string };

const SCHEDULE_EDIT = /^\/home\/schedule\/([^/?#]+)(.*)$/;

/**
 * - 일정 수정이 아니면(또는 「new」면) 그대로.
 * - 그 id 가 오늘 목록에 있으면 그대로.
 * - 없으면 오늘 목록의 일정으로 — 손으로 넣은 것(제목을 고칠 수 있는 것)을 먼저.
 * - 오늘 일정이 하나도 없으면 `null` — 옮기지 않는다(열어도 바로 닫힌다).
 */
export function retargetScheduleEdit(
  pathname: string,
  schedules: readonly LiveSchedule[],
): string | null {
  const match = SCHEDULE_EDIT.exec(pathname);
  if (match == null || match[1] === "new") return pathname;
  const id = decodeURIComponent(match[1]!);
  if (schedules.some((s) => s.id === id)) return pathname;
  const visible = schedules.filter((s) => !s.hidden);
  const pick = visible.find((s) => s.source === "manual") ?? visible[0] ?? schedules[0] ?? null;
  return pick == null ? null : `/home/schedule/${encodeURIComponent(pick.id)}${match[2] ?? ""}`;
}
