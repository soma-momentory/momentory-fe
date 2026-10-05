import { authedRequest } from "@/lib/http";

import { addTreasure, fetchTreasures, toTreasure } from "../treasureApi";

jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const mockedRequest = authedRequest as jest.MockedFunction<typeof authedRequest>;

const raw = {
  id: 7,
  date: "2026-10-05",
  content: "친구에게 먼저 연락했어요.",
  createdAt: "2026-10-05T11:00:00Z",
};

/** 보물함 계약의 경계 — 서버 모양이 바뀌면 여기가 먼저 깨진다 */
describe("보물 API", () => {
  beforeEach(() => mockedRequest.mockReset());

  it("서버 한 줄을 보물로 옮긴다 — id 는 문자열, 모양이 어긋나면 null", () => {
    expect(toTreasure(raw)).toEqual({ ...raw, id: "7" });
    expect(toTreasure({ ...raw, content: null })).toBeNull();
    expect(toTreasure([])).toBeNull();
  });

  it("담을 때는 내용만 보낸다 — 날짜는 서버가 정한다", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: raw });
    await expect(addTreasure("친구에게 먼저 연락했어요.")).resolves.toEqual({
      ok: true,
      data: { ...raw, id: "7" },
    });
    expect(mockedRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/treasures",
      { content: "친구에게 먼저 연락했어요." },
      expect.anything(),
    );
  });

  it("날짜를 주면 그날 것을, 없으면 전부를 묻는다", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: { treasures: [raw] } });
    await fetchTreasures("2026-10-05");
    expect(mockedRequest.mock.calls[0]![1]).toBe("/api/v1/treasures?date=2026-10-05");
    await fetchTreasures();
    expect(mockedRequest.mock.calls[1]![1]).toBe("/api/v1/treasures");
  });

  it("실패는 코드로 닫는다 — 던지지 않는다", async () => {
    mockedRequest.mockResolvedValue({
      ok: false,
      error: { code: "http", status: 401, body: null },
    });
    await expect(fetchTreasures()).resolves.toEqual({ ok: false, code: "unauthorized" });
    mockedRequest.mockResolvedValue({ ok: false, error: { code: "network" } });
    await expect(addTreasure("보물")).resolves.toEqual({ ok: false, code: "network" });
    mockedRequest.mockResolvedValue({ ok: true, data: { treasures: [{ id: 1 }] } });
    await expect(fetchTreasures()).resolves.toEqual({ ok: false, code: "malformed" });
  });
});
