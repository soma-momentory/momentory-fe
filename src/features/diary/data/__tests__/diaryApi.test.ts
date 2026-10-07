import { authedRequest } from "@/lib/http";

import {
  deleteDiary,
  isServerId,
  loadArchive,
  monthsBackFrom,
  putActionCardCompletion,
  serverRefusedWrite,
  toActionCard,
  toDiary,
  updateDiaryBody,
  type ArchiveMonth,
} from "@/features/diary/data/diaryApi";

jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const mockedRequest = authedRequest as jest.MockedFunction<typeof authedRequest>;

/**
 * 보관함 계약의 **경계**를 고정한다 — 서버 DTO 가 프론트 `Diary`/`ActionCard` 와
 * 다른 자리들이라, 계약이 바뀌면 여기가 먼저 깨져야 한다(`docs/api/openapi.json`).
 */
describe("DiaryResponse → Diary", () => {
  const raw = {
    id: 12,
    retrospectId: 34,
    primaryEmotion: "depressed", // 8 — 주 감정
    emotions: ["depressed", "anxious"], // 서버 감정 태그(일기에서 드러난 전체): 8, 7
    original: "오늘은 면접 준비를 했다.",
    createdAt: "2026-08-14T02:23:47.850Z",
  };

  it("id·retrospectId 를 문자열로 바꾼다 — 스키마가 그렇다", () => {
    const d = toDiary(raw);
    expect(d?.id).toBe("12");
    expect(d?.retrospectId).toBe("34");
  });

  it("original 만 본문에 담고 reframed 는 띄우지 않는다 — babaView 는 null", () => {
    const d = toDiary(raw);
    expect(d?.body).toBe(raw.original);
    expect(d?.babaView).toBeNull();
    expect(d?.babaViewBasis).toBeNull();
  });

  it("createdAt 을 KST 날짜로 접는다 — UTC 앞자르기가 아니다", () => {
    // 2026-08-13T20:00Z 는 KST 로 8/14 05:00(4시 넘음) — UTC 날짜(8/13)와 다른 날이다
    const d = toDiary({ ...raw, createdAt: "2026-08-13T20:00:00Z" });
    expect(d?.date).toBe("2026-08-14");
  });

  it("하루는 새벽 4시에 넘어간다 — 4시 전은 아직 어제다", () => {
    // 2026-08-14T18:00Z 는 KST 로 8/15 03:00 — 4시 전이라 아직 8/14 에 속한다
    const before = toDiary({ ...raw, createdAt: "2026-08-14T18:00:00Z" });
    expect(before?.date).toBe("2026-08-14");
    // 2026-08-14T19:00Z 는 KST 로 8/15 04:00 — 경계를 넘어 8/15 다
    const after = toDiary({ ...raw, createdAt: "2026-08-14T19:00:00Z" });
    expect(after?.date).toBe("2026-08-15");
  });

  it("감정 태그 전체를 편다 — 주 감정을 앞에 세우고 나머지 태그를 잇는다", () => {
    const d = toDiary(raw);
    expect(d?.emotions).toEqual([8, 7]); // 주 감정(depressed=8) → 태그(anxious=7)
    expect(d?.startEmotion).toBe(8); // 주 감정
    expect(d?.storyEmotion).toBeNull(); // 일정 감정은 폐기됨
  });

  it("태그가 없으면 주 감정 하나만 남는다(옛 일기)", () => {
    const d = toDiary({ ...raw, emotions: [] });
    expect(d?.emotions).toEqual([8]);
    expect(d?.startEmotion).toBe(8);
  });

  it("주 감정이 태그에도 있으면 하나로 접는다", () => {
    const d = toDiary({ ...raw, emotions: ["depressed"] });
    expect(d?.emotions).toEqual([8]);
  });

  it("모르는 감정 키는 버린다 — 이름을 지어내지 않는다", () => {
    const d = toDiary({ ...raw, primaryEmotion: "nope", emotions: ["nope"] });
    expect(d?.emotions).toEqual([]);
    expect(d?.startEmotion).toBeNull();
  });

  it("서버에 저장된 날씨를 보관함에 복원한다", () => {
    expect(toDiary({ ...raw, weather: "맑음 · 22℃" })?.weather).toBe("맑음 · 22℃");
    expect(toDiary({ ...raw, weather: 22 })?.weather).toBeNull();
    expect(toDiary({ ...raw, weather: "  " })?.weather).toBeNull();
  });

  it("서버에 없는 필드는 기본값 — authoredBy·editedAt·weather", () => {
    const d = toDiary(raw);
    expect(d?.authoredBy).toBe("baba");
    expect(d?.editedAt).toBeNull();
    expect(d?.weather).toBeNull();
  });

  it("필수가 어긋나면 null — 그 줄만 버린다", () => {
    expect(toDiary({ ...raw, original: 123 })).toBeNull();
    expect(toDiary({ ...raw, createdAt: "not-a-date" })).toBeNull();
    expect(toDiary({ ...raw, id: null })).toBeNull();
    expect(toDiary(null)).toBeNull();
  });
});

