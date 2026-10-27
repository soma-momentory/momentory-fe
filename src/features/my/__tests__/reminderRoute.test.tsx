import { act, render } from "@testing-library/react-native";
import { router } from "expo-router";

import { track } from "@/features/analytics";
import { useAuth } from "@/features/auth/model/auth";
import { useDiary } from "@/features/diary/model/diary";
import { ReminderRoute } from "@/features/my/ui/ReminderRoute";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";
import { clock } from "@/lib/clock";
import { onReminderOpened, type ReminderKind } from "@/lib/notifications";
import { testDiaryData } from "@/testing/fixtures";

/**
 * 알림을 누르면 그 알림이 부른 화면으로 간다 — 다만 **스플래시가 판정을 마친 뒤에.**
 * 그전에 옮기면 스플래시의 `replace` 가 덮어써서 결국 홈이 열린다.
 */
let mockPathname = "/";
jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  usePathname: () => mockPathname,
}));
jest.mock("@/lib/notifications", () => ({
  ...jest.requireActual("@/lib/notifications"),
  onReminderOpened: jest.fn(() => () => {}),
}));
jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  track: jest.fn(),
}));

/** 사용자가 알림을 눌렀다 — 구독이 받은 손잡이를 부른다 */
const tap = (key: ReminderKind, data: Record<string, string> = {}) =>
  act(async () => {
    jest.mocked(onReminderOpened).mock.calls[0]![0](key, data);
  });

const todayDiary = () => ({ ...testDiaryData().diaries[0]!, id: "d-today", date: clock.today() });

beforeEach(() => {
  jest.clearAllMocks();
  mockPathname = "/home";
  useAuth.setState({ status: "authenticated" });
  useOnboardingCompletion.setState({ completed: true });
  useDiary.setState({ diaries: [], actionCards: [], loaded: true });
});

afterEach(() => {
  useAuth.setState({ status: "hydrating" });
});

it("오늘 일기가 없으면 회고 알림은 회고로 간다 — 열람도 센다", async () => {
  await render(<ReminderRoute />);

  await tap("retro");

  expect(router.push).toHaveBeenCalledWith("/retro/confirm");
  expect(track).toHaveBeenCalledWith("reminder_opened", { reminder: "retro" });
});

it("오늘 일기가 있으면 그 일기로 간다", async () => {
  useDiary.setState({ diaries: [todayDiary()] });
  await render(<ReminderRoute />);

  await tap("retro");

  expect(router.push).toHaveBeenCalledWith("/diary/d-today");
});

it.each(["letter", "letter_action"] as const)(
  "편지 알림(%s)은 편지함 목록을 거치지 않고 그 날짜 편지로 바로 간다",
  async (kind) => {
    await render(<ReminderRoute />);

    await tap(kind, { date: "2026-10-26" });

    expect(router.push).toHaveBeenCalledWith("/letter/2026-10-26?source=notification");
    expect(router.push).not.toHaveBeenCalledWith("/letter");
  },
);

it("스플래시가 판정을 마칠 때까지 기다렸다가 한 번 옮긴다", async () => {
  // 꺼져 있다가 알림으로 켜졌다 — 아직 스플래시(`/`)다
  mockPathname = "/";
  const r = await render(<ReminderRoute />);

  await tap("retro");
  expect(router.push).not.toHaveBeenCalled();

  // 스플래시가 홈으로 보냈다
  mockPathname = "/home";
  await act(async () => r.rerender(<ReminderRoute />));
  await act(async () => r.rerender(<ReminderRoute />));

  expect(router.push).toHaveBeenCalledTimes(1);
  expect(router.push).toHaveBeenCalledWith("/retro/confirm");
});

it("로그인 · 온보딩 전에는 옮기지 않는다 — 가드가 보낸 화면을 덮지 않는다", async () => {
  useOnboardingCompletion.setState({ completed: false });
  mockPathname = "/welcome";
  await render(<ReminderRoute />);

  await tap("retro");

  expect(router.push).not.toHaveBeenCalled();
});

it("낮 기록 알림은 홈에 둔다", async () => {
  await render(<ReminderRoute />);

  await tap("daily");

  expect(router.push).not.toHaveBeenCalled();
});
