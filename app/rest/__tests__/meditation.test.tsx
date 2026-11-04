import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { AppState, StyleSheet } from "react-native";

import MeditationScreen from "../meditation";

import { track } from "@/features/analytics";
import { markGuideSeen, readGuideSeen } from "@/features/rest/data/guideMemory";
import { addRestRecord } from "@/features/rest/data/restRecordApi";
import { createSound } from "@/lib/audio";
import { openExternalLink } from "@/lib/links";

jest.mock("@/lib/audio", () => ({
  createSound: jest.fn(),
  enterListeningSession: jest.fn(() => Promise.resolve()),
  leaveListeningSession: jest.fn(),
}));

jest.mock("@/features/rest/data/guideMemory", () => ({
  readGuideSeen: jest.fn(() => Promise.resolve(true)),
  markGuideSeen: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/features/rest/data/restRecordApi", () => ({
  addRestRecord: jest.fn(() => Promise.resolve({ ok: true, data: null })),
  fetchRestRecords: jest.fn(),
}));

jest.mock("@/features/rest/data/storeReview", () => ({
  maybeRequestStoreReview: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/lib/links", () => ({
  openExternalLink: jest.fn(() => Promise.resolve(true)),
}));

/** 포커스 효과 — 효과를 부르면 포커스, 돌려받은 정리를 부르면 다른 화면으로 간 것이다 */
const mockFocusEffect: { current: (() => void | (() => void)) | null } = { current: null };

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useFocusEffect: (effect: () => void | (() => void)) => {
    mockFocusEffect.current = effect;
  },
  Stack: jest.fn(() => null),
  Redirect: jest.fn(() => null),
}));

jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  isAnalyticsEnabled: true,
  track: jest.fn(),
}));

const HIDDEN = { includeHiddenElements: true } as const;

/** 파도의 소리 네 개 — 배경음 · 음성 세 토막 순서로 만들어진다 */
let sounds: {
  play: jest.Mock;
  pause: jest.Mock;
  seek: jest.Mock;
  setVolume: jest.Mock;
  whenLoaded: jest.Mock;
  release: jest.Mock;
}[] = [];
let loadsVoice = true;

/** 흘린 시간을 시계가 보게 — 가짜 타이머는 `Date.now` 도 함께 옮긴다 */
const pass = async (ms: number) => {
  for (let t = 0; t < ms; t += 1000) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(1000, ms - t));
    });
  }
};

