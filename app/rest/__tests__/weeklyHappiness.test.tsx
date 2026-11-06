import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";
import { Keyboard, ScrollView, StyleSheet } from "react-native";

import WeeklyHappinessScreen from "@/../app/rest/weekly-happiness";
import { addRestRecord } from "@/features/rest/data/restRecordApi";
import { REST_THEMES } from "@/components/rest/restThemes";
import { GuideCard } from "@/components/rest/scene/GuideCard";
import { RestLedgerArt } from "@/components/rest/weekly/RestLedgerArt";
import { keepWords } from "@/features/letter/model/letter";
import { markGuideSeen, readGuideSeen } from "@/features/rest/data/guideMemory";
import { REST_CONTENTS } from "@/features/rest/model/contents";
import { recommendRest } from "@/features/rest/model/recommend";
import { REST_GUIDES } from "@/features/rest/model/restGuide";
import {
  WEEKLY_HAPPINESS_CATEGORIES,
  WEEKLY_HAPPINESS_RECORDS_LIVE,
  shiftWeek,
  weekRangeLabel,
} from "@/features/rest/model/weeklyHappiness";
import { clock, fixedClock, setClock } from "@/lib/clock";

// 처음 들어온 경우는 아래 「설명 카드」에서 본다 — 나머지는 이미 본 쉼터로 둔다
jest.mock("@/features/rest/data/guideMemory", () => ({
  readGuideSeen: jest.fn(() => Promise.resolve(true)),
  markGuideSeen: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/features/rest/data/restRecordApi", () => ({
  addRestRecord: jest.fn(() => Promise.resolve({ ok: true, data: null })),
  fetchRestRecords: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
  Stack: jest.fn(() => null),
  Redirect: jest.fn(() => null),
}));

beforeEach(() => jest.clearAllMocks());

const flush = () => act(async () => {});

const real = clock;

beforeAll(() => {
  // 2026-11-04(수) — 이번 주는 11-01(일) ~ 11-07(토)
  setClock(fixedClock("2026-11-04T21:30:00+09:00"));
});
afterAll(() => setClock(real));

describe("주간 행복 — 주 계산", () => {
  it("머리의 날짜는 일~토이고 달을 넘겨도 맞다", () => {
    expect(weekRangeLabel("2026-11-01")).toEqual({ from: "11.01", to: "11.07" });
    expect(weekRangeLabel("2026-10-25")).toEqual({ from: "10.25", to: "10.31" });
    expect(shiftWeek("2026-11-01", -1)).toBe("2026-10-25");
  });
});

