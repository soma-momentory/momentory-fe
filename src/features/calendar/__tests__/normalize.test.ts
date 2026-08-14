import { makeExternalId } from "@/features/calendar/model/externalId";
import { normalizeOccurrences } from "@/features/calendar/model/normalize";
import type { Occurrence } from "@/features/calendar/model/types";

const at = (over: Partial<Occurrence> & { calendarId: string; eventId: string }): Occurrence => {
  const date = over.date ?? "2026-09-07";
  return {
    date,
    title: over.title ?? "생일 축하합니다!",
    calendarId: over.calendarId,
    eventId: over.eventId,
    externalId:
      over.externalId ??
      makeExternalId({ calendarId: over.calendarId, eventId: over.eventId, date }),
  };
};

/** 2026-08-14 실측: 구글 계정 둘이 같은 연락처 생일을 각자 들고 있었다 */
describe("달력 사이 중복을 접는다", () => {
  it("서로 다른 달력의 같은 날 같은 제목은 한 줄이 된다", () => {
    const got = normalizeOccurrences([
      at({ calendarId: "c1", eventId: "b1" }),
      at({ calendarId: "c2", eventId: "b2" }),
    ]);

    expect(got).toHaveLength(1);
  });

  it("달력 순서가 바뀌어도 **같은 것이 남는다** — 화해가 지웠다 새로 만들지 않는다", () => {
    const a = at({ calendarId: "c1", eventId: "b1" });
    const b = at({ calendarId: "c2", eventId: "b2" });

    expect(normalizeOccurrences([a, b])).toEqual(normalizeOccurrences([b, a]));
  });

  it("**같은 달력 안의 동명 일정은 건드리지 않는다** — 진짜 둘일 수 있다", () => {
    // 「점심 약속」을 하루에 둘 적어둔 경우
    const got = normalizeOccurrences([
      at({ calendarId: "c1", eventId: "x1", title: "점심 약속" }),
      at({ calendarId: "c1", eventId: "x2", title: "점심 약속" }),
    ]);

    expect(got).toHaveLength(2);
  });

  it("한 달력이 둘을 갖고 다른 달력이 하나를 가지면 둘이 남는다", () => {
    const got = normalizeOccurrences([
      at({ calendarId: "c1", eventId: "x1", title: "점심 약속" }),
      at({ calendarId: "c1", eventId: "x2", title: "점심 약속" }),
      at({ calendarId: "c2", eventId: "x3", title: "점심 약속" }),
    ]);

    expect(got).toHaveLength(2);
  });

  it("날짜가 다르면 접지 않는다", () => {
    const got = normalizeOccurrences([
      at({ calendarId: "c1", eventId: "b1", date: "2026-09-07" }),
      at({ calendarId: "c2", eventId: "b2", date: "2026-09-08" }),
    ]);

    expect(got).toHaveLength(2);
  });

  it("제목이 다르면 접지 않는다", () => {
    const got = normalizeOccurrences([
      at({ calendarId: "c1", eventId: "b1", title: "팀 회의" }),
      at({ calendarId: "c2", eventId: "b2", title: "면접 스터디" }),
    ]);

    expect(got).toHaveLength(2);
  });

  it("같은 키가 두 번 들어와도 한 번만 나온다", () => {
    const one = at({ calendarId: "c1", eventId: "b1" });

    expect(normalizeOccurrences([one, { ...one }])).toHaveLength(1);
  });
});

describe("결정적 정렬 — 해시가 이 순서 위에 선다", () => {
  const rows = [
    at({ calendarId: "c1", eventId: "z", date: "2026-09-08", title: "저녁 약속" }),
    at({ calendarId: "c1", eventId: "a", date: "2026-09-07", title: "팀 회의" }),
    at({ calendarId: "c1", eventId: "m", date: "2026-09-07", title: "가나다" }),
  ];

  it("날짜 오름차순, 같은 날은 제목순이다", () => {
    expect(normalizeOccurrences(rows).map((e) => `${e.date} ${e.title}`)).toEqual([
      "2026-09-07 가나다",
      "2026-09-07 팀 회의",
      "2026-09-08 저녁 약속",
    ]);
  });

  it("입력 순서가 달라도 결과가 같다 — 조회 순서를 믿지 않는다", () => {
    expect(normalizeOccurrences(rows)).toEqual(normalizeOccurrences([...rows].reverse()));
  });

  it("제목까지 같으면 `externalId` 로 가른다 — 임의여도 **안정적**이면 된다", () => {
    const same = [
      at({ calendarId: "c1", eventId: "x1", title: "점심 약속" }),
      at({ calendarId: "c1", eventId: "x2", title: "점심 약속" }),
    ];

    expect(normalizeOccurrences(same)).toEqual(normalizeOccurrences([...same].reverse()));
  });
});

describe("서버로 가는 모양", () => {
  it("`calendarId`·`eventId` 를 떼고 셋만 남긴다", () => {
    const [first] = normalizeOccurrences([at({ calendarId: "c1", eventId: "b1" })]);

    expect(Object.keys(first ?? {}).sort()).toEqual(["date", "externalId", "title"]);
  });
});
