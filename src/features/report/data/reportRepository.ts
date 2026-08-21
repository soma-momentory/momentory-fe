/**
 * 리포트의 데이터 공급 — **화면과 서버 사이의 경계다.**
 *
 * ⚠ **해석 문장은 아직 어디에서도 오지 않는다** (2026-08-21). 예전에는
 * `src/mocks/sample.ts` 의 데모 문장 두 주치를 표로 들고 있었는데, 그 값이
 * 「어느 사용자가 로그인해도 2026년 7월 셋째 주 이야기가 보인다」는 화면을
 * 만들었다 — 그래서 샘플과 함께 지웠다.
 *
 * 계약에 주간 리포트 엔드포인트가 아직 없다(`docs/api/openapi.json` — 회고 ·
 * 일기 · 행동 카드까지다). 생기면 **이 파일 안쪽만** 그 호출로 갈리고 화면과
 * `model/report.ts` 는 그대로다.
 *
 * 그동안 화면이 그리는 것은 **세는 값**뿐이다 — 7일 감정 흐름 · 회고 수 ·
 * 감정 기록 수 · 행동 만든/해본 수는 전부 일기에서 계산한다(`model/report.ts`).
 * 없는 문장을 지어내지 않는다.
 */
import { weekStartOf } from "@/features/home/model/day";
import type { WeekAnalysis } from "@/features/report/model/report";
import { clock } from "@/lib/clock";

/**
 * 주차별 해석 — **서버가 줄 때까지 비어 있다.**
 *
 * 키가 곧 넘겨볼 수 있는 주라서(`availableWeekStarts`) 비면 **이번 주에서
 * 움직이지 않는다** — 화살표가 눌리지 않는 것으로 범위의 끝을 말한다.
 */
export const weekAnalyses = (): Record<string, WeekAnalysis> => ({});

/** 리포트가 처음 여는 주 — **오늘이 든 주**다 */
export const initialWeekStart = (): string => weekStartOf(clock.today());
