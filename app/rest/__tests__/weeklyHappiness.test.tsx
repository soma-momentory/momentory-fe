import { fireEvent, render } from "@testing-library/react-native";

import WeeklyHappinessScreen from "@/../app/rest/weekly-happiness";
import { REST_THEMES } from "@/components/rest/restThemes";
import { RestLedgerArt } from "@/components/rest/weekly/RestLedgerArt";
import { keepWords } from "@/features/letter/model/letter";
import { REST_CONTENTS } from "@/features/rest/model/contents";
import { recommendRest } from "@/features/rest/model/recommend";
import {
  WEEKLY_HAPPINESS_CATEGORIES,
  shiftWeek,
  weekRangeLabel,
} from "@/features/rest/model/weeklyHappiness";
import { clock, fixedClock, setClock } from "@/lib/clock";

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
