// paper.ts — 새 디자인 「손그림 다이어리」 토큰 정본 (2026-08-14 · PLAN.md D4)
//
// 이 파일은 이 저장소가 소유한다 — 상류 동기화 없음 (sync:theme 라인은 폐기 수순).
// 원 스펙: docs/design/design-system.md. 값이 문서와 어긋나면
// docs/design/prototype/*.dc.html 값이 이긴다 (docs/design/IMPORT.md).
// theme.ts(동결)·tokens.mvp.ts 의 참조가 전부 여기로 옮겨지면 그 둘은 삭제한다.

export const paperColors = {
  bg: {
    paper: "#F7F1E7", //     홈 화면 베이스
    paperDim: "#E6E1D6", //  그 외 화면 베이스
    flat: "#F7F4ED", //      회고·일기·리포트 베이스 (스카이 그라디언트 꼬리색)
    card: "#FFFDF8", //      홈 카드 (잉크 테두리 카드)
    cardOpaque: "#FDFBF5", //시트·상세 카드·모달·탭바
    cardSoft: "rgba(255,255,255,0.85)", // 쉼터·보관함·리포트 반투명 카드
    field: "#F7F4ED", //     입력 필드, 서브 배경
    fieldAlt: "#F1EDE3", //  아바타 원, 선택 안 된 칩
    titleChip: "#F3EADC", // 감정 시트 머리의 제목 칩
    hill: "#C7D3C0", //      곡선 언덕 섹션 (쉼터·보관함·리포트·회고·일기 하단)
    hillHome: "#AFD196", //  홈 잔디 — 위로 hillHomeMid·hillHomeTop 겹침
    hillHomeMid: "#C7E0AE",
    hillHomeTop: "#DDEBCB",
  },
  text: {
    primary: "#3C3830", //   본문·제목
    primaryHome: "#3C2E22", // 홈 전용 본문·제목
    ink: "#4A3B2C", //       홈 테두리·상태 텍스트
    green: "#5F6B4D", //     초록 면 위 보조 텍스트, 활성 탭 라벨 (흰 면 5.5 AA)
    greenStrong: "#4E5745", // 언덕(#C7D3C0) 면 위 필수 보조 텍스트 — green 은 3.65 미달 (대비 보정 · PLAN §4 Phase 1)
    muted: "#8F9A83", //     장식적 라벨 전용 — 흰 면 2.9 로 AA 미달. 필수 정보는 green/greenStrong
    mutedWarm: "#9A8874", // 홈 보조 — 장식 전용 (카드 위 3.4 미달)
    mutedWarmDeep: "#8C7A66", // 〃 (4.1 미달)
    mutedWarmText: "#7A6854", // 홈 카드·종이 위 보조 **글자** (5.25 / 4.75 AA · 대비 보정)
    faint: "#B9B2A2", //     플레이스홀더·비활성
    faintAlt: "#C4BEB2",
    doneWarm: "#A79883", //  홈 완료 일정 제목 (2.8 — 완료 상태 표현이라 예외 수용, 체크 원과 병행)
    // 캘린더 요일 머리 — 시안의 일 `#C98E7A`(2.7) · 토 `#7E93A8`(3.1) 은 둘 다
    // AA 미달이라 같은 색조를 유지한 채 어둡게 잡았다 (대비 보정)
    sunday: "#9C6047", //    일요일 (카드 위 4.94)
    saturday: "#5E7386", //  토요일 (카드 위 4.84)
    onDark: "#F7F4ED", //    어두운 면(토스트·선택일 #3C3830)의 글자 (10.6 AA)
    onFill: "#FFFFFF", //    색 면 버튼 위 글자 — greenDark 면에서 순백만 통과(4.52). onDark(4.11) 금지
  },
  line: {
    soft: "#E7E1D2", //      구분선·필드 테두리
    nav: "#EFEADE", //       탭바 상단선
    navHome: "#E5D9C6",
    ink: "#4A3B2C", //       홈 잉크 테두리 (1.5px)
    handle: "#C7BCA9", //    일정 줄의 끌기 손잡이 가로선
    grab: "#DED2BE", //      바텀시트 위쪽 그랩 핸들 (38×4)
    toggleOff: "#D8D2C2", // 스위치 꺼짐 트랙
    detail: "#EFE9DA", //    상세 카드 헤어라인
  },
  brand: {
    green: "#8FA28A", //     장식·채움 전용(체크·스위치 on·도넛) — 글자를 얹지 않는다(흰 글자 2.7)
    greenLight: "#A8B99E", //행동카드 배너 그라디언트 끝
    greenBorder: "#8C9A76", // 세그먼트·활성 탭 테두리
    greenDark: "#6E7B5C", // 선택 텍스트 · **흰 글자(onFill)가 얹히는 초록 버튼 면** (4.52 AA)
    greenCta: "#7C9E86", //  키보드 완료·홈 활성 탭 (장식 전용)
  },
  accent: {
    sand: "#C8A96B", //      「제안된 행동」 장식(선·아이콘) 전용 — 글자는 sandText
    sandText: "#8A6F3C", //  sand 역할의 글자용 (흰 면 4.67 AA · 대비 보정)
    danger: "#E4886C", //    장식·large 전용 (화남 감정과 동일 값 — 흰 글자 2.6)
    dangerFill: "#AD5A3F", //흰 글자(onFill)가 얹히는 위험 버튼 면 (4.87 AA · 대비 보정)
    dangerDeep: "#C2796A", //탈퇴 버튼·일요일 헤더 (흰 글자 3.4 — bold·large 전용)
  },
  neutral: {
    grey: "#B7AE9F", //      기능키·중지 버튼
    task: "#C4BCAF", //      감정 미선택 완료 일정
    tabInactiveBorder: "#C3C1B6",
    tabInactiveLabel: "#95928A",
  },
  overlay: {
    dim: "rgba(48,38,28,0.32)", //   시트·모달 딤
    dimDeep: "rgba(60,56,48,0.34)",
    toastBg: "rgba(60,56,48,0.92)",
  },
} as const;

