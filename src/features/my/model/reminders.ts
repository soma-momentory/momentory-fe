import { track } from "@/features/analytics";
import { useAuth } from "@/features/auth/model/auth";
import { useDiary } from "@/features/diary/model/diary";
import { weekStartOf } from "@/features/home/model/day";
import { useLetters } from "@/features/letter/model/letter";
import { useSettings } from "@/features/my/model/settings";
import { addDays, clock, momentOf } from "@/lib/clock";
import {
  applyReminders,
  cancelAllOneOffs,
  getNotificationPermission,
  type Reminder,
  type ReminderKind,
} from "@/lib/notifications";
import { parseHHMM } from "@/lib/time";

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
 * ## 회고 알림은 하루씩 14일치다 (2026-10-27 · 바바의 편지)
 *
 * 예전에는 「매일 반복」 예약 하나였다. 그러면 하루만 문구를 바꿀 수 없다 — 편지를 받은 날 밤에
 * 아직 안 열었으면 「안 본 바바의 편지가 있어요」로 한 번 알린다(PRD 4-9). 그래서 앞으로 14일을
 * 하루씩 예약하고, 일기 · 편지 목록 · 설정이 바뀔 때와 앱을 켤 때마다 다시 맞춘다. 덤으로
 * **그날 일기를 이미 쓴 밤은 건너뛴다.**
 * ⚠ 앱을 14일 넘게 열지 않으면 회고 알림이 멈춘다.
 *
 * 편지 아침 알림도 여기서 맞춘다 — 가장 최근 일기의 다음 날 아침, 그 편지를 아직 안 열었으면 한 번.
 * 고른 작은 일 알림은 여기 없다 — 다시 계산할 재료가 기기에 없어 고를 때 한 번 예약한다
 * (`features/letter/model/actionReminder.ts`).
 *
 * ## 예약하지 않는 세 경우
 *
 * 1. **로그인하지 않았을 때.** 설정을 비우는 `reset()` 은 샘플 사용자 값으로
 *    되돌리므로 회고 알림이 다시 켜진 상태가 된다 — 로그아웃한 기기가 밤마다
 *    「돌아볼까요」 하고 부르면 안 된다. 그래서 인증 상태도 함께 본다.
 * 2. **OS 권한이 없을 때.** 권한 없이 예약하면 아무 일도 일어나지 않지만,
 *    남겨두면 나중에 권한이 켜지는 순간 의도하지 않은 알림이 되살아난다.
 * 3. **일기를 아직 못 받았을 때**는 화해하지 않고 지금 예약을 그대로 둔다 — 빈 일기로 계산하면
 *    이미 쓴 밤 · 아침 편지가 잠깐 어긋난 채 예약된다.
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
const CONTENT = {
  retro: { title: "돌아보는 시간이에요", body: "오늘 하루, 저와 잠깐 이야기해요." },
  daily: { title: "지금 이 순간", body: "떠오른 게 있다면 한 줄만 남겨두세요." },
  // 편지 내용은 넣지 않는다 — 예약할 때는 편지가 아직 없을 수 있다(PRD 3)
  letter: { title: "바바의 편지가 와 있어요", body: "어제 이야기를 읽고 바바가 편지를 썼어요." },
  // 공책 내용은 넣지 않는다 — 잠금 화면에 일기 이야기가 보이지 않게 한다
  report: { title: "지난주 리포트가 도착했어요", body: "바바가 한 주를 적어 뒀어요." },
  retroUnread: { title: "안 본 바바의 편지가 있어요", body: "읽고 오늘 이야기도 들려줘요." },
} as const;

/** 고른 작은 일 알림(PRD 4-4) — 고른 문장은 승인된 제목이라 그대로 싣는다 */
export const letterActionContent = (title: string) => ({
  title: "오늘 해 보기로 한 일",
  body: title,
});

/** 공책 도착 알림 시각 — 일요일 오전 10시 */
export const REPORT_ARRIVAL_HOUR = 10;

/** 회고 알림을 며칠 앞까지 하루씩 예약하는가 — 위 머리말 */
export const RETRO_DAYS_AHEAD = 14;

