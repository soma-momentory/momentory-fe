import { fireEvent, render, screen } from "@testing-library/react-native";

import { WeatherCreditSheet } from "@/components/weather/WeatherCreditSheet";
import { WeatherSticker } from "@/features/home/ui/v2/WeatherSticker";
import { clock } from "@/lib/clock";
import { openExternalLink } from "@/lib/links";

/**
 * 날씨 스티커(HW-4 · HW-5 접근성)와 출처 · 갱신 시각 시트(HW-5 · CP-1) — 계획 §4.6 · §7.1 P4.
 * 아직 어느 화면도 그리지 않는다 — 홈 연결 뒤의 화면 테스트(`home.test.tsx`)는 후속이다.
 */
jest.mock("@/lib/links", () => ({ openExternalLink: jest.fn(() => Promise.resolve(true)) }));

const SUNNY = { label: "맑음", temperatureC: 22, stickerKey: "clear.day" };

beforeEach(() => {
  jest.clearAllMocks();
  // KST 2026-10-15 22:00
  jest.spyOn(clock, "now").mockReturnValue(new Date("2026-10-15T13:00:00Z"));
});
afterEach(() => jest.restoreAllMocks());

describe("WeatherSticker", () => {
  it("값이 없거나 그림이 없는 열쇠면 아무것도 그리지 않는다 — 빈 틀도 문구도 없다", async () => {
    for (const weather of [
      null,
      { ...SUNNY, stickerKey: "clear.night" },
      { ...SUNNY, stickerKey: "toString" },
    ]) {
      const view = await render(<WeatherSticker weather={weather} onPress={jest.fn()} />);
      expect(view.toJSON()).toBeNull();
      await view.unmount();
    }
  });

  it("접근성 이름은 「날씨: 맑음 22도」 · 힌트는 「출처와 갱신 시각 보기」", async () => {
    await render(<WeatherSticker weather={SUNNY} onPress={jest.fn()} />);
    const button = screen.getByRole("button", { name: "날씨: 맑음 22도" });
    expect(button.props.accessibilityHint).toBe("출처와 갱신 시각 보기");
  });

  it("기온이 없으면 「날씨: 맑음」", async () => {
    await render(<WeatherSticker weather={{ ...SUNNY, temperatureC: null }} onPress={jest.fn()} />);
    expect(screen.getByRole("button", { name: "날씨: 맑음" })).toBeTruthy();
  });

  it("누르면 onPress", async () => {
    const onPress = jest.fn();
    await render(<WeatherSticker weather={SUNNY} onPress={onPress} />);
    await fireEvent.press(screen.getByRole("button", { name: "날씨: 맑음 22도" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe("WeatherCreditSheet", () => {
  const sheet = (patch: Partial<Parameters<typeof WeatherCreditSheet>[0]> = {}) => (
    <WeatherCreditSheet
      visible
      onDismiss={jest.fn()}
      source="MET Norway"
      label="맑음"
      temperatureC={22}
      updatedAt="2026-10-15T12:31:07Z"
      {...patch}
    />
  );

  it("요약 · 출처 이름(응답의 source 그대로) · 오늘의 갱신 시각", async () => {
    await render(sheet());
    expect(screen.getByText("맑음 · 22℃")).toBeTruthy();
    expect(screen.getByText("MET Norway 예보 · 밤 9:31 갱신")).toBeTruthy();
  });

  it("출처 이름은 prop 을 그대로 쓴다(CP-1) — 하드코딩하지 않는다", async () => {
    await render(sheet({ source: "Yr (MET Norway)" }));
    expect(screen.getByText("Yr (MET Norway) 예보 · 밤 9:31 갱신")).toBeTruthy();
  });

  it("오늘이 아니면 날짜까지 — 「10월 14일 밤 11:31 갱신」", async () => {
    await render(sheet({ updatedAt: "2026-10-14T14:31:00Z" }));
    expect(screen.getByText("MET Norway 예보 · 10월 14일 밤 11:31 갱신")).toBeTruthy();
  });

  it("기온이 없으면 이름만 · 갱신 시각이 없으면 출처만", async () => {
    await render(sheet({ temperatureC: null, updatedAt: undefined }));
    expect(screen.getByText("맑음")).toBeTruthy();
    expect(screen.getByText("MET Norway 예보")).toBeTruthy();
  });

  it("링크는 links.ts 의 weather · weatherLicense 를 연다 · 확인은 닫는다", async () => {
    const onDismiss = jest.fn();
    await render(sheet({ onDismiss }));
    await fireEvent.press(screen.getByText("MET Norway 원본 보기"));
    await fireEvent.press(screen.getByText("CC BY 4.0 라이선스 보기"));
    expect(openExternalLink).toHaveBeenNthCalledWith(1, "weather");
    expect(openExternalLink).toHaveBeenNthCalledWith(2, "weatherLicense");
    await fireEvent.press(screen.getByText("확인"));
    expect(onDismiss).toHaveBeenCalled();
  });
});