describe("주간 행복 — 화면", () => {
  it("처음에는 일곱 칸의 이름만 있고 적는 자리는 비어 있다", async () => {
    const r = await render(<WeeklyHappinessScreen />);
    expect(r.getByText("주간 행복")).toBeTruthy();
    for (const c of WEEKLY_HAPPINESS_CATEGORIES) {
      expect(r.getByText(keepWords(c.label))).toBeTruthy();
      expect(r.queryByPlaceholderText(c.placeholder)).toBeNull();
    }
  });

  it("예시 글은 적으려고 누른 칸에만 뜨고, 나오면 사라진다", async () => {
    const r = await render(<WeeklyHappinessScreen />);
    const [first, second] = WEEKLY_HAPPINESS_CATEGORIES;

    await fireEvent(r.getByLabelText(first.label), "focus");
    expect(r.getByPlaceholderText(first.placeholder)).toBeTruthy();
    expect(r.queryByPlaceholderText(second.placeholder)).toBeNull();

    await fireEvent(r.getByLabelText(first.label), "blur");
    expect(r.queryByPlaceholderText(first.placeholder)).toBeNull();
  });

  it("이번 주에서 다음 주로는 못 가고, 지난주로 갔다가 돌아올 수 있다", async () => {
    const r = await render(<WeeklyHappinessScreen />);
    expect(r.getByText("11.01")).toBeTruthy();
    const next = r.getByRole("button", { name: "다음 주" });
    expect(next.props.accessibilityState).toMatchObject({ disabled: true });

    await fireEvent.press(r.getByRole("button", { name: "이전 주" }));
    expect(r.getByText("10.25")).toBeTruthy();

    await fireEvent.press(r.getByRole("button", { name: "다음 주" }));
    expect(r.getByText("11.01")).toBeTruthy();
  });

  it("넘길 수 있는 지난주는 네 주까지다", async () => {
    const r = await render(<WeeklyHappinessScreen />);
    for (let i = 0; i < 4; i += 1) {
      await fireEvent.press(r.getByRole("button", { name: "이전 주" }));
    }
    expect(r.getByText("10.04")).toBeTruthy();
    expect(r.getByRole("button", { name: "이전 주" }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
  });

  it("적은 글은 그 주에 남고, 다른 주는 비어 있다", async () => {
    const r = await render(<WeeklyHappinessScreen />);
    await fireEvent.changeText(r.getByLabelText("맛있었던 음식"), "마라탕");
    expect(r.getByDisplayValue("마라탕")).toBeTruthy();

    await fireEvent.press(r.getByRole("button", { name: "이전 주" }));
    expect(r.queryByDisplayValue("마라탕")).toBeNull();

    await fireEvent.press(r.getByRole("button", { name: "다음 주" }));
    expect(r.getByDisplayValue("마라탕")).toBeTruthy();
  });
});

describe("주간 행복 — 누른 칸을 올린다", () => {
  const scrollTo = () =>
    jest.mocked((ScrollView.prototype as unknown as { scrollTo: jest.Mock }).scrollTo);

  /** 화면 400 · 글 900 · 주 막대 120 · 칸들은 목록(180) 안에서 60씩 */
  const lay = async (r: Awaited<ReturnType<typeof render>>) => {
    const scroll = r.getByTestId("weekly-happiness-scroll");
    await fireEvent(scroll, "layout", { nativeEvent: { layout: { height: 400 } } });
    await fireEvent(scroll, "contentSizeChange", 360, 900);
    for (const [i, c] of WEEKLY_HAPPINESS_CATEGORIES.entries()) {
      await fireEvent(r.getByTestId(`weekly-happiness-row-${c.label}`), "layout", {
        nativeEvent: { layout: { y: i * 60 } },
      });
    }
  };

  afterEach(() => jest.restoreAllMocks());

  it("키보드가 떠 있을 때 칸을 누르면 바로 윗줄이 보이는 자리까지 올린다", async () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    const r = await render(<WeeklyHappinessScreen />);
    await lay(r);

    await fireEvent(r.getByLabelText(WEEKLY_HAPPINESS_CATEGORIES[3].label), "focus");
    // 윗줄(세 번째 칸 · 120)이 화면 위 숨(8) 아래에 온다 — 목록 자리는 재지 않았으니 0
    expect(scrollTo()).toHaveBeenLastCalledWith({ y: 112, animated: true });
  });

  it("끝 칸은 스크롤 끝까지만 올린다", async () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    const r = await render(<WeeklyHappinessScreen />);
    await lay(r);
    const scroll = r.getByTestId("weekly-happiness-scroll");
    await fireEvent(scroll, "contentSizeChange", 360, 600);

    const last = WEEKLY_HAPPINESS_CATEGORIES[WEEKLY_HAPPINESS_CATEGORIES.length - 1]!;
    await fireEvent(r.getByLabelText(last.label), "focus");
    expect(scrollTo()).toHaveBeenLastCalledWith({ y: 200, animated: true });
  });

  it("키보드가 아직 없으면 누를 때는 두고, 키보드가 다 오른 뒤에 올린다", async () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(false);
    const listeners: Record<string, () => void> = {};
    jest.spyOn(Keyboard, "addListener").mockImplementation((event, fn) => {
      listeners[event] = fn as () => void;
      return { remove: jest.fn() } as unknown as ReturnType<typeof Keyboard.addListener>;
    });
    jest.spyOn(globalThis, "requestAnimationFrame").mockImplementation((fn) => {
      fn(0);
      return 0;
    });
    const r = await render(<WeeklyHappinessScreen />);
    await lay(r);

    await fireEvent(r.getByLabelText(WEEKLY_HAPPINESS_CATEGORIES[2].label), "focus");
    expect(scrollTo()).not.toHaveBeenCalled();

    await act(async () => listeners.keyboardDidShow?.());
    expect(scrollTo()).toHaveBeenLastCalledWith({ y: 52, animated: true });
  });

  it("키보드가 떠 있는 동안 창이 줄면 한 번 더 맞춘다 — 안드로이드는 창이 줄기 전에 DidShow 가 온다", async () => {
    jest.spyOn(Keyboard, "isVisible").mockReturnValue(true);
    const r = await render(<WeeklyHappinessScreen />);
    await lay(r);
    const scroll = r.getByTestId("weekly-happiness-scroll");
    // 창이 줄기 전 — 글(400)이 창(400)과 같아 올릴 여유가 없다
    await fireEvent(scroll, "contentSizeChange", 360, 400);
    const last = WEEKLY_HAPPINESS_CATEGORIES[WEEKLY_HAPPINESS_CATEGORIES.length - 1]!;
    await fireEvent(r.getByLabelText(last.label), "focus");
    expect(scrollTo()).toHaveBeenLastCalledWith({ y: 0, animated: true });

    // 키보드만큼 창이 줄었다 → 이제 끝까지(400 − 150) 올린다
    await fireEvent(scroll, "layout", { nativeEvent: { layout: { height: 150 } } });
    expect(scrollTo()).toHaveBeenLastCalledWith({ y: 250, animated: true });
  });
});

