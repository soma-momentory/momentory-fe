/**
 * Momentory DS — **홈 v2 전용** 색 · 서체 · 크기 (2026-10-15 · 계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §2.6).
 *
 * 홈 v2 는 Claude Design 시안의 모눈 종이·손글씨·종이 조각을 쓴다.
 * 서체는 2026-11-01 사용자 요청으로 교보손글씨로 통일했다(Gaegu 파일은 같은 날 지웠다). 초기 시안의 색·크기는 유지한다.
 * 결정 HD-3 — 이 결은 **홈 한 화면만의 것**이고 글로벌 DS(`color.ts` · `typography.ts`)는 그대로다.
 * 그래서 `pond.ts` · `notebook.ts` · `diaryMemo.ts` 처럼 화면 전용 묶음 하나로 둔다.
 * `features/home/ui/v2/` 밖에서 쓰지 않는다.
 *
 * 값의 1차 근거는 Lab 번역(`expo-lab/src/claude-home/tokens.ts`)이다 — 운영 코드는 그 파일을
 * import 하지 않고, 쓰는 값만 여기로 옮겼다. 시안의 **목 감정 색(`mood`)은 옮기지 않는다** —
 * 도크는 실제 감정 조약돌(`EmotionPebble`)을 그린다(계획 §2.4).
 *
 * ## 대비 보정 둘 (`PLAN.md` A-5 선례)
 *
 * | 이름         | 시안      | 운영판    | 이유                                                     |
 * | ------------ | --------- | --------- | -------------------------------------------------------- |
 * | `taskDone`   | `#A8988A` | `#7D6D5E` | 마친 일정은 **읽히는 글자**다 — 카드 위 2.63 → 4.69       |
 * | `taskBorder` | `#C9BBA8` | `#998674` | 체크 테두리는 비텍스트 UI 3:1 — 1.77 → 3.29               |
 *
 * 되돌리면 `__tests__/contrast.test.ts` 「홈 v2」 묶음이 깨진다.
 *
 * ## 서체 — 로그인 외 앱 전체와 같은 교보손글씨 (2026-11-01)
 *
 * regular·bold는 같은 단일 파일을 가리킨다. 크기·색·배치로 위계를 유지한다.
 */
import { withAlpha } from "./color";
import { fontFamily } from "./typography";

const ink = "#48291A";
const card = "#FBF8F1";
const shadow = "#48291A";

export const homeV2 = {
  color: {
    /** 화면 바탕 — 모눈 종이 */
    paper: "#F6F1E7",
    /** 모눈 선(22px 칸) — 장식 */
    grid: "#EAE2D3",
    /** 히어로 · 일정 목록 · 빈 일정 카드 면 */
    card,
    white: "#FFFFFF",
    /** 글자 — 종이 위 11.60 · 날짜 종이 9.23 · 요일 종이 6.23 */
    ink,
    /** 보조 글자(리마인더 · 셈 · 빈 일정 설명) — 카드 5.87 · 종이 5.53 */
    muted: "#7A5A44",
    /** 주 CTA 면 · 체크 면 — 흰 글자 5.10 */
    green: "#5B7553",
    /** 녹색 테이프 · 끝맺음 알갱이 같은 옅은 장식 */
    greenSoft: "#B9CBA8",
    /** 오늘 요일 글자의 형광 — **밑줄과 함께** 오늘을 말한다(색만으로 말하지 않는다) */
    today: "#F6DE8A",
    /** 날짜 종이 조각 */
    date: "#E9D6BF",
    /** 요일 종이 조각 */
    weekday: "#CDAE8A",
    /** 날씨 스티커 테이프(P4 — 지금은 그리지 않는다) */
    weatherTape: "#DEC4A0",
    /** 일정 줄 사이 · 놓일 자리 */
    separator: "#EFE7DA",
    /** 빈 일정 카드 테두리 */
    emptyBorder: "#E3D8C6",
    /** 그림자 색 — 잉크와 같은 갈색 */
    shadow,
    /** 읽지 않음 점(P5) — 종이 위 3.13 · 비텍스트 3:1 */
    alert: "#E2603A",
    /** 체크 테두리 — **보정**(시안 `#C9BBA8` 1.77) */
    taskBorder: "#998674",
    /** 마친 일정 글자 — **보정**(시안 `#A8988A` 2.63) */
    taskDone: "#7D6D5E",
    /**
     * 「일기는 있는데 감정이 없는 날」의 **채운 조약돌**(결정 DN-1).
     * 기록 없는 날의 테두리 조약돌(`no-emotion.png`)과 **면이 있고 없음 + 가운데 점**으로 갈린다 —
     * 색만으로 가르지 않는다
     */
    writtenPebble: "#DCC9AC",
    /** 그 조약돌 가운데 「썼다」 점 */
    writtenMark: ink,
    /** 도크 · 떠 있는 면 — 모눈이 살짝 비친다 */
    dock: withAlpha(card, 0.92),
    /** 바바 발밑 풀빛 그림자 */
    heroGround: "rgba(169,190,140,.7)",
    /** 히어로 위 녹색 체크무늬 테이프 */
    tapeBase: "rgba(255,255,255,.5)",
    tapeStripe: "rgba(150,175,135,.45)",
  },
  /** 종이 위에 뜬 것들의 그림자 — 잉크색을 옅게(시안 값) */
  shadow: {
    hero: `0px 6px 18px ${withAlpha(shadow, 0.08)}`,
    bubble: `0px 4px 12px ${withAlpha(shadow, 0.1)}`,
    sticker: `0px 2px 6px ${withAlpha(shadow, 0.1)}`,
    dock: `0px 8px 24px ${withAlpha(shadow, 0.12)}`,
  },
  font: { regular: fontFamily.hand, bold: fontFamily.hand },
  /** v2 의 px 값 — **최소 14**(`DESIGN.md` 손글씨 최소 크기) · 배율 상한은 `maxFontScale` */
  type: {
    date: { fontSize: 36, lineHeight: 42 },
    weekday: { fontSize: 18, lineHeight: 24 },
    bubble: { fontSize: 25, lineHeight: 29 },
    note: { fontSize: 18, lineHeight: 23 },
    cta: { fontSize: 20, lineHeight: 25 },
    sectionTitle: { fontSize: 22, lineHeight: 28 },
    count: { fontSize: 17, lineHeight: 24 },
    add: { fontSize: 18, lineHeight: 24 },
    task: { fontSize: 19, lineHeight: 25 },
    emptyTitle: { fontSize: 22, lineHeight: 25 },
    emptyBody: { fontSize: 18, lineHeight: 22 },
    dockTitle: { fontSize: 17, lineHeight: 19 },
    dockDay: { fontSize: 14, lineHeight: 16 },
    dockPicked: { fontSize: 16, lineHeight: 20 },
  },
  size: {
    /** 모눈 한 칸 */
    grid: 22,
    hero: { height: 270, radius: 16, marginTop: 34 },
    baba: { width: 170, height: 227 },
    cta: { height: 50 },
    /** 원형 체크 — 히트는 44 그대로(hitSlop) */
    check: 24,
    checkBorder: 1.75,
    list: { radius: 14, paddingX: 14 },
    dock: { height: 72, radius: 24, pebble: 28, gap: 12 },
    bell: { dot: 8 },
  },
  /** 종이 조각 · 스티커의 기울기 — 장식 */
  tilt: {
    date: "-3deg",
    weekday: "-1deg",
    bubble: "-2deg",
    note: "-4deg",
    tape: "-2deg",
    add: "-3deg",
    ground: "-3deg",
    weather: "7deg",
    weatherTape: "-4deg",
  },
} as const;
