import { useAuth } from "@/features/auth/model/auth";
import type { Diary } from "@/features/diary/model/diary";
import { useDiary } from "@/features/diary/model/diary";
import { useLetters } from "@/features/letter/model/letter";
import {
  plannedReminders,
  RETRO_DAYS_AHEAD,
  startReminderSync,
  syncReminders,
} from "@/features/my/model/reminders";
import { useSettings } from "@/features/my/model/settings";
import { fixedClock, SampleClock, setClock } from "@/lib/clock";

/**
 * 설정과 실제 예약이 어긋나지 않는가 — **이 파일이 그 계약이다.**
 *
 * 어긋나도 화면에는 아무 표시가 없다. 스위치는 켜져 있는데 알림만 안 오는 상태를
 * 사용자가 알아차릴 방법이 없어서, 여기서 규칙을 못으로 박는다.
 *
 * 회고 알림은 2026-10-27 부터 하루씩 14일치다 — 안 본 편지가 있는 밤만 문구를 바꾸고, 일기를 이미
 * 쓴 밤은 건너뛴다(`reminders.ts` 머리말). 시계는 7/27 오전 10시로 고정한다.
 */
const native = jest.requireMock("expo-notifications") as {
  getPermissionsAsync: jest.Mock;
  getAllScheduledNotificationsAsync: jest.Mock;
  scheduleNotificationAsync: jest.Mock;
  cancelScheduledNotificationAsync: jest.Mock;
};

const scheduledKeys = () =>
  native.scheduleNotificationAsync.mock.calls.map(
    ([request]: [{ identifier: string }]) => request.identifier,
  );

const diaryOn = (date: string) => ({ id: `d-${date}`, date }) as Diary;
const keys = () => plannedReminders().map((r) => r.key);
const retroOn = (day: string) => plannedReminders().find((r) => r.key === `retro.${day}`);

beforeEach(() => {
  jest.clearAllMocks();
  setClock(fixedClock("2026-07-27T10:00:00"));
  native.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: true });
  useSettings.getState().reset();
  // 편지를 아는 서버다 — 모르면(`null`) 편지 알림 · 「안 본 편지」 문구가 없다
  useSettings.setState({ letterChosen: true });
  useDiary.setState({ diaries: [], actionCards: [], loaded: true });
  useLetters.setState({ userId: 7, summaries: [] });
  useAuth.setState({ status: "authenticated" });
});

afterEach(() => {
  useAuth.setState({ status: "hydrating" });
  setClock(SampleClock);
});

