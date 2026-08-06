// MVP 전용 토큰 — 상류가 아직 흡수하지 않은 값만 모은다.
//
// 상류 리팩토링본 `momentory.css` 는 글자색을 semantic 6종 체계로 다시 짰고
// (`09_MVP/docs/RULES.md` 「접근성」 — "글자색은 semantic 6토큰만, Raw hex 금지"),
// 배경 그라디언트도 개정했다. 그런데 `05_도구/lib.mjs` → `theme.ts` 는 아직
// 옛 이름 체계(textPrimary·textSlogan·textLegalInk…)를 쓴다.
//
// **이 파일은 임시다.** 상류가 lib.mjs 에 반영하고 export-theme.mjs 를 다시 돌리면
// 여기를 지우고 화면 코드가 theme 을 직접 읽게 바꾼다. 그때까지 오버라이드는
// 화면 코드에 흩지 않고 이 한 곳에만 둔다.
//
// 2026-08-05 — 상류가 `textOnDark` 와 `primaryDeepPress` 를 흡수해서 **리터럴이 0개가 됐다.**
// 이제 이 파일은 순수한 이름 매핑이라 값이 어긋날 수 없다. 남은 일은 상류가 semantic 별칭을
// 6종 이름(textStrong·textCaption…)으로 바꾸는 것뿐이고, 그때 이 파일을 지운다.
//
// 2026-08-06 — **리터럴이 다시 생겼다.** MVP 값 정본은 `momentory.css` 인데 `theme.ts` 가
// 아직 그걸 따라오지 못했다. `.card` 의 반경 18 · 테두리 ink 10% · 여백 15/17 은
// `theme.radius`(sm 6 · image 12 · control 14 · sheet 22 · pill 999) 어디에도 없다.
// 화면 코드에 18 을 흩어 적는 것보다 여기 한 곳에 모으는 편이 낫고, 상류가 흡수하면 지운다.
// 근거는 `06_운영문서/OPEN-ISSUES.md` `R-42`.

import theme from "./theme";

const { palette, semantic } = theme.colors;

/**
 * 글자색 6종 — 화면 코드는 이것만 쓴다.
 * `momentory.css` 의 `--textStrong` … `--textOnDark` 와 1:1.
 */
export const text = {
  /** 제목·본문 강조 · 최소 4.5:1 (실측 11.9+) — css `--textStrong` */
  strong: semantic.textPrimary,
  /** 본문·설명·탭·보조 버튼 · 최소 4.5:1 — css `--textBody` */
  body: semantic.textBody,
  /** 각주·힌트·타임스탬프·placeholder·비활성 · 최소 3:1 — css `--textCaption` */
  caption: semantic.textSlogan,
  /** 반드시 읽혀야 하는 법적·안전 줄 · 최소 4.5:1 — css `--textLegal` */
  legal: semantic.textLegalInk,
  /** 강조 라벨·알림 제목·활성 탭 · 최소 4.5:1 — css `--textAccent` */
  accent: semantic.accentInk,
  /** 채운 버튼·잉크 면 위 — css `--textOnDark` */
  onDark: semantic.textOnDark,
  /** 삭제 등 되돌릴 수 없는 동작의 글자·테두리 — css `--dangerInk`. 면을 채우지 않는다 */
  danger: semantic.textDanger,
} as const;

/**
 * 면 색 — 글자가 얹히는 주황은 primaryDeep 이고, primary 는 장식 전용이다.
 * (`09_MVP/docs/RULES.md` · 상류 ISS-03)
 */
export const fill = {
  /** 주 버튼·체크의 면 — theme 의 accentFill 과 같은 값 */
  primaryDeep: palette.primaryDeep,
  /** 눌린 상태 — css `--primaryDeepPress` */
  primaryDeepPress: semantic.accentFillPress,
} as const;

/**
 * 카드 — `momentory.css` `.card` 그대로.
 *
 * ```css
 * .card{background:#FBF6EC;border:1px solid rgba(36,31,25,.1);
 *       border-radius:18px;padding:15px 17px;gap:8px}
 * ```
 *
 * ⚠ 원본 `05_도구/lib.mjs` `card()` 는 **r14 · 테두리 primary 30%** 로 다르다.
 * MVP 를 만들 때 그쪽을 보면 어긋난다 — MVP 판은 `flows/ui.mjs` `card2()` 다.
 */