// 스카이 그라디언트 (쉼터·보관함·마이 상단) — 프로토타입 stop 값
export const paperSky = {
  stops: ["#D6E8F0", "#E4EEF4", "#F2ECE0", "#F7F4ED"] as const,
  locations: [0, 0.25, 0.43, 0.58] as const,
} as const;

// 날씨 스카이 (홈) — ⚠ design-system.md §1.5 가 아니라 프로토타입 WEATHER 맵 값 (IMPORT.md 1)
//
// `ink`·`sub` 는 그 하늘 위에 얹히는 **글자색**이다. 시안은 날씨와 무관하게
// 날짜 `#3C2E22` · 날씨 라벨 `#5C7C8A` 하나로 두는데, `#5C7C8A` 는 네 하늘 전부에서
// AA 미달(1.2~3.5)이고 **밤 하늘에서는 어두운 글자 자체가 읽히지 않는다**(2.4).
// 그래서 하늘마다 짝을 정했다 (대비 보정 — PLAN.md Phase 1).
export const paperWeather = {
  맑음: { top: "#CFE9F0", top2: "#DCEEEF", sky: "#EAF4EA", ink: "#3C2E22", sub: "#40515C" },
  흐림: { top: "#D6E1E2", top2: "#DFE7E4", sky: "#EDF1EA", ink: "#3C2E22", sub: "#40515C" },
  비: { top: "#B9C7CC", top2: "#CBD6D6", sky: "#E9EEE6", ink: "#3C2E22", sub: "#40515C" },
  밤: { top: "#5C6C82", top2: "#8896A6", sky: "#E7ECE5", ink: "#F7F4ED", sub: "#F7F4ED" },
} as const;

export type PaperWeatherLabel = keyof typeof paperWeather;

/** 모르는 날씨 문구가 와도 화면은 그대로 그린다 — 맑음으로 떨어진다 */
export function paperWeatherOf(label: string) {
  return paperWeather[label as PaperWeatherLabel] ?? paperWeather.맑음;
}

// 하늘 위 구름·해·달 — 씬의 장식면 (글자가 얹히지 않는다)
export const paperSceneFill = {
  cloud: "#FFFFFF",
  sun: "rgba(255,255,255,0.92)",
  moon: "#F2EFE2",
  rain: "rgba(255,255,255,0.75)",
} as const;

