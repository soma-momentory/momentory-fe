import { StyleSheet, type ViewStyle } from "react-native";

import { line } from "./color";

/**
 * Momentory DS — 크기. 정본은 `design-reference/design.md` §3~5, §6~11.
 *
 * 프레임 기준 375×812, **좌우 패딩 20 고정.**
 */

/**
 * 스페이싱 **10단만** 쓴다(`design.md` §3). 사이 값을 만들지 않는다 —
 * 하나 만들면 화면마다 하나씩 는다.
 *
 * 관계별 기준: 텍스트↔텍스트 4~8 · 아이콘↔텍스트 4~8 · 컴포넌트 내부 12~22 ·
 * 컴포넌트↔컴포넌트 12~16 · 섹션↔섹션 20~28 · 리스트 행 간(일정) 20.
 */
export const space = {
  xs2: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xl2: 24,
  xl3: 32,
  xl4: 40,
  xl5: 48,
} as const;

/** `design.md` §4 */
export const radius = {
  small: 8, //   칩, 작은 버튼
  medium: 12, // 버튼, 입력 필드, 정보 블록
  large: 16, //  카드
  xlarge: 20, // 시트 · 모달
  frame: 28, //  기기 프레임
  full: 999, //  필, 아바타, 감정 도트, 입력 pill
} as const;

/**
 * 말풍선만 라운드가 비대칭이다(`design.md` §4) —
 * 질문 `16 16 16 4` / 답변 `16 16 4 16`. 온보딩과 일기가 같은 값을 쓴다.
 */
export const bubbleRadius = {
  question: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomLeftRadius: 4,
  },
  answer: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 16,
  },
} as const;

/**
 * 화면 틀(`design.md` §3·§10).
 *
 * `statusBar`·`safeArea` 는 시안의 고정값이다 — **구현에서는
 * `react-native-safe-area-context` 의 실제 inset 을 쓰고** 이 숫자는 시안 대조용으로만 둔다.
 */
export const layout = {
  designWidth: 375,
  designHeight: 812,
  /** 좌우 패딩 — **고정이다.** 화면마다 다르게 잡지 않는다 */
  screenPadding: 20,
  statusBar: 44,
  /** 상단 내비 — **투명 배경**(격자가 이어지도록) · divider 없음 */
  topNav: 44,
  /** 하단 탭 — 5칸(홈·쉼터·보관함·리포트·마이) */
  tabBar: 56,
  tabBarPaddingBottom: 9,
  safeArea: 34,
  /** 스크롤 리스트 하단 클리어런스 — 탭바 56 + 20 */
  scrollClearance: 76,
  /** 모든 탭 대상 최소 (아이콘이 작으면 hitSlop 으로 채운다) */
  minTouch: 44,
} as const;

/**
 * `design.md` §5 — **경계는 border 가 아니라 hairline** 이다.
 *
 * 웹은 `inset 0 0 0 1px` 로 그리지만 RN 에는 inset shadow 가 없다 →
 * `StyleSheet.hairlineWidth` 테두리로 옮긴다(`EXPORT_MANIFEST` §7).
 * 두께가 1px 이 아니라 기기 픽셀 밀도의 최소 선이라 시안보다 얇게 보일 수 있다 —
 * 의도한 대체다.
 */
export const hairline = {
  alternative: { borderWidth: StyleSheet.hairlineWidth, borderColor: line.alternative },
  neutral: { borderWidth: StyleSheet.hairlineWidth, borderColor: line.neutral },
  normal: { borderWidth: StyleSheet.hairlineWidth, borderColor: line.normal },
} as const satisfies Record<string, ViewStyle>;

/**
 * 그림자 두 단(`design.md` §5). **카드에는 그림자가 없다** — hairline 만 쓴다.
 *
 * CSS blur 를 RN 으로 옮길 때 `shadowRadius ≈ blur / 2` 로 잡는다(관례적 근사).
 * Android 는 `elevation` 근사라 색·offset 이 무시된다.
 */
export const elevation = {
  /** `0 0 6px rgba(0,0,0,.08)` — 입력 바, 토스트 */
  floating: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 3,
    shadowOpacity: 0.08,
    elevation: 2,
  },
  /** `0 0 12px rgba(0,0,0,.16)` — 모달, 바텀시트 */
  overlay: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6,
    shadowOpacity: 0.16,
    elevation: 8,
  },
} as const;

/**
 * 쌓임 순서 — `design.md` §11 「z-index」.
 *
 * 시트·모달은 **콘텐츠보다 위(3)** 이고 프레임 hairline 이 2 다.
 * 오버레이가 이 값을 들고 **스스로 절대 배치**해야 형제 요소와 자리를 나눠 갖지 않는다.
 */
export const zIndex = {
  content: 1,
  frame: 2,
  /** 바텀시트 · 모달 */
  overlay: 3,
} as const;

/**
 * 컴포넌트 치수 — `design.md` §6~11 이 **시스템 차원에서** 정한 값만 둔다.
 * 화면 하나에서만 쓰는 숫자는 그 화면에 두고 여기로 올리지 않는다.
 */
export const size = {
  /** §6 — 높이 3단 · radius 12. 한 화면에 Solid Primary 는 하나다 */
  button: { large: 48, medium: 40, small: 32, radius: radius.medium },
  /** §7 — Text Field 52(large)/48 · 채팅 입력 r22 · 느낀 점 compact 52 */
  input: { large: 52, medium: 48, chatRadius: 22, compact: 52, maxLines: 3 },
  /** §8 — 카드 내부 패딩 16~22 */
  card: { radius: radius.large, paddingMin: 16, paddingMax: 22 },
  /** §9 — 칩 높이 36 · 간격 8 · 선택은 테두리 2px + 600 */
  chip: { height: 36, gap: space.sm, radius: radius.full, selectedBorderWidth: 2 },
  /** §10 — 아이콘 3단(24 그리드) */
  icon: { sm: 16, md: 20, lg: 24 },
  /** §11 — 시트/모달 r20 · 시간 휠 40px 행 */
  sheet: { radius: radius.xlarge, wheelRow: 40 },
} as const;

export const metrics = {
  space,
  radius,
  bubbleRadius,
  layout,
  hairline,
  elevation,
  size,
  zIndex,
} as const;