describe("ActionCardResponse → ActionCard", () => {
  const map = new Map([["34", "d-12"]]);
  const raw = {
    id: 7,
    retrospectId: 34,
    situation: "발표를 앞두고 긴장했던 상황",
    targetAction: "심호흡을 세 번 하고 시작하기",
    createdDate: "2026-08-10",
    done: false,
    createdAt: "2026-08-10T02:23:47.850Z",
  };

  it("retrospectId 로 일기에 조인해 diaryId 를 채운다 — 서버는 diaryId 를 주지 않는다", () => {
    expect(toActionCard(raw, map)?.diaryId).toBe("d-12");
  });

  it("짝 없는 카드는 버린다 — diaryId 를 지어내지 않는다", () => {
    expect(toActionCard({ ...raw, retrospectId: 99 }, map)).toBeNull();
  });

  it("doneAt·reflection 은 없으면 null · done 기본 false", () => {
    const c = toActionCard(raw, map);
    expect(c?.doneAt).toBeNull();
    expect(c?.reflection).toBeNull();
    expect(c?.done).toBe(false);
  });

  it("해본 카드는 doneAt·reflection 을 담는다", () => {
    const c = toActionCard(
      { ...raw, done: true, doneAt: "2026-08-12T09:20:11Z", reflection: "해보니 괜찮았다" },
      map,
    );
    expect(c?.done).toBe(true);
    expect(c?.doneAt).toBe("2026-08-12T09:20:11Z");
    expect(c?.reflection).toBe("해보니 괜찮았다");
  });

  it("필수가 어긋나면 null", () => {
    expect(toActionCard({ ...raw, situation: null }, map)).toBeNull();
    expect(toActionCard({ ...raw, id: undefined }, map)).toBeNull();
  });
});

describe("monthsBackFrom — 뒤로 훑는 창", () => {
  it("오늘 달부터 count 개월을 뒤로", () => {
    expect(monthsBackFrom("2026-08-15", 3)).toEqual([
      { year: 2026, month: 8 },
      { year: 2026, month: 7 },
      { year: 2026, month: 6 },
    ]);
  });

  it("해를 넘어간다", () => {
    expect(monthsBackFrom("2026-01-10", 2)).toEqual([
      { year: 2026, month: 1 },
      { year: 2025, month: 12 },
    ]);
  });
});