export const card = {
  /** theme.radius 에 18 이 없다 */
  radius: 18,
  /** ink 10% — 0.1 × 255 = 25.5 → 1A */
  border: `${semantic.textPrimary}1A`,
  paddingVertical: 15,
  paddingHorizontal: 17,
  gap: 8,
} as const;

/**
 * 채팅 — `momentory.css` 의 `.conv` `.bub` `.bubme` `.ba` `.chip` `.chipOn` 그대로.
 *
 * ⚠ `COMPONENTS.md` 는 `BabaBubble` 을 "크림 카드, **테두리 없음**" 이라고 적지만
 * MVP 는 **테두리가 있다**(ink 10%). 칩 높이도 52 가 아니라 **44** 다(52 는 `.opt` 선택지 행).
 *
 * 모서리는 css 순서(TL TR BR BL)를 그대로 옮긴다 — 꼬리가 붙는 쪽만 6 이다.
 */
export const chat = {
  /** `.conv` + `.convTop` — **위에서부터** 쌓는다. gap 11 · 위 8 · 아래 4 */
  gap: 11,
  /**
   * `.convTop{justify-content:flex-start;padding-top:8px;overflow-y:auto}`
   *
   * v2(2026-08-06)가 대화를 **상단 정렬**로 뒤집었다 — 아래로 몰면 키보드가
   * 올라올 때 바바의 말이 가려진다(`RULES.md` 「원본과 다른 것」 `04`~`09`).
   * 시안의 시작 높이 100px 통일은 절대좌표 이야기다 — RN 에서는 모든 질문
   * 화면이 같은 `OnboardingTopBar` 아래에서 이 paddingTop 으로 시작하면 같다.
   */
  convTop: { paddingTop: 8, paddingBottom: 4 },
  /** `.bub` — 바바. 왼쪽 아래 꼬리 */
  baba: {
    maxWidth: 290,
    paddingVertical: 14,
    paddingHorizontal: 17,
    radius: { topLeft: 20, topRight: 20, bottomRight: 20, bottomLeft: 6 },
  },
  /** `.bubme` — 내 답. 오른쪽 아래 꼬리 */
  answer: {
    maxWidth: 280,
    paddingVertical: 12,
    paddingHorizontal: 16,
    radius: { topLeft: 20, topRight: 20, bottomRight: 6, bottomLeft: 20 },
  },
  /** `.ba` 52 · `.bas` 34. 바깥 링은 box-shadow `0 0 0 10px rgba(251,246,236,.5)` */
  avatar: { lg: 52, sm: 34, ring: 10 },
  /** `typing()` — 62×35 버블 안에 7px 점 3개, 12px 간격 */
  typing: { width: 62, height: 35, dot: 7, dotGap: 5 },
  /** `.chip` 44 (·`.opt` 52 는 다른 것) */
  chip: { minHeight: 44, paddingHorizontal: 16, gap: 8 },
} as const;

/** 채팅에서 쓰는 테두리·면 — `theme` 에 이름이 없는 것만 */
export const chatColor = {
  /** `.bub` `.chipOn` 아님 — 기본 칩 테두리 ink 14% (0.14 × 255 = 35.7 → 24) */
  chipBorder: `${semantic.textPrimary}24`,
  /** `.ba` 바깥 링 — rgba(251,246,236,.5). #FBF4E7 = textOnDark */
  avatarRing: `${semantic.textOnDark}80`,
  /** `.ba` 이미지가 없을 때의 바탕 */
  avatarBase: "#EFE5D4",
} as const;

/**
 * 입력 줄 — `momentory.css` `.tfield` 그대로 (`04` 닉네임 · `05-b` 나이).
 *
 * ```css
 * .tfield{min-height:56px;padding:0 18px;background:#FBF6EC;
 *         border:1.5px solid rgba(36,31,25,.24);border-radius:14px}
 * .tfieldOn{border:1.5px solid var(--primaryDeep);
 *           box-shadow:0 0 0 3px rgba(162,91,44,.12)}
 * ```
 *
 * ⚠ `08` 의 시간 선택 칸은 **다른 물건**이다 — 아래 `timeField`.
 */
