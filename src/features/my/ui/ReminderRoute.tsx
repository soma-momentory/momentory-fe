import { router, usePathname } from "expo-router";
import { useEffect, useRef, useState } from "react";

import { track } from "@/features/analytics";
import { useAuth } from "@/features/auth/model/auth";
import { reminderHref } from "@/features/my/model/reminders";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";
import { onReminderOpened, type ReminderKey } from "@/lib/notifications";

/**
 * 알림을 눌러 들어오면 그 알림이 부른 화면으로 옮긴다(2026-10-12). 예전에는 열람만 세고
 * 늘 홈이 열렸다. 어디로 가는지는 `reminderHref` 가 정한다.
 *
 * **들어갈 수 있을 때까지 기다렸다가 한 번 옮긴다.** 꺼져 있다가 알림으로 켜지면 스플래시
 * (`S0`)가 로그인 · 온보딩을 판정하고 홈으로 `replace` 하는데, 그전에 옮기면 그 판정이
 * 덮어쓴다. 그래서 로그인 · 온보딩을 마쳤고 스플래시를 벗어난 뒤에 `push` 한다 — 뒤로 가면
 * 그 아래 화면(켜진 직후면 홈)이다.
 *
 * 열람 계측(`reminder_opened`)도 여기서 보낸다. 응답을 받으면 지우므로(`onReminderOpened`)
 * 구독은 하나여야 하고, 계측이 꺼진 빌드에서도 옮기는 일은 해야 한다.
 */
export function ReminderRoute() {
  /** 눌렸지만 아직 옮기지 못한 알림 */
  const pending = useRef<ReminderKey | null>(null);
  /** 눌릴 때마다 오른다 — 이미 들어갈 수 있는 상태에서도 아래 효과를 다시 돌리는 신호다 */
  const [opened, setOpened] = useState(0);
  const authenticated = useAuth((s) => s.status === "authenticated");
  const onboarded = useOnboardingCompletion((s) => s.completed);
  const pathname = usePathname();
  const ready = authenticated && onboarded && pathname !== "/";

  useEffect(
    () =>
      onReminderOpened((reminder) => {
        track("reminder_opened", { reminder });
        pending.current = reminder;
        setOpened((n) => n + 1);
      }),
    [],
  );

  useEffect(() => {
    const key = pending.current;
    if (key == null || !ready) return;
    pending.current = null;
    void reminderHref(key).then((href) => {
      if (href != null) router.push(href);
    });
  }, [opened, ready]);

  return null;
}
