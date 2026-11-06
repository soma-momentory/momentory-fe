import { useCallback, useEffect, useRef, useState } from "react";

import { onForeground } from "@/lib/appState";

import { fetchWeeklyHappiness, saveWeeklyHappiness } from "../data/weeklyHappinessApi";
import {
  WEEKLY_HAPPINESS_SAVE_FAILED,
  WEEKLY_HAPPINESS_WEEK_CLOSED,
  sameEntries,
  type WeeklyHappinessEntries,
  type WeeklyHappinessKey,
} from "./weeklyHappiness";

/** 마지막으로 고친 뒤 이만큼 멈추면 남긴다 — 칸마다 한 글자씩 보내지 않게 */
export const WEEKLY_HAPPINESS_SAVE_DELAY_MS = 1_000;

/** 아직 없는 주(`weeks[week]` 가 비었다)는 받는 중이다 */
export type WeekStatus = "ready" | "failed";
/** `flush` 의 끝 — 남았다(남길 것이 없었던 것도) · 못 남겼다 · 주가 넘어가 닫혔다 */
export type FlushResult = "saved" | "failed" | "closed";
type WeekState = { status: WeekStatus; entries: WeeklyHappinessEntries };

/**
 * 주간 행복 기록장의 서버 상태 — **이번 주만 쓰고, 지난 주는 읽기만** 한다(2026-11-06).
 *
 * - 이번 주는 들어오자마자 받는다. **받기 전에는 적지 못한다** — PUT 이 그 주를 통째로 바꾸므로,
 *   못 받은 채 적으면 서버에 있던 칸이 지워진다. 못 받았으면 앱이 앞으로 돌아올 때 다시 받는다.
 * - 지난 주는 넘겨 볼 때 받는다(`ensure`). 한 번 받은 주는 다시 받지 않는다 — 고칠 수 없으니 바뀌지 않는다.
 * - 고치면 {@link WEEKLY_HAPPINESS_SAVE_DELAY_MS} 뒤에 남기고, 「다 적었어요」 · 화면을 떠날 때 바로 남긴다(`flush`).
 *   보내는 것은 한 번에 하나다 — 늦게 떠난 요청이 먼저 떠난 것을 덮지 않게 줄 세운다.
 * - 실패는 한 줄(`notice`)로 흡수한다. 적은 글은 화면에 그대로 있고 다음에 고치거나 끝낼 때 다시 보낸다.
 * - 적는 사이 주가 넘어가면(`past_week`) 그 장을 닫는다 — 더 적을 수 없고 한 줄로 알린다.
 */
export function useWeeklyHappiness(thisWeek: string) {
  const [weeks, setWeeks] = useState<Record<string, WeekState>>({});
  const [firstWeekStart, setFirstWeekStart] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);

  const alive = useRef(true);
  const requested = useRef(new Set<string>());
  /** 서버가 마지막으로 가진 이번 주 */
  const saved = useRef<WeeklyHappinessEntries>({});
  /** 화면이 가진 이번 주 */
  const latest = useRef<WeeklyHappinessEntries>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<FlushResult>>(Promise.resolve("saved"));
  const closedRef = useRef(false);

  // 상태는 응답이 온 뒤(`then`)에만 바꾼다 — 부르는 순간에는 표시만 남긴다
  const load = useCallback(
    (week: string): Promise<void> => {
      requested.current.add(week);
      return fetchWeeklyHappiness(week).then((result) => {
        if (!alive.current) return;
        if (!result.ok) {
          // 다시 받을 수 있게 표시를 지운다
          requested.current.delete(week);
          setWeeks((all) => ({ ...all, [week]: { status: "failed", entries: {} } }));
          return;
        }
        if (week === thisWeek) {
          saved.current = result.week.entries;
          latest.current = result.week.entries;
        }
        setFirstWeekStart(result.week.firstWeekStart);
        setWeeks((all) => ({ ...all, [week]: { status: "ready", entries: result.week.entries } }));
      });
    },
    [thisWeek],
  );

  /** 넘겨 본 주를 받는다 — 받았거나 받는 중이면 아무것도 하지 않는다 */
  const ensure = useCallback(
    (week: string) => {
      if (!requested.current.has(week)) void load(week);
    },
    [load],
  );

  /** 이번 주를 지금 남긴다 — 바뀐 것이 없으면 보내지 않는다 */
  const flush = useCallback((): Promise<FlushResult> => {
    if (timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const run = queue.current.then(async () => {
      if (closedRef.current) return "closed";
      const entries = latest.current;
      if (sameEntries(entries, saved.current)) return "saved";
      const result = await saveWeeklyHappiness(thisWeek, entries);
      if (result.ok) {
        saved.current = result.week.entries;
        if (alive.current) {
          setFirstWeekStart(result.week.firstWeekStart);
          setNotice(null);
        }
        return "saved";
      }
      if (result.code === "past_week") {
        closedRef.current = true;
        if (alive.current) {
          setClosed(true);
          setNotice(WEEKLY_HAPPINESS_WEEK_CLOSED);
        }
        return "closed";
      }
      if (alive.current) setNotice(WEEKLY_HAPPINESS_SAVE_FAILED);
      return "failed";
    });
    queue.current = run;
    return run;
  }, [thisWeek]);

  const canWrite = weeks[thisWeek]?.status === "ready" && !closed;

  const write = (key: WeeklyHappinessKey, text: string) => {
    if (!canWrite) return;
    const next = { ...latest.current, [key]: text };
    latest.current = next;
    setWeeks((all) => ({ ...all, [thisWeek]: { status: "ready", entries: next } }));
    if (timer.current != null) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      void flush();
    }, WEEKLY_HAPPINESS_SAVE_DELAY_MS);
  };

  useEffect(() => {
    alive.current = true;
    void load(thisWeek);
    // 이번 주를 못 받았으면 앞으로 돌아올 때 다시 받는다
    const stop = onForeground(() => {
      if (!requested.current.has(thisWeek)) void load(thisWeek);
    });
    return () => {
      stop();
      alive.current = false;
      // 떠나는 순간 남지 않은 글이 있으면 보낸다 — 화면 상태는 더 바꾸지 않는다
      void flush();
    };
  }, [thisWeek, load, flush]);

  return {
    weeks,
    firstWeekStart,
    notice,
    closed,
    canWrite,
    ensure,
    write,
    flush,
  };
}
