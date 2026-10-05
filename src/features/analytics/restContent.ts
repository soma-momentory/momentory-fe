import { createActiveClock } from "./activeClock";
import type { Track } from "./client";
import type { RestContentName, RestEntryName, RestStageName, ScreenName } from "./events";

/**
 * 쉼 콘텐츠 한 판의 계측 — 열었다 · 끝까지 했다 · 어디서 나갔다 (2026-10-05).
 *
 * 콘텐츠마다 놀이는 달라도 묻는 것은 같다: **얼마나 들어오고, 얼마나 끝까지 가고, 못 끝내면
 * 어디서 나가는가.** 그래서 세 이벤트를 모든 쉼 콘텐츠가 같이 쓴다 — `content` 로 가르고,
 * 나간 자리는 `stage` 다. 감각연못의 단계 시간(`sensePond.ts`)처럼 콘텐츠에만 있는 것은 따로 둔다.
 *
 * 시간은 전면 시계로 잰다 — 화면이 잠긴 동안이 쉼 시간에 섞이지 않게(`activeClock.ts`).
 * 끝까지 갔거나 떠났으면 그 뒤로는 아무것도 보내지 않는다.
 */
export function createRestContentTracker(
  track: Track,
  content: RestContentName,
  now: () => number = Date.now,
) {
  const clock = createActiveClock(now);
  let stage: RestStageName | null = null;
  let over = false;

  return {
    /** 화면이 섰다 — 어떻게 들어왔는지와, 오늘 일기를 이미 썼는지를 싣는다 */
    open(entry: RestEntryName, diaryToday: boolean) {
      track("rest_content_opened", { content, entry, diary_today: diaryToday });
    },
    /** 지금 단계 — 나가면 여기가 「나간 자리」다 */
    stage(next: RestStageName) {
      if (!over) stage = next;
    },
    /** 끝까지 했다 */
    complete() {
      if (over) return;
      over = true;
      track("rest_content_completed", { content, duration_ms: clock.now() });
    },
    pause: clock.pause,
    resume: clock.resume,
    /** 끝내지 않고 화면을 떠났다. 끝까지 간 판에는 아무것도 보내지 않는다 */
    leave() {
      if (over || stage == null) return;
      over = true;
      track("rest_content_exited", { content, stage, duration_ms: clock.now() });
    },
  };
}

/** 쉼터 묶음 — 쉼터 탭과 그 안에서 여는 화면들. 여기 안에서 옮겨 다니는 동안은 한 번의 방문이다 */
const REST_FAMILY: ReadonlySet<ScreenName> = new Set([
  "rest",
  "wish_cards",
  "sense_pond",
  "body_release",
  "worry_box",
]);

/**
 * 이번 쉼터 방문이 **회고(일기)를 마친 화면에서 곧장** 이어졌는가.
 *
 * 회고 완료(`retro_done`)에서 쉼터 묶음으로 들어오면 그 방문은 `after_diary` 이고, 쉼터 묶음
 * 안에서 옮겨 다니는 동안(쉼터 탭 → 콘텐츠 → 뒤로 → 다른 콘텐츠) 그대로 이어진다. 쉼터 묶음
 * 밖으로 나가면 끝난다 — 그 뒤 탭으로 다시 들어오면 `direct` 다. 같은 날 일기를 썼는지는
 * 따로 `diary_today` 로 본다(일기를 쓰고 나중에 따로 들어온 것과 가르려고).
 */
export function createRestVisit() {
  let afterDiary = false;
  return {
    /** 화면이 바뀌었다 — 화면 관찰(`createScreenObserver`)이 알려 준다 */
    move(from: ScreenName | null, to: ScreenName | null) {
      if (to == null || !REST_FAMILY.has(to)) afterDiary = false;
      else if (from === "retro_done") afterDiary = true;
    },
    entry: (): RestEntryName => (afterDiary ? "after_diary" : "direct"),
  };
}

/** 앱 안에서 하나 — 화면 관찰이 움직이고 쉼 콘텐츠가 읽는다 */
export const restVisit = createRestVisit();
