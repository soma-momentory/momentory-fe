import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";

import { useDay } from "@/features/home/model/day";
import { ScheduleEditBar } from "@/features/home/ui/ScheduleEditBar";

/**
 * `12-c` · 일정 수정
 *
 * **⋮ 메뉴의 「수정하기」가 연다** — 새 디자인에서 제목 탭은 아무 일도 하지 않고
 * (제목을 꾹 누르면 순서가 바뀐다), 고치는 길과 지우는 길이 ⋮ 하나로 모였다
 * (`Schedule.dc.html` 4-2·4-3).
 *
 * ⚠ **삭제가 여기서 빠졌다.** 지우는 것은 홈의 ⋮ 메뉴 → 확인 모달 한 번이다
 * (`DESIGN.md` 「일정」). 고치러 온 자리에 지우는 버튼을 두지 않는다.
 *
 * **가져온 일정은 읽기 전용이다**(`12-c`) — 그래서 홈의 ⋮ 도 그 줄에는
 * 「수정하기」를 내주지 않는다. 딥링크로 곧장 올 수는 있으므로 여기서도 잠근다.
 */
export default function ScheduleEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const schedule = useDay((s) => s.schedules.find((x) => x.id === id));
  const rename = useDay((s) => s.renameSchedule);

  // 없는 일정이면 조용히 닫는다 — 오류 화면을 만들지 않는다(RULES 5)
  useEffect(() => {
    if (schedule == null) router.back();
  }, [schedule]);

  if (schedule == null) return null;

  const manual = schedule.source === "manual";

  return (
    <ScheduleEditBar
      mode="edit"
      onDismiss={() => router.back()}
      initialTitle={schedule.title}
      readOnly={!manual}
      caption={manual ? "일정 수정" : "캘린더에서 가져온 일정이라 제목을 고칠 수 없어요"}
      onSubmit={(title) => rename(schedule.id, title)}
    />
  );
}
