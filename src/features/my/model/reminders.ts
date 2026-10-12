import { useAuth } from "@/features/auth/model/auth";
import { useSettings } from "@/features/my/model/settings";
import {
  applyReminders,
  getNotificationPermission,
  REMINDER_KEYS,
  type Reminder,
  type ReminderKey,
} from "@/lib/notifications";

/**
 * 알림 설정(`M3`)과 **실제 OS 예약을 맞춰 두는 곳**.
 *
 * 설정 store 는 순수하게 둔다 — 값만 들고 네이티브를 모른다. 대신 이 파일이
 * 그 store 를 구독해서 「지금 설정대로라면 무엇이 예약돼 있어야 하는가」를
 * 계산하고 `lib/notifications.ts` 에 넘긴다.
 *
 * **화면이 예약을 부르지 않는다.** 값이 바뀌는 자리가 넷이나 되기 때문이다 —
 * `M3` 의 스위치 · `M3` 의 시각 · `10` 의 온보딩 커밋(`adoptProfile`) ·
 * 서버 동기화(`syncMe`). 화면마다 예약을 부르면 하나를 빠뜨리는 순간
 * 「설정은 켜져 있는데 알림은 안 오는」 상태가 되고, 그건 사용자가 확인할
 * 방법이 없는 어긋남이다.
 *
 * ## 예약하지 않는 두 경우
 *
 * 1. **로그인하지 않았을 때.** 설정을 비우는 `reset()` 은 샘플 사용자 값으로
 *    되돌리므로 회고 알림이 다시 켜진 상태가 된다 — 로그아웃한 기기가 밤마다
 *    「돌아볼까요」 하고 부르면 안 된다. 그래서 인증 상태도 함께 본다.
 * 2. **OS 권한이 없을 때.** 권한 없이 예약하면 아무 일도 일어나지 않지만,
 *    남겨두면 나중에 권한이 켜지는 순간 의도하지 않은 알림이 되살아난다.
 *
 * ⚠ **「새로운 소식」은 여기 없다.** 시각이 없는 알림이고 서버 푸시가 필요한데
 * MVP 에는 푸시 인프라가 없다(`ARCHITECTURE.md §1`) — 지금은 **받아만 두는
 * 설정**이다. 로컬 알림으로 흉내 내면 소식이 없는데도 울린다.
 */

/**
 * 알림이 하는 말. **스펙에 없다** — 상류 문서는 `M3` 의 줄 이름까지만 정하고
 * 알림 본문은 정하지 않았다. 차이 기록: `docs/PRODUCT.md` 「상류와 차이」.
 *
 * 규칙은 화면과 같다 — 숫자로 압박하지 않고(연속 · 편수 · 진행률 금지),
 * 재촉하지 않는다. 부르는 것은 언제나 바바 쪽이다("제가 먼저 말 걸어요").
 */
const CONTENT: Record<ReminderKey, { title: string; body: string }> = {
  retro: { title: "돌아보는 시간이에요", body: "오늘 하루, 저와 잠깐 이야기해요." },
  daily: { title: "지금 이 순간", body: "떠오른 게 있다면 한 줄만 남겨두세요." },
};

/** 지금 설정대로라면 예약돼 있어야 하는 것 — 순수 계산이라 테스트가 이걸 본다 */
export function plannedReminders(): Reminder[] {
  if (useAuth.getState().status !== "authenticated") return [];

  const { notify } = useSettings.getState();

  return REMINDER_KEYS.flatMap((key) => {
    const setting = notify[key];
    // 시각이 없는 줄은 예약할 것이 없다 — 스위치가 켜져 있어도 마찬가지다
    if (!setting.enabled || setting.time == null) return [];

    return [{ key, time: setting.time, ...CONTENT[key] }];
  });
}

/**
 * 예약이 서로를 앞지르지 않게 **한 줄로 세운다.** 스위치를 빠르게 두 번 누르거나
 * 로그아웃처럼 두 store 가 잇따라 바뀌면 화해가 겹쳐 도는데, 취소와 예약이
 * 섞이면 결과가 마지막 설정과 달라진다.
 */
let queue: Promise<void> = Promise.resolve();

/** 지금 설정·권한·로그인 상태를 보고 OS 예약을 그대로 맞춘다 */
export function syncReminders(): Promise<void> {
  queue = queue
    .then(async () => {
      const planned = plannedReminders();
      // 예약할 것이 없으면 권한을 묻지 않는다 — 지우는 데는 권한이 필요 없다
      if (planned.length === 0) return applyReminders([]);

      const { granted } = await getNotificationPermission();
      return applyReminders(granted ? planned : []);
    })
    .catch(() => {
      // 알림은 곁가지다 — 여기서 난 오류가 다음 화해까지 막지 않는다
    });

  return queue;
}

/**
 * 앱이 뜰 때 한 번 건다(`lib/providers.tsx`). 구독을 돌려주므로 테스트는
 * 걸었다 풀 수 있다.
 */
export function startReminderSync(): () => void {
  const unsubscribeSettings = useSettings.subscribe((state, previous) => {
    if (state.notify !== previous.notify) void syncReminders();
  });

  const unsubscribeAuth = useAuth.subscribe((state, previous) => {
    if (state.status !== previous.status) void syncReminders();
  });

  // 앱을 껐다 켠 사이에 기기 설정에서 알림을 껐을 수 있다 — 시작할 때 한 번 맞춘다
  void syncReminders();

  return () => {
    unsubscribeSettings();
    unsubscribeAuth();
  };
}
