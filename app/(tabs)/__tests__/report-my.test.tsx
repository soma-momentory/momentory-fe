import { render, act, fireEvent, waitFor, within } from "@testing-library/react-native";
// jest.mock 팩토리는 `mock` 으로 시작하는 이름만 밖에서 끌어 쓸 수 있다(호이스팅 가드)
import { useEffect as mockUseEffect } from "react";

import { router, useLocalSearchParams } from "expo-router";

import My from "../my";
import Report from "../report";

import { track } from "@/features/analytics";
import { useAuth } from "@/features/auth/model/auth";
import { CALENDAR_NOTICE } from "@/features/calendar/model/notice";
import { syncDeviceCalendar } from "@/features/calendar/model/foregroundSync";
import { useProfile, useSettings } from "@/features/my/model/settings";
import { completeOnboarding } from "@/features/onboarding/data/completeOnboardingApi";
import { ONBOARDING_FAILURE_MESSAGES } from "@/features/onboarding/model/submit";
import { getCalendarAccess, openCalendarSettings, requestCalendarAccess } from "@/lib/calendar";
import { seedDiaries, seedProfile } from "@/testing/fixtures";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
  Stack: jest.fn(() => null),
  useLocalSearchParams: jest.fn(() => ({})),
  // 리포트는 **포커스마다** 다시 받는다 — 테스트에는 화면이 하나뿐이라 마운트가 곧 포커스다
  useFocusEffect: (effect: () => void | (() => void)) => mockUseEffect(effect, [effect]),
}));

/**
 * `M1` 「캘린더 연동」 줄이 보는 기기 권한 — 기본은 **허용**이다. 연결을 보는 테스트만
 * 각자 거부로 바꾼다(알림 권한과 같은 판단: 기본이 거부면 관계없는 테스트가 깨진다).
 */
jest.mock("@/features/report/data/weeklyBookApi", () => ({
  ...jest.requireActual("@/features/report/data/weeklyBookApi"),
  fetchWeeklyBook: jest.fn(() => Promise.resolve({ ok: false, code: "network" })),
}));
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
});

describe("M1 · 마이 기본", () => {
  it("프로필은 닉네임 · 기록 일수 한 줄이다 — 이니셜 동그라미가 없다", async () => {
    // 「총 회고 12회」는 내부 용어였다 — 지금은 「일기 쓴 날 12일」 한 줄이다
    const r = await render(<My />);

    expect(r.getByText("지현")).toBeTruthy();
    expect(r.getByText("12일")).toBeTruthy();
    // 같은 말을 되풀이하던 「일기 12일 기록」 줄은 뺐다(2026-11-10)
    expect(r.queryByText("일기 12일 기록")).toBeNull();
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

  it("프로필을 아직 못 받았으면 맞추지 않는다 — 빈 프로필로 서버를 덮어쓰지 않는다", async () => {
    useProfile.getState().set({ calendarLinked: false, nickname: "" });
    await render(<My />);
    await act(async () => {});

    expect(completeOnboarding).not.toHaveBeenCalled();
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

  it("홈에서 알림 설정으로 오면 기존 시간 시트를 곧장 연다", async () => {
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

  it.each([
    ["딤", 0],
    ["✕", 1],
  ])("%s 을 누르면 고르던 값이 버려진다", async (_, which) => {
    const r = await render(<My />);
    await fireEvent.press(row(r));
    await fireEvent.press(r.getByText("10시"));

    // 딤과 ✕ 가 같은 「닫기」다 — 닫는 길은 늘어도 닫기는 하나다(`BottomSheet`)
    await fireEvent.press(r.getAllByLabelText("닫기")[which]!);

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

describe("하단 탭 — 네 칸이 전부 이어진다", () => {
  it("리포트에서 다른 탭으로 옮겨갈 수 있다", async () => {
    const r = await render(<Report />);
    const tabs = r.getAllByRole("tab");
    const my = tabs.find((t) => within(t).queryByText("마이") != null);

    await fireEvent.press(my!);

    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/my");
  });
});
