import { render, act, fireEvent, waitFor, within } from "@testing-library/react-native";
import { Dimensions } from "react-native";
// jest.mock 팩토리는 `mock` 으로 시작하는 이름만 밖에서 끌어 쓸 수 있다(호이스팅 가드)
import { useEffect as mockUseEffect } from "react";

import { router, useLocalSearchParams } from "expo-router";

import My from "../my";
import Report from "../report";

import { track } from "@/features/analytics";
import { useAuth } from "@/features/auth/model/auth";
import { CALENDAR_NOTICE } from "@/features/calendar/model/notice";
import { syncDeviceCalendar } from "@/features/calendar/model/foregroundSync";
import { useDiary } from "@/features/diary/model/diary";
import { useProfile, useSettings } from "@/features/my/model/settings";
import { completeOnboarding } from "@/features/onboarding/data/completeOnboardingApi";
import { ONBOARDING_FAILURE_MESSAGES } from "@/features/onboarding/model/submit";
import { getCalendarAccess, openCalendarSettings, requestCalendarAccess } from "@/lib/calendar";
import type { WeeklyReport } from "@/features/report/data/weeklyReportApi";
import { useWeeklyReport } from "@/features/report/model/weeklyReport";
import { seedDiaries, seedProfile } from "@/testing/fixtures";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  Stack: jest.fn(() => null),
  useLocalSearchParams: jest.fn(() => ({})),
  // 리포트는 **포커스마다** 다시 받는다 — 테스트에는 화면이 하나뿐이라 마운트가 곧 포커스다
  useFocusEffect: (effect: () => void | (() => void)) => mockUseEffect(effect, [effect]),
}));

/**
 * 주간 리포트는 **한 번의 조회**가 전부다(`GET /reports/weekly`) — 마음 일곱 칸 ·
 * 요약 멘트 · 일정 · 행동 카드 · 일기 셈이 한 벌로 온다. 화면은 아무것도 세지
 * 않으므로, 여기서 심는 것은 **서버가 준 한 주** 하나다.
 *
 * ⚠ 한 주는 **일~토**다(2026-08-24 · 서버와 같은 기준). 고정 하루
 * (`SampleClock` · 2026-07-27 월)가 든 주는 **7월 26일(일)에 시작한다.**
 */
const THIS_WEEK = "2026-07-26";

const weeklyReport = (over: Partial<WeeklyReport> = {}): WeeklyReport => ({
  startDate: THIS_WEEK,
  endDate: "2026-08-01",
  days: [
    { date: "2026-07-26", emotion: 4, emotions: [4] }, // 일 · 피곤함 (v2 재번호)
    // 월은 감정이 둘이다 — 점은 대표(평온함) 색만 맡고, 뿌듯함은 눌러야 보인다
    { date: "2026-07-27", emotion: 3, emotions: [3, 2] }, // 월 · 평온함 · 뿌듯함
    { date: "2026-07-28", emotion: 3, emotions: [3] },
    { date: "2026-07-29", emotion: null, emotions: [] }, // 수 · 기록 없음
    { date: "2026-07-30", emotion: 3, emotions: [3] },
    { date: "2026-07-31", emotion: null, emotions: [] }, // 금 · 기록 없음
    { date: "2026-08-01", emotion: 1, emotions: [1] }, // 토 · 행복함
  ],
  dominantEmotion: 3,
  moodMessage:
    "이번 주에는 평온한 마음을 가장 많이 느꼈어요. " +
    "나를 편안하게 해준 환경이나 행동을 다음 주에도 이어가 보세요.",
  scheduleTotal: 12,
  scheduleCompleted: 9,
  actionCardCreated: 5,
  actionCardCompleted: 3,
  // 바람은 많이 나온 순으로 온다 — 휴식만 두 카드에 나왔다
  needs: [
    { word: "휴식", count: 2 },
    { word: "연결", count: 1 },
    { word: "인정", count: 1 },
  ],
  // 실천 목록은 최신순이고 길이가 곧 actionCardCompleted 다
  practicedWishes: [
    { action: "30분 산책하기", needs: ["휴식"] },
    { action: "먼저 안부 묻기", needs: ["연결"] },
    { action: null, needs: ["인정"] },
  ],
  diaryCount: 5,
  ...over,
});

jest.mock("@/features/report/data/weeklyReportApi", () => ({
  fetchWeeklyReport: jest.fn(),
}));

const reportApi = jest.requireMock("@/features/report/data/weeklyReportApi") as {
  fetchWeeklyReport: jest.Mock;
};

/**
 * `M1` 「캘린더 연동」 줄이 보는 기기 권한 — 기본은 **허용**이다. 연결을 보는 테스트만
 * 각자 거부로 바꾼다(알림 권한과 같은 판단: 기본이 거부면 관계없는 테스트가 깨진다).
 */
jest.mock("@/lib/calendar", () => ({
  ...jest.requireActual("@/lib/calendar"),
  getCalendarAccess: jest.fn(() => Promise.resolve({ granted: true, canAskAgain: false })),
  requestCalendarAccess: jest.fn(() => Promise.resolve({ granted: true, canAskAgain: false })),
  openCalendarSettings: jest.fn(() => Promise.resolve()),
}));
jest.mock("@/features/calendar/model/foregroundSync", () => ({
  syncDeviceCalendar: jest.fn(() => Promise.resolve(null)),
}));
jest.mock("@/features/onboarding/data/completeOnboardingApi", () => ({
  ...jest.requireActual("@/features/onboarding/data/completeOnboardingApi"),
  completeOnboarding: jest.fn(() =>
    Promise.resolve({ ok: true, data: { onboardingRequired: false } }),
  ),
}));
jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  track: jest.fn(),
}));

// 앱 안 브라우저도 네이티브다 — 「지원」 세 줄이 무엇을 여는지만 본다
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(() => Promise.resolve()) }));
const browser = jest.requireMock("expo-web-browser") as { openBrowserAsync: jest.Mock };

/** `M2` 시트가 보는 OS 권한. 기본은 허용이고, 각 테스트가 거부로 바꾼다 */
const notifications = jest.requireMock("expo-notifications") as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
};

