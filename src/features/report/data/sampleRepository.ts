/**
 * 리포트의 데이터 공급 — **화면과 mock 사이의 경계다.**
 *
 * 서버가 붙으면 이 파일 안쪽만 API 호출로 갈리고, 화면과 `model/report.ts` 는
 * 그대로다(`CLAUDE.md` 「BE 는 마지막에 붙인다」). 화면이 `@/mocks/sample` 을
 * 직접 읽지 않는 이유가 이 파일이다.
 */
import type { WeekAnalysis } from "@/features/report/model/report";
import { SAMPLE_REPORT_ANALYSIS, SAMPLE_REPORT_WEEK } from "@/mocks/sample";

/** 주차별 해석 — 키가 곧 볼 수 있는 주다. 서버가 붙으면 응답으로 바뀐다 */
export const weekAnalyses = (): Record<string, WeekAnalysis> => SAMPLE_REPORT_ANALYSIS;

/** 리포트가 처음 여는 주 — **최신 주가 마지막**이라 여기서 뒤로만 간다 */
export const initialWeekStart = (): string => SAMPLE_REPORT_WEEK.start;
