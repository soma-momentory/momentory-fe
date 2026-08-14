import { makeExternalId } from "@/features/calendar/model/externalId";
import { snapshotHash } from "@/features/calendar/model/hash";
import type { SyncEvent, SyncRange } from "@/features/calendar/model/types";

const RANGE: SyncRange = { from: "2026-07-01", to: "2026-09-30" };
const NEXT_RANGE: SyncRange = { from: "2026-08-01", to: "2026-10-31" };

const e = (externalId: string, date: string, title: string): SyncEvent => ({
  externalId,
  date,
  title,
});

const SAMPLE = [e("a", "2026-07-01", "캡스톤 팀미팅"), e("b", "2026-07-13", "엔디비아 보조강사")];

describe("같은 내용이면 같은 해시다", () => {
  it("두 번 불러도 같다", () => {
    expect(snapshotHash(RANGE, SAMPLE)).toBe(snapshotHash(RANGE, SAMPLE));
  });

  it("배열을 새로 만들어도 같다 — 참조가 아니라 내용을 본다", () => {
    expect(snapshotHash(RANGE, SAMPLE)).toBe(
      snapshotHash(
        { ...RANGE },
        SAMPLE.map((x) => ({ ...x })),
      ),
    );
  });

  it("빈 목록도 해시가 나온다 — 「전부 지웠다」도 정상 스냅샷이다", () => {
    expect(snapshotHash(RANGE, [])).toHaveLength(32);
  });
});

describe("내용이 바뀌면 해시가 바뀐다", () => {
  it("제목이 바뀌면", () => {
    const changed = [e("a", "2026-07-01", "캡스톤 팀미팅(변경)"), SAMPLE[1]!];

    expect(snapshotHash(RANGE, changed)).not.toBe(snapshotHash(RANGE, SAMPLE));
  });

  it("날짜가 바뀌면", () => {
    const moved = [e("a", "2026-07-02", "캡스톤 팀미팅"), SAMPLE[1]!];

    expect(snapshotHash(RANGE, moved)).not.toBe(snapshotHash(RANGE, SAMPLE));
  });

  it("키가 바뀌면", () => {
    const rekeyed = [e("z", "2026-07-01", "캡스톤 팀미팅"), SAMPLE[1]!];

    expect(snapshotHash(RANGE, rekeyed)).not.toBe(snapshotHash(RANGE, SAMPLE));
  });

  it("하나가 사라지면", () => {
    expect(snapshotHash(RANGE, [SAMPLE[0]!])).not.toBe(snapshotHash(RANGE, SAMPLE));
  });

  it("**범위가 바뀌면** — 창이 달마다 밀리므로 이걸 놓치면 새 달을 영영 못 올린다", () => {
    expect(snapshotHash(NEXT_RANGE, SAMPLE)).not.toBe(snapshotHash(RANGE, SAMPLE));
  });
});

describe("경계가 흐려지지 않는다 — 길이를 앞에 붙여 잇는다", () => {
  it("붙는 자리를 옮긴 것과 다르다", () => {
    const a = [e("ab", "2026-07-01", "회의")];
    const b = [e("a", "2026-07-01", "b회의")];

    expect(snapshotHash(RANGE, a)).not.toBe(snapshotHash(RANGE, b));
  });

  it("제목에 구분자가 들어와도 섞이지 않는다", () => {
    const a = [e("x", "2026-07-01", "회의:2026-07-02")];
    const b = [e("x", "2026-07-01", "회의"), e("x2", "2026-07-02", "")];

    expect(snapshotHash(RANGE, a)).not.toBe(snapshotHash(RANGE, b));
  });
});

/**
 * 이 묶음이 해시의 존재 이유다 — 화면에 아무 변화가 없는데 해시가 달라지면
 * 매번 서버를 부르게 되고, 해시가 하는 일이 없어진다.
 */
describe("의미 없는 변화에는 흔들리지 않는다", () => {
  it("`SyncEvent` 에 없는 값은 애초에 들어오지 않는다", () => {
    // instanceId·alarms·organizerEmail 같은 것은 타입 단계에서 이미 빠져 있다
    const withNoise = SAMPLE.map((x) => ({ ...x, instanceId: Math.random() }) as SyncEvent);

    expect(snapshotHash(RANGE, withNoise)).toBe(snapshotHash(RANGE, SAMPLE));
  });

  it("객체 키 순서가 달라도 같다 — 문자열을 우리가 직접 조립한다", () => {
    const reordered = SAMPLE.map((x) => ({
      title: x.title,
      externalId: x.externalId,
      date: x.date,
    }));

    expect(snapshotHash(RANGE, reordered)).toBe(snapshotHash(RANGE, SAMPLE));
  });
});

describe("externalId 생성기", () => {
  const base = { calendarId: "c1", eventId: "e1", date: "2026-08-05" };

  it("같은 회차면 항상 같다", () => {
    expect(makeExternalId(base)).toBe(makeExternalId({ ...base }));
  });

  it("**달력이 다르면 다르다** — 계정 둘이 이벤트 id 를 겹쳐 쓸 수 있다", () => {
    expect(makeExternalId({ ...base, calendarId: "c2" })).not.toBe(makeExternalId(base));
  });

  it("**날짜가 다르면 다르다** — 반복 회차들이 `eventId` 를 공유한다", () => {
    expect(makeExternalId({ ...base, date: "2026-08-12" })).not.toBe(makeExternalId(base));
  });

  it("이벤트가 다르면 다르다", () => {
    expect(makeExternalId({ ...base, eventId: "e2" })).not.toBe(makeExternalId(base));
  });

  it("입력이 붙는 자리가 달라도 섞이지 않는다", () => {
    expect(makeExternalId({ calendarId: "1", eventId: "23", date: "2026-08-05" })).not.toBe(
      makeExternalId({ calendarId: "12", eventId: "3", date: "2026-08-05" }),
    );
  });

  it("불투명하다 — 원문이 그대로 남지 않는다", () => {
    const id = makeExternalId(base);

    expect(id).toMatch(/^[0-9a-f]{32}$/);
    expect(id).not.toContain("c1");
    expect(id).not.toContain("2026-08-05");
  });
});