beforeEach(() => {
  seedDiaries();
  useWeeklyReport.getState().reset();
  useSettings.getState().reset();
  seedProfile();
  // 탈퇴 상태가 테스트 사이로 새지 않게 — 한 곳만 이 store 를 건드린다
  useAuth.setState({ withdrawing: false, withdrawError: null });
  jest.clearAllMocks();
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  notifications.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
  // 캘린더 권한도 기본은 허용이다 — 거부로 바꾼 테스트의 값이 다음 테스트로 새지 않게 되돌린다
  jest.mocked(getCalendarAccess).mockResolvedValue({ granted: true, canAskAgain: false });
  jest.mocked(requestCalendarAccess).mockResolvedValue({ granted: true, canAskAgain: false });
  // 기본은 「이번 주가 그대로 왔다」 — 실패·빈 주를 보는 테스트만 이 목을 갈아끼운다
  reportApi.fetchWeeklyReport.mockResolvedValue({ ok: true, data: weeklyReport() });
});

/** 마운트 직후에는 아직 조회 중이다 — 값이 그려지길 기다렸다가 본다 */
const openReport = async () => {
  const r = await render(<Report />);
  // 첫 조회의 응답이 **act 안에서** 닿게 한다 — 밖에서 닿으면 React 가 경고한다
  await act(async () => {});
  // ⚠ 카드 제목이 없다(2026-09-12) — 화면이 준비됐는지는 **셈 카드의 섹션 라벨**로 확인한다
  // (서버 멘트는 주마다 달라서 기준이 못 된다)
  expect(r.getByText("이번 주 기록")).toBeTruthy();
  return r;
};

/** 날짜 줄을 눌러 주 고르는 목록을 연다 */
const openPicker = async (r: Awaited<ReturnType<typeof render>>) => {
  await act(async () => {
    fireEvent.press(r.getByLabelText(/주 고르기$/));
  });
};

/**
 * 주를 옮긴다 — 목록을 열고 그 주의 줄을 고른다. 고르는 즉시 서버를 부르므로
 * 그 왕복이 **act 안에서** 끝나게 감싼다(밖에서 상태가 바뀌면 React 가 경고한다).
 * 응답이 아직 없으면 그대로 「받는 중」이다.
 */
const pickWeek = async (r: Awaited<ReturnType<typeof render>>, name: string) => {
  await openPicker(r);
  await act(async () => {
    fireEvent.press(r.getByText(name));
  });
};

