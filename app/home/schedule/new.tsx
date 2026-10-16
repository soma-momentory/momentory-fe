import { router } from "expo-router";

import { useDay } from "@/features/home/model/day";
import { ScheduleEditBar } from "@/features/home/ui/ScheduleEditBar";

/**
 * `12-e` · 일정 직접 추가
 *
 * **제목 하나만 받는다.** 시간·장소·반복을 받으면 캘린더 앱이 된다 — 여기서
 * 필요한 것은 밤에 "그런 일이 있었지"를 떠올릴 실마리뿐이다.
 *
 * 새 디자인은 시트가 아니라 **화면 아래에서 올라오는 입력 바**다
 * (`Schedule.dc.html` 4-1) — 제목을 고칠 때(`12-c`)와 **같은 바**라 「추가」와
 * 「수정」의 조작이 갈리지 않는다.
 *
 * - **`Schedule.time` 은 MVP 에서 항상 `null`** — 시간 입력이 없으므로 홈 목록도
 *   시간순이 아니라 들어온 순서다
 * - 안내는 **양방향을 다 말한다**(`12-e.md`) — 여기서 만든 일정은 캘린더로 나가지
 *   않는다. 시안은 이 문장을 두지 않지만 **문안은 `docs/spec/` 이 정본**이고,
 *   수정 모드의 「일정 수정」 캡션과 **같은 자리**라 새로 만든 슬롯도 아니다
 */
export default function NewSchedule() {
  const addSchedule = useDay((s) => s.addSchedule);

  return (
    <ScheduleEditBar
      mode="add"
      onDismiss={() => router.back()}
      caption="모멘토리에만 저장돼요 · 캘린더에는 추가되지 않아요"
      onSubmit={(title) => addSchedule(title)}
    />
  );
}