describe("주간 행복 — 끝맺음 · 이용 기록(서버 대기)", () => {
  it("한 칸도 적지 않으면 「다 적었어요」가 눌리지 않고, 그냥 나가도 기록이 남지 않는다", async () => {
    const r = await render(<WeeklyHappinessScreen />);
    expect(r.getByRole("button", { name: "다 적었어요" }).props.accessibilityState).toMatchObject({
      disabled: true,
    });
    await r.unmount();
    await flush();
    expect(addRestRecord).not.toHaveBeenCalled();
  });

  it("적고 「다 적었어요」를 누르면 기분을 묻고, 고르면 쉼터로 돌아간다", async () => {
    const r = await render(<WeeklyHappinessScreen />);
    await fireEvent.changeText(r.getByLabelText("맛있었던 음식"), "마라탕");
    await fireEvent.press(r.getByRole("button", { name: "다 적었어요" }));

    expect(r.getByText("기분이 나아졌나요?")).toBeTruthy();
    await fireEvent.press(r.getByRole("button", { name: "그대로예요" }));
    await fireEvent.press(r.getByRole("button", { name: "쉼터로 돌아가기" }));
    expect(router.replace).toHaveBeenCalledWith("/(tabs)/rest");
  });

  // 서버 `RestContent` 에 WEEKLY_HAPPINESS 가 생기면 `WEEKLY_HAPPINESS_RECORDS_LIVE` 를 켜고 이 묶음을 뒤집는다
  it("서버가 아직 받지 않아 기분을 골라도, 적다가 나가도 아무것도 보내지 않는다", async () => {
    expect(WEEKLY_HAPPINESS_RECORDS_LIVE).toBe(false);
    const done = await render(<WeeklyHappinessScreen />);
    await fireEvent.changeText(done.getByLabelText("맛있었던 음식"), "마라탕");
    await fireEvent.press(done.getByRole("button", { name: "다 적었어요" }));
    await fireEvent.press(done.getByRole("button", { name: "나아졌어요" }));
    await done.unmount();
    await flush();

    const left = await render(<WeeklyHappinessScreen />);
    await fireEvent.changeText(left.getByLabelText("좋았던 장소"), "산책했던 공원");
    await left.unmount();
    await flush();

    expect(addRestRecord).not.toHaveBeenCalled();
  });

  it("서버가 받기 전에는 늘 빈 기록이라 오른쪽 위 기록 원이 없다", async () => {
    const r = await render(<WeeklyHappinessScreen />);
    expect(r.queryByRole("button", { name: "지난 기록 보기" })).toBeNull();
  });
});