export const inputRow = {
  height: 56,
  radius: 14,
  paddingHorizontal: 18,
  borderWidth: 1.5,
  /** ink 24% — 0.24 × 255 = 61.2 → 3D */
  border: `${semantic.textPrimary}3D`,
  /** placeholder 는 16px caption */
  fontSize: 16,
  /** `.tfieldOn` — 포커스. 테두리 primaryDeep + 3px 링 */
  focus: {
    border: palette.primaryDeep,
    /** rgba(162,91,44,.12) — primaryDeep 12% */
    ring: `${palette.primaryDeep}1F`,
    ringWidth: 3,
  },
} as const;

/**
 * `08` 시간 선택 칸 — `9-mvp.mjs` 의 raw rect. `.tfield` 와 반경·테두리가 다르다.
 * 탭하면 **OS 피커**가 열린다(`08.md` — 커스텀 휠 금지).
 */
export const timeField = {
  height: 56,
  radius: 16,
  paddingHorizontal: 20,
  borderWidth: 1,
  /** ink 14% — 0.14 × 255 = 35.7 → 24 */
  border: `${semantic.textPrimary}24`,
  fontSize: 15,
} as const;

/**
 * 지우기 × — `05-b` 나이 · `06-c` 기타. 시각 19px 원, **히트는 44**(hitSlop).
 * `05-b.md` — "선택을 되돌릴 길이 없으면 선택이 아니다."
 */
export const clearButton = {
  size: 19,
  /** `.othxi` — ink 14% 판 위 body × */
  background: `${semantic.textPrimary}24`,
  /** (44 - 19) / 2 — hitSlop 으로 44pt 를 채운다 */
  hitSlop: 12.5,
} as const;

/**
 * `.othr` — `06-b`·`06-c` 기타 인라인 입력 줄. 칩 **바로 아래** 한 줄이고
 * 별도 화면·시트로 보내지 않는다(`06-b.md`). 밑줄만 강조한다 — 칩 줄에
 * 사각 입력칸을 넣으면 칩과 같은 것으로 읽힌다.
 */
export const otherRow = {
  gap: 8,
  /** `.othk` 라벨 13px caption */
  labelSize: 13,
  field: {
    minHeight: 44,
    paddingHorizontal: 15,
    gap: 6,
    /** 위쪽만 둥근 사각 — 12 12 0 0 */
    radiusTop: 12,
    underline: 1.5,
  },
  /** `.othv` 값 · `.othp` placeholder — 500 14px */
  fontSize: 14,
  /** `.othc` 카운터 — 11px caption */
  counterSize: 11,
  maxLength: 12,
} as const;

/**
 * `.warn` — 한 줄 경고. 모달이 아니고 입력을 막지 않는다(`06-b.md`).
 * 배지와 같은 accentWash 면 위에 accent 글자.
 */
export const warnRow = {
  radius: 13,
  paddingVertical: 12,
  paddingHorizontal: 14,
  gap: 9,
  fontSize: 12,
  background: semantic.accentWash,
} as const;

/**
 * `.oauth` — `S1` 소셜 버튼. v2 에서 54 → **44 · r12** 로 바뀌었고
 * 공식 마크는 **왼쪽 16px 절대 정렬**이다(`S1.md` — 마크가 라벨과 함께
 * 흐르면 세 버튼의 글자 시작점이 어긋난다).
 */
export const oauth = {
  height: 44,
  radius: 12,
  markLeft: 16,
  markSize: 18,
  fontSize: 15,
} as const;

/**
 * 홈(`12`·`12-b`) — `momentory.css` 의 카드·행·버튼 그대로.
 *
 * **세 칸의 순서는 어떤 상태에서도 바뀌지 않는다**(`RULES.md`) — 오늘 일정 →
 * 오늘의 순간 → 돌아보기. 그래서 카드 셋의 값을 한자리에 모아 둔다.
 *
 * ⚠ **채운 버튼은 화면에 하나뿐**이다(`.addr`). 순간 추가(`.mbtnQ`)는 한 단계
 * 연한 톤이고, 원본의 알약(`.mbtn` 50·r25)과 **다른 물건**이다(`RULES.md`
 * 「원본과 다른 것」) — 여기서 `.mbtn` 을 쓰면 채운 버튼이 둘이 된다.
 */
