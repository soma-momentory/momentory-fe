import { useEffect, useState } from "react";

import { fetchAllDiaryDates } from "@/features/diary/data/diaryApi";
import { ARCHIVE_MONTHS, useDiary } from "@/features/diary/model/diary";
import { onForeground } from "@/lib/appState";
import { clock } from "@/lib/clock";

/**
 * 마이 「일기 N일 기록」 — 앱을 쓴 **전체 기간**에 일기가 남은 날 수(2026-11-06 결정).
 *
 * 연속 일수가 아니라 **기록이 남은 날 수**다 — 같은 날 두 편이어도 하루다(`RULES.md` 「불변 규칙」).
 *
 * 두 출처를 합친다:
 * - **기기 store**(`useDiary`) — 최근 `ARCHIVE_MONTHS` 개월. 방금 쓴 일기 · 지운 일기가 곧바로
 *   반영되는 쪽이다(삭제는 확인 뒤 곧바로 서버로 간다 — 되돌리기 창은 2026-08-21 에 없앴다).
 * - **서버 전체**(`GET /api/v1/diaries/all`) — 그 창보다 **오래된** 날짜만 쓴다. 창 밖의 일기는
 *   앱에서 쓰거나 지울 길이 없어 한 번 받으면 바뀌지 않는다.
 *
 * store 가 아직 서버에서 채워지지 않았으면(`loaded=false`) 서버 날짜를 창과 상관없이 다 쓴다.
 * 서버 조회가 실패하면 store 만 센다 — 지금까지와 같은 값이다.
 */
export const countRecordedDays = ({
  localDates,
  localLoaded,
  serverDates,
  windowStart,
}: {
  localDates: readonly string[];
  localLoaded: boolean;
  serverDates: readonly string[] | null;
  windowStart: string;
}): number => {
  const days = new Set(localDates);
  if (serverDates != null) {
    for (const date of serverDates) {
      if (!localLoaded || date < windowStart) days.add(date);
    }
  }
  return days.size;
};

/** store 가 훑는 창의 첫날(`YYYY-MM-01`) — `useDiary.load()` 와 같은 `ARCHIVE_MONTHS` 를 쓴다 */
export const archiveWindowStart = (today: string): string => {
  const [y, m] = [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const first = new Date(y, m - ARCHIVE_MONTHS, 1);
  const month = String(first.getMonth() + 1).padStart(2, "0");
  return `${first.getFullYear()}-${month}-01`;
};

/**
 * 화면이 쓰는 값. 서버 전체 조회는 **처음 한 번**만 하고, 실패했으면 앱이 앞으로 돌아올 때
 * 다시 묻는다(`onForeground`). 던지지 않는다.
 */
export const useRecordedDays = (): number => {
  const diaries = useDiary((s) => s.diaries);
  const loaded = useDiary((s) => s.loaded);
  const [serverDates, setServerDates] = useState<string[] | null>(null);

  useEffect(() => {
    let alive = true;
    let fetched = false;
    let inFlight = false;
    const fetchOnce = () => {
      if (fetched || inFlight) return;
      inFlight = true;
      void fetchAllDiaryDates().then((dates) => {
        inFlight = false;
        if (!alive || dates == null) return;
        fetched = true;
        setServerDates(dates);
      });
    };
    fetchOnce();
    const stop = onForeground(fetchOnce);
    return () => {
      alive = false;
      stop();
    };
  }, []);

  return countRecordedDays({
    localDates: diaries.map((d) => d.date),
    localLoaded: loaded,
    serverDates,
    windowStart: archiveWindowStart(clock.today()),
  });
};
