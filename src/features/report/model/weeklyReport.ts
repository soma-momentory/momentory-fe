import { create } from "zustand";

import type { Diary } from "@/features/diary/model/types";
import { weekStartOf } from "@/features/home/model/day";
import {
  fetchWeeklyReport,
  type WeeklyReport,
  type WeeklyReportFailureCode,
} from "@/features/report/data/weeklyReportApi";
import { weekEnd } from "@/features/report/model/report";
import { clock } from "@/lib/clock";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * 주간 리포트가 보는 **한 주** — 서버가 정본이다(`GET /reports/weekly`).
 *
 * 예전에는 화면이 일기·행동 카드 store 를 직접 세고, 한 주 「해석」 문장만 서버를
 * 기다렸다(`data/reportRepository.ts` — 계약에 엔드포인트가 없어 **빈 표**였다).
 * 이제 세는 값도 문장도 한 번의 조회로 온다:
 *
 * - 일정 셈은 **서버가 목록 화면과 같은 규칙**(숨김·삭제 제외)으로 센다 —
 *   화면이 로컬 일정 store 를 다시 세면 두 값이 어긋난다
 * - 마음 멘트는 **서버가 감정에 따라 고른 고정 문장**이다 — 없는 문장을 짓지 않는다
 *
 * ## 왜 store 인가
 *
 * 탭은 `replace` 로 옮겨 다녀서 리포트 화면이 **매번 새로 마운트된다**. 보고 있던
 * 주와 받은 값을 화면 안에 두면 탭을 한 번 다녀올 때마다 사라진다. 대신 화면은
 * 들어올 때마다 {@link WeeklyReportStore.open} 으로 **이번 주부터 다시 연다** —
 * 리포트는 「지금 이 주」를 보는 화면이고, 지난 주는 넘겨서 가는 곳이다.
 *
 * **던지지 않는다.** 실패는 `status: "failed"` 하나로 닫고 화면이 다시 시도한다.
 */
export type {
  PracticedWish,
  WeeklyMoodDay,
  WeeklyNeed,
  WeeklyReport,
} from "@/features/report/data/weeklyReportApi";

export type WeeklyReportStatus =
  /** 아직 부르지 않았다 */
  | "idle"
  /** 받는 중 — `report` 가 `null` 이면 첫 조회다 */
  | "loading"
  | "ready"
  | "failed";

type WeeklyReportStore = {
  /** 보고 있는 주의 **일요일**(주의 첫날). 서버에 보내는 `date` 이기도 하다 */
  weekStart: string;
  /** 받은 한 주. 주를 옮기면 **먼저 비운다** — 새 날짜 아래 옛 수치를 두지 않는다 */
  report: WeeklyReport | null;
  status: WeeklyReportStatus;
  /** 마지막 실패 사유 — 화면이 문구를 고르는 데만 쓴다 */
  failure: WeeklyReportFailureCode | null;
  /** 화면에 들어올 때 — **이번 주**로 되돌리고 받는다 */
  open: () => Promise<void>;
  /** 고른 주로 옮기고 곧바로 받는다 — 인자는 그 주의 **일요일**이다 */
  selectWeek: (weekStart: string) => Promise<void>;
  reset: () => void;
};

/**
 * 주를 빠르게 넘기면 응답이 순서를 바꿔 도착할 수 있다 — 늦게 온 옛 주가 새 주를
 * 덮지 않게 **마지막 요청 토큰**만 반영한다(`monthSchedules.ts` 의 같은 보호).
 */
let latest = 0;

/** 오늘(04:00 하루 경계)이 든 주의 일요일 — 리포트가 처음 여는 주다 */
export const thisWeekStart = (): string => weekStartOf(clock.today());

/** 보고 있는 주가 이번 주인가 — 문구가 「이번 주 …」인지 「이 주 …」인지를 가른다 */
export const isThisWeek = (weekStart: string) => weekStart === thisWeekStart();

export const useWeeklyReport = create<WeeklyReportStore>((set, get) => {
  const load = async () => {
    const token = ++latest;
    const week = get().weekStart;
    set({ status: "loading" });

    const result = await fetchWeeklyReport(week);
    // 더 최근 요청이 이겼으면 버린다 — 화면은 그 주를 보고 있지 않다
    if (token !== latest) return;

    set(
      result.ok
        ? { report: result.data, status: "ready", failure: null }
        : { status: "failed", failure: result.code },
    );
  };

  return {
    weekStart: thisWeekStart(),
    report: null,
    status: "idle",
    failure: null,

    open: async () => {
      const week = thisWeekStart();
      // 다른 주를 보다 나갔으면 값도 함께 버린다 — 이번 주 날짜 아래 지난 주 수치가
      // 한 프레임이라도 보이면 그 화면은 거짓말을 한 것이다
      if (get().weekStart !== week) set({ weekStart: week, report: null });
      await load();
    },

    selectWeek: async (weekStart) => {
      // 보고 있던 주를 다시 고르면 아무 일도 없다 — 같은 조회를 두 번 보내지 않는다
      if (get().weekStart === weekStart) return;
      set({ weekStart, report: null });
      await load();
    },

    reset: () => {
      latest += 1; // 날아간 요청이 돌아와도 되살리지 못하게 한다
      set({ weekStart: thisWeekStart(), report: null, status: "idle", failure: null });
    },
  };
});

