import { router, useLocalSearchParams } from "expo-router";

import { useDay } from "@/features/home/model/day";
import { ScheduleEditBar } from "@/features/home/ui/ScheduleEditBar";

/**
 * `12-c` · 일정 수정·삭제
 *
 * **제목을 누르면 열린다** — 새 디자인의 제목 탭은 상세 카드가 아니라
 * **기존 값이 담긴 입력 바 + 🗑**다(`홈.dc.html` · `app-flow.md` §2.1).
 * 감정은 여기 없다 — **마침 원을 누를 때** 뜨는 감정 시트가 맡는다(`12-c-emotion`).
 *
 * **가져온 일정은 읽기 전용이다** — 제목을 고칠 수 없고, `[삭제]` 대신
 * **`[홈에서 숨기기]`** 다. 같은 자리에 삭제를 두면 캘린더 원본이 지워진다고
 * 읽힌다(실제로는 `hidden` 만 켠다).
 *
 * - **삭제는 한 번 묻는다**(시안의 확인 모달) — 되돌릴 수 없기 때문이다.
 *   **숨기기는 묻지 않는다** — 되돌릴 수 있는 동작이다
 * - 삭제는 서버에서도 지운다(`DELETE /api/v1/schedules/{id}`)
 */
export default function ScheduleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const schedule = useDay((s) => s.schedules.find((x) => x.id === id));
  const rename = useDay((s) => s.renameSchedule);
  const hide = useDay((s) => s.hide);
  const remove = useDay((s) => s.remove);

  // 없는 일정이면 조용히 닫는다 — 오류 화면을 만들지 않는다(RULES 5)
  if (schedule == null) return <ScheduleEditBar hint="" onSubmit={() => router.back()} />;

  const manual = schedule.source === "manual";

  // 직접 추가한 것만 실제로 지운다. 가져온 일정은 캘린더 원본을 건드리지 않는다
  const onDelete = () => {
    if (manual) remove(schedule.id);
    else hide(schedule.id);
    router.back();
  };

  return (
    <ScheduleEditBar
      initialTitle={schedule.title}
      readOnly={!manual}
      hint={
        manual
          ? "모멘토리에만 있던 일정이라 지우면 완전히 사라져요"
          : "캘린더에서 가져온 일정이라 제목을 고칠 수 없어요 · 홈에서만 숨길 수 있어요"
      }
      onSubmit={(title) => rename(schedule.id, title)}
      onDelete={onDelete}
      deleteLabel={manual ? "이 일정 삭제" : "홈에서 숨기기"}
      // 숨기기는 되돌릴 수 있으므로 묻지 않는다
      deleteConfirm={manual ? "이 일정을 지울까요?" : null}
    />
  );
}
