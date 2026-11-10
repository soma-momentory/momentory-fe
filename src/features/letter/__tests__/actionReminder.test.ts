import { chooseLetterAction, type Letter } from "@/features/letter/data/letterApi";
import { pickLetterAction } from "@/features/letter/model/actionReminder";
import { clock } from "@/lib/clock";
import { scheduleOneOff } from "@/lib/notifications";

/**
 * 고른 작은 일 알림은 **제목을 싣지 않는다** — 1번 칸 제목은 AI 가 일기 사건을 넣어 다시 쓴 문장일 수 있어,
 * 잠금 화면에 일기 이야기가 보이게 된다(AI 안전성 설계 P0-5).
 */
jest.mock("@/features/letter/data/letterApi", () => ({ chooseLetterAction: jest.fn() }));
jest.mock("@/lib/notifications", () => ({
  cancelOneOff: jest.fn(),
  getNotificationPermission: jest.fn(async () => ({ granted: true })),
  requestNotificationPermission: jest.fn(async () => ({ granted: true })),
  scheduleOneOff: jest.fn(),
}));
jest.mock("@/features/analytics", () => ({ track: jest.fn() }));

const TAILORED = "엄마와 언성이 높아진 일의 사실 · 내 해석 · 다른 해석을 한 줄씩 적기";

test("고른 작은 일 알림 본문에 고른 제목이 들어가지 않는다", async () => {
  const remindAt = new Date(clock.now().getTime() + 60 * 60 * 1000).toISOString();
  const letter: Letter = {
    id: "7",
    date: clock.today(),
    status: "READY",
    quote: null,
    insight: "관점",
    tonightQuestion: null,
    actions: [
      {
        position: 0,
        title: TAILORED,
        source: "CATALOG",
        chosen: true,
        whenLabel: "저녁",
        scheduleId: null,
        remindAt,
      },
    ],
    helplines: [],
    isNew: true,
    openedAt: null,
  };
  jest.mocked(chooseLetterAction).mockResolvedValue({ ok: true, data: letter });

  await pickLetterAction(letter, 0, null);

  expect(scheduleOneOff).toHaveBeenCalledTimes(1);
  const [scheduled] = jest.mocked(scheduleOneOff).mock.calls[0] ?? [];
  expect(scheduled?.kind).toBe("letter_action");
  expect(JSON.stringify(scheduled)).not.toContain(TAILORED);
  expect(scheduled?.body).toBe("오늘 해 보기로 한 일이 있어요.");
});
