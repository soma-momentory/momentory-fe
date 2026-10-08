import { authedRequest } from "@/lib/http";

import { addRestRecord, fetchRestRecords, toRestRecord } from "../restRecordApi";

jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const mockedRequest = authedRequest as jest.MockedFunction<typeof authedRequest>;

const raw = {
  id: 3,
  content: "WORRY_BOX",
  date: "2026-10-08",
  completed: true,
  mood: "BETTER",
  createdAt: "2026-10-08T11:00:00Z",
};

/** 이용 기록 계약의 경계 — 서버 enum(대문자)과 앱 이름(소문자)이 여기서만 갈린다 */
describe("이용 기록 API", () => {
  beforeEach(() => mockedRequest.mockReset());

  it("서버 한 줄을 기록으로 옮긴다 — 모르는 쉼터 · 기분이면 null", () => {
    expect(toRestRecord(raw)).toEqual({ ...raw, id: "3", content: "worry_box", mood: "better" });
    expect(toRestRecord({ ...raw, completed: false, mood: null })?.mood).toBeNull();
    expect(toRestRecord({ ...raw, content: "NOPE" })).toBeNull();
    expect(toRestRecord({ ...raw, mood: "GREAT" })).toBeNull();
  });

  it("끝까지 했으면 기분과 함께, 중간에 나갔으면 기분 없이 보낸다", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: raw });
    await addRestRecord("worry_box", { completed: true, mood: "better" });
    await addRestRecord("sense_pond", { completed: false });
    expect(mockedRequest.mock.calls.map((c) => c.slice(0, 3))).toEqual([
      ["POST", "/api/v1/rest-records", { content: "WORRY_BOX", completed: true, mood: "BETTER" }],
      ["POST", "/api/v1/rest-records", { content: "SENSE_POND", completed: false, mood: null }],
    ]);
  });

  it("쉼터별로 묻고, 모양이 어긋나면 malformed 로 닫는다", async () => {
    mockedRequest.mockResolvedValue({ ok: true, data: { records: [raw] } });
    await expect(fetchRestRecords("body_release")).resolves.toMatchObject({ ok: true });
    expect(mockedRequest.mock.calls[0]![1]).toBe("/api/v1/rest-records?content=BODY_RELEASE");

    mockedRequest.mockResolvedValue({ ok: true, data: { records: [{}] } });
    await expect(fetchRestRecords("body_release")).resolves.toEqual({
      ok: false,
      code: "malformed",
    });
  });
});