describe("무엇이 예약돼야 하는가 — 회고", () => {
  it("켜져 있으면 오늘부터 14일을 하루씩, 그 시각으로", () => {
    const retro = plannedReminders().filter((r) => r.kind === "retro");

    expect(retro).toHaveLength(RETRO_DAYS_AHEAD);
    expect(retro[0]).toMatchObject({ key: "retro.2026-07-27", title: "돌아보는 시간이에요" });
    expect("at" in retro[0]! && retro[0].at).toEqual(new Date(2026, 6, 27, 21, 30));
    expect(retro.at(-1)?.key).toBe("retro.2026-08-09");
  });

  it("새벽 시각은 그 하루의 다음 달력 날이다 — 04:00 경계", () => {
    useSettings.getState().setTime("retro", "00:30");

    const first = retroOn("2026-07-27");
    expect(first != null && "at" in first && first.at).toEqual(new Date(2026, 6, 28, 0, 30));
  });

  it("그날 일기를 이미 썼으면 그 밤은 건너뛴다", () => {
    useDiary.setState({ diaries: [diaryOn("2026-07-27")] });

    expect(keys()).not.toContain("retro.2026-07-27");
    expect(keys()).toContain("retro.2026-07-28");
  });

  it("오늘 일기를 쓰면 내일 밤은 「안 본 편지」 문구다 — 한 번뿐이다", () => {
    useDiary.setState({ diaries: [diaryOn("2026-07-27")] });

    expect(retroOn("2026-07-28")?.title).toBe("안 본 바바의 편지가 있어요");
    expect(retroOn("2026-07-29")?.title).toBe("돌아보는 시간이에요");
  });

  it("어제 편지를 안 열었으면 오늘 밤이 그 문구고, 열면 평소 문구로 돌아간다", () => {
    useDiary.setState({ diaries: [diaryOn("2026-07-26")] });
    useLetters.setState({
      summaries: [{ id: "5", date: "2026-07-26", isNew: true, openedAt: null }],
    });
    expect(retroOn("2026-07-27")?.title).toBe("안 본 바바의 편지가 있어요");

    useLetters.getState().markOpened({ id: "5", date: "2026-07-26", openedAt: null });
    expect(retroOn("2026-07-27")?.title).toBe("돌아보는 시간이에요");
  });

  it("편지를 모르는 서버면 「안 본 편지」 문구를 쓰지 않는다", () => {
    useSettings.setState({ letterChosen: null });
    useDiary.setState({ diaries: [diaryOn("2026-07-27")] });

    expect(retroOn("2026-07-28")?.title).toBe("돌아보는 시간이에요");
  });

  it("편지 목록을 모르면 평소 문구로 둔다 — 연 편지를 「안 봤다」고 부르지 않는다", () => {
    useDiary.setState({ diaries: [diaryOn("2026-07-26")] });
    useLetters.setState({ summaries: null });

    expect(retroOn("2026-07-27")?.title).toBe("돌아보는 시간이에요");
  });

  it("끄면 목록에서 빠진다 — 시각은 남아 있어도", () => {
    useSettings.getState().toggle("retro");

    expect(plannedReminders().filter((r) => r.kind === "retro")).toEqual([]);
    // 껐다는 이유로 값을 지우지 않는다 (M3.md)
    expect(useSettings.getState().notify.retro.time).toBe("21:30");
  });
});

describe("무엇이 예약돼야 하는가 — 나머지", () => {
  it("주간 알림 · 「새로운 소식」은 예약하지 않는다", () => {
    useSettings.setState((s) => ({
      notify: {
        ...s.notify,
        weekly: { enabled: true, time: "21:00" },
        news: { enabled: true, time: null },
      },
    }));

    expect(plannedReminders().map((r) => r.kind)).not.toContain("weekly");
    expect(keys()).not.toContain("news");
  });

  it("오늘 일기가 있으면 내일 아침 편지 시각에 한 번", () => {
    useSettings.setState({ letterChosen: true });
    useDiary.setState({ diaries: [diaryOn("2026-07-27")] });

    const morning = plannedReminders().find((r) => r.kind === "letter");
    expect(morning).toMatchObject({
      key: "letter.morning",
      title: "바바의 편지가 와 있어요",
      data: { date: "2026-07-27" },
    });
    expect(morning != null && "at" in morning && morning.at).toEqual(new Date(2026, 6, 28, 8, 30));
  });

  it("편지 목록을 아직 모르면 아침 편지는 보낸다 — 못 받으면 그날 아침이 비어 버린다", () => {
    setClock(fixedClock("2026-07-27T06:00:00"));
    useDiary.setState({ diaries: [diaryOn("2026-07-26")] });
    useLetters.setState({ summaries: null });

    expect(keys()).toContain("letter.morning");
  });

  it("아침 편지는 끄거나 · 편지를 모르는 서버거나 · 이미 열었으면 없다", () => {
    useDiary.setState({ diaries: [diaryOn("2026-07-26")] });
    useLetters.setState({
      summaries: [{ id: "5", date: "2026-07-26", isNew: true, openedAt: "2026-07-27T00:00:00Z" }],
    });
    useSettings.setState({ letterChosen: true });
    expect(keys()).not.toContain("letter.morning");

    useDiary.setState({ diaries: [diaryOn("2026-07-27")] });
    useSettings.setState({ letterChosen: null });
    expect(keys()).not.toContain("letter.morning");

    useSettings.setState({ letterChosen: true });
    useSettings.getState().toggle("letter");
    expect(keys()).not.toContain("letter.morning");
  });

  it("로그인하지 않았으면 아무것도 예약하지 않는다", () => {
    // 로그아웃은 설정을 샘플 기본값으로 되돌린다 — 회고 알림이 다시 켜진 상태다.
    // 인증을 보지 않으면 로그아웃한 기기가 밤마다 「돌아볼까요」 하고 부른다.
    useAuth.setState({ status: "anonymous" });

    expect(plannedReminders()).toEqual([]);
  });
});

