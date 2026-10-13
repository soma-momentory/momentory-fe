import { Dimensions, Platform, type TextStyle } from "react-native";

/**
 * Momentory DS — 타이포. 정본은 `docs/DESIGN.md` §2.
 *
 * Wanted 19단 스케일에서 앱이 쓰는 **12단만** 꺼냈다(`DESIGN.md` 본문은 「11단」이라
 * 적었지만 표에는 12줄이 있다 — 표를 따랐다). Display·Title 1 은 앱에서 쓰지 않는다.
 *
 * ## 서체는 **교보손글씨 하나다** (2026-09-06)
 *
 * 그전에는 Pretendard 4웨이트가 본문을 맡고 손글씨는 제목·일기에만 썼다. 지금은
 * **로그인(`S1`)을 뺀 앱 전체**가 손글씨다.
 *
 * ⚠ **웨이트로 위계를 만들 수 없다.** 교보손글씨는 파일이 하나여서 `regular` ·
 * `medium` · `semibold` · `bold` 가 **전부 같은 글자**로 그려진다 — 이름은 단이
 * 원래 뜻하던 굵기의 **기록**으로 남겨 둔 것이고(되돌릴 때 그대로 쓴다), 실제
 * 위계는 이제 **크기·색·자리**만으로 선다. 굵기를 올려 강조하려는 코드는 아무
 * 일도 하지 않는다.
 *
 * ⚠ 그래도 **웨이트를 `fontWeight` 로 주지 않는다** — Android 에서 안 먹는다.
 * **파일 이름**으로 준다(`CLAUDE.md` 규칙 5).
 */

/** 교보손글씨 2025 lyb — `assets/fonts/` 에 파일 하나, 웨이트도 하나다 */
const HAND = "KyoboHandwriting2025lyb";

/**
 * **로그인(`S1`) 하나만 쓰는 고딕**(2026-09-06).
 *
 * 로그인은 앱을 처음 만나는 자리이고 약관·오류 같은 **읽고 판단하는 글**이 모여
 * 있어서, 여기만 Pretendard 로 남긴다. 네 파일 다 `assets/fonts/` 에 있고
 * `src/lib/providers.tsx` 가 계속 로드한다 — 다른 화면이 집어 쓰지 않도록
 * `fontFamily` 토큰에는 올리지 않았다.
 */
export const gothicFamily = {
  regular: "Pretendard-Regular",
  medium: "Pretendard-Medium",
  semibold: "Pretendard-SemiBold",
  bold: "Pretendard-Bold",
} as const;

/**
 * 단이 고르는 서체. **네 이름이 전부 같은 파일을 가리킨다** — 위 머리말 참고.
 * `hand` 는 원래부터 이 서체였고, 이름을 쓰던 자리(제목·일기)를 그대로 둔다.
 */
export const fontFamily = {
  regular: HAND,
  medium: HAND,
  semibold: HAND,
  bold: HAND,
  hand: HAND,
} as const;

/**
 * 로그인 예외를 거는 손잡이 — **크기·행간은 단 그대로 두고 서체만 되돌린다.**
 *
 * `Text` 가 `style` 을 `variant` **뒤에** 얹으므로 이것 하나만 넘기면 된다
 * (`components/ds/Text.tsx`). 부르는 쪽이 그 단의 원래 굵기를 골라 준다 —
 * `fontFamily` 가 굵기를 잃어서 단 이름만으로는 되찾을 수 없다.
 */
export const gothic = {
  regular: { fontFamily: gothicFamily.regular },
  medium: { fontFamily: gothicFamily.medium },
  semibold: { fontFamily: gothicFamily.semibold },
  bold: { fontFamily: gothicFamily.bold },
} as const;

/**
 * 서체 이름 하나. ⚠ 「weight」라고 부르지만 `hand` 처럼 **웨이트가 아닌 것도**
 * 들어 있다 — `fontFamily` 의 키 전부다.
 */
