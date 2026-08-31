import { EMOTIONS } from "@/features/emotion/model/emotion";
import { SCHEDULE_EMOTIONS, toSchedule } from "@/features/home/data/scheduleApi";

/**
 * 일정 계약의 **경계**를 고정한다 — 서버 모양이 스키마와 다른 자리들이라
 * 계약이 바뀌면 여기가 먼저 깨져야 한다(`docs/api/openapi.json`).
 */
describe("ScheduleResponse → 스키마 Schedule", () => {
  const raw = {
    id: 12,
    date: "2026-07-27",
    title: "면접 스터디",
    completed: true,
    emotion: "ANXIOUS",
    displayOrder: 3,
    source: "MANUAL",
    hidden: false,
  };

  it("id 를 문자열로 바꾼다 — 스키마가 그렇고 아웃박스의 ULID 가 이 자리에 온다", () => {
    expect(toSchedule(raw)?.id).toBe("12");
  });

  it("서버 enum·숨김 상태를 옮기고, 없는 externalId·doneAt만 메운다", () => {
    const s = toSchedule(raw);

    expect(s?.source).toBe("manual");
    expect(s?.externalId).toBeNull();
    expect(s?.hidden).toBe(false);
    // 마친 시각을 서버가 돌려주지 않는다
    expect(s?.doneAt).toBeNull();
  });

  it("가져온 일정과 숨김 상태를 서버 응답 그대로 구분한다", () => {
    const s = toSchedule({ ...raw, source: "CALENDAR", hidden: true });

    expect(s?.source).toBe("calendar");
    expect(s?.hidden).toBe(true);
  });

  it("출처·숨김 계약이 없거나 모르면 그 줄을 버린다", () => {
    expect(toSchedule({ ...raw, source: "OTHER" })).toBeNull();
    expect(toSchedule({ ...raw, hidden: null })).toBeNull();
  });

  it("감정 하나를 배열로 담는다 — 타입은 스키마대로 배열이다", () => {
    // ANXIOUS 는 v2 재번호에서 7번(불안함)이다
    expect(toSchedule(raw)?.emotions).toEqual([7]);
    expect(toSchedule({ ...raw, emotion: null })?.emotions).toEqual([]);
  });

  it("모르는 감정 코드는 버린다 — 이름을 지어내지 않는다", () => {
    expect(toSchedule({ ...raw, emotion: "ANGRY" })?.emotions).toEqual([]);
  });

  it("제목·날짜가 없으면 그 줄을 버린다", () => {
    expect(toSchedule({ ...raw, title: "  " })).toBeNull();
    expect(toSchedule({ ...raw, date: null })).toBeNull();
    expect(toSchedule(null)).toBeNull();
    expect(toSchedule([raw])).toBeNull();
  });
});

describe("감정 표 — 회고와 다른 어휘다", () => {
  it("10종을 빠짐없이 덮는다 — 스케줄 enum 은 화남·답답함을 합쳐 9개 코드다", () => {
    for (const e of EMOTIONS) expect(SCHEDULE_EMOTIONS[e.id]).toBeTruthy();
    // 화남(9)·답답함(10)이 같은 ANGRY_FRUSTRATED 라 코드는 9종
    expect(new Set(Object.values(SCHEDULE_EMOTIONS)).size).toBe(9);
  });

  it("화남(9)·답답함(10)은 회고와 달리 합쳐진 ANGRY_FRUSTRATED 다", () => {
    // 스케줄 enum 은 아직 미분리 — 회고의 angry/frustrated 를 재사용하면 조용히 400 이 된다
    expect(SCHEDULE_EMOTIONS[9]).toBe("ANGRY_FRUSTRATED");
    expect(SCHEDULE_EMOTIONS[10]).toBe("ANGRY_FRUSTRATED");
  });

  it("순서가 EMOTIONS 와 같다 — 1 행복함 … 3 평온함", () => {
    expect(SCHEDULE_EMOTIONS[1]).toBe("HAPPY");
    expect(SCHEDULE_EMOTIONS[3]).toBe("CALM");
  });
});
