import type { TextStyle } from "react-native";

/**
 * Momentory DS — 타이포. 정본은 `docs/DESIGN.md` §2.
 *
 * Pretendard 4웨이트(400·500·600·700). Wanted 19단 스케일에서 앱이 쓰는 **12단만** 꺼냈다
 * (`DESIGN.md` 본문은 「11단」이라 적었지만 표에는 12줄이 있다 — 표를 따랐다).
 * Display·Title 1 은 앱에서 쓰지 않는다.
 *
 * ⚠ **웨이트를 `fontWeight` 로 주지 않는다.** Android 에서 안 먹는다 —
 * **파일 이름**(`Pretendard-SemiBold`)으로 준다(`CLAUDE.md` 규칙 5).
 * 네 파일 다 `assets/fonts/` 에 있고 `src/lib/providers.tsx` 가 로드한다.
 *
 * 본문 기본 웨이트는 **Medium 500** 이다. Regular 400 은 **입력값·플레이스홀더·읽기
 * 본문**에만 쓴다 — 그래서 `bodyReading` 계열이 따로 있다.
 */
export const fontFamily = {
  regular: "Pretendard-Regular",
  medium: "Pretendard-Medium",
  semibold: "Pretendard-SemiBold",
  bold: "Pretendard-Bold",
} as const;

export type FontWeightName = keyof typeof fontFamily;

/**
 * 한 단 = fontFamily + size + lineHeight. 화면이 셋을 따로 조합하지 않는다.
 * `Required` 인 이유 — 셋 다 **반드시 있다**. optional 로 두면 값을 꺼내 쓰는 쪽
 * (예: 여러 줄 입력의 최대 높이 계산)이 매번 `undefined` 를 처리해야 한다.
 */
type Style = Required<Pick<TextStyle, "fontFamily" | "fontSize" | "lineHeight">>;

const style = (family: FontWeightName, fontSize: number, lineHeight: number): Style => ({
  fontFamily: fontFamily[family],
  fontSize,
  lineHeight,
});

export const text = {
  /** 28/38 700 — 브랜드 워드마크, 페이지 제목 */
  title2: style("bold", 28, 38),
  /** 24/32 700 — 화면 제목(마이·쉼터·보관함), 날짜 */
  title3: style("bold", 24, 32),
  /** 22/30 600 — 카드·시트 제목, 온보딩 질문 */
  heading1: style("semibold", 22, 30),
  /** 18/26 600 — 리스트 강조, 값 표시 */
  headline1: style("semibold", 18, 26),
  /** 16/24 500 — 리스트·본문 기본 */
  body1: style("medium", 16, 24),
  /** 16/26 400 — 일기 본문, 대화 메시지 */
  body1Reading: style("regular", 16, 26),
  /** 15/22 500 — 보조 본문 */
  body2: style("medium", 15, 22),
  /** 15/24 400 — 설명 문단 */
  body2Reading: style("regular", 15, 24),
  /** 14/20 600 — 버튼·입력 라벨, 섹션 제목 */
  label1: style("semibold", 14, 20),
  /** 13/18 600 — 칩, 작은 버튼, 카드 라벨 */
  label2: style("semibold", 13, 18),
  /** 12/16 500 — 메타, 헬퍼, 탭 라벨 */
  caption1: style("medium", 12, 16),
  /** 11/14 600 — 최소 캡션, 약관. **이보다 작게 쓰지 않는다** */
  caption2: style("semibold", 11, 14),
} as const;

export type TextToken = keyof typeof text;

export const typography = { fontFamily, text } as const;