export type FontWeightName = keyof typeof fontFamily;

/**
 * 한 단 = fontFamily + size + lineHeight. 화면이 셋을 따로 조합하지 않는다.
 * `Required` 인 이유 — 셋 다 **반드시 있다**. optional 로 두면 값을 꺼내 쓰는 쪽
 * (예: 여러 줄 입력의 최대 높이 계산)이 매번 `undefined` 를 처리해야 한다.
 */
type Style = Required<Pick<TextStyle, "fontFamily" | "fontSize" | "lineHeight">>;

/**
 * **기준 기기 폭.** 이 저장소가 화면을 맞춰 온 기기가 iPhone 16(393)이다 —
 * 시안의 375 가 아니다. 375 를 기준으로 잡으면 이미 검수를 마친 기준 기기의
 * 글자까지 커진다.
 */
const REFERENCE_WIDTH = 393;

/**
 * 넓은 기기의 상한. 17 Pro Max(440)가 440/393 = 1.12 라 사실상 그 기기가 천장이고,
 * 더 넓은 기기가 나와도 여기서 멈춘다 — 고정 높이 그릇(Button 48 · Chip 36 · 탭바)은
 * 함께 커지지 않기 때문에 배율을 끝없이 올리면 글자가 그릇을 뚫는다.
 */
const MAX_TYPE_SCALE = 1.12;

/**
 * **기기 폭 보정.** 넓은 화면에서 글자가 작아 보이던 것을 되돌린다.
 *
 * 같은 pt 의 글자는 화면이 넓을수록 작아 **보인다** — 눈이 글자를 화면 대비로 읽기
 * 때문이다. 실제로 Pro Max 둘(428·440)에서만 「글자가 작다」는 말이 나왔다
 * (2026-08-28). 그래서 기준 기기보다 넓은 만큼만 키우고, 좁은 기기는 **건드리지
 * 않는다**(하한 1) — SE·13 mini 는 이미 빠듯하다.
 *
 * ⚠ 세로 화면 전용 앱이라 모듈이 올라올 때 한 번 잰다(`supportsTablet: false` ·
 * 회전 없음). 회전을 열게 되면 이 값이 갱신되지 않는다는 것을 먼저 본다.
 */
const widthScale = Math.min(
  Math.max(Dimensions.get("window").width / REFERENCE_WIDTH, 1),
  MAX_TYPE_SCALE,
);

/**
 * **iOS 보정 — 같은 단을 한 뼘 크게 그린다** (2026-09-13 · 실기기 대조).
 *
 * 12단 값은 두 OS 가 나눠 쓴다. 그런데 **같은 숫자가 눈에 닿는 크기는 다르다** —
 * 안드로이드 기기는 비슷한 물리 폭을 360dp 안팎으로 세는데 iPhone 은 393pt 로 세니
 * 1pt 가 1dp 보다 물리적으로 작다. 여기에 교보손글씨의 얇은 획이 겹친다.
 *
 * **값은 실기기에서 골랐다.** 폭 비율만 보면 393/360 ≈ 1.09 인데, 기기 텍스트 크기를
 * 기본으로 둔 아이폰(390pt)에서 나란히 보고 **1.2 가 낫다**고 정했다. 1.09~1.2 가
 * 그때 검토한 폭이다.
 *
 * ⚠ **안드로이드는 1 이다** — 그쪽 크기는 이미 검수를 마쳤다(2026-09-13 · 사용자 결정).
 * ⚠ 값은 여기 하나뿐이다. 「iOS 만 조금 더/덜」은 이 숫자를 고쳐서 한다 —
 * 화면에서 `fontSize` 를 따로 올리기 시작하면 스케일이 무너진다.
 * ⚠ **이 배율은 `maxFontScale` 이 나누지 않는다**(아래 주석). 나누면 시스템 텍스트
 * 크기를 키워 둔 기기에서 확대가 통째로 상쇄돼 아무 일도 일어나지 않는다.
 */