describe("화해 — OS 예약을 설정과 같게 만든다", () => {
  it("권한이 있으면 하루씩 · 한 번짜리로 예약한다", async () => {
    await syncReminders();

    expect(scheduledKeys()).toHaveLength(RETRO_DAYS_AHEAD);
    expect(native.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "momentory.reminder.retro.2026-07-27",
        trigger: expect.objectContaining({ type: "date" }),
      }),
    );
  });

  it("OS 에 남은 하루씩 예약 · 옛 매일 예약도 지운다 — 고른 작은 일 예약은 건드리지 않는다", async () => {
    native.getAllScheduledNotificationsAsync.mockResolvedValueOnce([
      { identifier: "momentory.reminder.retro.2026-07-20" },
      { identifier: "momentory.once.letter-action.5" },
    ]);

    await syncReminders();

    const cancelled = native.cancelScheduledNotificationAsync.mock.calls.map(([id]) => id);
    expect(cancelled).toEqual(
      expect.arrayContaining(["momentory.reminder.retro", "momentory.reminder.retro.2026-07-20"]),
    );
    expect(cancelled).not.toContain("momentory.once.letter-action.5");
  });

  it("권한이 없으면 아무것도 예약하지 않고 남은 것을 지운다", async () => {
    native.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: false });

    await syncReminders();

    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(native.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(3);
  });

  it("앱이 막 켜져 세션을 읽는 중이면 아무것도 지우지 않는다 — 고른 작은 일 알림을 지키려고", async () => {
    useAuth.setState({ status: "hydrating" });
    native.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: "momentory.once.letter-action.5" },
    ]);

    await syncReminders();

    expect(native.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
    native.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });

  it("일기를 아직 못 받았으면 지금 예약을 그대로 둔다", async () => {
    useDiary.setState({ loaded: false });

    await syncReminders();

    expect(native.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("로그아웃 상태면 권한을 묻지 않고 지운다 — 고른 작은 일 예약까지", async () => {
    useAuth.setState({ status: "anonymous" });
    native.getAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: "momentory.once.letter-action.5" },
    ]);

    await syncReminders();

    expect(native.getPermissionsAsync).not.toHaveBeenCalled();
    expect(native.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      "momentory.once.letter-action.5",
    );
    native.getAllScheduledNotificationsAsync.mockResolvedValue([]);
  });
});

describe("구독 — 설정이 바뀌면 스스로 맞춘다", () => {
  it("스위치를 끄면 화면이 부르지 않아도 예약이 사라진다", async () => {
    const stop = startReminderSync();
    await syncReminders(); // 시작 시 화해가 끝나기를 기다린다
    jest.clearAllMocks();

    useSettings.getState().toggle("retro");
    // 구독이 이미 한 번 돌았다 — 이 기다림은 그것이 끝나기를 기다리는 것이다
    await syncReminders();

    expect(scheduledKeys()).toEqual([]);
    stop();
  });

  it("일기를 저장하면 그 밤의 회고 알림이 빠진다", async () => {
    const stop = startReminderSync();
    await syncReminders();
    jest.clearAllMocks();

    useDiary.setState({ diaries: [diaryOn("2026-07-27")] });
    await syncReminders();

    expect(scheduledKeys()).not.toContain("momentory.reminder.retro.2026-07-27");
    expect(scheduledKeys()).toContain("momentory.reminder.retro.2026-07-28");
    stop();
  });

  it("로그아웃하면 예약이 사라진다", async () => {
    const stop = startReminderSync();
    await syncReminders();
    jest.clearAllMocks();

    useAuth.setState({ status: "anonymous" });
    await syncReminders();

    expect(native.scheduleNotificationAsync).not.toHaveBeenCalled();
    stop();
  });

  it("풀면 더 이상 따라가지 않는다", async () => {
    const stop = startReminderSync();
    await syncReminders();
    stop();
    jest.clearAllMocks();

    useSettings.getState().toggle("retro");
    await Promise.resolve();

    expect(native.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});
