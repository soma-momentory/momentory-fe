import { act, fireEvent, render, within } from "@testing-library/react-native";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import type { ReactNode } from "react";
import { View } from "react-native";

import { PreviewFontScaleContext } from "@/components/ds/Text";
import { homeV2 } from "@/design/ds";
import type { Schedule } from "@/features/home/model/types";
import {
  HomeV2View,
  type HomeV2ViewActions,
  type HomeV2ViewModel,
} from "@/features/home/ui/v2/HomeV2View";
import { DatePaper } from "@/features/home/ui/v2/DatePaper";
import { weekDays, weekEnd, type WeekDay } from "@/features/report/model/report";

/**
 * 홈 v2 공유 뷰 — 계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §7.1 P2.
 *
 * ⚠ 이 파일은 **모듈을 하나도 목킹하지 않는다** — 표시 전용 뷰라 store · router · 계측 없이 그려져야 한다.
 */

const TODAY = "2026-10-14"; // 수요일
const WEEK_START = "2026-10-11";

const schedule = (i: number, patch: Partial<Schedule> = {}): Schedule => ({
  id: `s${i}`,
  date: TODAY,
  title: `일정 ${i + 1}`,
  time: null,
  source: "manual",
  externalId: null,
  done: false,
  doneAt: null,
  emotions: [],
  hidden: false,
  ...patch,
});

const emptyWeek = () => weekDays([], WEEK_START, weekEnd(WEEK_START));

const baseModel = (patch: Partial<HomeV2ViewModel> = {}): HomeV2ViewModel => ({
  today: TODAY,
  schedules: [schedule(0, { done: true, doneAt: `${TODAY}T09:00:00.000Z` }), schedule(1)],
  week: emptyWeek(),
  retroReminderTime: null,
  weather: null,
  hasUnreadLetter: false,
  ...patch,
});

const actions = (): HomeV2ViewActions => ({
  onToggleDone: jest.fn(),
  onMove: jest.fn(),
  onReorder: jest.fn(),
  onHideCalendarSchedule: jest.fn(),
  onDeleteManualSchedule: jest.fn(),
  onEditManualSchedule: jest.fn(),
  onAddSchedule: jest.fn(),
  onStartReflection: jest.fn(),
  onOpenLetter: jest.fn(),
  onOpenNotificationSettings: jest.fn(),
  onOpenWeatherInfo: jest.fn(),
});

const frame = (body: ReactNode, overlay: ReactNode) => (
  <View testID="frame">
    {body}
    {overlay}
  </View>
);

const show = (model: HomeV2ViewModel = baseModel(), a: HomeV2ViewActions = actions()) =>
  render(<HomeV2View model={model} actions={a} renderFrame={frame} menuTopFromPageY={(y) => y} />);

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