const IOS_TYPE_BOOST = 1.2;

/**
 * 단 값에 곱하는 **최종 배율** — 기기 폭 보정 × 플랫폼 보정.
 *
 * 고정 높이 그릇(Button 48 · Chip 36 · 탭바 `minHeight` 56)은 함께 커지지 않지만,
 * 가장 큰 조합(440 기기의 iOS · 1.12 × 1.2 = 1.34)에서도 라벨 단(14·13·12 → 19·17·16)은
 * 그릇 안에 남는다 — 탭바는 `minHeight` 라 필요하면 스스로 늘어난다.
 */
export const typeScale = widthScale * (Platform.OS === "ios" ? IOS_TYPE_BOOST : 1);

/** 보정한 단 — 반올림해 정수로 떨어뜨린다(픽셀 격자에 얹혀 또렷하게) */
const scaled = (v: number) => Math.round(v * typeScale);

/**
 * 12단 **밖에서** 크기를 적어야 하는 자리가 같은 보정을 타게 하는 손잡이
 * (시간 휠의 17/24 한 곳 — `components/ds/WheelPicker`). 새 자리를 여는 문이
 * 아니다: 단으로 될 일이면 `text` 를 쓴다.
 */
export const scaleFont = scaled;

/**
 * **버튼 글자만 한 번 더 — iOS 한정** (2026-09-13 · 사용자 요청).
 *
 * 전역 `IOS_TYPE_BOOST` 위에 **버튼 라벨에만** 더 얹는다. 버튼은 손가락이 가는
 * 자리라 같은 단이어도 한 눈에 읽혀야 하는데, 12단에서 버튼이 쓰는 `label1`(14)·
 * `label2`(13)는 본문(16)보다 작아서 전역 보정만으로는 여전히 작게 읽혔다.
 *
 * ⚠ **안드로이드는 1 이다** — 전역 보정과 같은 규칙이다.
 * ⚠ 그릇을 뚫지 않는지 함께 본다. 가장 큰 조합(440 기기 · 1.12 × 1.2 × 1.15 = 1.54)에서
 *   `buttonLabel` 의 행간이 20 → 31 인데 Large 48 · Medium 40 안에 남는다.
 *   Small 32 는 `buttonLabelSmall`(18 → 28)이라 역시 들어간다.
 * ⚠ 로그인의 소셜 버튼은 **여기 안 든다** — 글자 없이 둥근 네모 안에 로고만 둔다
 *   (`SocialButton` · `DESIGN.md` 로그인 절).
 */
const BUTTON_BOOST = Platform.OS === "ios" ? 1.15 : 1;

const style = (family: FontWeightName, fontSize: number, lineHeight: number): Style => ({
  fontFamily: fontFamily[family],
  fontSize: scaled(fontSize),
  lineHeight: scaled(lineHeight),
});

