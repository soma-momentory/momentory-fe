import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import WeeklyHappinessScreen from "@/../app/rest/weekly-happiness";
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
  shiftWeek,
  weekRangeLabel,
} from "@/features/rest/model/weeklyHappiness";
import { clock, fixedClock, setClock } from "@/lib/clock";

// 처음 들어온 경우는 아래 「설명 카드」에서 본다 — 나머지는 이미 본 쉼터로 둔다
jest.mock("@/features/rest/data/guideMemory", () => ({
  readGuideSeen: jest.fn(() => Promise.resolve(true)),
  markGuideSeen: jest.fn(() => Promise.resolve()),
}));

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
