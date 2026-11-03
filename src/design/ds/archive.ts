/**
 * 보관함(`A1` · `A2`) 한 화면만의 글자 크기(2026-11-03 · 사용자 요청).
 *
 * 공용 12단을 바꾸면 다른 화면이 함께 커지므로 **이 화면의 값으로 따로 둔다**(`homeV2.type` 과 같은
 * 판단). 탭 화면은 390 비례 캔버스 안에 있어서 **여기 숫자가 그대로 그리는 크기**다 — 12단은 그 안에서
 * 1.12 배로 그려진다(`label1` 14 → 16). 글씨 배율은 `Text` 가 그 위에 곱한다.
 *
 * 들어가는지는 실제 글꼴 폭으로 잰다(`features/archive/__tests__/archiveTextFit.test.ts`).
 */
export const archiveType = {
  /** 달력 날짜 — 이 화면에서 가장 많이 키운 값이다. 행간이 곧 날짜 줄 높이다 */
  date: { fontSize: 18, lineHeight: 20 },
  weekday: { fontSize: 16, lineHeight: 22 },
  diaryTitle: { fontSize: 18, lineHeight: 26 },
  diaryBody: { fontSize: 17, lineHeight: 26 },
  emotionName: { fontSize: 16, lineHeight: 22 },
  openLink: { fontSize: 16, lineHeight: 22 },
  scheduleTitle: { fontSize: 17, lineHeight: 24 },
  scheduleItem: { fontSize: 17, lineHeight: 24 },
  /** 「기록 N건」 · 기간 */
  listMeta: { fontSize: 17, lineHeight: 24 },
  /** 높이 36 인 칩 안에 들어간다 — 글씨 1.5 배에서도 행간이 30 이다 */
  chip: { fontSize: 16, lineHeight: 20 },
  /** 하단 「이번 달 기록」 · 그 옆의 셈 */
  dock: { fontSize: 16, lineHeight: 20 },
} as const;