export const text = {
  /** 28/38 700 — 브랜드 워드마크, 페이지 제목 */
  title2: style("bold", 28, 38),
  /** 24/32 700 — 화면 제목(일기 상세 등). ⚠ **탭 제목 셋은 `title3Hand`** 다 */
  title3: style("bold", 24, 32),
  /**
   * 40/52 손글씨 — **진입 워드마크 하나**(`S0` 스플래시 · `S1` 로그인의 「모멘토리」).
   * 앱에서 가장 큰 글자다.
   *
   * 진입 2장은 브랜드를 처음 보이는 자리라, 워드마크를 **본문 위계 밖의 한 단
   * 큰 손글씨**로 세운다 — 고딕 `title2`(28)로는 로고가 아니라 화면 제목처럼
   * 읽혔다. 손글씨는 같은 크기의 고딕보다 작아 보여(획이 얇다) 더 키운다.
   * **두 화면이 같은 단을 써야** S0→S1 이 워드마크에서 흔들리지 않는다
   * (`app/index.tsx` 「같은 블록」). 40/52 는 `title1Hand` 의 행간비를 그대로 이었다.
   */
  wordmarkHand: style("hand", 40, 52),
  /**
   * 32/42 손글씨 — **홈 날짜 하나**. 본문 화면에서 가장 큰 글자다
   * (진입 워드마크 `wordmarkHand` 만 이보다 크다).
   *
   * 손글씨는 같은 크기의 고딕보다 작아 보인다(획이 얇고 글자 면이 좁다) —
   * 28(`title2`)로는 「가장 큰 자리」로 읽히지 않아 2026-08-22 에 한 단 더 올렸다.
   * **Wanted 스케일에서 안 쓰던 Title 1 자리를 이 한 곳에만 연 것이고**, 32/42 는
   * 우리가 정한 값이다(반입 패키지를 지워 원본 Title 1 값을 확인할 수 없다 —
   * 24/32 · 28/38 의 행간비 1.33 을 그대로 이었다). `DESIGN.md` §2.
   */
  title1Hand: style("hand", 32, 42),
  /** 24/32 손글씨 — 탭 제목 셋(쉼터·보관함·마이). 같은 크기의 `title3` 와 짝이다 */
  title3Hand: style("hand", 24, 32),
  /**
   * 14/20 손글씨 — **홈 날짜 아래 요일 한 줄**. 날짜와 한 덩어리로 읽혀야 해서
   * 서체를 같이 간다(`label1` 과 크기·행간이 같다).
   *
   * ⚠ 손글씨 중 **가장 작은 자리**다. 이보다 작게 쓰지 않는다 — 획이 얇아
   * 처음 잡았던 12 에서는 읽기가 아니라 무늬에 가까웠다(2026-08-22 · 12→14).
   */
  label1Hand: style("hand", 14, 20),
  /**
   * 20/28 손글씨 — **메모지 테이프에 적은 제목**(일기 확인 `C6` 의 「n월 n일의 일기」 ·
   * 「오늘 일정」). 테이프는 종이보다 좁은 띠라 화면 제목(`title3Hand` 24)보다 한 단 낮춘다.
   */
  tapeHand: style("hand", 20, 28),
  /** 22/30 600 — 카드·시트 제목, 온보딩 질문 */
  heading1: style("semibold", 22, 30),
  /** 18/26 600 — 리스트 강조, 값 표시 */
  headline1: style("semibold", 18, 26),
  /** 16/24 500 — 리스트·본문 기본 */
  body1: style("medium", 16, 24),
  /** 16/26 400 — 일기 본문, 대화 메시지 */
  body1Reading: style("regular", 16, 26),
  /**
   * 16/26 손글씨 — **일기 본문(손글씨)**. 회고 일기 확인·저장 화면이 날짜
   * 제목(`title3Hand`)과 짝을 이뤄 손으로 쓴 결처럼 보이게 한다. `body1Reading`
   * 과 크기·행간이 같아 서체만 바뀌고 읽기 레이아웃은 그대로다.
   */
  body1ReadingHand: style("hand", 16, 26),
  /**
   * 18/30 손글씨 — **보관함 일기 상세의 본문**. `body1ReadingHand`(16/26)보다 한 단
   * 크게 읽는다. 상세는 그날의 기록을 **읽기만** 하는 자리라(회고 저장 화면처럼
   * 고쳐 쓰지 않는다) 손글씨를 더 키워도 입력 눈금과 어긋날 일이 없다.
   */
  body1ReadingHandLg: style("hand", 18, 30),
  /** 15/22 500 — 보조 본문 */
  body2: style("medium", 15, 22),
  /** 15/24 400 — 설명 문단 */
  body2Reading: style("regular", 15, 24),
  /** 14/20 600 — 입력 라벨, 섹션 제목. ⚠ **버튼은 `buttonLabel`** 이다 */
  label1: style("semibold", 14, 20),
  /** 13/18 600 — 칩, 카드 라벨. ⚠ **작은 버튼은 `buttonLabelSmall`** 이다 */
  label2: style("semibold", 13, 18),
  /**
   * `label1` × 버튼 보정 — **Large·Medium 버튼 라벨**. iOS 에서만 `label1` 보다 크고
   * 안드로이드에서는 `label1` 과 **같은 값**이다(`BUTTON_BOOST` 머리말).
   */
  buttonLabel: style("semibold", 14 * BUTTON_BOOST, 20 * BUTTON_BOOST),
  /** `label2` × 버튼 보정 — **Small 버튼 라벨**. 안드로이드에서는 `label2` 와 같다 */
  buttonLabelSmall: style("semibold", 13 * BUTTON_BOOST, 18 * BUTTON_BOOST),
  /** 12/16 500 — 메타, 헬퍼, 탭 라벨 */
  caption1: style("medium", 12, 16),
  /** 11/14 600 — 최소 캡션, 약관. **이보다 작게 쓰지 않는다** */
  caption2: style("semibold", 11, 14),
} as const;