// 감정 팔레트 — id·이름은 스키마(theme.ts emotions)를 유지하고 색·아이콘만 교체 (PLAN.md D3).
// icon 은 assets/moods/<icon>.png (Phase 1 자산 이관 후 require 맵은 컴포넌트 쪽에 둔다).
// id 8 은 새 팔레트(design-system.md §1.4)의 「두근함」 색·아이콘을 받되
// 이름은 「뿌듯함」 유지 — 2026-08-14 결정 (D3 닫힘).
export const paperEmotions = [
  { id: 1, name: "불안함", base: "#BFC7AE", icon: "mood-anxious" },
  { id: 2, name: "우울함", base: "#A9B5D9", icon: "mood-down" },
  { id: 3, name: "화남/답답", base: "#E4886C", icon: "mood-angry" },
  { id: 4, name: "행복함", base: "#F3D07A", icon: "mood-happy" },
  { id: 5, name: "막막함", base: "#C9AFA6", icon: "mood-stuck" },
  { id: 6, name: "무기력", base: "#C7C1B6", icon: "mood-flat" },
  { id: 7, name: "피곤함", base: "#B4C3CC", icon: "mood-tired" },
  { id: 8, name: "뿌듯함", base: "#EFA76B", icon: "mood-excited" },
  { id: 9, name: "평온함", base: "#A8C79B", icon: "mood-calm" },
] as const;
// 감정 미선택은 null — 색은 paperColors.neutral.task. 「없음」 감정 값을 만들지 않는다.
export type PaperEmotionId = (typeof paperEmotions)[number]["id"];

/** 감정색 한 곳 — 못 찾거나 미선택이면 중립색. 화면이 `find` 를 다시 쓰지 않는다 */
export function paperEmotionColor(id: number | null | undefined): string {
  return paperEmotions.find((e) => e.id === id)?.base ?? paperColors.neutral.task;
}

// 타이포 — Pretendard 400/700 두 단만 (D6). 폰트 파일·로드는 현행 유지.
// Android 는 fontWeight 가 안 먹는다 — fontFamily 파일 이름으로 (CLAUDE.md 규칙 5)
export const paperTypography = {
  fontFamily: { regular: "Pretendard-Regular", bold: "Pretendard-Bold" } as const,
  styles: {
    homeDate: { fontSize: 29, lineHeight: 36, letterSpacing: -0.5 }, // bold
    screenTitle: { fontSize: 24, lineHeight: 32 }, //                   bold
    sheetTitle: { fontSize: 19, lineHeight: 26 }, //                    bold — 시트·카드 큰 제목
    cardTitle: { fontSize: 16, lineHeight: 22 }, //                     bold
    bodyLg: { fontSize: 15, lineHeight: 24 },
    body: { fontSize: 14, lineHeight: 22 }, //                          본문 기본 (1.5~1.6)
    bodySm: { fontSize: 13, lineHeight: 20 },
    label: { fontSize: 12, lineHeight: 18 },
    caption: { fontSize: 11, lineHeight: 16 }, //                       최소 크기 — 이하 금지
  },
} as const;

export const paperRadius = {
  field: 12, //       입력 필드 (10~14 대역의 기본)
  toast: 14, //       토스트 알약
  chip: 16, //        감정 칩
  card: 16, //        일반 카드
  cardLg: 18, //      큰 카드·타일·배너
  cardHome: 20, //    홈 카드·모달
  sheet: 22, //       바텀시트 상단·상세 카드·세그먼트 트랙
  calendarCell: 12, //보관함 캘린더 셀 (쉼터 미니 캘린더는 8)
  calendarCellSm: 8,
  navIcon: 7, //      탭바 라운드 사각 아이콘
  pill: 999,
} as const;

// 그림자 — 얕은 3단 (rgba(60,56,48,…)). 홈만 예외: 그림자 대신 잉크 테두리 + 오프셋
export const paperShadows = {
  flat: {
    shadowColor: "#3C3830",
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    shadowOpacity: 0.05,
    elevation: 1,
  },
  raised: {
    shadowColor: "#3C3830",
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.07,
    elevation: 3,
  },
  floating: {
    shadowColor: "#3C3830",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 22,
    shadowOpacity: 0.16,
    elevation: 9,
  },
} as const;

// 홈 전용 카드 스타일 — 테두리 1.5px 잉크 + 아래로 3px 단색 오프셋
export const paperHomeCard = {
  borderWidth: 1.5,
  borderColor: paperColors.line.ink,
  shadow: {
    shadowColor: "#4A3B2C",
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 0,
    shadowOpacity: 0.12,
    elevation: 2,
  },
} as const;