/** 지금 설정대로라면 예약돼 있어야 하는 것 — 순수 계산이라 테스트가 이걸 본다 */
export function plannedReminders(): Reminder[] {
  if (useAuth.getState().status !== "authenticated") return [];

  const { notify, letterChosen } = useSettings.getState();
  const today = clock.today();
  const written = new Set(useDiary.getState().diaries.map((d) => d.date));
  const summaries = useLetters.getState().summaries;

  /**
   * `day` 의 일기로 쓴 편지를 아직 안 열었나 — 내일부터 열릴 편지는 당연히 안 열었다.
   * 편지를 모르는 서버(`letterChosen == null`)면 편지가 없다. 목록을 모를 때는 `ifUnknown` 이다 —
   * 밤 문구는 평소대로(열었는데 「안 봤다」고 부르는 쪽이 더 나쁘다), 아침 편지는 보낸다(못 받으면 그날 아침이 비어 버린다).
   */
  const unopenedLetterOf = (day: string, ifUnknown: boolean) => {
    if (letterChosen == null || !written.has(day)) return false;
    if (day >= today) return true;
    if (summaries == null) return ifUnknown;
    return summaries.some((l) => l.date === day && l.openedAt == null);
  };

  const planned: Reminder[] = [];

  const retro = parsed(notify.retro);
  if (retro != null) {
    for (let i = 0; i < RETRO_DAYS_AHEAD; i += 1) {
      const day = addDays(today, i);
      // 그날 일기를 이미 썼다 — 낮에 회고했어도 밤에 다시 부르지 않는다
      if (written.has(day)) continue;
      planned.push({
        key: `retro.${day}`,
        kind: "retro",
        at: momentOf(day, retro.hour, retro.minute),
        ...(unopenedLetterOf(addDays(day, -1), false) ? CONTENT.retroUnread : CONTENT.retro),
      });
    }
  }

  const { daily } = notify;
  if (daily.enabled && daily.time != null) {
    planned.push({ key: "daily", kind: "daily", time: daily.time, ...CONTENT.daily });
  }

  // 편지를 모르는 서버(`letterChosen == null`)면 편지가 없다
  const letter = parsed(notify.letter);
  const latest = [...written].sort().at(-1);
  if (letter != null && letterChosen != null && latest != null && latest >= addDays(today, -1)) {
    if (unopenedLetterOf(latest, true)) {
      planned.push({
        key: "letter.morning",
        kind: "letter",
        at: momentOf(addDays(latest, 1), letter.hour, letter.minute),
        data: { date: latest },
        ...CONTENT.letter,
      });
    }
  }

  // 끝난 주에 일기가 있을 때만 일요일 아침에 공책 도착을 알린다. 끄는 스위치는 회고 알림과 같다
  if (retro != null) {
    const thisSunday = weekStartOf(today);
    const beforeArrival = today === thisSunday && clock.now().getHours() < REPORT_ARRIVAL_HOUR;
    const arrival = beforeArrival ? thisSunday : addDays(thisSunday, 7);
    const weekStart = addDays(arrival, -7);
    if ([...written].some((day) => day >= weekStart && day < arrival)) {
      planned.push({
        key: `report.${arrival}`,
        kind: "report",
        at: momentOf(arrival, REPORT_ARRIVAL_HOUR, 0),
        ...CONTENT.report,
      });
    }
  }

  return planned;
}

const parsed = (setting: { enabled: boolean; time: string | null }) => {
  // 시각이 없는 줄은 예약할 것이 없다 — 스위치가 켜져 있어도 마찬가지다
  if (!setting.enabled || setting.time == null) return null;
  const { hour, minute } = parseHHMM(setting.time);
  return Number.isFinite(hour) && Number.isFinite(minute) ? { hour, minute } : null;
};

/**
 * 알림을 눌러 들어온 사람이 갈 곳(2026-10-12 · 예전에는 늘 홈이었다). 회고 알림은 오늘
 * 일기가 있으면 그 일기, 없으면 회고의 첫 장(`C2`)이다. 편지 알림 둘은 그 편지다. 낮 기록은
 * 켤 길이 없어 홈에 둔다.
 *
 * 알림으로 켜진 직후에는 일기를 아직 못 받았을 수 있어 **받기를 기다린 뒤** 고른다.
 * 못 받으면 회고로 간다 — 이미 쓴 날이면 회고가 「이미 마쳤어요」로 받는다.
 */
