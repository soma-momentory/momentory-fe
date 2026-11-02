/**
 * 실행이 끝났을 때 알린다 — 브라우저 알림(Notification API). 처음 실행할 때 권한을 묻고,
 * 거부되거나 없으면 탭 제목 앞에 ✓ / ✕ 를 붙여 대신한다(탭으로 돌아오면 지운다).
 */

const MARKS = ["✓ ", "✕ "];

const hasNotification = () => typeof window !== "undefined" && "Notification" in window;

/** 「AI에게 수정 맡기기」를 누를 때 부른다 — 사용자 동작 안에서 물어야 브라우저가 창을 띄운다. */
export function askNotificationPermission(): void {
  if (!hasNotification()) return;
  if (Notification.permission === "default") void Notification.requestPermission().catch(() => {});
}

function stripMark(title: string) {
  for (const mark of MARKS) if (title.startsWith(mark)) return title.slice(mark.length);
  return title;
}

export function notifyRunEnded(input: { title: string; ok: boolean; body: string }): void {
  if (typeof document === "undefined") return;
  if (hasNotification() && Notification.permission === "granted") {
    try {
      new Notification(`${input.ok ? "끝났어요" : "멈췄어요"} — ${input.title}`, {
        body: input.body,
        tag: "momentory-lab-agent",
      });
      return;
    } catch {
      /* 알림을 못 띄우는 환경 — 제목으로 */
    }
  }
  document.title = `${input.ok ? MARKS[0] : MARKS[1]}${stripMark(document.title)}`;
  const clear = () => {
    document.title = stripMark(document.title);
    window.removeEventListener("focus", clear);
  };
  if (typeof window !== "undefined") window.addEventListener("focus", clear);
}
