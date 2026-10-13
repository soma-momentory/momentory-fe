import { authedRequest } from "@/lib/http";

import { fetchWorries, keepWorry, toWorry } from "../worryApi";

jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const mockedRequest = authedRequest as jest.MockedFunction<typeof authedRequest>;

const raw = {
  id: 3,
  date: "2026-10-13",
  content: "내일 발표가 걱정돼요",
  createdAt: "2026-10-13T11:00:00Z",
};

/** 맡겨둔 걱정 계약의 경계 — 서버 모양이 바뀌면 여기가 먼저 깨진다 */
describe("걱정 API", () => {
  beforeEach(() => mockedRequest.mockReset());

  it("서버 한 줄을 걱정으로 옮긴다 — id 는 문자열, 모양이 어긋나면 null", () => {
    expect(toWorry(raw)).toEqual({ ...raw, id: "3" });
    expect(toWorry({ ...raw, content: null })).toBeNull();
    expect(toWorry([])).toBeNull();
  });

  it("맡길 때는 내용만 보내고, 목록은 전부를 묻는다", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: raw });
    await expect(keepWorry("내일 발표가 걱정돼요")).resolves.toEqual({
      ok: true,
      data: { ...raw, id: "3" },
    });
    expect(mockedRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/worries",
      { content: "내일 발표가 걱정돼요" },
      expect.anything(),
    );

    mockedRequest.mockResolvedValue({ ok: true, data: { worries: [raw] } });
    await expect(fetchWorries()).resolves.toEqual({ ok: true, data: [{ ...raw, id: "3" }] });
    expect(mockedRequest.mock.calls[1]![1]).toBe("/api/v1/worries");
  });

  it("실패는 코드로 닫는다 — 던지지 않는다", async () => {
    mockedRequest.mockResolvedValue({ ok: false, error: { code: "network" } });
    await expect(keepWorry("걱정")).resolves.toEqual({ ok: false, code: "network" });
    mockedRequest.mockResolvedValue({ ok: true, data: { worries: [{ id: 1 }] } });
    await expect(fetchWorries()).resolves.toEqual({ ok: false, code: "malformed" });
  });
});
