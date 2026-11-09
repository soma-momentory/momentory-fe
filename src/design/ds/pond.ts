/**
 * Momentory DS — 옛 감각연못에서 남은 값. 감각연못 장면의 값은 `pondScene.ts` 로 옮겼다(2026-11-04).
 * 여기 남은 것은 다른 화면이 함께 쓰는 안내 전환 시간 하나다.
 */
export const pondMotion = {
  /**
   * 쉼터 위 안내(`StepHeading`)를 갈아 끼우는 시간 — 글자만 옅어졌다(`out`) 새 문구로 돌아오고(`in`),
   * 갈리는 동안 살짝 내려갔다 온다(`shift`). 걱정상자 · 보물함 · 몸에 힘 빼기가 쓴다.
   */
  headingSwap: { out: 160, in: 260, shift: 6 },
} as const;