/** 응답 도착 시점을 테스트가 쥔다 — 「받는 동안」과 순서 뒤바뀜을 보려면 필요하다 */
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe("W1 · 주간 리포트 — 평가가 아니라 관찰이다", () => {
  it("보고 있는 주를 서버에 그 주의 월요일로 묻는다", async () => {
    await openReport();

    expect(reportApi.fetchWeeklyReport).toHaveBeenCalledWith(THIS_WEEK);
    expect(reportApi.fetchWeeklyReport).toHaveBeenCalledTimes(1);
  });

  it("마음 일곱 칸을 두고 기록 없는 날은 빈 칸으로 남긴다", async () => {
    const r = await openReport();

    for (const d of ["일", "월", "화", "수", "목", "금", "토"]) {
      expect(r.getByLabelText(new RegExp(`^${d}요일`))).toBeTruthy();
    }
    // 색만으로 판단하게 하지 않는다 — 칸마다 낭독기가 읽을 감정 이름이 붙는다
    expect(r.getByLabelText("일요일 피곤함")).toBeTruthy();
    expect(r.getByLabelText("수요일 기록 없음")).toBeTruthy();
    expect(r.getByLabelText("금요일 기록 없음")).toBeTruthy();
  });

  it("일기는 썼는데 감정이 없는 날은 「기록 있음」이다 — 서버 칸은 안 쓴 날과 똑같이 비어 온다", async () => {
    // 서버는 수요일을 `emotion: null` 로 주지만 로컬에는 그날 일기가 있다(감정 추출 실패)
    const [sample] = useDiary.getState().diaries;
    useDiary.setState({
      diaries: [
        ...useDiary.getState().diaries,
        { ...sample!, id: "no-emotion", date: "2026-07-29", emotions: [] },
      ],
    });
    const r = await openReport();

    expect(r.getByLabelText("금요일 기록 없음")).toBeTruthy();
    await act(async () => {
      await fireEvent.press(r.getByLabelText("수요일 기록 있음"));
    });
    expect(within(r.getByTestId("week-emotion-head")).getByText("기록 있음")).toBeTruthy();
  });

  it("칸을 누르면 그날 감정을 글자로 드러낸다 — 색만으로 안 보이던 하루를 확인한다", async () => {
    const r = await openReport();

    // 누르기 전엔 그날 감정이 글자로 떠 있지 않다
    expect(r.queryByText("일요일 ·")).toBeNull();

    await act(async () => {
      await fireEvent.press(r.getByLabelText("일요일 피곤함"));
    });
    expect(r.getByText("일요일 ·")).toBeTruthy();
    expect(r.getByText("피곤함")).toBeTruthy();
    // ⚠ 드러난 글자는 **감정들 카드 제목 줄 안**에 선다 — 더미 아래에 새 줄을 세우면 땅과
    // 요일 글자가 밀려 내려갔다(2026-09-11). 자리가 아래로 돌아가면 이 검사가 깨진다
    expect(within(r.getByTestId("week-emotion-head")).getByText("일요일 ·")).toBeTruthy();

    // 하루에 감정이 여럿이면 **전부** 선다 — 더미에 쌓인 조약돌 전부가 그 하루다
    await act(async () => {
      await fireEvent.press(r.getByLabelText("월요일 평온함, 뿌듯함"));
    });
    expect(r.getByText("월요일 ·")).toBeTruthy();
    expect(r.getByText("평온함")).toBeTruthy();
    expect(r.getByText("뿌듯함")).toBeTruthy();

    // 기록 없는 날은 솔직히 「기록 없음」으로 말한다
    await act(async () => {
      await fireEvent.press(r.getByLabelText("수요일 기록 없음"));
    });
    expect(r.getByText("수요일 ·")).toBeTruthy();
    expect(r.getByText("기록 없음")).toBeTruthy();

    // 같은 칸을 다시 누르면 접힌다
    await act(async () => {
      await fireEvent.press(r.getByLabelText("수요일 기록 없음"));
    });
    expect(r.queryByText("수요일 · 기록 없음")).toBeNull();
  });

  it("요약 멘트를 두 줄로 가르되 문장을 고치지 않는다", async () => {
    const r = await openReport();

    // 서버가 준 한 덩이를 첫 마침표에서 자를 뿐이다 — 없는 문장을 짓지 않는다
    expect(r.getByText("이번 주에는 평온한 마음을 가장 많이 느꼈어요.")).toBeTruthy();
    expect(
      r.getByText("나를 편안하게 해준 환경이나 행동을 다음 주에도 이어가 보세요."),
    ).toBeTruthy();
  });

  it("한 문장뿐인 주는 그대로 한 줄이다", async () => {
    reportApi.fetchWeeklyReport.mockResolvedValue({
      ok: true,
      data: weeklyReport({
        dominantEmotion: null,
        moodMessage: "여러 마음이 번갈아 찾아온 한 주였어요.",
      }),
    });
    const r = await openReport();

    expect(r.getByText("여러 마음이 번갈아 찾아온 한 주였어요.")).toBeTruthy();
  });

  it("일정은 「몇 개 중 몇 개」로 적는다", async () => {
    const r = await openReport();

    expect(r.getByText("이번 주 기록")).toBeTruthy();

    const schedule = within(r.getByText("일정").parent!.parent!);
    expect(schedule.getByText("12개 중")).toBeTruthy();
    expect(schedule.getByText("9개 완료")).toBeTruthy();
  });

  it("바람카드를 셈 카드에서 또 세지 않는다 — 제 카드가 무엇을 실천했는지까지 말한다", async () => {
    const r = await openReport();

    // 같은 것을 두 번 세면 어느 쪽이 정본인지 흐려진다(`WeekCountList` 머리말).
    // 「5개 중 3개 실천」이 서던 줄이다 — 일정의 「12개 중」은 그대로 있다
    expect(r.queryByText("5개 중")).toBeNull();
    expect(r.queryByText("3개 실천")).toBeNull();
  });

  it("바람카드는 찾은 바람을 알약으로 세우고 여러 번 나온 것에만 ×N 을 붙인다", async () => {
    const r = await openReport();

    expect(r.getByText("이번 주에 찾은 바람들")).toBeTruthy();
    expect(r.getByText("휴식")).toBeTruthy();
    expect(r.getByText("×2")).toBeTruthy();
    // 한 번만 나온 바람에는 붙지 않는다 — 「×1」은 아무것도 말하지 않는다
    expect(r.getByText("연결")).toBeTruthy();
    expect(r.queryByText("×1")).toBeNull();
    // 낭독기는 「곱하기 2」가 아니라 「2번」으로 읽는다
    expect(r.getByLabelText("휴식, 2번")).toBeTruthy();
  });

  it("실천한 것은 무엇을 했는지까지 적는다 — 안 한 카드는 세우지 않는다", async () => {
    const r = await openReport();

    expect(r.getByText("이번 주에는 3개의 바람을 실천했어요.")).toBeTruthy();
    // 한 줄이 「실천 내용 — 바람」 한 덩이라 부분으로 찾는다(글자 안에 글자를 중첩한다)
    expect(r.getByText(/30분 산책하기 — 휴식/)).toBeTruthy();
    expect(r.getByText(/먼저 안부 묻기 — 연결/)).toBeTruthy();
    // 작은 행동을 안 정하고 해본 카드도 줄을 지킨다 — 일기 상세와 같은 말이다
    expect(r.getByText(/아직 정하지 않음 — 인정/)).toBeTruthy();
    // 실천율·못 한 개수를 적지 않는다
    expect(r.queryByText(/실천율|%|남은/)).toBeNull();
  });

  it("바람카드가 없는 주는 「아직 없어요」 한 줄이다 — 0 을 붙이지 않는다", async () => {
    reportApi.fetchWeeklyReport.mockResolvedValue({
      ok: true,
      data: weeklyReport({
        actionCardCreated: 0,
        actionCardCompleted: 0,
        needs: [],
        practicedWishes: [],
      }),
    });
    const r = await openReport();

    expect(r.getByText("이번 주에 찾은 바람이 아직 없어요")).toBeTruthy();
    expect(r.queryByText(/0개의 바람/)).toBeNull();
  });

  it("찾기만 하고 실천하지 않은 주는 알약만 서고 실천 줄이 비었다고 말한다", async () => {
    reportApi.fetchWeeklyReport.mockResolvedValue({
      ok: true,
      data: weeklyReport({ actionCardCompleted: 0, practicedWishes: [] }),
    });
    const r = await openReport();

    expect(r.getByText("휴식")).toBeTruthy();
    expect(r.getByText("이번 주에는 아직 실천한 바람이 없어요.")).toBeTruthy();
  });

  it("제목은 감정 카드에만 둔다 — 나머지는 첫 줄이 곧 제 이름이다", async () => {
    const r = await openReport();

    // 2026-09-12 · 사용자 결정. 요약 문장은 카드에서도 꺼내 날짜 줄 아래 그냥 놓인다
    expect(r.queryByText("이번 주 한눈에")).toBeNull();
    expect(r.queryByText("이번 주의 마음")).toBeNull();
    expect(r.queryByText("바람카드")).toBeNull();
    // 조약돌과 요일뿐인 카드라 무엇을 보는 판인지 말해 줄 글자가 여기뿐이다
    expect(r.getByText("이번 주 감정들")).toBeTruthy();
    expect(r.getByText("이번 주 기록")).toBeTruthy();
  });

  it("일기는 남긴 날 수로 적는다 — 분모가 될 「전체」가 없다", async () => {
    const r = await openReport();

    expect(r.getByText("5일 기록")).toBeTruthy();
  });

  it("셀 것이 없는 줄에 0 을 붙이지 않는다", async () => {
    // 「0개 중 0개 완료」는 없던 일을 못 한 일로 만든다
    reportApi.fetchWeeklyReport.mockResolvedValue({
      ok: true,
      data: weeklyReport({
        scheduleTotal: 0,
        scheduleCompleted: 0,
        actionCardCreated: 0,
        actionCardCompleted: 0,
        diaryCount: 0,
      }),
    });
    const r = await openReport();

    expect(r.getAllByText("없음")).toHaveLength(2);
    expect(r.queryByText(/0개/)).toBeNull();
  });

  it("비율을 만들지 않는다 — 도넛·%·완료율을 쓰지 않는다", async () => {
    // `DESIGN.md` 「리포트」 — 「도넛·비율·범례 없이」 · 「완료율·%·분석 표현 금지」.
    // 「12개 중 9개」는 비율이 아니라 그 주에 있었던 일의 크기다
    const r = await openReport();

    expect(r.queryByText(/%/)).toBeNull();
    expect(r.queryByLabelText(/비율/)).toBeNull();
    expect(r.queryByText(/완료율|실행률|달성률|분석|평균/)).toBeNull();
  });

  it("점수·등급·배지·연속을 쓰지 않는다", async () => {
    const r = await openReport();

    expect(r.queryByText(/점수|등급|배지|연속|최고 기록|\d+점/)).toBeNull();
  });

  it("날짜를 누르면 주 목록이 열린다 — 화살표로 옮기지 않는다", async () => {
    const r = await openReport();

    // 옛 `‹ ›` 는 걷었다 (2026-08-24 · 사용자 요청)
    expect(r.queryByLabelText("이전 주")).toBeNull();
    expect(r.queryByLabelText("다음 주")).toBeNull();

    await openPicker(r);

    // **제목 줄은 두지 않는다**(2026-08-24) — 늘어선 「N주차」가 그 자체로 자리를 말한다
    expect(r.getByTestId("ds-bottom-sheet")).toBeTruthy();
    expect(r.queryByText("주 고르기")).toBeNull();
  });

  it("일기가 있는 주만 「몇 년 몇 월 몇 주차」로 세운다 — 최근 주가 위다", async () => {
    // 재료(7월 1·4·8·13·15·17·20·21·22·24·26·27일)가 다섯 주에 흩어져 있다
    const r = await openReport();
    await openPicker(r);

    expect(r.getByText("2026년 7월 4주차 · 이번 주")).toBeTruthy();
    expect(r.getByText("2026년 7월 3주차")).toBeTruthy();
    expect(r.getByText("2026년 7월 2주차")).toBeTruthy();
    expect(r.getByText("2026년 7월 1주차")).toBeTruthy();
    // 6월 28일(일)에 시작한 주 — 달을 걸쳐도 시작한 달로 센다
    expect(r.getByText("2026년 6월 4주차")).toBeTruthy();
    expect(r.getAllByText(/주차/)).toHaveLength(5);
  });

  it("몇 주차인지만으로는 어느 날인지 모른다 — 날짜와 일기 수를 함께 적는다", async () => {
    const r = await openReport();
    await openPicker(r);

    // 7/19(일) 주에는 20·21·22·24 네 편, 7/12 주에는 13·15·17 세 편이 있다
    expect(r.getByText("7월 19일 ~ 7월 25일 · 일기 4일")).toBeTruthy();
    expect(r.getByText("7월 12일 ~ 7월 18일 · 일기 3일")).toBeTruthy();
  });

  it("이번 주는 일기가 없어도 목록에 남는다", async () => {
    // 없으면 지난 주를 보다가 이번 주로 돌아올 길이 목록에서 사라진다
    useDiary.setState({
      diaries: useDiary.getState().diaries.filter((d) => d.date < "2026-07-26"),
    });
    const r = await openReport();
    await openPicker(r);

    expect(r.getByText("2026년 7월 4주차 · 이번 주")).toBeTruthy();
    // 머리와 목록 줄, 두 자리에 같은 범위가 선다
    expect(r.getAllByText("7월 26일 ~ 8월 1일")).toHaveLength(2);
    // 일기가 없으니 뒤에 「· 일기 N일」을 붙이지 않는다
    expect(r.queryByText(/7월 26일 ~ 8월 1일 · 일기/)).toBeNull();
  });

  it("목록에서 한 주를 고르면 그 주를 다시 받고 목록이 닫힌다", async () => {
    const r = await openReport();

    await pickWeek(r, "2026년 7월 3주차");

    await waitFor(() => expect(reportApi.fetchWeeklyReport).toHaveBeenCalledWith("2026-07-19"));
    // 날짜 머리도 함께 옮겨간다 — 옛 주 날짜 아래 새 수치를 두지 않는다
    await waitFor(() => expect(r.getByText("7월 19일 ~ 7월 25일")).toBeTruthy());
    expect(r.queryByTestId("ds-bottom-sheet")).toBeNull();
  });

  it("주가 쌓여도 시트는 화면 절반을 넘지 않는다", async () => {
    // 시트가 화면을 거의 다 덮으면 뒤에 있던 리포트가 안 보여서
    // 「지금 어느 주를 보고 있었나」를 잃는다. 넘치는 만큼은 목록 안에서 구른다
    const r = await openReport();
    await openPicker(r);

    const { height } = Dimensions.get("window");
    const style = Object.assign(
      {},
      ...[r.getByTestId("week-picker-list").props.style].flat(Infinity).filter(Boolean),
    ) as { maxHeight: number };

    // 손잡이·제목·안내 한 줄이 함께 절반 안에 들어가므로 목록은 그보다 낮다
    expect(style.maxHeight).toBeLessThan(height / 2);
    expect(style.maxHeight).toBeGreaterThan(0);
  });

  it("아직 오지 않은 주는 목록에 아예 없다 — 셀 것이 없다", async () => {
    const r = await openReport();
    await openPicker(r);

    expect(r.queryByText("2026년 8월 1주차")).toBeNull();
  });

  it("실패는 한 줄로 흡수한다 — 모달도 재시도 버튼도 없다", async () => {
    reportApi.fetchWeeklyReport.mockResolvedValue({ ok: false, code: "network" });
    const r = await render(<Report />);

    await waitFor(() =>
      expect(r.getByText("리포트를 불러오지 못했어요 · 잠시 뒤에 다시 열어 주세요")).toBeTruthy(),
    );
    expect(r.queryByText(/다시 시도|재시도/)).toBeNull();
  });

  it("보조 행동으로 그 주의 기록을 보러 간다 — 보고 있던 주를 들려 보낸다", async () => {
    // 날짜를 안 주면 보관함이 오늘이 든 달로 열려, 지난 주를 보다 누른 사람은
    // 자기가 보던 주를 다시 찾아가야 한다
    const r = await openReport();

    fireEvent.press(r.getByText("이번 주 기록 보기"));

    expect(router.replace).toHaveBeenCalledWith({
      pathname: "/archive",
      params: { date: THIS_WEEK },
    });
  });

  it("기록이 없어도 처음부터 열려 있다 — 문턱을 두지 않는다", async () => {
    // 「일기 7편부터 열린다」(`RULES.md`)를 없앴다 (2026-08-24 · 사용자 결정).
    // 빈 주는 잠긴 화면이 아니라 **비어 있는 한 주**로 보인다 — 하루하루 쌓이면 채워진다
    useDiary.setState({ diaries: [] });
    reportApi.fetchWeeklyReport.mockResolvedValue({
      ok: true,
      data: weeklyReport({
        days: weeklyReport().days.map((d) => ({ ...d, emotion: null, emotions: [] })),
        dominantEmotion: null,
        moodMessage: "아직 이번 주에 기록된 마음이 없어요.",
        scheduleTotal: 0,
        scheduleCompleted: 0,
        actionCardCreated: 0,
        actionCardCompleted: 0,
        diaryCount: 0,
      }),
    });

    const r = await openReport();

    expect(r.getByText("아직 이번 주에 기록된 마음이 없어요.")).toBeTruthy();
    expect(r.getAllByText("없음")).toHaveLength(2);
    expect(r.getByLabelText("월요일 기록 없음")).toBeTruthy();
    // 잠금 화면의 흔적이 남지 않는다
    expect(r.queryByText(/7편|잠김|잠겨|열리지 않/)).toBeNull();
  });
});