// 곡선 언덕 — border-radius 50% 50% 0 0 / 100% 100% 0 0, 폭 140%(좌 -20%),
// 높이 54~64 를 26~34 컨테이너로 잘라 쓴다. react-native-svg 로 그린다 (Hill 컴포넌트)
export const paperHill = {
  widthRatio: 1.4,
  height: { sm: 26, md: 30, lg: 34 }, //  잘라 쓰는 컨테이너 높이
  curveHeight: 60, //                     원 곡률 계산용 원 높이 (54~64 대역)
} as const;

/**
 * 캘린더 — 보관함(`A1`)의 큰 칸과 쉼터 행동카드의 작은 칸.
 * 「기록 있는 날」은 면이 밝아지고, 선택일은 잉크 면 + 밝은 글자다.
 */
export const paperCalendar = {
  cell: { size: 54, radius: paperRadius.calendarCell, gap: 6, icon: 22 },
  mini: { size: 27, radius: paperRadius.calendarCellSm, gap: 5 },
  dayHeaderSize: 11,
  recorded: "rgba(255,255,255,0.92)",
  empty: "rgba(247,244,237,0.55)",
  selected: paperColors.text.primary,
  onSelected: paperColors.text.onDark,
} as const;

/** 리포트 — 주간 감정 도넛과 초록 통계 패널 */
export const paperReport = {
  donut: 178,
  hole: 100,
  /** 기록이 없는 주의 고리 */
  emptyRing: "#DCD6C8",
  /** 통계 패널 — **흰 글자가 얹히므로 `greenDark`** 다(`brand.green` 은 2.7) */
  panel: paperColors.brand.greenDark,
  divider: "rgba(255,255,255,0.3)",
} as const;

/** 회고 대화 — 말풍선 둘과 입력 독 (`회고.dc.html`) */
export const paperChat = {
  baba: {
    background: paperColors.bg.cardSoft,
    radius: { topLeft: 14, topRight: 14, bottomRight: 14, bottomLeft: 4 },
    maxWidth: "84%",
  },
  me: {
    background: paperColors.text.primary,
    color: paperColors.text.onDark,
    radius: { topLeft: 14, topRight: 14, bottomRight: 4, bottomLeft: 14 },
    maxWidth: "76%",
  },
  dot: paperColors.text.faint,
  dock: { background: "rgba(255,255,255,0.9)", radius: 20, send: 42 },
} as const;

// 탭바 — 5탭: 홈 · 쉼터 · 보관함 · 리포트 · 마이 (PLAN.md D1)
export const paperTabBar = {
  bg: paperColors.bg.cardOpaque,
  line: paperColors.line.nav,
  icon: { size: 22, borderWidth: 1.5, radius: paperRadius.navIcon },
  active: {
    border: paperColors.brand.greenBorder,
    tint: "rgba(143,162,138,0.14)",
    label: paperColors.text.green,
  },
  inactive: {
    border: paperColors.neutral.tabInactiveBorder,
    label: paperColors.neutral.tabInactiveLabel,
  },
  labelSize: 11,
} as const;

// 모션 — reduceMotion 시 트랜지션은 즉시 표시로 대체 (opacity 만 120ms)
export const paperMotion = {
  sheet: { duration: 300, bezier: [0.3, 0.9, 0.3, 1] as const }, // 패널·시트 올라옴
  dim: { duration: 240 }, //                                        딤 페이드
  fadeIn: { duration: 240 }, //                                     .16~.28s 대역의 기본
  chip: { duration: 180 }, //                                       칩 상태 변화
  breathe: { inhale: 4000, hold: 7000, exhale: 8000 }, //           감각 연못 4-7-8 (Phase 5)
  chatSentenceGap: 540, //                                          봇 발화 문장 간격
  chatReplyDelay: 700, //                                           응답 대기
  reduceMotion: { duration: 120 },
} as const;

export const paper = {
  colors: paperColors,
  sky: paperSky,
  weather: paperWeather,
  emotions: paperEmotions,
  typography: paperTypography,
  radius: paperRadius,
  shadows: paperShadows,
  homeCard: paperHomeCard,
  hill: paperHill,
  tabBar: paperTabBar,
  motion: paperMotion,
} as const;
export type Paper = typeof paper;
export default paper;