describe("주간 행복 — 설명 카드", () => {
  const guide = REST_GUIDES.weekly_happiness;
  const row = guide.pages[0].example!.rows![0]!;

  it("처음 들어오면 카드가 뜨고 1장에 기록장 예시가 있으며, 닫으면 빈 칸이 남는다", async () => {
    jest.mocked(readGuideSeen).mockResolvedValueOnce(false);
    const r = await render(<WeeklyHappinessScreen />);

    expect(await r.findByTestId("rest-guide-card")).toBeTruthy();
    expect(jest.mocked(markGuideSeen)).toHaveBeenCalledWith("weekly_happiness");
    expect(r.getByText(guide.pages[0].text)).toBeTruthy();
    expect(r.getByText(row.entry)).toBeTruthy();

    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    expect(r.getByText(guide.pages[1].text)).toBeTruthy();
    expect(r.queryByText(row.entry)).toBeNull();

    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    expect(r.getByText(guide.pages[2].text)).toBeTruthy();

    await fireEvent.press(r.getByRole("button", { name: "시작할게요" }));
    expect(r.queryByTestId("rest-guide-card")).toBeNull();
    expect(r.queryByText(row.entry)).toBeNull();
  });

  it("이미 본 뒤에는 뜨지 않고, 「?」 원이 같은 카드를 다시 연다", async () => {
    const r = await render(<WeeklyHappinessScreen />);
    expect(r.queryByTestId("rest-guide-card")).toBeNull();

    await fireEvent.press(r.getByLabelText("설명 보기"));
    expect(r.getByTestId("rest-guide-card")).toBeTruthy();
    expect(r.getByText(guide.pages[0].text)).toBeTruthy();
  });

  it("가장 긴 장만큼 자리를 잡아, 장을 넘겨도 카드 바닥과 버튼이 움직이지 않는다", async () => {
    const r = await render(<WeeklyHappinessScreen />);
    await fireEvent.press(r.getByLabelText("설명 보기"));

    const hidden = { includeHiddenElements: true };
    const measure = (page: number, height: number) =>
      fireEvent(r.getByTestId(`rest-guide-measure-${page}`, hidden), "layout", {
        nativeEvent: { layout: { height } },
      });
    await measure(0, 500);
    await measure(1, 320);
    await measure(2, 340);

    const seat = () => StyleSheet.flatten(r.getByTestId("rest-guide-seat").props.style);
    expect(seat()).toMatchObject({ minHeight: 500, justifyContent: "flex-end" });

    await fireEvent.press(r.getByRole("button", { name: "다음" }));
    expect(seat()).toMatchObject({ minHeight: 500, justifyContent: "flex-end" });
  });

  it("높이를 재는 장은 낭독기에 없고, 그 안의 버튼은 꺼져 있다", async () => {
    const r = await render(
      <GuideCard
        content="meditation"
        first
        onClose={jest.fn()}
        lastPageLink={{ label: "참고한 실습 보기", onPress: jest.fn() }}
      />,
    );
    // 보이는 1장의 「다음」 하나만 잡히고, 재는 장의 버튼은 숨겨져 있다
    expect(r.getAllByRole("button")).toHaveLength(1);
    expect(r.queryByText("참고한 실습 보기")).toBeNull();

    const measured = r.getByText("참고한 실습 보기", { includeHiddenElements: true });
    let node = measured.parent;
    while (node != null && node.props.accessibilityState?.disabled == null) node = node.parent;
    expect(node?.props.accessibilityState).toMatchObject({ disabled: true });
  });

  it("예시 줄은 실제 칸 이름과 입력칸 예시를 그대로 쓴다", () => {
    for (const { label, entry } of guide.pages[0].example!.rows!) {
      expect(WEEKLY_HAPPINESS_CATEGORIES).toContainEqual(
        expect.objectContaining({ label, placeholder: entry }),
      );
    }
  });
});

describe("주간 행복 — 쉼터", () => {
  it("쉼터 칸은 소원 연꽃 바로 앞이고 테마가 있다", () => {
    const ids = REST_CONTENTS.map((c) => c.id);
    expect(ids.indexOf("weeklyHappiness")).toBe(ids.indexOf("wish") - 1);
    expect(REST_THEMES.weeklyHappiness.Art).toBeDefined();
  });

  it("칸 그림은 실제 화면처럼 이번 주 날짜와 칸 이름을 보여 준다", async () => {
    const r = await render(<RestLedgerArt />);
    const hidden = { includeHiddenElements: true };
    expect(r.getByText("11.01", hidden)).toBeTruthy();
    expect(r.getByText("11.07", hidden)).toBeTruthy();
    expect(r.getByText(WEEKLY_HAPPINESS_CATEGORIES[0].label, hidden)).toBeTruthy();
  });

  it("출시 빌드에는 칸이 없다 — 적은 글이 아직 저장되지 않는다", () => {
    const dev = (globalThis as { __DEV__?: boolean }).__DEV__;
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    try {
      jest.isolateModules(() => {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- __DEV__ 를 바꾼 뒤 새로 읽어야 한다
        const released = require("@/features/rest/model/contents") as {
          REST_CONTENTS: readonly { id: string }[];
        };
        const ids = released.REST_CONTENTS.map((c) => c.id);
        expect(ids).not.toContain("weeklyHappiness");
        expect(ids).toContain("wish");
      });
    } finally {
      (globalThis as { __DEV__?: boolean }).__DEV__ = dev;
    }
  });

  it("쉼 추천에는 나오지 않는다 — 아직 저장되지 않는다", () => {
    for (let i = 0; i < 60; i += 1) {
      expect(recommendRest([], [], () => i / 60).content).not.toBe("weeklyHappiness");
    }
  });
});