export async function reminderHref(
  kind: ReminderKind,
  data: Record<string, string> = {},
): Promise<`/diary/${string}` | `/letter/${string}` | "/retro/confirm" | "/report" | null> {
  if (kind === "report") return "/report";
  if ((kind === "letter" || kind === "letter_action") && data.date != null) {
    return `/letter/${data.date}?source=notification`;
  }
  if (kind !== "retro") return null;
  await useDiary.getState().load();
  const today = useDiary.getState().diaries.find((d) => d.date === clock.today());
  return today != null ? `/diary/${today.id}` : "/retro/confirm";
}

/**
 * 계측 — 아침 편지 · 안 본 편지 알림을 **새로** 예약했을 때 한 번(`letter_notification_scheduled`).
 * 화해는 자주 돌므로 이미 센 것(편지 날짜 · 밤)은 다시 세지 않고, 지나서 걸지 않은 것은 세지 않는다.
 * ⚠ 센 것은 메모리에만 있어 앱을 다시 켜면 같은 예약을 한 번 더 셀 수 있다 — 알림 효과는
 * `reminder_opened` 로 본다.
 */
const counted = new Set<string>();
const countScheduled = (planned: readonly Reminder[]) => {
  const now = clock.now().getTime();
  for (const reminder of planned) {
    if (!("at" in reminder) || reminder.at.getTime() <= now) continue;
    const kind =
      reminder.kind === "letter"
        ? "morning"
        : reminder.title === CONTENT.retroUnread.title
          ? "unread_night"
          : null;
    if (kind == null) continue;
    const once = `${kind}:${reminder.key}:${reminder.data?.date ?? ""}`;
    if (counted.has(once)) continue;
    counted.add(once);
    track("letter_notification_scheduled", { kind });
  }
};

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
      const { status } = useAuth.getState();
      // 앱이 막 켜져 세션을 읽는 중이다 — 로그아웃으로 보고 지우면 고른 작은 일 알림처럼
      // 다시 살릴 수 없는 예약까지 사라진다. 상태가 정해지면 구독이 다시 부른다
      if (status === "hydrating") return;
      // 위 「예약하지 않는 세 경우」 3 — 일기를 받으면 구독이 다시 부른다
      if (status === "authenticated" && !useDiary.getState().loaded) return;
      if (status !== "authenticated") await cancelAllOneOffs();

      const planned = plannedReminders();
      // 예약할 것이 없으면 권한을 묻지 않는다 — 지우는 데는 권한이 필요 없다
      if (planned.length === 0) return applyReminders([]);

      const { granted } = await getNotificationPermission();
      await applyReminders(granted ? planned : []);
      if (granted) countScheduled(planned);
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
    if (state.notify !== previous.notify || state.letterChosen !== previous.letterChosen) {
      void syncReminders();
    }
  });

  const unsubscribeAuth = useAuth.subscribe((state, previous) => {
    if (state.status !== previous.status) void syncReminders();
  });

  // 일기가 생기거나 지워지면 그 밤의 회고 알림과 다음 날 아침 편지가 달라진다
  const unsubscribeDiary = useDiary.subscribe((state, previous) => {
    if (state.diaries !== previous.diaries || state.loaded !== previous.loaded) {
      void syncReminders();
    }
  });

  // 편지를 열면 그 밤의 「안 본 편지」 문구가 평소 문구로 돌아간다
  const unsubscribeLetters = useLetters.subscribe((state, previous) => {
    if (state.summaries !== previous.summaries) void syncReminders();
  });

  // 앱을 껐다 켠 사이에 기기 설정에서 알림을 껐을 수 있다 — 시작할 때 한 번 맞춘다
  void syncReminders();

  return () => {
    unsubscribeSettings();
    unsubscribeAuth();
    unsubscribeDiary();
    unsubscribeLetters();
  };
}
