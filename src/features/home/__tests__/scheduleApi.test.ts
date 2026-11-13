import { EMOTIONS } from "@/features/emotion/model/emotion";
import { SCHEDULE_EMOTIONS, toSchedule } from "@/features/home/data/scheduleApi";

/**
 * 일정 계약의 **경계**를 고정한다 — 서버 모양이 스키마와 다른 자리들이라
 * 계약이 바뀌면 여기가 먼저 깨져야 한다(`docs/api/openapi.json`).
 */
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

describe("ScheduleResponse → 스키마 Schedule", () => {
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
    // ANXIOUS 는 12종 번호에서 6번(불안)이다
    expect(toSchedule(raw)?.emotions).toEqual([6]);
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
  it("12종 가운데 일정 enum 에 짝이 있는 여덟만 덮는다 — 서버 일정 enum 은 옛 9종 그대로다", () => {
    const covered = EMOTIONS.filter((e) => SCHEDULE_EMOTIONS[e.id] != null).map((e) => e.name);
    expect(covered).toEqual(["기쁨", "평온", "뿌듯함", "슬픔", "불안", "분노", "혼란", "지침"]);
    // 여덟이 서로 다른 코드다 — 한 코드가 두 감정에 묶이면 되돌릴 때 하나가 사라진다
    expect(new Set(Object.values(SCHEDULE_EMOTIONS)).size).toBe(8);
  });

  it("애정 · 실망 · 부끄러움 · 미안함은 일정 enum 에 짝이 없다 — 없는 코드를 지어 보내지 않는다", () => {
    for (const id of [4, 8, 9, 11] as const) expect(SCHEDULE_EMOTIONS[id]).toBeUndefined();
  });

  it("분노(7)는 회고와 달리 합쳐진 ANGRY_FRUSTRATED 다", () => {
    // 스케줄 enum 은 옛 어휘다 — 회고의 angry 를 재사용하면 조용히 400 이 된다
    expect(SCHEDULE_EMOTIONS[7]).toBe("ANGRY_FRUSTRATED");
    expect(toSchedule({ ...raw, emotion: "ANGRY_FRUSTRATED" })?.emotions).toEqual([7]);
  });

  it("번호가 EMOTIONS 와 같다 — 1 기쁨 · 2 평온 · 3 뿌듯함 · 12 지침", () => {
    expect(SCHEDULE_EMOTIONS[1]).toBe("HAPPY");
    expect(SCHEDULE_EMOTIONS[2]).toBe("CALM");
    expect(SCHEDULE_EMOTIONS[3]).toBe("PROUD");
    expect(SCHEDULE_EMOTIONS[5]).toBe("DEPRESSED");
    expect(SCHEDULE_EMOTIONS[10]).toBe("STUCK");
    expect(SCHEDULE_EMOTIONS[12]).toBe("TIRED");
  });

  it("서버 일정 enum 에만 남은 옛 값도 12종으로 읽는다 — 무기력 · 피곤함은 지침이다", () => {
    expect(toSchedule({ ...raw, emotion: "LETHARGIC" })?.emotions).toEqual([12]);
    expect(toSchedule({ ...raw, emotion: "TIRED" })?.emotions).toEqual([12]);
    expect(toSchedule({ ...raw, emotion: "STUCK" })?.emotions).toEqual([10]);
    expect(toSchedule({ ...raw, emotion: "DEPRESSED" })?.emotions).toEqual([5]);
    expect(toSchedule({ ...raw, emotion: "HAPPY" })?.emotions).toEqual([1]);
  });
});