export const home = {
  /** `.top` — 날짜 + 날씨 + 종 */
  top: { gap: 10, dateSize: 12, weatherGap: 4 },
  /** `.hero` — 바바 64(`.baL`) + 인사 20(`.htit`) */
  hero: { gap: 15, baba: 64, titleSize: 20, titleLineHeight: 28, letterSpacing: -0.4 },
  /** `.stack` — 카드 셋이 쌓이는 스크롤 영역 */
  stackGap: 12,
  /** `.daycard` — 오늘 일정 (구 「오늘의 하루」) */
  dayCard: {
    radius: 20,
    padding: 20,
    gap: 13,
    /** ink 16% — 0.16 × 255 = 40.8 → 29 */
    border: `${semantic.textPrimary}29`,
  },
  /** `.mcard` — 순간 카드. **배경 투명 · 테두리만** (위계를 카드 수로 늘리지 않는다) */
  momentCard: {
    radius: 20,
    paddingVertical: 15,
    paddingHorizontal: 18,
    gap: 9,
    /** ink 13% — 0.13 × 255 = 33.2 → 21 */
    border: `${semantic.textPrimary}21`,
  },
  /** `.rowc` — 회고 진입 줄 */
  retroRow: { radius: 20, paddingVertical: 15, paddingHorizontal: 18, gap: 12 },
  /** `.addr` — 일정 추가. **일정이 있든 없든 같은 크기·모양·색**(`12-b.md`) */
  addButton: { minHeight: 44, radius: 12, fontSize: 13 },
  /** `.mbtnQ` — 순간 추가. 왼쪽 정렬 사각 · 연필 · 테두리 primary 34% */
  momentButton: {
    minHeight: 46,
    radius: 12,
    paddingHorizontal: 14,
    gap: 9,
    fontSize: 13.5,
    /** `#FDFAF4` — card 보다 한 톤 밝은 면. 팔레트에 이름이 없다 */
    background: "#FDFAF4",
    /** primary 34% — 0.34 × 255 = 86.7 → 57 */
    border: `${palette.primary}57`,
  },
  /** `.sec` — 카드 안 섹션 라벨 (accent · 자간 .04em) */
  sectionLabel: { fontSize: 11.5, letterSpacing: 0.46 },
  /** `.dlist` · `.ir` — 일정 목록과 한 줄 */
  list: { gap: 13, rowGap: 11 },
  /** `.chk` / `.chkOff` — 마침 체크 원. 22 라서 hitSlop 으로 44 를 채운다 */
  check: {
    size: 22,
    /** ink 24% */
    borderOff: `${semantic.textPrimary}3D`,
    borderWidth: 1.5,
    /** (44 - 22) / 2 */
    hitSlop: 11,
  },
  /** `.it` — 일정 제목. **긴 제목은 한 줄 말줄임** */
  itemTitle: { fontSize: 14, lineHeight: 21 },
  /** 목록이 5개를 넘으면 5까지 펼치고 `[n개 더 보기]` 로 접는다 (`12.md`) */
  maxVisibleSchedules: 5,
} as const;

/**
 * 하단 시트 — `momentory.css` `.sheet` · `.scrimS` · `.grab`.
 *
 * 스크림이 **.38** 이라 뒤의 홈이 계속 보인다 — 어디서 왔는지가 화면에 남아
 * 있어야 닫고 나서 길을 잃지 않는다. (`.scrim` .62 는 코치마크용이고 MVP 밖)
 */
export const sheet = {
  radius: 26,
  paddingTop: 14,
  paddingBottom: 22,
  gap: 16,
  /** ink 38% — 0.38 × 255 = 96.9 → 61 */
  scrim: `${semantic.textPrimary}61`,
  /** ink 16% — 0.16 × 255 = 40.8 → 29 */
  grab: { width: 38, height: 4, color: `${semantic.textPrimary}29` },
} as const;

/**
 * `.tonebox` · `.mkrow` — 시트 안의 톤 박스와 행. 면은 `surfaceTone` 이고
 * 카드가 아니다 — 시트 위에 카드를 또 얹으면 위계가 한 겹 늘어난다.
 */
