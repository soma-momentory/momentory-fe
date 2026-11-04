import { authedRequest } from "@/lib/http";

import { answerWish, fetchMyWishes, fetchPond, postWish, reviewWish } from "../wishApi";

jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const ok = (data: unknown) =>
  jest.mocked(authedRequest).mockResolvedValueOnce({ ok: true, data } as never);
const httpFail = (status: number) =>
  jest.mocked(authedRequest).mockResolvedValueOnce({
    ok: false,
    error: { code: "http", status },
  } as never);

beforeEach(() => jest.clearAllMocks());

describe("wishApi", () => {
  it("연못을 앱 값으로 옮기고 바바의 소원을 가른다", async () => {
    ok({
      rulesAgreed: true,
      postedToday: false,
      hasFloatingWish: false,
      floatingCount: 2,
      wishes: [
        { id: 3, content: "소원", daysLeft: 6, light: true, joined: false, author: "USER" },
        { id: -1, content: "귤", daysLeft: 7, light: true, joined: false, author: "BABA" },
      ],
    });

    const r = await fetchPond();

    expect(r).toEqual({
      ok: true,
      data: expect.objectContaining({
        rulesAgreed: true,
        wishes: [
          expect.objectContaining({ id: 3, author: "user" }),
          expect.objectContaining({ id: -1, author: "baba" }),
        ],
      }),
    });
  });

  it("모양이 어긋난 연못은 받지 않는다", async () => {
    ok({ wishes: [{ id: "x" }] });
    expect(await fetchPond()).toEqual({ ok: false, code: "malformed" });
  });

  it("심사 결과 넷을 옮긴다", async () => {
    ok({ result: "EDITED", content: "그 사람", reviewToken: "t" });
    expect(await reviewWish("김지훈")).toEqual({
      ok: true,
      data: { result: "edited", content: "그 사람", reviewToken: "t" },
    });
    ok({ result: "PASS", content: "글", reviewToken: "t" });
    expect((await reviewWish("글")) as { data: { result: string } }).toMatchObject({
      data: { result: "pass" },
    });
    ok({ result: "REJECTED", message: "안 돼요" });
    expect(await reviewWish("글")).toEqual({
      ok: true,
      data: { result: "rejected", message: "안 돼요" },
    });
    ok({ result: "CRISIS" });
    expect(await reviewWish("글")).toEqual({ ok: true, data: { result: "crisis" } });
  });

  it.each([
    [403, "rules_required"],
    [404, "not_found"],
    [409, "daily_limit"],
    [503, "unavailable"],
    [401, "unauthorized"],
    [500, "server"],
  ])("HTTP %i 는 %s 로 닫는다", async (status, code) => {
    httpFail(status);
    expect(await postWish("글", "t")).toEqual({ ok: false, code });
  });

  it("내 소원과 답을 옮긴다", async () => {
    ok({
      postedToday: true,
      floating: [{ id: 1, content: "글", daysLeft: 3, joinedByOthers: true }],
      past: [{ id: 2, content: "지난", endReason: "REPORTED", outcome: "CAME_TRUE" }],
    });
    expect(await fetchMyWishes()).toEqual({
      ok: true,
      data: {
        postedToday: true,
        floating: [{ id: 1, content: "글", daysLeft: 3, joinedByOthers: true }],
        past: [{ id: 2, content: "지난", endReason: "reported", outcome: "came_true" }],
      },
    });

    ok(null);
    await answerWish(2, "not_yet");
    expect(jest.mocked(authedRequest)).toHaveBeenLastCalledWith(
      "PUT",
      "/api/v1/wishes/2/outcome",
      { outcome: "NOT_YET" },
      expect.anything(),
    );
  });
});
