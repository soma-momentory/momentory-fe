import {
  AndroidImportance,
  DEFAULT_ACTION_IDENTIFIER,
  SchedulableTriggerInputTypes,
  addNotificationResponseReceivedListener,
  cancelScheduledNotificationAsync,
  clearLastNotificationResponseAsync,
  getLastNotificationResponseAsync,
  getPermissionsAsync,
  requestPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
  setNotificationHandler,
  type NotificationResponse,
} from "expo-notifications";
import { Platform } from "react-native";

import { parseHHMM } from "@/lib/time";

/**
 * OS 알림 경계 — **`expo-notifications` 를 부르는 곳은 여기 하나다.**
 *
 * `kakaoSdk.ts` 와 같은 자리다: 네이티브의 말을 우리 말로 바꿔 주고, **던지지
 * 않는다.** 알림은 앱의 본체가 아니라 곁가지라, 여기서 난 오류가 화면을 멈추게
 * 하면 안 된다 — 실패하면 조용히 아무 알림도 예약되지 않을 뿐이다.
 *
 * **문안을 모른다.** 무엇이라고 말할지는 도메인(`features/my/model/reminders.ts`)이
 * 정하고, 이 파일은 「언제 · 어떤 식별자로」만 다룬다. 여기에 한국어를 두면
 * 문구를 고칠 때 OS 코드를 열게 된다.
 *
 * **서버 푸시가 아니다.** MVP 의 알림은 전부 기기가 스스로 띄우는 로컬 알림이다
 * (`ARCHITECTURE.md §1` — "서버 푸시 인프라 없이 시작"). 그래서 토큰도 등록도 없다.
 */

/** 시각이 있는 알림만 예약할 수 있다 — 「새로운 소식」은 서버 푸시라 여기 없다 */
export type ReminderKey = "retro" | "daily" | "weekly";

export const REMINDER_KEYS: readonly ReminderKey[] = ["retro", "daily", "weekly"];

/** 주간 알림의 요일. OS 는 1 을 일요일로 센다 */
export const SUNDAY = 1;

export type Reminder = {
  key: ReminderKey;
  /** `"HH:mm"` — 설정 store 가 드는 형태 그대로 받는다 */
  time: string;
  /** 있으면 그 요일에만(1 = 일요일), 없으면 매일 */
  weekday?: number;
  title: string;
  body: string;
};

export type NotificationPermission = {
  granted: boolean;
  /**
   * 한 번 거부한 뒤에는 앱이 다시 물을 수 없다 — **기기 설정에서만** 켤 수 있다.
   * `M3` 의 한 줄 안내가 이 값을 보고 나타난다(`M3.md`).
   */
  canAskAgain: boolean;
};

/** 판단이 안 서면 「꺼짐」이다 — 알림을 보낸다고 잘못 말하지 않는다 */
const DENIED: NotificationPermission = { granted: false, canAskAgain: false };

/**
 * Android 8+ 는 채널 없이 알림이 **아예 뜨지 않는다.** 사용자가 기기 설정에서
 * 보는 이름이라 한국어로 둔다. 종류별로 채널을 쪼개지 않는다 — 설정 화면이
 * 우리 화면(`M3`)이고, OS 쪽에 같은 스위치를 하나 더 만들 이유가 없다.
 */
const CHANNEL_ID = "reminder";
const CHANNEL_NAME = "기록 알림";

/**
 * 예약 식별자. **접두사로 우리 것을 가른다** — `cancelAllScheduledNotificationsAsync`
 * 는 다른 곳이 예약한 것까지 지우므로 쓰지 않는다.
 */
const identifierOf = (key: ReminderKey) => `momentory.reminder.${key}`;

/**
 * **개발 빌드에서만** 사유를 남긴다. 사용자에게는 아무것도 보이지 않는다 —
 * 알림이 안 왔다는 것 말고는 증상이 없어서, 이 줄이 없으면 채널 · 권한 ·
 * 잘못된 시각 중 무엇이었는지 알 방법이 없다.
 */
const warnInDev = (what: string, error?: unknown) => {
  if (__DEV__) console.warn("[notify]", what, error ?? "");
};

let configuring: Promise<void> | null = null;

/**
 * 핸들러와 채널을 한 번만 깐다. **예약보다 먼저 끝나야 한다** — 채널이 없는
 * 상태로 예약하면 Android 가 알림을 만들고도 띄우지 않는다.
 */
export function configureNotifications(): Promise<void> {
  configuring ??= configureOnce();
  return configuring;
}