export const toneBox = {
  radius: 16,
  paddingVertical: 14,
  paddingHorizontal: 16,
  gap: 10,
  /** `.mkrow` — 52 행 */
  row: { minHeight: 52, paddingHorizontal: 18, gap: 11, radius: 16 },
} as const;

/**
 * `.em` · `.emOn` · `.egrid` — 감정 9종 격자(3열).
 *
 * **선택을 색만으로 표시하지 않는다**(`RULES.md` 「접근성」) — 테두리 1→**2px** ·
 * 글자 굵기 500→**600** · 면 색까지 함께 바뀐다. 테두리 색은 그 감정의 `ink`
 * (`.emOn{border-color:currentColor}`).
 */
export const emotionGrid = {
  columns: 3,
  gap: 7,
  cell: {
    minHeight: 46,
    radius: 14,
    /** `rgba(251,246,236,.6)` — card 60% */
    background: `${palette.card}99`,
    /** ink 12% — 0.12 × 255 = 30.6 → 1F */
    border: `${semantic.textPrimary}1F`,
    fontSize: 13,
    dot: 9,
    gap: 6,
  },
  /**
   * `.emBig` — `C3` 시작 감정 고르기. 64 높이에 점이 이름 **위**로 간다.
   * 아홉을 한 화면에 3×3 으로 다 보이므로 칸이 커도 접히지 않는다.
   */
  big: { minHeight: 64, gap: 7, dot: 14, flowGap: 8 },
  /** 켜진 칸의 면 — 감정색 22% */
  onAlpha: "38",
} as const;

/**
 * 회고 상단 — `momentory.css` `.nav` · `.navb` · `.navbHit`.
 *
 * 왼쪽 `‹` · (제목) · (시작 감정 알약) · `[잠시 쉬기]`. 온보딩의
 * `OnboardingTopBar` 와 다른 물건이다 — 저쪽은 진행 점을 들고 이쪽은 감정을 든다.
 * **진행률·단계 번호를 노출하지 않는다**(`C1.md`).
 */
export const retroNav = {
  height: 30,
  gap: 10,
  /** `.navb` — ‹ 글리프 19 · body */
  chevron: 19,
  /** `[잠시 쉬기]` — 12px caption */
  restSize: 12,
  titleSize: 15,
} as const;

/**
 * `.inp` · `.inpt` · `.send` — 회고 대화의 답변 입력 알약.
 *
 * **빠른 답변 칩·예시 placeholder 를 두지 않는다**(`C4.md`) — 보기를 주면
 * 사용자는 자기 말 대신 보기 중 하나를 고른다. 그래서 여기 있는 것은
 * 입력 한 칸과 보내기 하나뿐이다.
 */
export const chatInput = {
  radius: 999,
  paddingVertical: 7,
  paddingLeft: 16,
  paddingRight: 7,
  gap: 9,
  fontSize: 14,
  /** ink 12% — 0.12 × 255 = 30.6 → 1F */
  border: `${semantic.textPrimary}1F`,
  /** `.send` — 40 원형. 44 는 hitSlop 으로 채운다 */
  send: { size: 40, hitSlop: 2 },
} as const;

/**
 * `.dopt` — 회고 방향 4줄(`C4-c`). **네 줄의 무게가 모두 같다** — 추천 배지를
 * 두지 않으므로 켜진 줄만 달라 보인다(`C4-c.md`).
 *
 * 선택 표시는 **테두리(1→1.5px) + 배경 + 체크** 셋을 함께 쓴다 — 색 하나에
 * 기대지 않는다(`C4-c2.md`).
 */
export const directionOption = {
  minHeight: 44,
  radius: 14,
  paddingVertical: 12,
  paddingHorizontal: 15,
  gap: 3,
  titleSize: 13.5,
  descSize: 11.5,
  /** ink 16% — 0.16 × 255 = 40.8 → 29 */
  border: `${semantic.textPrimary}29`,
  onBorderWidth: 1.5,
  /** `.dlistw` — 선택지 영역만 스크롤된다. 제목과 버튼은 고정 */
  listGap: 6,
  /** 시트 최대 높이 74% */
  sheetMaxRatio: 0.74,
} as const;