describe("홈 v2 — 표시 전용", () => {
  it("표시 전용이다 — store · router · 계측을 import 하지 않는다(모듈 목킹 없이 렌더)", async () => {
    const r = await show();
    expect(r.getByText("10월 14일")).toBeTruthy();
    expect(r.getByText("수요일")).toBeTruthy();

    const dir = join(__dirname, "..", "ui", "v2");
    const sources = readdirSync(dir)
      .filter((f) => /\.tsx?$/.test(f))
      .map((f) => readFileSync(join(dir, f), "utf8"));
    expect(sources.length).toBeGreaterThanOrEqual(7);
    for (const src of sources) {
      expect(src).not.toMatch(/from "expo-router"/);
      expect(src).not.toMatch(/@\/features\/analytics/);
      expect(src).not.toMatch(/@\/features\/[a-z]+\/data\//);
      expect(src).not.toMatch(/model\/(day|diary|settings)"/);
      expect(src).not.toMatch(/@\/lib\/http/);
      // 운영 앱은 Lab 을 모른다
      expect(src).not.toMatch(/expo-lab/);
      // 스키마의 옛 Weather 타입을 import 하지 않는다(MF-5)
      expect(src).not.toMatch(/\bWeather\b[^;]*from "@\/features\/home\/model\/types"/);
    }
  });
});

describe("홈 v2 — 큰 글씨 날짜", () => {
  it("날짜와 요일 종이가 글씨 배율에 맞춰 늘어난다", async () => {
    const normal = await render(<DatePaper today={TODAY} />);
    const normalDate = flatten(normal.getByText("10월 14일").parent?.props.style).height as number;
    const normalWeekday = flatten(normal.getByText("수요일").parent?.props.style).height as number;
    await normal.unmount();

    const large = await render(<DatePaper today={TODAY} fontScale={1.3} />);
    expect(flatten(large.getByText("10월 14일").parent?.props.style).height).toBeGreaterThan(
      normalDate,
    );
    expect(flatten(large.getByText("수요일").parent?.props.style).height).toBeGreaterThan(
      normalWeekday,
    );
  });

  it("1.5배 모의에서 날짜 종이 폭도 글자와 함께 늘어난다", async () => {
    const screen = await render(<DatePaper today={TODAY} fontScale={1.5} />);
    expect(flatten(screen.getByText("10월 14일").parent?.parent?.props.style).width).toBe(270);
  });
});

describe("홈 v2 — 큰 글씨 배치", () => {
  it("안내문과 CTA는 줄 수에 따라 카드 높이를 늘리고, 일정 머리글은 필요한 경우 접힌다", async () => {
    const screen = await render(
      <PreviewFontScaleContext.Provider value={1.5}>
        <HomeV2View
          model={baseModel({ schedules: [], retroReminderTime: "21:30" })}
          actions={actions()}
          renderFrame={frame}
          menuTopFromPageY={(y) => y}
        />
      </PreviewFontScaleContext.Provider>,
    );
    const note = screen.getByText("밤 9:30엔 제가\n먼저 말 걸어요");
    const noteStyle = flatten(note.props.style);
    const bubbleStyle = flatten(screen.getByText("오늘 하루는\n어땠어요?").props.style);
    const heroStyle = flatten(note.parent?.props.style);
    const ctaStyle = flatten(screen.getByRole("button", { name: "하루 돌아보기" }).props.style);
    const headingStyle = flatten(screen.getByText("오늘 일정").parent?.parent?.props.style);

    expect(noteStyle.lineHeight).toBe(homeV2.type.note.lineHeight * 1.5);
    expect(bubbleStyle.lineHeight).toBe(homeV2.type.bubble.lineHeight * 1.5);
    expect(noteStyle.position).toBeUndefined();
    expect(heroStyle.minHeight).toBe(homeV2.size.hero.height);
    expect(heroStyle.height).toBeUndefined();
    expect(heroStyle.paddingTop).toBeGreaterThan(128);
    expect(ctaStyle.position).toBeUndefined();
    expect(ctaStyle.marginTop).toBeGreaterThan(0);
    expect(headingStyle.flexWrap).toBe("wrap");
  });
});

describe("홈 v2 — 히어로 문안(계획 §2.2)", () => {
  it.each([
    ["21:30", "밤 9:30엔 제가\n먼저 말 걸어요"],
    ["07:00", "아침 7:00엔 제가\n먼저 말 걸어요"],
  ])("리마인더는 설정 시각으로 만든다 — %s → 하드코딩이 아니다", async (time, expected) => {
    const r = await show(baseModel({ retroReminderTime: time }));
    expect(r.getByText(expected)).toBeTruthy();
  });

  it("알림을 끄면 「편할 때 언제든 / 돌아볼 수 있어요」", async () => {
    const r = await show(baseModel({ retroReminderTime: null }));
    expect(r.getByText("편할 때 언제든 돌아볼 수 있어요")).toBeTruthy();
    expect(r.queryByText(/먼저 말 걸어요/)).toBeNull();
  });

  it("말풍선은 「오늘 하루는 / 어땠어요?」", async () => {
    const r = await show();
    expect(r.getByText("오늘 하루는\n어땠어요?")).toBeTruthy();
  });

  it("weather == null 이면 스티커 자리를 그리지 않는다 — 날씨를 말하지 않는다", async () => {
    const r = await show(baseModel({ weather: null }));
    expect(r.queryByTestId("home-v2-weather", { includeHiddenElements: true })).toBeNull();
    expect(r.queryByLabelText(/날씨/)).toBeNull();
    expect(r.queryByText(/날씨|맑음|℃/)).toBeNull();
  });

  it("주 버튼은 「하루 돌아보기」 하나다 — ›는 장식이라 이름에 없다", async () => {
    const a = actions();
    const r = await show(baseModel(), a);
    const ctas = r.getAllByRole("button", { name: /돌아보기/ });
    expect(ctas).toHaveLength(1);
    expect(ctas[0]?.props.accessibilityLabel).toBe("하루 돌아보기");
    await fireEvent.press(ctas[0]!);
    expect(a.onStartReflection).toHaveBeenCalledTimes(1);
  });

  it("Baba 는 낭독기에서 숨는다 — 누를 수도 없다", async () => {
    const r = await show();
    expect(r.queryByTestId("home-v2-baba")).toBeNull();
    const baba = r.getByTestId("home-v2-baba", { includeHiddenElements: true });
    expect(baba.props.accessibilityElementsHidden).toBe(true);
    expect(baba.props.importantForAccessibility).toBe("no-hide-descendants");
    expect(baba.props.pointerEvents).toBe("none");
  });
});

describe("홈 v2 — 바바의 편지 아이콘(알림함 종 자리)", () => {
  it("hasUnreadLetter == false 면 점도 「새 편지」 접근성 이름도 없다", async () => {
    const a = actions();
    const r = await show(baseModel({ hasUnreadLetter: false }), a);
    expect(r.queryByTestId("home-v2-unread-dot", { includeHiddenElements: true })).toBeNull();
    expect(r.queryByLabelText(/새 편지/)).toBeNull();
    await fireEvent.press(r.getByRole("button", { name: "바바의 편지" }));
    expect(a.onOpenLetter).toHaveBeenCalledTimes(1);
  });

  it("안 연 새 편지가 있으면 점과 이름이 함께 바뀐다 — 숫자는 없다", async () => {
    const r = await show(baseModel({ hasUnreadLetter: true }));
    expect(r.getByTestId("home-v2-unread-dot")).toBeTruthy();
    expect(r.getByRole("button", { name: "바바의 편지, 새 편지 있음" })).toBeTruthy();
    expect(r.queryByText(/^\d+$/)).toBeNull();
  });
});

describe("홈 v2 — 이번 주 감정 도크(WK-1 · D2 · DN-1)", () => {
  const NO_EMOTION = require("../../../../assets/emotion-pebble/no-emotion.png");

  it("도크는 이번 주 기록이 없어도 일곱 칸 · 빈 날은 「기록 없음」 + no-emotion 그림", async () => {
    const r = await show(baseModel({ week: emptyWeek() }));
    expect(r.getByText("이번 주\n감정")).toBeTruthy();
    const cells = r.getAllByRole("button", { name: /요일 · / });
    expect(cells).toHaveLength(7);
    expect(r.getByRole("button", { name: "금요일 · 기록 없음" })).toBeTruthy();
    const marks = r.getAllByTestId("week-dock-no-record", { includeHiddenElements: true });
    expect(marks).toHaveLength(7);
    for (const mark of marks) expect(mark.props.source).toEqual(NO_EMOTION);
  });

  it("감정이 있는 날은 감정 이름을 읽고 · 일기만 있는 날은 「기록 있음, 감정 없음」 — 두 빈 칸은 그림도 다르다", async () => {
    const week: WeekDay[] = emptyWeek().map((d) =>
      d.label === "월"
        ? { ...d, emotions: [7, 8], written: true }
        : d.label === "화"
          ? { ...d, emotions: [], written: true }
          : d,
    );
    const r = await show(baseModel({ week }));

    expect(r.getByRole("button", { name: "월요일 · 불안함, 우울함" })).toBeTruthy();
    expect(r.getByRole("button", { name: "화요일 · 기록 있음, 감정 없음" })).toBeTruthy();
    expect(r.getByRole("button", { name: "수요일 · 기록 없음" })).toBeTruthy();

    // 일기만 있는 날은 테두리 조약돌(no-emotion.png)이 아니라 채운 조약돌 + 점이다
    expect(r.getAllByTestId("week-dock-written", { includeHiddenElements: true })).toHaveLength(1);
    expect(r.getAllByTestId("week-dock-no-record", { includeHiddenElements: true })).toHaveLength(
      5,
    );
  });

  it("칸을 누르면 그날 감정 이름이 도크 위에 서고, 다시 누르면 접힌다", async () => {
    const week: WeekDay[] = emptyWeek().map((d) =>
      d.label === "월" ? { ...d, emotions: [1], written: true } : d,
    );
    const r = await show(baseModel({ week }));
    expect(r.queryByTestId("week-dock-picked")).toBeNull();

    await fireEvent.press(r.getByRole("button", { name: "월요일 · 행복함" }));
    expect(within(r.getByTestId("week-dock-picked")).getByText("월요일 · 행복함")).toBeTruthy();

    await fireEvent.press(r.getByRole("button", { name: "월요일 · 행복함" }));
    expect(r.queryByTestId("week-dock-picked")).toBeNull();
  });

  it("오늘은 형광과 굵기로 — 색만으로 말하지 않는다", async () => {
    const r = await show();
    const day = (label: string) =>
      flatten(
        within(r.getByRole("button", { name: `${label}요일 · 기록 없음` })).getByText(label).props
          .style,
      );
    expect(day("수").fontFamily).toBe("Gaegu-Bold");
    expect(day("수").backgroundColor).toBeDefined();
    expect(day("목").fontFamily).toBe("Gaegu-Regular");
    expect(day("목").backgroundColor).toBeUndefined();
  });
});

describe("홈 v2 — 일정(HD-4 · S1~S20 중 뷰의 몫)", () => {
  it("체크는 마침 토글이고 히트 영역은 44 다(S1 · S3)", async () => {
    const a = actions();
    const r = await show(baseModel(), a);
    const check = r.getByRole("checkbox", { name: "일정 2 마침" });
    expect(check.props.hitSlop).toBe(10); // (44 - 24) / 2
    await fireEvent.press(check);
    expect(a.onToggleDone).toHaveBeenCalledWith("s1");
  });

  it("마친 줄은 취소선 + 보정한 글자색으로 남는다(S4 · 색만으로 말하지 않는다)", async () => {
    const r = await show();
    const done = flatten(r.getByText("일정 1").props.style);
    expect(done.textDecorationLine).toBe("line-through");
    expect(done.color).toBe(homeV2.color.taskDone);
    expect(flatten(r.getByText("일정 2").props.style).textDecorationLine).toBeUndefined();
  });

  it("「N개 남음」 · 다 마치면 「모두 완료」와 한 줄 — 진행률 · 배지 · 감정 알약이 없다(S13 · S14 · S16 · S17)", async () => {
    const r = await show();
    expect(r.getByText("1개 남음")).toBeTruthy();
    expect(r.queryByText(/%|연속|배지/)).toBeNull();
    expect(r.queryByText(/행복함|불안함/)).toBeNull();

    const all = await show(
      baseModel({ schedules: [schedule(0, { done: true }), schedule(1, { done: true })] }),
    );
    expect(all.getByText("모두 완료")).toBeTruthy();
    expect(all.getByText("오늘 일정을 모두 마쳤어요.")).toBeTruthy();
  });

  it("6개째부터 접고 「N개 더 보기」로 펼친다(S12) · 숨긴 일정은 세지 않는다(S15)", async () => {
    const many = [
      ...Array.from({ length: 7 }, (_, i) => schedule(i)),
      schedule(7, { hidden: true }),
    ];
    const r = await show(baseModel({ schedules: many }));
    expect(r.getByText("7개 남음")).toBeTruthy();
    expect(r.queryByText("일정 6")).toBeNull();

    await fireEvent.press(r.getByRole("button", { name: "2개 더 보기" }));
    expect(r.getByText("일정 7")).toBeTruthy();
    expect(r.queryByText("일정 8")).toBeNull();
  });

  it("⋮ 메뉴 — 직접 추가는 수정 · 삭제(확인 한 번) · 가져온 일정은 숨김 토스트(S5 · S7 · S8)", async () => {
    const measure = jest
      .spyOn(View.prototype, "measureInWindow")
      .mockImplementation((cb) => cb(0, 280, 44, 44));
    const a = actions();
    const r = await show(
      baseModel({
        schedules: [
          schedule(0),
          schedule(1, { source: "calendar", externalId: "cal-1", title: "캘린더 일정" }),
        ],
      }),
      a,
    );

    await fireEvent.press(r.getByLabelText("일정 1 더보기"));
    await fireEvent.press(r.getByText("수정하기"));
    expect(a.onEditManualSchedule).toHaveBeenCalledWith("s0");

    await fireEvent.press(r.getByLabelText("일정 1 더보기"));
    await fireEvent.press(r.getByText("삭제하기"));
    expect(r.getByText("이 일정을 삭제할까요?")).toBeTruthy();
    await fireEvent.press(r.getByText("삭제"));
    expect(a.onDeleteManualSchedule).toHaveBeenCalledWith("s0");
    expect(r.getByText("일정을 삭제했어요.")).toBeTruthy();

    await fireEvent.press(r.getByLabelText("캘린더 일정 더보기"));
    expect(r.queryByText("수정하기")).toBeNull();
    await fireEvent.press(r.getByText("삭제하기"));
    expect(a.onHideCalendarSchedule).toHaveBeenCalledWith("s1");
    expect(r.getByText("일정을 삭제했어요 · 캘린더 원본은 그대로 있어요")).toBeTruthy();
    measure.mockRestore();
  });

  it("⋮ 메뉴는 도크를 덮지 않는다 — 아래 여백에 도크 자리를 더한다", async () => {
    // ⋮ 가 화면 아래쪽(y 500)에 있다 — 탭바 여백만 보면 아래로 펴지지만 도크까지 보면 위로 뒤집힌다
    const measure = jest
      .spyOn(View.prototype, "measureInWindow")
      .mockImplementation((cb) => cb(0, 500, 44, 44));
    const r = await render(
      <HomeV2View
        model={baseModel()}
        actions={actions()}
        renderFrame={frame}
        menuTopFromPageY={(y) => y}
        menuBottomInset={80}
      />,
    );
    await fireEvent.press(r.getByLabelText("일정 2 더보기"));
    await fireEvent(r.getByTestId("ds-menu-overlay"), "layout", {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
    });
    // 메뉴 높이 88(두 줄) · 바라던 자리 552(⋮ 아래 + 8) — 552 + 88 = 640 은 탭바 여백(800 - 80 - 8)
    // 안이지만 도크 자리를 더하면 넘친다 → ⋮ 위로(500 - 8 - 88) 뒤집혀 도크를 덮지 않는다
    expect(flatten(r.getByTestId("ds-menu-panel").props.style).top).toBe(404);
    measure.mockRestore();
  });

  it("일정이 없으면 v2 빈 카드 — 머리 · 히어로 · 도크는 그대로다(S18)", async () => {
    const a = actions();
    const r = await show(baseModel({ schedules: [] }), a);
    expect(r.getByText("오늘은 일정이 없어요")).toBeTruthy();
    const emptyBody = r.getByText("여유로운 하루예요.\n하고 싶은 일 하나 적어둘까요?");
    expect(emptyBody.props.accessibilityLabel).toBe(
      "여유로운 하루예요. 하고 싶은 일 하나 적어둘까요?",
    );
    expect(emptyBody.props.numberOfLines).toBeUndefined();
    expect(r.getByText("0개")).toBeTruthy();
    expect(r.queryByText("오늘 하루를 차곡차곡 담아볼까요?")).toBeNull();
    expect(r.getByRole("button", { name: "하루 돌아보기" })).toBeTruthy();
    expect(r.getAllByRole("button", { name: /요일 · / })).toHaveLength(7);

    await fireEvent.press(r.getByRole("button", { name: "일정 추가" }));
    expect(a.onAddSchedule).toHaveBeenCalledTimes(1);
  });

  it("끄는 동안 목록 스크롤이 잠긴다 — 바깥은 처음부터 스크롤하지 않는다", async () => {
    jest.useFakeTimers();
    const r = await show();
    const scroll = () => r.getByTestId("home-v2-list-scroll");
    expect(scroll().props.scrollEnabled).toBe(true);

    await fireEvent(r.getByLabelText("일정 2"), "responderGrant", { nativeEvent: { pageY: 0 } });
    await act(async () => {
      jest.advanceTimersByTime(220);
    });
    await fireEvent(r.getByLabelText("일정 2"), "responderMove", { nativeEvent: { pageY: 10 } });
    expect(scroll().props.scrollEnabled).toBe(false);

    await fireEvent(r.getByLabelText("일정 2"), "responderRelease", {});
    expect(scroll().props.scrollEnabled).toBe(true);
    jest.useRealTimers();
  });

  it("좁은 화면에서는 날짜와 목록이 함께 스크롤하고, 끄는 동안 그 스크롤도 잠긴다", async () => {
    jest.useFakeTimers();
    const r = await show();
    await fireEvent(r.getByTestId("home-v2-root"), "layout", {
      nativeEvent: { layout: { width: 360, height: 500 } },
    });
    await fireEvent(r.getByTestId("home-v2-fixed"), "layout", {
      nativeEvent: { layout: { width: 360, height: 370 } },
    });
    const scroll = () => r.getByTestId("home-v2-body-scroll");
    expect(scroll().props.scrollEnabled).toBe(true);
    expect(within(scroll()).getByText("10월 14일")).toBeTruthy();
    expect(within(scroll()).getByText("일정 2")).toBeTruthy();
    expect(r.getByTestId("week-dock")).toBeTruthy();

    await fireEvent(r.getByLabelText("일정 2"), "responderGrant", { nativeEvent: { pageY: 0 } });
    await act(async () => {
      jest.advanceTimersByTime(220);
    });
    await fireEvent(r.getByLabelText("일정 2"), "responderMove", {
      nativeEvent: { pageY: 10 },
    });
    expect(scroll().props.scrollEnabled).toBe(false);
    await fireEvent(r.getByLabelText("일정 2"), "responderRelease", {});
    expect(scroll().props.scrollEnabled).toBe(true);
    jest.useRealTimers();
  });
});
