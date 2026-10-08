import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import BodyReleaseScreen from "../body-release";

import { track } from "@/features/analytics";

import { bodyReleaseMotion } from "@/design/ds";
import { addRestRecord } from "@/features/rest/data/restRecordApi";
import { restMoodMotion } from "@/design/ds";

/**
 * 몸에 힘 빼기 — 시작 버튼 하나를 누르면 나머지는 시간이 끌고 간다.
 *
 * 여기서 고정하는 것: 시작 전에는 첫 부위 미리보기와 「따라 해보기」 · 힘주기 5초 →
 * 풀기 10초 · 네 부위를 차례로 · 카피바라가 박자를 따라 포즈를 바꾼다 · 끝나면 정적
 * 뒤에야 「마치기」 · 마치면 쉼터 탭으로.
 */
jest.mock("@/features/rest/data/restRecordApi", () => ({
  addRestRecord: jest.fn(() => Promise.resolve({ ok: true, data: null })),
  fetchRestRecords: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
  Redirect: jest.fn(() => null),
}));

// 계측은 켜 두고 전송만 가로챈다 — 화면이 언제 무엇을 보내는지 본다
jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  isAnalyticsEnabled: true,
  track: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// 조금씩 나눠 흘린다 — 한 번에 흘리면 시계가 바꾼 문구의 갈아 끼우기 타이머가
// 그 act 가 끝난 뒤에야 걸려서 새 문구가 자리에 앉지 못한다
/** 장면은 낭독기에서 숨긴다 — 포즈를 보려면 숨긴 것까지 봐야 한다 */
const HIDDEN = { includeHiddenElements: true } as const;

const pass = async (ms: number) => {
  for (let t = 0; t < ms; t += 200) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(200, ms - t));
    });
  }
};

describe("몸에 힘 빼기", () => {
  it("시작 전에는 첫 부위를 미리 보여 주고 「따라 해보기」로 시작한다", async () => {
    const r = await render(<BodyReleaseScreen />);

    expect(r.getByText("몸에 힘 빼기")).toBeTruthy();
    expect(r.getByText("손과 팔")).toBeTruthy();
    expect(r.getByText("주먹을 살짝 쥐었다가 천천히 풀어요")).toBeTruthy();
    // 시작 전에는 셈이 없고, 카피바라는 가만히 앉아 있다
    expect(r.queryByText("5초")).toBeNull();
    expect(r.getByTestId("body-release-ring", HIDDEN)).toBeTruthy();
    expect(r.queryByTestId("body-release-motes", HIDDEN)).toBeNull();
    expect(r.getByTestId("body-release-pose-neutral", HIDDEN)).toBeTruthy();

    await fireEvent.press(r.getByText("따라 해보기"));
    await pass(400);

    expect(r.getByText("두 주먹을 꼭 쥐어보세요")).toBeTruthy();
    expect(r.getByText("천천히 숨을 들이마셔요")).toBeTruthy();
    // 셈은 아래 박자 줄 하나다 — 지금 박자는 남은 초, 다른 박자는 제 길이
    expect(r.getByText("5초")).toBeTruthy();
    expect(r.getByText("10초")).toBeTruthy();
    // 박자 이름은 「힘 주기 · 힘 빼기」 — 「풀기」가 아니다
    expect(r.getByText("힘 주기")).toBeTruthy();
    expect(r.getByText("힘 빼기")).toBeTruthy();
    expect(r.queryByText("따라 해보기")).toBeNull();
    expect(r.getByTestId("body-release-pose-hands", HIDDEN)).toBeTruthy();
  });

  it("힘주기 5초 뒤 풀기 10초, 그다음 부위로 넘어간다", async () => {
    const r = await render(<BodyReleaseScreen />);
    await fireEvent.press(r.getByText("따라 해보기"));

    await pass(7_400);
    expect(r.getByText("주먹을 스르르 펴보세요")).toBeTruthy();
    expect(r.getByText("숨을 길게 내쉬어요")).toBeTruthy();
    expect(r.getByText("8초")).toBeTruthy();
    expect(r.getByTestId("body-release-pose-release", HIDDEN)).toBeTruthy();

    await pass(8_000);
    expect(r.getByText("어깨와 목")).toBeTruthy();
    expect(r.getByText("어깨를 귀 쪽으로 으쓱 올려보세요")).toBeTruthy();
    expect(r.getByTestId("body-release-pose-shoulders", HIDDEN)).toBeTruthy();
  });

  it("네 부위가 끝나면 정적 뒤에야 「마치기」가 서고, 누르면 쉼터 탭으로 간다", async () => {
    const r = await render(<BodyReleaseScreen />);
    await fireEvent.press(r.getByText("따라 해보기"));

    await pass(60_400);
    // 끝의 한마디는 제목 아래 함께 서고, 「마치기」는 잠시 뒤에 붙는다
    expect(r.getByText("천천히 몸의 힘을 풀어봤어요")).toBeTruthy();
    expect(r.getByText("지금 몸이 어떻게 느껴지는지 잠시 느껴보세요")).toBeTruthy();
    expect(r.queryByText("마치기")).toBeNull();
    expect(r.getByTestId("body-release-pose-calm", HIDDEN)).toBeTruthy();
    // 끝났다는 표시 — 다 찬 링이 퍼져 사라지고 빛 알갱이가 떠오른다
    expect(r.getByTestId("body-release-motes", HIDDEN)).toBeTruthy();

    await pass(bodyReleaseMotion.doneHold);
    expect(r.queryByText("마치기")).toBeNull();
    // 기분을 골라야 끝맺음이 이어진다 — 건너뛰기가 없다
    expect(r.getByText("기분이 나아졌나요?")).toBeTruthy();
    await fireEvent.press(r.getByRole("button", { name: "나아졌어요" }));
    // 도장이 찍히고 「골랐다」를 볼 시간이 지나야 끝맺음이 이어진다
    await pass(restMoodMotion.stamp + restMoodMotion.hold);
    expect(addRestRecord).toHaveBeenCalledWith("body_release", { completed: true, mood: "better" });

    await fireEvent.press(r.getByText("마치기"));
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/rest");
  });

  describe("계측", () => {
    const sent = () => jest.mocked(track).mock.calls.map(([name, props]) => [name, props]);

    it("시작하지 않고 떠나면 intro 에서 나간 것이다", async () => {
      const r = await render(<BodyReleaseScreen />);
      await act(async () => {
        r.unmount();
      });

      expect(sent()).toEqual([
        ["rest_content_opened", { content: "body_release", entry: "direct", diary_today: false }],
        [
          "rest_content_exited",
          { content: "body_release", stage: "intro", duration_ms: expect.any(Number) },
        ],
      ]);
    });

    it("하다가 떠나면 그때의 부위에서 나간 것이다", async () => {
      const r = await render(<BodyReleaseScreen />);
      await fireEvent.press(r.getByText("따라 해보기"));
      await pass(16_000);
      await act(async () => {
        r.unmount();
      });

      expect(sent()).toContainEqual([
        "rest_content_exited",
        { content: "body_release", stage: "shoulders", duration_ms: expect.any(Number) },
      ]);
    });

    it("네 부위를 다 하면 끝까지 간 것이고, 떠나도 이탈은 없다", async () => {
      const r = await render(<BodyReleaseScreen />);
      await fireEvent.press(r.getByText("따라 해보기"));
      await pass(60_400);
      await act(async () => {
        r.unmount();
      });

      const names = sent().map(([name]) => name);
      expect(names).toContain("rest_content_completed");
      expect(names).not.toContain("rest_content_exited");
    });
  });
});