/**
 * `.dirchip` · `.dirchipb` — 대화 가운데에 남는 방향 칩(`C4-d`).
 *
 * **칩이 경계선 역할을 한다** — 어디서부터 방향을 정하고 이야기한 것인지
 * 나중에 다시 봐도 보인다. 가운데 정렬이라 좌우의 말풍선과 구분된다.
 */
export const directionChip = {
  minHeight: 32,
  paddingHorizontal: 12,
  gap: 7,
  fontSize: 11.5,
} as const;

/**
 * `.addemo` — 감정이 비어 있는 줄에 붙는 **점선 알약**(`C2`).
 * 마침과 감정은 서로를 요구하지 않으므로 마치기 전에도 감정을 남길 수 있다.
 */
export const addEmotionChip = {
  fontSize: 11,
  paddingVertical: 5,
  paddingHorizontal: 9,
  /** ink 22% — 0.22 × 255 = 56.1 → 38 */
  border: `${semantic.textPrimary}38`,
} as const;

/**
 * `.sw` · `.swk` — 토글 스위치. 48×28 트랙에 22 손잡이.
 * 트랙 켜짐은 `primary` — **장식 전용 색이 맞는 자리**다(글자가 얹히지 않는다).
 */
export const toggle = {
  width: 48,
  height: 28,
  knob: 22,
  inset: 3,
  /** ink 18% — 0.18 × 255 = 45.9 → 2E */
  trackOff: `${semantic.textPrimary}2E`,
  trackOn: palette.primary,
} as const;

/**
 * `.epill` — 감정 알약. 면은 감정색 22%, 점과 글자는 그 감정의 `ink`.
 * **색만으로 감정을 판단하게 하지 않는다** — 이름을 항상 함께 쓴다(`RULES.md`).
 */
export const emotionPill = {
  height: 22,
  paddingVertical: 5,
  paddingHorizontal: 10,
  gap: 5,
  dot: 7,
  fontSize: 11.5,
  /** 면 알파 22% — 0.22 × 255 = 56.1 → 38 */
  fillAlpha: "38",
} as const;

/**
 * `.tabs` · `.tb` · `.tbOn` — 하단 탭 **네 칸**(홈·보관함·리포트·마이).
 * 쉼터가 MVP 밖이라 다섯이 아니라 넷이다(`RULES.md` 「자른 것」).
 * **아이콘은 아직 없다** — 현재는 라벨만(`RULES.md` 「아이콘」).
 */
export const tabBar = {
  paddingTop: 12,
  paddingHorizontal: 8,
  fontSize: 11.5,
  /** ink 8% — 0.08 × 255 = 20.4 → 14 */
  border: `${semantic.textPrimary}14`,
} as const;

/**
 * `.icoi` — 선 아이콘 한 벌(해 · 종 · 달 · 연필). 이모지를 쓰지 않는다 —
 * 기기마다 다르게 그려져 카드 안에서 크기가 튄다(`RULES.md` 「아이콘」).
 */
export const lineIcon = { strokeWidth: 1.5 } as const;

/**
 * `S0`·`S1` — 바바 발밑 그림자 92×8 / 24% (`9-mvp.mjs`).
 * 150×16 / 30% 는 캐릭터가 떠 있는 것처럼 보였다(`S0.md`).
 */
export const babaShadow = {
  color: "#8C6E4A",
  opacity: 0.24,
} as const;

/**
 * 배경 그라디언트.
 * 상류 `momentory.css` 가 `.scr` 을 `120% 90% at 50% 18%` 로 개정했고,
 * **진입 2장(S0·S1)만** 구 값 `115% 75% at 50% 26%` 를 유지한다.
 * (`09_MVP/docs/RULES.md` 「원본과 다른 것」)
 *
 * center·radius 는 화면 크기 대비 비율이다 — svg RadialGradient 에 그대로 넘긴다.
 */
export const gradients = {
  /** 기본 — MVP 28장 */
  screen: {
    center: [0.5, 0.18],
    radius: [1.2, 0.9],
    stops: theme.gradients.screen.stops,
  },
  /** 진입 2장 전용 — S0 · S1 */
  entry: {
    center: theme.gradients.screen.center,
    radius: theme.gradients.screen.radius,
    stops: theme.gradients.screen.stops,
  },
} as const;

export type ScreenGradient = (typeof gradients)[keyof typeof gradients];
