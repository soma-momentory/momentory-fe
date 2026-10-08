import { act, fireEvent, render } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";

import BodyReleaseScreen from "../body-release";
import RestRecordsScreen from "../records";

import { addRestRecord, fetchRestRecords } from "@/features/rest/data/restRecordApi";

/**
 * 쉼터 이용 기록 — 시작한 판을 기분 없이 떠나면 「중간에 나감」이 한 번 남고, 시작 전에 떠나면
 * 아무것도 남지 않는다 · 오른쪽 위 원이 그 쉼터의 기록으로 간다 · 기록은 하루씩 묶여 세지 않는다.
 */
jest.mock("@/features/rest/data/restRecordApi", () => ({
  addRestRecord: jest.fn(() => Promise.resolve({ ok: true, data: null })),
  fetchRestRecords: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({ content: "worry_box" })),
  Stack: jest.fn(() => null),
  Redirect: jest.fn(() => null),
}));

beforeEach(() => jest.clearAllMocks());

const flush = () => act(async () => {});

describe("이용 기록 남기기", () => {
  it("시작 전에 떠나면 남기지 않는다", async () => {
    const r = await render(<BodyReleaseScreen />);
    await r.unmount();
    await flush();
    expect(addRestRecord).not.toHaveBeenCalled();
  });

  it("시작한 판을 끝내지 않고 떠나면 「중간에 나감」을 한 번 남긴다", async () => {
    const r = await render(<BodyReleaseScreen />);
    await fireEvent.press(r.getByText("따라 해보기"));
    await r.unmount();
    await flush();
    expect(addRestRecord).toHaveBeenCalledTimes(1);
    expect(addRestRecord).toHaveBeenCalledWith("body_release", { completed: false });
  });

  it("오른쪽 위 원이 그 쉼터의 기록으로 간다", async () => {
    const r = await render(<BodyReleaseScreen />);
    await fireEvent.press(r.getByRole("button", { name: "지난 기록 보기" }));
    expect(router.push).toHaveBeenCalledWith("/rest/records?content=body_release");
  });
});

describe("쉼터 기록 화면", () => {
  it("하루씩 묶어 최신 날부터 기분을 그대로 보여 준다 — 중간에 나간 것은 「잠깐 들렀어요」", async () => {
    jest.mocked(fetchRestRecords).mockResolvedValue({
      ok: true,
      data: [
        {
          id: "3",
          content: "worry_box",
          date: "2026-10-08",
          completed: true,
          mood: "better",
          createdAt: "2026-10-08T11:00:00Z",
        },
        {
          id: "2",
          content: "worry_box",
          date: "2026-10-08",
          completed: false,
          mood: null,
          createdAt: "2026-10-08T02:00:00Z",
        },
        {
          id: "1",
          content: "worry_box",
          date: "2026-10-06",
          completed: true,
          mood: "unsure",
          createdAt: "2026-10-06T02:00:00Z",
        },
      ],
    });
    const r = await render(<RestRecordsScreen />);
    await flush();

    expect(fetchRestRecords).toHaveBeenCalledWith("worry_box");
    expect(r.getByText("걱정상자 기록")).toBeTruthy();
    const tree = JSON.stringify(r.toJSON());
    const at = ["10월 8일", "나아졌어요", "잠깐 들렀어요", "10월 6일", "잘 모르겠어요"].map((o) =>
      tree.indexOf(o),
    );
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(r.queryByText(/번|%/)).toBeNull();
  });

  it("못 받아 오면 비어 있다고만 말한다 · 모르는 쉼터는 감각연못으로 연다", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ content: "nope" });
    jest.mocked(fetchRestRecords).mockResolvedValue({ ok: false, code: "network" });
    const r = await render(<RestRecordsScreen />);
    await flush();
    expect(fetchRestRecords).toHaveBeenCalledWith("sense_pond");
    expect(r.getByText("아직 남은 기록이 없어요")).toBeTruthy();
  });
});