describe("loadArchive — 여러 달을 한 벌로", () => {
  const ok = (data: unknown) => ({ ok: true as const, data });
  const httpError = { ok: false as const, error: { code: "network" as const } };

  /** path 로 일기/카드 응답을 갈라 돌려주는 목 */
  const route = (byPath: {
    diaries?: (m: ArchiveMonth) => unknown;
    cards?: (m: ArchiveMonth) => unknown;
  }) => {
    mockedRequest.mockImplementation((_method, path) => {
      const [base, q = ""] = path.split("?");
      const year = Number(new URLSearchParams(q).get("year"));
      const month = Number(new URLSearchParams(q).get("month"));
      const m = { year, month };
      if (base === "/api/v1/diaries") {
        return Promise.resolve(byPath.diaries ? ok(byPath.diaries(m)) : ok({ diaries: [] }));
      }
      return Promise.resolve(byPath.cards ? ok(byPath.cards(m)) : ok({ actionCards: [] }));
    });
  };

  beforeEach(() => mockedRequest.mockReset());

  const diaryRaw = (id: number, retrospectId: number, createdAt: string) => ({
    id,
    retrospectId,
    primaryEmotion: "calm",
    original: `일기 ${id}`,
    createdAt,
  });

  it("달들을 모아 날짜 오름차순으로 ordinal 을 매긴다", async () => {
    route({
      diaries: (m) =>
        m.month === 8
          ? { diaries: [diaryRaw(2, 20, "2026-08-05T01:00:00Z")] }
          : { diaries: [diaryRaw(1, 10, "2026-07-20T01:00:00Z")] },
    });

    const result = await loadArchive([
      { year: 2026, month: 8 },
      { year: 2026, month: 7 },
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { diaries } = result.data;
    expect(diaries.map((d) => d.id)).toEqual(["1", "2"]); // 7월이 먼저
    expect(diaries.map((d) => d.ordinal)).toEqual([1, 2]);
  });

  it("카드를 retrospectId 로 그 달 밖의 일기에도 조인한다", async () => {
    route({
      diaries: (m) =>
        m.month === 7 ? { diaries: [diaryRaw(1, 10, "2026-07-20T01:00:00Z")] } : { diaries: [] },
      cards: (m) =>
        m.month === 7
          ? {
              actionCards: [
                {
                  id: 5,
                  retrospectId: 10,
                  situation: "상황",
                  targetAction: "행동",
                  createdDate: "2026-07-20",
                  done: false,
                  createdAt: "2026-07-20T01:00:00Z",
                },
              ],
            }
          : { actionCards: [] },
    });

    const result = await loadArchive([
      { year: 2026, month: 8 },
      { year: 2026, month: 7 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.actionCards).toHaveLength(1);
    expect(result.data.actionCards[0]?.diaryId).toBe("1");
  });

  it("서버가 빈 달을 주면 ok · 빈 목록 — 신규 사용자", async () => {
    route({});
    const result = await loadArchive([{ year: 2026, month: 8 }]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.diaries).toEqual([]);
    expect(result.data.actionCards).toEqual([]);
  });

  it("전부 실패하면 ok:false — store 가 가진 것을 지우지 않게", async () => {
    mockedRequest.mockResolvedValue(httpError);
    const result = await loadArchive([{ year: 2026, month: 8 }]);
    expect(result.ok).toBe(false);
  });
});

describe("쓰기 — 삭제·완료", () => {
  beforeEach(() => mockedRequest.mockReset());

  it("deleteDiary — DELETE /diaries/{id} 로 보낸다", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: null });
    const result = await deleteDiary("12");
    expect(result).toEqual({ ok: true });
    expect(mockedRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/diaries/12",
      undefined,
      expect.any(Object),
    );
  });

  it("putActionCardCompletion(true) — 완료 여부와 느낀 점을 함께 싣는다", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: {} });
    await putActionCardCompletion("7", true, "한 줄");
    expect(mockedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/action-cards/7/completion",
      { done: true, reflection: "한 줄" },
      expect.any(Object),
    );
  });

  it("putActionCardCompletion(false) — 되돌리기는 느낀 점을 싣지 않는다(400 방지)", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: {} });
    await putActionCardCompletion("7", false, null);
    expect(mockedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/action-cards/7/completion",
      { done: false },
      expect.any(Object),
    );
  });

  it("updateDiaryBody — 회고 id 로 본문만 PUT 한다", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: {} });
    const result = await updateDiaryBody("10", "고친 본문");
    expect(result).toEqual({ ok: true });
    expect(mockedRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/diaries/by-retrospect/10",
      { original: "고친 본문" },
      expect.any(Object),
    );
  });

  it("HTTP 오류를 사유 코드로 접는다", async () => {
    mockedRequest.mockResolvedValue({
      ok: false,
      error: { code: "http", status: 404, body: null },
    });
    expect(await deleteDiary("9")).toEqual({ ok: false, code: "not_found" });
    mockedRequest.mockResolvedValue({ ok: false, error: { code: "network" } });
    expect(await deleteDiary("9")).toEqual({ ok: false, code: "network" });
    mockedRequest.mockResolvedValue({ ok: false, error: { code: "unauthenticated" } });
    expect(await deleteDiary("9")).toEqual({ ok: false, code: "no_session" });
  });

  it("serverRefusedWrite — 서버가 실제로 거부한 것만 되돌린다", () => {
    // 서버가 답하고 거부 → 되돌린다
    expect(serverRefusedWrite("server")).toBe(true);
    expect(serverRefusedWrite("not_found")).toBe(true);
    expect(serverRefusedWrite("invalid_request")).toBe(true);
    // 요청이 못 나갔거나 곧 로그아웃 → 기기 값을 둔다
    expect(serverRefusedWrite("network")).toBe(false);
    expect(serverRefusedWrite("no_session")).toBe(false);
    expect(serverRefusedWrite("unauthorized")).toBe(false);
  });

  it("isServerId — 숫자 문자열만 서버 항목", () => {
    expect(isServerId("12")).toBe(true);
    expect(isServerId("d-local-3")).toBe(false);
    expect(isServerId("ac-sample-21")).toBe(false);
  });
});
