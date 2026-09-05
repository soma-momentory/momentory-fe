import { render, act, fireEvent, waitFor, within } from "@testing-library/react-native";
import { Dimensions } from "react-native";
import { router } from "expo-router";

import My from "../my";
import Report from "../report";

import { useAuth } from "@/features/auth/model/auth";
import { useDiary } from "@/features/diary/model/diary";
import { useSettings } from "@/features/my/model/settings";
import type { WeeklyReport } from "@/features/report/data/weeklyReportApi";
import { useWeeklyReport } from "@/features/report/model/weeklyReport";
import { seedDiaries, seedProfile } from "@/testing/fixtures";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
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
  diaryCount: 5,
  ...over,
});

jest.mock("@/features/report/data/weeklyReportApi", () => ({
  fetchWeeklyReport: jest.fn(),
}));

const reportApi = jest.requireMock("@/features/report/data/weeklyReportApi") as {
  fetchWeeklyReport: jest.Mock;
};

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
  notifications.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
  // 기본은 「이번 주가 그대로 왔다」 — 실패·빈 주를 보는 테스트만 이 목을 갈아끼운다
  reportApi.fetchWeeklyReport.mockResolvedValue({ ok: true, data: weeklyReport() });
});

/** 마운트 직후에는 아직 조회 중이다 — 값이 그려지길 기다렸다가 본다 */
const openReport = async () => {
  const r = await render(<Report />);
  // 첫 조회의 응답이 **act 안에서** 닿게 한다 — 밖에서 닿으면 React 가 경고한다
  await act(async () => {});
  expect(r.getByText("이번 주의 마음")).toBeTruthy();
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

  it("칸을 누르면 그날 감정을 글자로 드러낸다 — 색만으로 안 보이던 하루를 확인한다", async () => {
    const r = await openReport();

    // 누르기 전엔 그날 감정이 글자로 떠 있지 않다
    expect(r.queryByText("일요일 ·")).toBeNull();

    await act(async () => {
      await fireEvent.press(r.getByLabelText("일요일 피곤함"));
    });
    expect(r.getByText("일요일 ·")).toBeTruthy();
    expect(r.getByText("피곤함")).toBeTruthy();

    // 하루에 감정이 여럿이면 **전부** 선다 — 점 하나는 대표 감정 색만 맡는다
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

  it("일정·바람카드는 「몇 개 중 몇 개」로 적는다", async () => {
    const r = await openReport();

    expect(r.getByText("이번 주 한눈에")).toBeTruthy();

    const schedule = within(r.getByText("일정").parent!.parent!);
    expect(schedule.getByText("12개 중")).toBeTruthy();
    expect(schedule.getByText("9개 완료")).toBeTruthy();

    const cards = within(r.getByText("바람카드").parent!.parent!);
    expect(cards.getByText("5개 중")).toBeTruthy();
    expect(cards.getByText("3개 실천")).toBeTruthy();
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

    expect(r.getAllByText("없음")).toHaveLength(3);
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
    expect(r.getAllByText("없음")).toHaveLength(3);
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

  it("지원 세 줄이 각자의 웹 문서를 앱 안에서 연다", async () => {
    // **주소를 화면이 알지 않는다** — 무엇을 여는지만 여기서 고정하고,
    // 주소가 바뀌면 고칠 곳은 `src/lib/links.ts` 하나다
    const r = await render(<My />);

    for (const [label, path] of [
      ["문의하기", "notion.site"],
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

describe("M2 · 알림 설정 시트 — 하나의 결정만 담는다", () => {
  /** 시트 제목과 줄 이름이 같은 말이다 — 줄은 목록에 먼저 있다 */
  const row = (r: Awaited<ReturnType<typeof render>>) => r.getAllByText("알림 설정")[0]!;

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

    expect(useSettings.getState().notify.retro).toMatchObject({
      enabled: false,
      time: "21:30",
    });
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
    expect(r.getByText("이번 주 한눈에")).toBeTruthy();
    expect(r.getByText("이번 주 기록 보기")).toBeTruthy();

    reportApi.fetchWeeklyReport.mockResolvedValue(lastWeek);
    await pickWeek(r, "2026년 7월 3주차");
    await waitFor(() => expect(r.getByText("4개 중")).toBeTruthy());

    // 「7월 19일 ~ 7월 25일」 위에 「이번 주」가 서면 대놓고 틀린 말이 된다
    expect(r.getByText("이 주의 마음")).toBeTruthy();
    expect(r.getByText("이 주 한눈에")).toBeTruthy();
    expect(r.getByText("이 주의 기록 보기")).toBeTruthy();
    expect(r.queryByText("이번 주의 마음")).toBeNull();
    expect(r.queryByText("이번 주 한눈에")).toBeNull();
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
