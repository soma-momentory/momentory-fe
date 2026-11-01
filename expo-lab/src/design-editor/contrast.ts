/**
 * 편집 중 **대비 읽기 값** — 어떤 글자·아이콘 토큰이 어떤 면 위에 놓이는지.
 * 짝과 기준은 `src/design/ds/__tests__/contrast.test.ts` 를 옮긴 것이다(그 테스트가 게이트다 —
 * 여기서 「미달」이면 코드에 반영한 뒤 `npm run test` 가 실패한다).
 */
import { contrastRatio } from "./colorMath";

export type ContrastRule = {
  fg: string;
  bg: string;
  /** 0 이면 기준 없음(읽기 값만) */
  min: number;
  note: string;
};

const SURFACES = ["background.normal", "background.alternative", "background.elevated"] as const;
const TEXT_ON_SURFACES = [
  "label.strong",
  "label.normal",
  "label.neutral",
  "label.alternative",
  "primary.heavy",
  "status.negative",
  "status.cautionary",
  "interaction.inactive",
];

export const CONTRAST_RULES: readonly ContrastRule[] = [
  ...TEXT_ON_SURFACES.flatMap((fg) =>
    SURFACES.map((bg) => ({ fg, bg, min: 4.5, note: "본문 글자" })),
  ),
  ...["primary.normal", "status.positive"].flatMap((fg) =>
    SURFACES.map((bg) => ({ fg, bg, min: 3, note: "비텍스트 UI" })),
  ),
  ...SURFACES.map((bg) => ({
    fg: "label.assistive",
    bg,
    min: 0,
    note: "플레이스홀더 — 기준 예외(여기에만 있는 정보를 담지 않는다)",
  })),
  { fg: "label.disabled", bg: "interaction.disabled", min: 4, note: "비활성 버튼 라벨" },
  { fg: "label.onFill", bg: "primary.heavy", min: 4.5, note: "주 CTA 흰 글자" },
  { fg: "label.onFill", bg: "status.negative", min: 4.5, note: "삭제 버튼 흰 글자" },
  { fg: "label.neutral", bg: "retroRug.fill", min: 4.5, note: "회고 러그 위 오류 한 줄" },
  { fg: "restScene.ink", bg: "restScene.surface", min: 4.5, note: "쉼터 빈티지 버튼" },
  { fg: "restScene.ink", bg: "restScene.accent", min: 4.5, note: "쉼터 주 행동 버튼" },
  { fg: "homeV2.color.taskDone", bg: "homeV2.color.card", min: 4.5, note: "홈 v2 마친 일정" },
  { fg: "homeV2.color.taskBorder", bg: "homeV2.color.card", min: 3, note: "홈 v2 체크 테두리" },
  { fg: "homeV2.color.alert", bg: "homeV2.color.paper", min: 3, note: "홈 v2 읽지 않음 점" },
];

export type ContrastReadout = ContrastRule & { ratio: number | null; pass: boolean };

/** 토큰 하나가 낀 짝 전부 — 글자 쪽이든 면 쪽이든 */
export function contrastReadouts(
  key: string,
  valueOf: (key: string) => string | number | null,
): ContrastReadout[] {
  const base = String(valueOf("background.normal") ?? "");
  return CONTRAST_RULES.filter((rule) => rule.fg === key || rule.bg === key).map((rule) => {
    const ratio = contrastRatio(
      String(valueOf(rule.fg) ?? ""),
      String(valueOf(rule.bg) ?? ""),
      base,
    );
    return { ...rule, ratio, pass: ratio !== null && ratio >= rule.min };
  });
}

export const hasContrastRule = (key: string) =>
  CONTRAST_RULES.some((rule) => rule.fg === key || rule.bg === key);