export type TextToken = keyof typeof text;

/**
 * **iOS 에서만 다른 단을 쓴다** (2026-09-13 · 사용자 결정).
 *
 * 이 세션의 크기 조정은 **전부 iOS 한정**이다 — 안드로이드는 이미 검수를 마쳤고,
 * 같이 건드리면 두 번 검수해야 한다. 배율(`IOS_TYPE_BOOST`·`BUTTON_BOOST`)은 스스로
 * 플랫폼을 보지만, **단 자체를 갈아끼우는 자리**는 이 손잡이를 지난다.
 *
 * `Platform.OS` 를 화면마다 적지 않게 한 곳에 모은 것이다 — 나중에 「안드로이드도
 * 같이 간다」로 바뀌면 여기 하나만 고치면 된다.
 */
export const iosVariant = <T extends TextToken>(ios: T, android: T): T =>
  Platform.OS === "ios" ? ios : android;

/**
 * 글꼴 배율 **천장**. 시스템 글꼴 크기(iOS 「텍스트 크기」 · 안드로이드 「글꼴/화면
 * 크기」)를 그대로 따라가면 배율이 1.5·2.0 까지 올라 고정 높이 그릇(Button 48 ·
 * Chip 36 · 탭바)을 글자가 뚫는다 — 접근성을 죽이는 `allowFontScaling={false}`
 * 대신의 절충값이다.
 *
 * `components/ds/Text` 가 이 값을 `maxFontSizeMultiplier` 로 넘긴다. **글자 높이로
 * 여백을 계산하는 쪽도 같은 천장을 봐야 한다** — 화면이 1.3 을 따로 적으면
 * 천장이 둘이 되고, 한쪽만 고쳐졌을 때 배율 큰 기기에서만 어긋난다.
 *
 * ## ⚠ 나누는 것은 **`widthScale` 하나다** — `typeScale` 이 아니다 (2026-09-13)
 *
 * 기기 폭 보정은 「같은 크기로 **보이게**」 하는 것이라 천장도 같이 내려야 맞다.
 * 시안의 1.3 배를 넓은 기기에서 1.12 × 1.3 = 1.46 배로 그리면 그 기기에서만
 * 그릇이 뚫린다.
 *
 * **iOS 보정은 다르다.** 그건 「이만큼 크게 **하고 싶다**」는 결정이다. 여기까지
 * 나누면 천장이 정확히 그만큼 내려가서 **확대가 통째로 상쇄된다** — 시스템 텍스트
 * 크기를 키워 둔 기기는 보정 전에도 후에도 천장에 닿아 있어 글자 크기가 안 바뀐다
 * (16 × 1.3 = 20.8 → 19 × 1.083 = 20.6). 천장이 지키는 것은 이제 **「그리는 크기의
 * 1.3 배」**다.
 */
export const maxFontScale = 1.3 / widthScale;

export const typography = { fontFamily, text } as const;