/**
 * 마음 멘트를 **두 줄로 가른다** — 서버가 주는 문장은 한 덩이지만 안에서 역할이
 * 갈린다: 앞 문장은 그 주를 **관찰**하고(「평온한 마음을 가장 많이 느꼈어요」),
 * 뒤 문장은 **권한다**(「…이어가 보세요」).
 *
 * 시안이 두 줄을 굵기로 나눠 그린 자리라 여기서 나눠 준다. **문장을 새로 짓거나
 * 고치지 않는다** — 첫 마침표에서 자르기만 한다. 한 문장뿐인 멘트(「여러 마음이
 * 번갈아 찾아온 한 주였어요.」 · 「아직 …기록된 마음이 없어요.」)는 그대로 한 줄이다.
 */
export function splitMoodMessage(message: string): { lead: string; follow: string } {
  const at = message.indexOf(". ");
  if (at < 0) return { lead: message.trim(), follow: "" };
  return { lead: message.slice(0, at + 1).trim(), follow: message.slice(at + 1).trim() };
}

// ── 주를 고르는 목록이 쓰는 계산 ──────────────────────────────────────────

/**
 * 그 주의 이름 — `2026-08-24` → 「2026년 8월 4주차」.
 *
 * **주가 시작한 달**로 센다(그 주의 일요일이 든 달). 한 주가 달을 걸치면 어느 쪽으로
 * 셀지 정해야 하는데, 시작한 달이 가장 설명하기 쉽다 — 8월 30일에 시작한 주는
 * 「8월 5주차」다(9월 1주차가 아니다).
 *
 * 몇 주차인지는 **첫날의 날짜**만 보면 나온다: 한 달 안의 일요일들은 7일 간격이라
 * 첫 일요일이 며칠이든 `(일 - 1) / 7` 이 그대로 순번이 된다.
 */
export function weekNameOf(weekStart: string): string {
  const [y = "2026", m = "1", d = "1"] = weekStart.split("-");
  return `${Number(y)}년 ${Number(m)}월 ${Math.floor((Number(d) - 1) / 7) + 1}주차`;
}

/** 목록에 서는 한 줄 — 고르는 값(`weekStart`)과 사람이 읽는 것들 */
export type WeekOption = {
  /** 그 주의 일요일 — 고르면 이 값이 서버로 간다 */
  weekStart: string;
  /** 「2026년 8월 4주차」 */
  name: string;
  /** 「8월 24일 ~ 8월 30일」 — 몇 주차인지만으로는 어느 날인지 모른다 */
  range: string;
  /** 그 주에 일기를 남긴 날 수 */
  diaryCount: number;
  /** 오늘이 든 주인가 — 목록에서 「이번 주」라고 적는다 */
  thisWeek: boolean;
};

/**
 * 고를 수 있는 주 목록 — **일기가 있는 주만**, 최근 주가 위로.
 *
 * 리포트가 넘겨볼 수 있는 주는 원래 무한하다(서버는 아무 주나 「빈 주」로 성실히
 * 답한다). 그런데 빈 주를 무한히 넘겨보는 일은 없어서, **기록이 남은 주만** 세워
 * 둔다(사용자 요청 2026-08-24). 일기는 12개월 창으로 받아 두므로
 * (`features/diary/model/diary.ts`) 목록의 범위도 거기까지다.
 *
 * ⚠ **이번 주는 일기가 없어도 늘 목록에 둔다.** 그러지 않으면 지난 주를 보다가
 * 이번 주로 돌아올 길이 목록에서 사라진다 — 오늘 아직 일기를 안 쓴 날이 그렇다.
 * 지금 보고 있는 주도 같은 이유로 늘 둔다(선택 표시가 설 자리가 있어야 한다).
 */
export function weekOptions(diaries: readonly Diary[], current: string): WeekOption[] {
  const counts = new Map<string, number>();
  for (const diary of diaries) {
    const week = weekStartOf(diary.date);
    counts.set(week, (counts.get(week) ?? 0) + 1);
  }

  const today = thisWeekStart();
  const weeks = new Set([...counts.keys(), today, current]);

  return [...weeks]
    .sort()
    .reverse()
    .map((weekStart) => ({
      weekStart,
      name: weekNameOf(weekStart),
      range: `${formatKoreanDateShort(weekStart)} ~ ${formatKoreanDateShort(weekEnd(weekStart))}`,
      diaryCount: counts.get(weekStart) ?? 0,
      thisWeek: weekStart === today,
    }));
}