describe("M1 · 마이 기본", () => {
  it("프로필은 닉네임 · 기록 일수 한 줄이다 — 이니셜 동그라미가 없다", async () => {
    // 「총 회고 12회」는 내부 용어였다 — 새 디자인은 「일기 12일 기록」이다
    const r = await render(<My />);

    expect(r.getByText("지현")).toBeTruthy();
    expect(r.getByText("일기 12일 기록")).toBeTruthy();
    expect(r.queryByText(/회고 \d+회/)).toBeNull();
    // 이니셜 아바타 원(2026-08-23 제거) — 첫 글자만 따로 뜨던 동그라미가 없다
    expect(r.queryByText("지")).toBeNull();
  });

  it("연속 일수·점수·배지를 쓰지 않는다", async () => {
    const r = await render(<My />);

    expect(r.queryByText(/일째|연속|점수|배지/)).toBeNull();
  });

  it("설정을 세 무리로 묶는다 — 앱 설정 · 지원 · 계정", async () => {
    const r = await render(<My />);

    for (const label of ["앱 설정", "지원", "계정"]) {
      expect(r.getByText(label)).toBeTruthy();
    }
  });

  it("앱 잠금·내보내기 줄을 두지 않는다 — 갈 곳 없는 줄을 만들지 않는다", async () => {
    const r = await render(<My />);

    expect(r.queryByText(/앱 잠금|나만의 공간|내보내기/)).toBeNull();
  });

  it("눌러도 아무 일도 없는 줄을 두지 않는다", async () => {
    // 갈 곳이 없는 줄은 표식(›)도 두지 않고 눌리지도 않는다 (M3.md 와 같은 이유)
    const r = await render(<My />);
    // 줄의 **역할**로 찾는다 — 껍데기 구조가 바뀌어도 규칙은 그대로다
    const pressable = (label: string) =>
      r.queryAllByRole("button").some((b) => within(b).queryByText(label) != null);

    // 지원 세 줄은 2026-08-21 에 랜딩 페이지로 이어졌다 — 더 이상 「준비 중」이 아니다
    for (const label of [
      "알림 설정",
      "기본 정보 수정",
      "로그아웃",
      "문의하기",
      "이용약관",
      "개인정보 처리방침",
    ]) {
      expect(pressable(label)).toBe(true);
    }
  });

  it("문의하기는 앱 안 문의 화면으로 간다 — 웹 폼을 열지 않는다", async () => {
    const r = await render(<My />);

    await fireEvent.press(r.getByText("문의하기"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/my/inquiry");
    expect(browser.openBrowserAsync).not.toHaveBeenCalled();
  });

  it("약관 두 줄이 각자의 웹 문서를 앱 안에서 연다", async () => {
    // **주소를 화면이 알지 않는다** — 무엇을 여는지만 여기서 고정하고,
    // 주소가 바뀌면 고칠 곳은 `src/lib/links.ts` 하나다
    const r = await render(<My />);

    for (const [label, path] of [
      ["이용약관", "/terms"],
      ["개인정보 처리방침", "/privacy"],
    ] as const) {
      browser.openBrowserAsync.mockClear();
      await fireEvent.press(r.getByText(label));

      await waitFor(() => expect(browser.openBrowserAsync).toHaveBeenCalledTimes(1));
      expect(browser.openBrowserAsync.mock.calls[0]![0]).toContain(path);
    }
  });

  it("약관을 앱 안에 복사해 두지 않는다 — 웹에서 갱신되는 문서다", async () => {
    const r = await render(<My />);

    expect(r.queryByText(/제 ?\d+ ?조|수집하는 개인정보|시행일/)).toBeNull();
  });

  it("온보딩에서 답한 것은 [기본 정보 수정] 한 줄 뒤에 모여 있다", async () => {
    const r = await render(<My />);

    await fireEvent.press(r.getByText("기본 정보 수정"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/my/profile");
  });

  it("회원 탈퇴는 확인 문구를 따라 써야 실행된다 — 틀리면 버튼이 안 켜진다", async () => {
    // 되돌릴 수 없는 동작이라 문구(`회원탈퇴`)를 정확히 따라 써야 실행된다
    const withdraw = jest.fn(async () => true);
    useAuth.setState({ withdraw, withdrawing: false, withdrawError: null });
    const r = await render(<My />);

    const leave = r.getByText("회원 탈퇴");
    expect(leave.parent?.props.accessibilityRole).toBe("button");

    // 누르면 확인 시트가 열리고 따라 쓸 문구를 안내한다
    await fireEvent.press(leave);
    expect(r.getByText(/회원탈퇴 를 입력해 주세요/)).toBeTruthy();
    const input = r.getByPlaceholderText("회원탈퇴");

    // 문구가 틀리면 탈퇴 버튼이 안 켜져 실행되지 않는다
    await fireEvent.changeText(input, "회원탈퇴합니다");
    await fireEvent.press(r.getByText("탈퇴하기"));
    expect(withdraw).not.toHaveBeenCalled();

    // 정확히 따라 쓰면 실행된다
    await fireEvent.changeText(input, "회원탈퇴");
    await fireEvent.press(r.getByText("탈퇴하기"));
    expect(withdraw).toHaveBeenCalledTimes(1);
  });

  it("탈퇴에 실패하면 시트가 아니라 한 줄로 알린다", async () => {
    // 오류는 한 줄로 흡수한다 — 시트·재시도 버튼을 띄우지 않는다 (RULES.md 4)
    useAuth.setState({
      withdraw: jest.fn(async () => false),
      withdrawing: false,
      withdrawError: "지금은 탈퇴할 수 없어요. 잠시 뒤 다시 시도해 주세요.",
    });
    const r = await render(<My />);

    expect(r.getByText("지금은 탈퇴할 수 없어요. 잠시 뒤 다시 시도해 주세요.")).toBeTruthy();
    // 실패 안내는 시트가 아니다 — 시트는 닫혀 있다
    expect(r.queryByPlaceholderText("회원탈퇴")).toBeNull();
  });

  it("알림 설정 줄이 지금 시각을 말하고, 끄면 「꺼짐」이 된다", async () => {
    const r = await render(<My />);
    expect(r.getByText("매일 밤 9:30")).toBeTruthy();

    await act(async () => {
      useSettings.getState().toggle("retro");
    });

    expect(await r.findByText("꺼짐")).toBeTruthy();
  });
});

describe("M1 · 캘린더 연동 — 온보딩에서 미룬 사람이 다시 잇는 길", () => {
  const access = jest.mocked(getCalendarAccess);
  const request = jest.mocked(requestCalendarAccess);
  const denied = { granted: false, canAskAgain: false };

  it("연결된 사람에게는 「연결됨」만 말하고 눌리지 않는다 — 해제는 두지 않는다", async () => {
    const r = await render(<My />);
    await act(async () => {});

    expect(r.getByText("연결됨")).toBeTruthy();
    const pressable = r
      .queryAllByRole("button")
      .some((b) => within(b).queryByText("캘린더 연동") != null);
    expect(pressable).toBe(false);
  });

  it("기기 설정에서 권한을 끄면 서버 값이 켜져 있어도 「연결 안 함」이다", async () => {
    access.mockResolvedValue(denied);
    const r = await render(<My />);

    expect(await r.findByText("연결 안 함")).toBeTruthy();
  });

  it("연결하지 않은 사람은 줄을 눌러 온보딩과 같은 약속을 보고 잇는다", async () => {
    useProfile.getState().set({ calendarLinked: false });
    access.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    const r = await render(<My />);
    await act(async () => {});

    await fireEvent.press(r.getByText("캘린더 연동"));
    expect(r.getByText(CALENDAR_NOTICE.title)).toBeTruthy();
    expect(r.getByText(CALENDAR_NOTICE.body)).toBeTruthy();

    await fireEvent.press(r.getByText("캘린더 연결하기"));
    // 권한 → 서버 저장 → 권한 다시 보기까지 비동기 세 단계를 다 흘려보낸다
    await act(async () => {});

    expect(r.getByText("연결됨")).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
    expect(syncDeviceCalendar).toHaveBeenCalledTimes(1);
    // 서버는 통째로 덮어쓴다 — 다른 답은 지금 값 그대로, 캘린더만 켜서 보낸다
    expect(completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ calendarLinked: true, nickname: "지현" }),
    );
    expect(track).toHaveBeenCalledWith("calendar_link_chosen", { source: "my", choice: "link" });
  });

  it("다시 물을 수 없는 기기는 약속 대신 기기 설정으로 안내한다", async () => {
    useProfile.getState().set({ calendarLinked: false });
    access.mockResolvedValue(denied);
    const r = await render(<My />);
    await act(async () => {});

    await fireEvent.press(r.getByText("캘린더 연동"));
    expect(r.getByText(/기기 설정에서 모멘토리의 캘린더 접근을 허용해 주세요/)).toBeTruthy();
    expect(r.queryByText("캘린더 연결하기")).toBeNull();

    await fireEvent.press(r.getByText("설정 열기"));

    expect(openCalendarSettings).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
    expect(track).toHaveBeenCalledWith("calendar_link_chosen", {
      source: "my",
      choice: "settings",
    });
  });

  it("권한은 받았는데 서버에 남기지 못하면 한 줄로 알린다 — 모달도 재시도 버튼도 없다", async () => {
    useProfile.getState().set({ calendarLinked: false });
    // 아직 허용 전이다 — 허용된 채로 들어오면 화면이 먼저 서버 값을 맞춘다(아래 테스트)
    access.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    jest.mocked(completeOnboarding).mockResolvedValueOnce({ ok: false, code: "server" });
    const r = await render(<My />);
    await act(async () => {});

    await fireEvent.press(r.getByText("캘린더 연동"));
    await fireEvent.press(r.getByText("캘린더 연결하기"));
    await act(async () => {});

    expect(r.getByText(ONBOARDING_FAILURE_MESSAGES.server)).toBeTruthy();
    expect(useProfile.getState().calendarLinked).toBe(false);
  });

  it("기기에서 허용돼 있는데 서버 값만 꺼져 있으면 들어오자마자 맞춘다 — 다시 누르게 하지 않는다", async () => {
    // iOS 는 설정에서 권한을 바꾸면 앱을 종료시킨다. 설정에서 켜고 돌아온 사람은
    // 다시 열린 앱으로 들어온다 — 그때 이미 허용이고 서버 값만 꺼져 있다(2026-09-28 실기기)
    useProfile.getState().set({ calendarLinked: false });
    const r = await render(<My />);
    await act(async () => {});

    expect(r.getByText("연결됨")).toBeTruthy();
    expect(completeOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ calendarLinked: true }),
    );
    // 권한 창도 새 동기화도 없다 — 이미 허용이고 동기화는 이미 돌고 있다
    expect(request).not.toHaveBeenCalled();
    expect(syncDeviceCalendar).not.toHaveBeenCalled();
  });

  it("기기 권한이 없으면 서버 값을 건드리지 않는다", async () => {
    useProfile.getState().set({ calendarLinked: false });
    access.mockResolvedValue(denied);
    const r = await render(<My />);
    await act(async () => {});

    expect(r.getByText("연결 안 함")).toBeTruthy();
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it("시트를 그냥 닫으면 미룬 것으로 남긴다", async () => {
    useProfile.getState().set({ calendarLinked: false });
    access.mockResolvedValueOnce({ granted: false, canAskAgain: true });
    const r = await render(<My />);
    await act(async () => {});

    await fireEvent.press(r.getByText("캘린더 연동"));
    await fireEvent.press(r.getByLabelText("닫기"));

    expect(r.queryByText("캘린더 연결하기")).toBeNull();
    expect(track).toHaveBeenCalledWith("calendar_link_chosen", { source: "my", choice: "later" });
  });
});

describe("M2 · 알림 설정 시트 — 하나의 결정만 담는다", () => {
  /** 시트 제목과 줄 이름이 같은 말이다 — 줄은 목록에 먼저 있다 */
  const row = (r: Awaited<ReturnType<typeof render>>) => r.getAllByText("알림 설정")[0]!;

  it("홈 알림함의 설정 버튼에서 오면 기존 시간 시트를 곧장 연다", async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ openNotificationSettings: "1" });
    const r = await render(<My />);
    await waitFor(() => expect(r.getByText("알림 시간")).toBeTruthy());
    expect(router.setParams).toHaveBeenCalledWith({ openNotificationSettings: "" });
  });

  it("줄을 누르면 시각을 고르는 시트가 열린다", async () => {
    const r = await render(<My />);

    await fireEvent.press(row(r));

    expect(r.getByText("알림 시간")).toBeTruthy();
    expect(r.getByText("완료")).toBeTruthy();
    // 시트에 설정 요소를 늘리지 않는다 (design.md §11)
    expect(r.queryByText(/낮 기록|주간 돌아보기|새로운 소식/)).toBeNull();
  });

  it("[완료] 를 눌러야 시각이 정해진다", async () => {
    // 휠을 굴린 것만으로 설정이 바뀌면 시트를 열어 본 것과 고른 것이 같아진다
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("10시"));
    expect(useSettings.getState().notify.retro.time).toBe("21:30");

    await fireEvent.press(r.getByText("완료"));

    await waitFor(() => expect(useSettings.getState().notify.retro.time).toBe("22:30"));
    expect(r.queryByText("알림 시간")).toBeNull();
  });

  it("딤을 누르면 고르던 값이 버려진다", async () => {
    const r = await render(<My />);
    await fireEvent.press(row(r));
    await fireEvent.press(r.getByText("10시"));

    await fireEvent.press(r.getByLabelText("닫기"));

    expect(useSettings.getState().notify.retro.time).toBe("21:30");
  });

  it("꺼져 있었다면 [완료] 가 OS 권한을 묻고, 받아야 켠다", async () => {
    // 켜진 채 아무 알림도 오지 않으면 사용자는 확인할 방법이 없다
    useSettings.getState().toggle("retro"); // 꺼 둔 상태에서 시작
    // 아직 한 번도 묻지 않은 기기 — `완료` 가 곧 그 물음이다
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    notifications.requestPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("완료"));

    await waitFor(() => expect(notifications.requestPermissionsAsync).toHaveBeenCalled());
    expect(useSettings.getState().notify.retro.enabled).toBe(false);
    // 다시 물을 수 없을 때만 한 줄로 길을 알려준다 — 모달도 재시도 버튼도 없다
    expect(await r.findByText("기기 설정에서 알림을 켜면 이 시간에 찾아갈게요.")).toBeTruthy();
    expect(r.queryByText(/다시 시도|허용하기/)).toBeNull();
  });

  it("켜져 있으면 묻지 않는다 — 시각만 바꾼다", async () => {
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("완료"));

    await waitFor(() => expect(r.queryByText("알림 시간")).toBeNull());
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("[알림 받지 않기] 로 끌 수 있고, 껐어도 시각은 남는다", async () => {
    // 껐다고 값을 지우면 다시 켜는 일이 다시 설정하는 일이 된다 (M3.md)
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("알림 받지 않기"));

    await waitFor(() =>
      expect(useSettings.getState().notify.retro).toMatchObject({
        enabled: false,
        time: "21:30",
      }),
    );
  });

  it("고른 시각 · 끄기를 서버에 남긴다 — 다시 켜도 서버 값이 되돌리지 않는다", async () => {
    // 기기에만 두면 다음 실행의 `syncMe` 가 온보딩 때 값으로 덮어 「껐는데 또 온다」가 된다
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("알림 받지 않기"));

    await waitFor(() =>
      expect(completeOnboarding).toHaveBeenCalledWith(
        expect.objectContaining({ notifyRetro: false, retroTime: "21:30", nickname: "지현" }),
      ),
    );
  });

  it("서버에 남기지 못하면 설정을 바꾸지 않고 한 줄로 알린다", async () => {
    jest.mocked(completeOnboarding).mockResolvedValueOnce({ ok: false, code: "network" });
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("알림 받지 않기"));

    expect(await r.findByText(ONBOARDING_FAILURE_MESSAGES.network)).toBeTruthy();
    expect(useSettings.getState().notify.retro.enabled).toBe(true);
  });

  it("바뀐 것이 없으면 서버에 보내지 않는다", async () => {
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("완료"));

    await waitFor(() => expect(r.queryByText("알림 시간")).toBeNull());
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it("꺼져 있을 때는 끄는 줄을 두지 않는다", async () => {
    useSettings.getState().toggle("retro");
    const r = await render(<My />);

    await fireEvent.press(row(r));

    expect(r.queryByText("알림 받지 않기")).toBeNull();
  });
});