const clockText = (r: Awaited<ReturnType<typeof render>>) =>
  r.getByTestId("meditation-clock").props.children as string;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  sounds = [];
  loadsVoice = true;
  (createSound as jest.Mock).mockImplementation(() => {
    const isVoice = sounds.length % 4 !== 0;
    const sound = {
      play: jest.fn(),
      pause: jest.fn(),
      seek: jest.fn(),
      setVolume: jest.fn(),
      whenLoaded: jest.fn(() => Promise.resolve(!isVoice || loadsVoice)),
      release: jest.fn(),
    };
    sounds.push(sound);
    return sound;
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("3분 명상", () => {
  it("처음에는 파도가 서고, 동그라미를 누르면 풍경과 이름이 바뀐다", async () => {
    const r = await render(<MeditationScreen />);

    expect(r.getByText("마음이 급할 때")).toBeTruthy();
    expect(r.getByTestId("meditation-scene-wave", HIDDEN)).toBeTruthy();

    await fireEvent.press(r.getByLabelText("비 오는 창가"));

    expect(r.getByText("하루를 마칠 때")).toBeTruthy();
    expect(r.getByTestId("meditation-scene-rain", HIDDEN)).toBeTruthy();
    expect(r.getByLabelText("비 오는 창가").props.accessibilityState.selected).toBe(true);
    expect(r.getByLabelText("파도").props.accessibilityState.selected).toBe(false);
  });

  it("시작하면 시계와 첫 자막이 서고 배경음이 나며, 음성 안내가 켜져 있다", async () => {
    const r = await render(<MeditationScreen />);

    await fireEvent.press(r.getByLabelText("시작하기"));

    expect(clockText(r)).toBe("00:00 / 03:00");
    expect(r.getByLabelText(/지금 떠오르는 생각, 감정, 몸의 감각을 살펴봅니다/)).toBeTruthy();
    expect(r.getByLabelText("음성 안내 켜기/끄기").props.accessibilityState.selected).toBe(true);
    expect(sounds[0]!.play).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith("meditation_started", { concept: "wave" });
  });

  it("자막은 화면 높이의 같은 자리에 서고, 작은 화면에서는 조작에 닿지 않게 올라간다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("비 오는 창가"));
    await fireEvent.press(r.getByLabelText("시작하기"));
    const top = () => StyleSheet.flatten(r.getByTestId("meditation-cue-zone").props.style).top;
    const layout = (height: number) =>
      fireEvent(r.getByTestId("meditation-session"), "layout", {
        nativeEvent: { layout: { x: 0, y: 0, width: 393, height } },
      });

    await layout(1000);
    expect(top()).toBeCloseTo(605);

    // 조작 윗변 = 500 - (안전 영역 0 + 아래 24 + 큰 원 76 + 그림자 4) = 396 · 다섯 줄 160 을 남긴다
    await layout(500);
    expect(top()).toBe(236);
  });

  it("음성이 끝나면 자막이 낭독기에서도 빠지고, 다음 구간에 새 자막이 선다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));
    expect(r.getByTestId("meditation-cue").props.accessibilityElementsHidden).toBe(false);

    await pass(11_000);
    expect(r.getByTestId("meditation-cue", HIDDEN).props.accessibilityElementsHidden).toBe(true);

    await pass(51_000);
    expect(r.getByLabelText(/배에서 느껴지는 호흡의 움직임/)).toBeTruthy();
    expect(r.getByTestId("meditation-cue").props.accessibilityElementsHidden).toBe(false);
  });

  it("1분이 지나면 다음 자막으로 갈린다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));

    await pass(62_000);

    expect(clockText(r)).toBe("01:02 / 03:00");
    expect(r.getByLabelText(/배에서 느껴지는 호흡의 움직임/)).toBeTruthy();
  });

  it("일시정지하면 시간이 멈추고, 이어하면 그 자리부터 흐른다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));
    await pass(10_000);

    await fireEvent.press(r.getByLabelText("일시정지"));
    await pass(30_000);
    expect(clockText(r)).toBe("00:10 / 03:00");

    await fireEvent.press(r.getByLabelText("이어하기"));
    await pass(5_000);
    expect(clockText(r)).toBe("00:15 / 03:00");
  });

  it("멈추기는 확인을 묻고, 묻는 동안 시간이 멈추며 「이어서 하기」로 돌아온다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));
    await pass(10_000);

    await fireEvent.press(r.getByLabelText("멈추기"));
    expect(r.getByText("여기서 멈출까요?")).toBeTruthy();
    await pass(20_000);

    await fireEvent.press(r.getByLabelText("이어서 하기"));
    expect(r.queryByText("여기서 멈출까요?")).toBeNull();
    await pass(1_000);
    expect(clockText(r)).toBe("00:11 / 03:00");
  });

  it("재생 중 뒤로가기 원도 같은 확인을 묻고, 곧장 나가지 않는다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));

    await fireEvent.press(r.getByLabelText("뒤로"));

    expect(r.getByText("여기서 멈출까요?")).toBeTruthy();
    expect(router.back).not.toHaveBeenCalled();
  });

  it("「여기서 멈추기」는 기분 쪽지로 가고, 실제 머문 시간과 이유를 한 번만 남긴다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));
    await pass(45_000);

    await fireEvent.press(r.getByLabelText("멈추기"));
    await pass(5_000);
    await fireEvent.press(r.getByLabelText("여기서 멈추기"));

    expect(r.getByText("기분이 나아졌나요?")).toBeTruthy();
    expect(r.getByText("-바바-")).toBeTruthy();
    expect(r.queryByLabelText("쉼터로 돌아가기")).toBeNull();
    expect(track).toHaveBeenCalledWith("meditation_ended", {
      concept: "wave",
      reason: "user_stop",
      duration_ms: 45_000,
      voice_enabled: true,
    });

    await fireEvent.press(r.getByLabelText("나아졌어요"));
    await fireEvent.press(r.getByLabelText("쉼터로 돌아가기"));
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/rest");

    await r.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(addRestRecord).toHaveBeenCalledTimes(1);
    expect(addRestRecord).toHaveBeenCalledWith("meditation", { completed: true, mood: "better" });
  });

  it("3분이 차면 저절로 기분 쪽지로 가고 끝까지 한 것으로 센다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));

    await pass(181_000);

    expect(r.getByText("기분이 나아졌나요?")).toBeTruthy();
    const ended = (track as jest.Mock).mock.calls.filter(([name]) => name === "meditation_ended");
    expect(ended).toEqual([
      [
        "meditation_ended",
        { concept: "wave", reason: "natural", duration_ms: 180_000, voice_enabled: true },
      ],
    ]);
    expect(track).toHaveBeenCalledWith(
      "rest_content_completed",
      expect.objectContaining({ content: "meditation" }),
    );
  }, 60_000);

  it("처음 들어오면 설명 카드가 저절로 뜨고, 세 장을 넘겨 「시작할게요」로 닫는다", async () => {
    jest.mocked(readGuideSeen).mockResolvedValueOnce(false);
    const r = await render(<MeditationScreen />);

    expect(r.getByTestId("rest-guide-card")).toBeTruthy();
    expect(markGuideSeen).toHaveBeenCalledWith("meditation");
    expect(r.getByText(/마음에 맞는 풍경을 골라/)).toBeTruthy();

    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    await fireEvent.press(r.getByRole("button", { name: "시작할게요" }));

    expect(r.queryByTestId("rest-guide-card")).toBeNull();
    expect(r.getByLabelText("시작하기")).toBeTruthy();
  });

  it("재생 중 「?」는 설명 카드를 열고, 떠 있는 동안 시간과 소리가 멈춘다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));
    await pass(3_000);

    await fireEvent.press(r.getByLabelText("설명 보기"));
    expect(r.getByTestId("rest-guide-card")).toBeTruthy();
    expect(track).toHaveBeenCalledWith("rest_guide_opened", { content: "meditation" });
    expect(sounds[1]!.pause).toHaveBeenCalled();
    expect(sounds[0]!.pause).toHaveBeenCalled();
    await pass(10_000);

    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    await fireEvent.press(r.getByRole("button", { name: "알겠어요" }));
    expect(r.queryByTestId("rest-guide-card")).toBeNull();
    await pass(1_000);
    expect(clockText(r)).toBe("00:04 / 03:00");
  });

  it("설명 카드 마지막 장에서 정보 시트로 가 출처를 열고, 닫으면 시간이 다시 흐른다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("작은 모닥불"));
    await fireEvent.press(r.getByLabelText("시작하기"));
    await pass(3_000);

    await fireEvent.press(r.getByLabelText("설명 보기"));
    expect(r.queryByRole("button", { name: "참고한 실습 보기" })).toBeNull();
    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    await fireEvent.press(r.getByRole("button", { name: "참고한 실습 보기" }));

    expect(r.queryByTestId("rest-guide-card")).toBeNull();
    expect(r.getByText("콘텐츠 정보")).toBeTruthy();
    expect(r.getByText("작은 모닥불: 나에게 엄격해질 때")).toBeTruthy();
    expect(r.getByLabelText("작은 모닥불 정보 보기").props.accessibilityState.selected).toBe(true);

    await fireEvent.press(r.getByLabelText("숲 정보 보기"));
    expect(r.getByText("숲: 생각이 많을 때")).toBeTruthy();
    expect(r.getByLabelText("숲 정보 보기").props.accessibilityState.selected).toBe(true);
    await fireEvent.press(r.getByLabelText("출처 uclahealth.org 열기"));
    expect(openExternalLink).toHaveBeenCalledWith("meditationUcla");
    await fireEvent.press(r.getByLabelText("작은 모닥불 정보 보기"));
    await pass(10_000);

    await fireEvent.press(r.getByLabelText("출처 self-compassion.org 열기"));
    expect(openExternalLink).toHaveBeenCalledWith("meditationSelfCompassion");

    await fireEvent.press(r.getByLabelText("닫기"));
    expect(r.queryByText("콘텐츠 정보")).toBeNull();
    await pass(1_000);
    expect(clockText(r)).toBe("00:04 / 03:00");
  });

  it("앱이 뒤로 가면 저절로 멈추고, 돌아와도 사용자가 이어하기를 누를 때까지 멈춰 있다", async () => {
    const r = await render(<MeditationScreen />);
    const listeners = (AppState.addEventListener as jest.Mock).mock.calls.map(
      ([, fn]) => fn as (state: string) => void,
    );
    await fireEvent.press(r.getByLabelText("시작하기"));
    await pass(5_000);

    await act(async () => listeners.forEach((fn) => fn("background")));
    await pass(20_000);
    await act(async () => listeners.forEach((fn) => fn("active")));
    await pass(5_000);

    expect(clockText(r)).toBe("00:05 / 03:00");
    expect(r.getByLabelText("이어하기")).toBeTruthy();
  });

  it("1분마다 그 구간의 음성이 나고, 끄면 자막과 시간만 간다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));

    await pass(1_000);
    expect(sounds[1]!.play).toHaveBeenCalledTimes(1);

    await pass(60_000);
    expect(sounds[2]!.play).toHaveBeenCalledTimes(1);

    await fireEvent.press(r.getByLabelText("음성 안내 켜기/끄기"));
    expect(sounds[2]!.pause).toHaveBeenCalled();
    expect(r.getByLabelText("음성 안내 켜기/끄기").props.accessibilityState.selected).toBe(false);

    await pass(60_000);
    expect(sounds[3]!.play).not.toHaveBeenCalled();
    expect(clockText(r)).toBe("02:01 / 03:00");
  }, 30_000);

  it("멈춤을 묻는 동안 소리가 멈추고, 떠나면 소리를 남기지 않는다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));
    await pass(1_000);

    await fireEvent.press(r.getByLabelText("멈추기"));
    expect(sounds[1]!.pause).toHaveBeenCalled();
    expect(sounds[0]!.pause).toHaveBeenCalled();

    await r.unmount();
    sounds.forEach((sound) => expect(sound.release).toHaveBeenCalledTimes(1));
  });

  it("일시정지하면 음성과 배경음이 함께 멈추고, 이어하면 함께 돌아온다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));
    await pass(1_000);

    await fireEvent.press(r.getByLabelText("일시정지"));
    expect(sounds[0]!.pause).toHaveBeenCalledTimes(1);
    expect(sounds[1]!.pause).toHaveBeenCalledTimes(1);

    await fireEvent.press(r.getByLabelText("이어하기"));
    expect(sounds[0]!.play).toHaveBeenCalledTimes(2);
    expect(sounds[1]!.play).toHaveBeenCalledTimes(2);
  });

  it("앱이 뒤로 가면 소리도 멈추고, 돌아와도 이어하기 전에는 조용하다", async () => {
    const r = await render(<MeditationScreen />);
    const listeners = (AppState.addEventListener as jest.Mock).mock.calls.map(
      ([, fn]) => fn as (state: string) => void,
    );
    await fireEvent.press(r.getByLabelText("시작하기"));
    await pass(1_000);

    await act(async () => listeners.forEach((fn) => fn("background")));
    expect(sounds[0]!.pause).toHaveBeenCalled();
    expect(sounds[1]!.pause).toHaveBeenCalled();

    await act(async () => listeners.forEach((fn) => fn("active")));
    expect(sounds[0]!.play).toHaveBeenCalledTimes(1);
    expect(sounds[1]!.play).toHaveBeenCalledTimes(1);
  });

  it("음성을 못 불러오면 묻고, 자막으로 시작하면 음성 없이 간다", async () => {
    loadsVoice = false;
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));

    expect(r.getByText("음성을 불러오지 못했어요.")).toBeTruthy();
    expect(track).toHaveBeenCalledWith("meditation_audio_failed", { concept: "wave" });
    expect(track).not.toHaveBeenCalledWith("meditation_started", expect.anything());
    expect(sounds[0]!.play).not.toHaveBeenCalled();

    await fireEvent.press(r.getByLabelText("자막으로 시작"));
    expect(clockText(r)).toBe("00:00 / 03:00");
    expect(r.getByLabelText("음성 안내 켜기/끄기").props.accessibilityState.disabled).toBe(true);
    expect(sounds[0]!.play).toHaveBeenCalledTimes(1);

    await pass(1_000);
    expect(sounds[1]!.play).not.toHaveBeenCalled();
  });

  it("음성을 못 불러와도 다시 시도할 수 있고, ✕ 는 준비 화면으로 돌아간다", async () => {
    loadsVoice = false;
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));

    await fireEvent.press(r.getByLabelText("닫기"));
    expect(r.getByLabelText("시작하기")).toBeTruthy();
    expect(sounds[0]!.release).toHaveBeenCalled();

    await fireEvent.press(r.getByLabelText("시작하기"));
    loadsVoice = true;
    await fireEvent.press(r.getByLabelText("다시 시도"));

    expect(clockText(r)).toBe("00:00 / 03:00");
    expect(sounds[4]!.release).toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith("meditation_started", { concept: "wave" });
  });

  it("위 원은 다른 쉼터처럼 뒤로가기 · 「?」 · 이용 기록 순서다", async () => {
    const r = await render(<MeditationScreen />);

    const labels = r
      .getAllByRole("button")
      .map((b) => b.props.accessibilityLabel as string)
      .filter((label) => ["뒤로", "설명 보기", "지난 기록 보기"].includes(label));
    expect(labels).toEqual(["뒤로", "설명 보기", "지난 기록 보기"]);

    await fireEvent.press(r.getByLabelText("지난 기록 보기"));
    expect(router.push).toHaveBeenCalledWith("/rest/records?content=meditation");
  });

  it("재생 중에 이용 기록으로 가면 시간과 소리가 멈추고, 돌아와도 이어하기 전에는 조용하다", async () => {
    const r = await render(<MeditationScreen />);
    const refocus = mockFocusEffect.current!;
    const blur = refocus() as () => void;
    await fireEvent.press(r.getByLabelText("시작하기"));
    await pass(5_000);

    await fireEvent.press(r.getByLabelText("지난 기록 보기"));
    await act(async () => blur());
    expect(sounds[0]!.pause).toHaveBeenCalled();
    expect(sounds[1]!.pause).toHaveBeenCalled();

    await pass(20_000);
    expect(clockText(r)).toBe("00:05 / 03:00");

    await act(async () => void refocus());
    expect(sounds[0]!.play).toHaveBeenCalledTimes(1);
    expect(sounds[1]!.play).toHaveBeenCalledTimes(1);
    expect(r.getByLabelText("이어하기")).toBeTruthy();
  });

  it("시작 전에 나가면 기록을 남기지 않는다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("뒤로"));
    expect(router.back).toHaveBeenCalled();
    await r.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(addRestRecord).not.toHaveBeenCalled();
  });

  it("시작한 뒤 나가면 「중간에 나감」으로 남긴다", async () => {
    const r = await render(<MeditationScreen />);
    await fireEvent.press(r.getByLabelText("시작하기"));
    await r.unmount();
    await act(async () => {
      await Promise.resolve();
    });
    expect(addRestRecord).toHaveBeenCalledWith("meditation", { completed: false });
  });
});
