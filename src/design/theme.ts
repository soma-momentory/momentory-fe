// ⚠ 생성 파일 — 직접 고치지 말 것.
//
//   원본:   momentory/02_디자인시스템/theme.ts
//   재생성: npm run sync:theme
//   검증:   npm run check:theme   (CI 가 돌린다)
//
// 값을 바꾸려면 상류 05_도구/lib.mjs 를 고치고 node 05_도구/export-theme.mjs 를
// 돌린 뒤 여기로 다시 동기화한다. 이 파일을 고치면 다음 동기화에 덮인다.
//
// @generated-from  momentory@111e8368c372b329f59e61ebeb46cda57bcabbe6 (미커밋 변경 있음)
// @generated-sha256 62243d0f6b5dc205f4e5d80392ff22fbad94013fd704e48336169e0ad842ab29
// ─── 여기부터 상류 원본 ───
// 자동 생성 파일 — 직접 수정하지 말 것.
//   재생성: node 05_도구/export-theme.mjs   (소스: 05_도구/lib.mjs)
// 색·수치의 근거는 05_도구/lib.mjs 와 각 파트 docs (RULES.md · MOTION.md).

export const colors = {
  // lib.mjs P 팔레트 그대로
  palette: {
    bgTop: "#FCF8F0",
    bgMid: "#F2E9DA",
    bgBot: "#E7DBC7",
    card: "#FBF6EC",
    tone: "#F1E7D6",
    ink: "#241F19",
    body: "#6B5F4E",
    slogan: "#8B7355",
    legal: "#9A7B57",
    legalInk: "#71583C",
    dangerInk: "#9B3B2F",
    mute: "#B0A08A",
    textOnDark: "#FBF4E7",
    primary: "#C2703D",
    primaryDeep: "#A25B2C",
    primaryDeepPress: "#9E5626",
    primarySoft: "#B06C4E",
    accentInk: "#8E4E23",
    accentWash: "#F6E7DA",
    green: "#2E5A40",
    kakao: "#FEE500",
    kakaoInk: "#1A1A1A",
    apple: "#1A1A1A",
    white: "#FFFFFF",
  },
  // 시맨틱 별칭 — 화면 코드는 가급적 이쪽을 쓴다
  semantic: {
    background: "#F2E9DA", // 단색 폴백. 실제 배경은 gradients.screen
    surface: "#FBF6EC", //     카드 + 바텀시트 표면 (면 색은 하나로 통합 — 위계는 shadow/radius/딤으로)
    surfaceTone: "#F1E7D6", //  살짝 눌린 톤 (인풋 등)
    textPrimary: "#241F19",
    textBody: "#6B5F4E",
    textMuted: "#B0A08A", //      분위기용 — AA 미달, 본문·필수 문구 금지
    textLegal: "#9A7B57", //     분위기용 각주·라벨 — AA 미달, 필수 문구 금지
    textLegalInk: "#71583C", // 약관·안전 등 읽혀야 하는 문구 (AA ≥4.5:1)
    textSlogan: "#8B7355",
    textOnDark: "#FBF4E7", // 채운 면 위 글자 — primaryDeep 위 4.72:1 · ink 위 14.9:1
    textDanger: "#9B3B2F", //  삭제 등 되돌릴 수 없는 동작의 글자·테두리. 면을 채우지 말 것
    accent: "#C2703D", //    장식 전용 — 점·바·테두리·커서·토글 트랙 (3:1 티어). 글자를 얹지 말 것
    accentFill: "#A25B2C", // 주 버튼·체크의 면 — 흰 라벨 기준 4.79:1 (2026-08-01 ISS-03)
    accentFillPress: "#9E5626", // 〃 눌림 — Reduce Motion 이면 이 색만 남는다
    accentSoft: "#B06C4E",
    accentInk: "#8E4E23", //  primary 계열 진한 텍스트/아이콘 (상류 채택 2026-07-31)
    accentWash: "#F6E7DA", // 은은한 강조 배경 워시
    success: "#2E5A40",
    kakao: "#FEE500",
    kakaoInk: "#1A1A1A",
    apple: "#1A1A1A",
    white: "#FFFFFF",
  },
} as const;

// 화면 공통 배경 — docs/S0.md 의 radial-gradient. RN 에서는
// react-native-svg RadialGradient 또는 expo-linear-gradient 근사로 구현.
export const gradients = {
  screen: {
    type: "radial" as const,
    center: [0.5, 0.26] as const, // [x, y] 비율
    radius: [1.15, 0.75] as const,
    stops: [
      { color: "#FCF8F0", position: 0 },
      { color: "#F2E9DA", position: 0.52 },
      { color: "#E7DBC7", position: 1 },
    ],
  },
} as const;

// 감정 9종 — 앱 전체(홈 칩·회고·보관함 캘린더·리포트 차트)에서 이 값만 쓴다.
// base = 밝은 원색(점·막대), ink = 글자, 필 배경은 base 22% (예: rgba 또는 base + "38").
export const emotions = [
  { id: 1, name: "불안함", base: "#B39EDC", ink: "#563E7B" },
  { id: 2, name: "우울함", base: "#79A9DB", ink: "#194F81" },
  { id: 3, name: "화남/답답", base: "#DE857E", ink: "#7E302D" },
  { id: 4, name: "행복함", base: "#E2BF76", ink: "#6F530A" },
  { id: 5, name: "막막함", base: "#AEB8A5", ink: "#424B3A" },
  { id: 6, name: "무기력", base: "#A1968C", ink: "#453B32" },
  { id: 7, name: "피곤함", base: "#83B1B9", ink: "#0E4B54" },
  { id: 8, name: "뿌듯함", base: "#DD9AB9", ink: "#7A395A" },
  { id: 9, name: "평온함", base: "#90C6A8", ink: "#255940" },
] as const;
export type EmotionId = (typeof emotions)[number]["id"];