describe("W1 · 주 고르기 — 고른 주마다 서버에 다시 묻는다", () => {
  /** 이전 주(7/19~25)가 답할 값 — 이번 주와 **다른 수치**여야 뒤바뀜이 보인다 */
  const lastWeek = {
    ok: true,
    data: weeklyReport({
      startDate: "2026-07-19",
      endDate: "2026-07-25",
      scheduleTotal: 4,
      scheduleCompleted: 1,
    }),
  };

  it("지난 주를 고르면 날짜와 수치가 함께 그 주 것이 된다", async () => {
    const r = await openReport();
    expect(r.getByText("12개 중")).toBeTruthy();

    reportApi.fetchWeeklyReport.mockResolvedValue(lastWeek);
    await pickWeek(r, "2026년 7월 3주차");

    await waitFor(() => expect(reportApi.fetchWeeklyReport).toHaveBeenCalledWith("2026-07-19"));
    await waitFor(() => expect(r.getByText("4개 중")).toBeTruthy());
    expect(r.getByText("7월 19일 ~ 7월 25일")).toBeTruthy();
    expect(r.queryByText("12개 중")).toBeNull();
  });

  it("새 주를 받는 동안 옛 주의 수치를 남겨 두지 않는다", async () => {
    // 새 날짜 아래 지난 주 수치가 한 프레임이라도 보이면 그 화면은 거짓말을 한 것이다
    const r = await openReport();
    const gate = deferred<typeof lastWeek>();
    reportApi.fetchWeeklyReport.mockReturnValueOnce(gate.promise);

    await pickWeek(r, "2026년 7월 3주차");

    await waitFor(() => expect(r.getByText("7월 19일 ~ 7월 25일")).toBeTruthy());
    expect(r.queryByText("12개 중")).toBeNull();
    expect(r.getByText("한 주를 모으고 있어요")).toBeTruthy();

    gate.resolve(lastWeek);
    await waitFor(() => expect(r.getByText("4개 중")).toBeTruthy());
  });

  it("지난 주를 볼 때는 「이번 주」라고 쓰지 않는다", async () => {
    const r = await openReport();
    expect(r.getByText("이번 주 감정들")).toBeTruthy();
    expect(r.getByText("이번 주에 찾은 바람들")).toBeTruthy();
    expect(r.getByText("이번 주 기록")).toBeTruthy();
    expect(r.getByText("이번 주 기록 보기")).toBeTruthy();

    reportApi.fetchWeeklyReport.mockResolvedValue(lastWeek);
    await pickWeek(r, "2026년 7월 3주차");
    await waitFor(() => expect(r.getByText("4개 중")).toBeTruthy());

    // 「7월 19일 ~ 7월 25일」 위에 「이번 주」가 서면 대놓고 틀린 말이 된다
    expect(r.getByText("이 주 감정들")).toBeTruthy();
    expect(r.getByText("이 주에 찾은 바람들")).toBeTruthy();
    expect(r.getByText("이 주에는 3개의 바람을 실천했어요.")).toBeTruthy();
    expect(r.getByText("이 주 기록")).toBeTruthy();
    expect(r.getByText("이 주의 기록 보기")).toBeTruthy();
    expect(r.queryByText("이번 주 감정들")).toBeNull();
    expect(r.queryByText("이번 주에 찾은 바람들")).toBeNull();
    expect(r.queryByText("이번 주 기록")).toBeNull();
    expect(r.queryByText("이번 주 기록 보기")).toBeNull();

    // ⚠ **서버 멘트만은 지난 주에도 「이번 주에는 …」이다**(BE `WeeklyMood` 의 고정 문장).
    // 우리가 쓰지 않은 문장이라 여기서 고치지 않는다 — BE 가 닫아야 할 자리라 못을 박아 둔다
    expect(r.getByText(/^이번 주에는/)).toBeTruthy();
  });

  it("다시 이번 주를 고르면 이번 주다", async () => {
    const r = await openReport();

    reportApi.fetchWeeklyReport.mockResolvedValue(lastWeek);
    await pickWeek(r, "2026년 7월 3주차");
    await waitFor(() => expect(r.getByText("4개 중")).toBeTruthy());

    reportApi.fetchWeeklyReport.mockResolvedValue({ ok: true, data: weeklyReport() });
    await pickWeek(r, "2026년 7월 4주차 · 이번 주");

    await waitFor(() => expect(r.getByText("7월 26일 ~ 8월 1일")).toBeTruthy());
    await waitFor(() => expect(r.getByText("12개 중")).toBeTruthy());
  });

  it("늦게 도착한 옛 주의 응답이 지금 보는 주를 덮지 않는다", async () => {
    const slow = deferred<{ ok: true; data: WeeklyReport }>();
    reportApi.fetchWeeklyReport.mockReturnValueOnce(slow.promise).mockResolvedValue(lastWeek);

    const r = await render(<Report />);
    await pickWeek(r, "2026년 7월 3주차");
    await waitFor(() => expect(r.getByText("4개 중")).toBeTruthy());

    // 이번 주 조회가 이제야 돌아온다 — 화면은 그 주를 보고 있지 않다
    slow.resolve({ ok: true, data: weeklyReport() });
    await act(async () => {
      await Promise.resolve();
    });

    expect(r.getByText("4개 중")).toBeTruthy();
    expect(r.queryByText("12개 중")).toBeNull();
  });
});

describe("하단 탭 — 네 칸이 전부 이어진다", () => {
  it("리포트에서 다른 탭으로 옮겨갈 수 있다", async () => {
    const r = await render(<Report />);
    const tabs = r.getAllByRole("tab");
    const my = tabs.find((t) => within(t).queryByText("마이") != null);

    await fireEvent.press(my!);

    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/my");
  });
});