async function configureOnce(): Promise<void> {
  try {
    setNotificationHandler({
      // 앱이 떠 있을 때 도착해도 배너로 보인다. 다만 **배지 숫자는 올리지 않는다** —
      // 「숫자로 압박하지 않는다」(`RULES.md` 불변 규칙)가 앱 아이콘에도 적용된다.
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === "android") {
      await setNotificationChannelAsync(CHANNEL_ID, {
        name: CHANNEL_NAME,
        importance: AndroidImportance.DEFAULT,
      });
    }
  } catch (error) {
    warnInDev("초기화 실패", error);
  }
}

/** 지금 권한이 어떤지 **묻기만** 한다 — 다이얼로그를 띄우지 않는다 */
export async function getNotificationPermission(): Promise<NotificationPermission> {
  try {
    const { granted, canAskAgain } = await getPermissionsAsync();
    return { granted, canAskAgain };
  } catch (error) {
    warnInDev("권한 조회 실패", error);
    return DENIED;
  }
}

/**
 * OS 권한 다이얼로그를 띄운다 — **화면을 따로 만들지 않는다**(`RULES.md`
 * 「OS 권한 `P*` 는 OS 가 그린다」). 부르는 곳은 둘뿐이다: `08` 저장 직후,
 * `M3` 에서 알림을 켤 때.
 *
 * **이미 거부된 뒤에는 부르지 않는다.** 그 상태로 요청하면 다이얼로그 없이
 * 조용히 거부로 돌아와, 사용자에게는 스위치가 그냥 안 켜지는 것으로만 보인다 —
 * 그래서 현재 상태를 먼저 보고 `canAskAgain` 을 그대로 돌려준다.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  try {
    const current = await getPermissionsAsync();
    if (current.granted || !current.canAskAgain) {
      return { granted: current.granted, canAskAgain: current.canAskAgain };
    }

    const next = await requestPermissionsAsync();
    return { granted: next.granted, canAskAgain: next.canAskAgain };
  } catch (error) {
    warnInDev("권한 요청 실패", error);
    return DENIED;
  }
}

/**
 * 예약을 **목록과 같은 상태로 만든다** — 목록에 없는 것은 취소한다.
 *
 * 부분 갱신(켠 것만 추가)이 아니라 전체 화해인 이유: 설정은 네 갈래인데
 * 예약은 OS 에 남는다. "켤 때 추가, 끌 때 삭제"로 두면 로그아웃 · 서버 동기화 ·
 * 앱 재설치처럼 **우리가 지나가지 않은 경로**에서 어긋난 예약이 살아남는다.
 * 화해 한 번이면 어떤 경로로 왔든 지금 설정과 같아진다.
 */
export async function applyReminders(reminders: readonly Reminder[]): Promise<void> {
  await configureNotifications();

  // **먼저 전부 지운다.** 같은 식별자로 다시 예약하는 것이 교체라는 보장이 없어,
  // 시각을 고칠 때마다 옛 예약이 하나씩 쌓일 수 있다.
  for (const key of REMINDER_KEYS) {
    try {
      await cancelScheduledNotificationAsync(identifierOf(key));
    } catch (error) {
      warnInDev(`취소 실패(${key})`, error);
    }
  }

  for (const reminder of reminders) {
    const { hour, minute } = parseHHMM(reminder.time);
    // 형태가 아닌 값으로 예약하면 네이티브가 던지거나 자정에 울린다 — 건너뛴다
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
      warnInDev(`시각을 읽지 못했다(${reminder.key}): ${reminder.time}`);
      continue;
    }

    try {
      await scheduleNotificationAsync({
        identifier: identifierOf(reminder.key),
        content: {
          title: reminder.title,
          body: reminder.body,
          // 우리가 예약한 것임을 표시해 둔다 — 알림을 눌러 들어오는 경로가 생길 때 쓴다
          data: { reminder: reminder.key },
        },
        trigger:
          reminder.weekday == null
            ? {
                type: SchedulableTriggerInputTypes.DAILY,
                channelId: CHANNEL_ID,
                hour,
                minute,
              }
            : {
                type: SchedulableTriggerInputTypes.WEEKLY,
                channelId: CHANNEL_ID,
                weekday: reminder.weekday,
                hour,
                minute,
              },
      });
    } catch (error) {
      warnInDev(`예약 실패(${reminder.key})`, error);
    }
  }
}

/**
 * 사용자가 **우리가 예약한 알림을 눌러** 앱을 열었다(2026-09-28).
 *
 * 앱이 떠 있을 때 누른 것은 리스너가, **꺼져 있다가 알림으로 켜진 것**은 마지막 응답이 받는다.
 * 마지막 응답은 OS 가 들고 있다가 다음 실행에도 돌려주므로, 받으면 **지운다** — 지우지 않으면
 * 알림과 상관없이 앱을 열 때마다 같은 열람이 다시 세진다. 켜지는 순간 둘이 같은 응답을 함께
 * 줄 수 있어서 알림 하나(식별자 + 도착 시각)는 한 번만 넘긴다.
 *
 * 우리가 예약한 알림만 본다 — 예약할 때 `data.reminder` 에 키를 실어 두었다. 던지지 않는다.
 */
export function onReminderOpened(handler: (key: ReminderKey) => void): () => void {
  const seen = new Set<string>();
  const handle = (response: NotificationResponse | null) => {
    if (response == null || response.actionIdentifier !== DEFAULT_ACTION_IDENTIFIER) return;
    const { request, date } = response.notification;
    const key = request.content.data?.reminder;
    if (typeof key !== "string" || !(REMINDER_KEYS as readonly string[]).includes(key)) return;
    const once = `${request.identifier}@${date}`;
    if (seen.has(once)) return;
    seen.add(once);
    void clearLastNotificationResponseAsync().catch(() => {});
    handler(key as ReminderKey);
  };

  void getLastNotificationResponseAsync()
    .then(handle)
    .catch((error: unknown) => warnInDev("마지막 알림 응답을 읽지 못했다", error));
  const subscription = addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
