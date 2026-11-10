import { track } from "@/features/analytics";
import { chooseLetterAction, type Letter } from "@/features/letter/data/letterApi";
import { actionReminderKey, remindAtOf, type WhenChoice } from "@/features/letter/model/letter";
import { LETTER_ACTION_CONTENT } from "@/features/my/model/reminders";
import { clock } from "@/lib/clock";
import {
  cancelOneOff,
  getNotificationPermission,
  requestNotificationPermission,
  scheduleOneOff,
} from "@/lib/notifications";

/**
 * 작은 일 고르기 · 바꾸기 · 풀기(PRD 4-3)와 그 알림 한 번(4-4).
 *
 * 알림은 **고른 순간에** 예약하고 바꾸거나 풀면 지운다. 식별자에 편지 id 를 넣어 편지마다 하나다.
 * 화해(`reminders.ts`)에 넣지 않는 까닭은 앱을 다시 켜면 다시 계산할 재료(고른 일 · 시각)가 기기에
 * 없기 때문이다. 고른 시각은 오늘 안이라 하루가 지나기 전에 울리고 사라진다.
 *
 * 시각 있는 칩을 고르면 그때 알림 권한을 묻는다. 받지 못하면 「언제」만 남기고 알림 시각은 보내지 않는다
 * — 서버에 시각이 있는데 알림이 안 오면 사용자는 확인할 길이 없다.
 */
export async function pickLetterAction(
  letter: Letter,
  position: number | null,
  when: WhenChoice | null,
): Promise<Letter | null> {
  let remindAt: string | null = null;
  if (position != null && when?.time != null) {
    const { granted } = await requestNotificationPermission();
    if (granted) remindAt = remindAtOf(when, clock.today())?.toISOString() ?? null;
  }

  const result = await chooseLetterAction(letter.id, {
    position,
    whenLabel: position == null ? null : (when?.label ?? null),
    scheduleId: position == null ? null : (when?.scheduleId ?? null),
    remindAt,
  });
  if (!result.ok) return null;

  await syncActionReminder(result.data);
  return result.data;
}

const keyOf = (letter: Pick<Letter, "id">) => actionReminderKey(letter.id);

async function syncActionReminder(letter: Letter): Promise<void> {
  const chosen = letter.actions.find((a) => a.chosen);
  const at = chosen?.remindAt != null ? new Date(chosen.remindAt) : null;
  if (chosen == null || at == null || !(at.getTime() > clock.now().getTime())) {
    return cancelOneOff(keyOf(letter));
  }
  const { granted } = await getNotificationPermission();
  if (!granted) return cancelOneOff(keyOf(letter));

  await scheduleOneOff({
    key: keyOf(letter),
    kind: "letter_action",
    at,
    data: { date: letter.date },
    ...LETTER_ACTION_CONTENT,
  });
  track("letter_notification_scheduled", { kind: "action" });
}