export const typography = {
  // 서체는 Pretendard 하나 — 위계는 굵기·크기·자간으로만 (docs/RULES.md · S0.md)
  fontFamily: "Pretendard",
  weights: { regular: "400", medium: "500", semibold: "600", bold: "700" } as const,
  // 역할별 스케일 — flows 실사용 값 기준. lineHeight 는 px (플러그인·시안과 동일 계산)
  styles: {
    display: { fontSize: 34, lineHeight: 46, fontWeight: "500" }, //  워드마크 (자간 넓힘: letterSpacing 4.9 ≈ .145em)
    title: { fontSize: 23, lineHeight: 33, fontWeight: "700" }, //    화면 대표 제목
    heading: { fontSize: 17, lineHeight: 24, fontWeight: "600" }, //  헤더·섹션 제목
    bodyLg: { fontSize: 15, lineHeight: 24, fontWeight: "700" }, //   버튼 라벨·선택지
    body: { fontSize: 14, lineHeight: 22, fontWeight: "400" }, //     본문 기본
    bodySm: { fontSize: 13, lineHeight: 21, fontWeight: "400" }, //   보조 본문
    caption: { fontSize: 12.5, lineHeight: 21, fontWeight: "400" }, //불릿·행·설명
    footnote: { fontSize: 11.5, lineHeight: 18, fontWeight: "400" }, // 법적 고지·최하단
  },
} as const;

export const layout = {
  // 시안 기준 프레임 — 다른 화면 폭에서는 이 값 대비 비율로 스케일하지 말고
  // 여백(M)·콘텐츠 폭만 유지한 채 flex 로 푼다 (시안은 절대좌표, 구현은 flex)
  designWidth: 375,
  designHeight: 812,
  screenMargin: 20, //  좌우 여백
  contentWidth: 335, // 375 기준 콘텐츠 폭 (참고용)
  gap: { chip: 8, element: 10, section: 16 },
} as const;

export const radius = {
  sm: 6, //     작은 배지·인디케이터
  image: 12, // 이미지 프레임
  control: 14, // 버튼·카드·인풋 (기본)
  sheet: 22, //  바텀시트·큰 카드
  pill: 999, //  알약 (칩·pill 버튼 — 시안의 r27 = 높이/2)
} as const;

// 터치 규칙 — docs/RULES.md "터치·접근성"
export const touch = {
  minTarget: 44, //  모든 탭 대상 최소 (pt)
  optionHeight: 52, // 선택지 행·칩
  buttonHeight: 54, // 주 CTA (lib.mjs button 기본)
  // 작은 글리프(지우기 × 19~22px)는 시각 크기를 키우지 말고 hitSlop 으로 44 확보
  hitSlopForSmallGlyph: { top: 12, bottom: 12, left: 12, right: 12 },
} as const;

// 그림자 — claude-figma-plugin SHADOW_PRESETS 와 동일 값.
// iOS 는 shadow*, Android 는 elevation 근사.
export const shadows = {
  sm: { shadowColor: "#3B2F26", shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, shadowOpacity: 0.06, elevation: 2 },
  md: { shadowColor: "#3B2F26", shadowOffset: { width: 0, height: 6 }, shadowRadius: 18, shadowOpacity: 0.08, elevation: 5 },
  lg: { shadowColor: "#3B2F26", shadowOffset: { width: 0, height: 10 }, shadowRadius: 28, shadowOpacity: 0.12, elevation: 9 },
  xl: { shadowColor: "#3B2F26", shadowOffset: { width: 0, height: 16 }, shadowRadius: 40, shadowOpacity: 0.16, elevation: 14 },
} as const;

// 모션 토큰 — 1. SPLASH/docs/MOTION.md. 시간은 3단계만, 사이 값 금지.
export const motion = {
  duration: { fast: 120, base: 250, slow: 300 } as const,
  spec: {
    screen: { duration: 250, easing: "ease-out" as const }, //           화면 전환: Fade only, 슬라이드 없음
    push: { os: true } as const, //                                      하위 화면: OS 기본 push
    sheet: { duration: 300, spring: 0.82, translateY: 40, dim: 0.3 }, // 바텀시트
    bubble: { duration: 220, easing: "ease-out" as const, translateY: 10, stagger: 90 }, // 말풍선
    press: { duration: 120, easing: "ease-in-out" as const, scale: 0.98 }, // 버튼 누름
    enable: { duration: 180, easing: "ease-out" as const, scale: 0.98 }, //  비활성→활성
    breathe: { duration: 2400, loop: true, scale: 1.015, translateY: -2 }, // 바바 호흡 (1.02 아님 — 보이지 않게 살아있는 정도)
    notice: { duration: 200, easing: "ease-out" as const, translateY: 6 }, // 오류·안내 등장. 흔들기·붉은 점멸 금지
  },
  // Reduce Motion: 이동·스케일·루프 전부 끄고 opacity 120ms 만. 바바 호흡도 정지.
  reduceMotion: { duration: 120, opacityOnly: true } as const,
} as const;

export const theme = { colors, gradients, emotions, typography, layout, radius, touch, shadows, motion } as const;
export type Theme = typeof theme;
export default theme;
