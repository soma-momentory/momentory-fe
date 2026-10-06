import { Platform, StyleSheet, type ViewStyle } from "react-native";

import { line, raisedShadow } from "./color";

/**
 * Momentory DS — 크기. 정본은 `docs/DESIGN.md` §3~5, §6~11.
 *
 * 프레임 기준 375×812, **좌우 패딩 20 고정.**
 */

/**
 * 스페이싱 **10단만** 쓴다(`DESIGN.md` §3). 사이 값을 만들지 않는다 —
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

/**
 * 카드 안쪽 여백(`DESIGN.md` §8 의 16~22 대역 양 끝) — `Card` 가 쓰는 값이다.
 *
 * **밖에서도 쓴다**: 카드 밖에 놓인 글이 카드 안의 글과 왼쪽 줄을 맞추려면 같은 값을
 * 봐야 한다(리포트의 한 주 요약 문장 · `WeekMoodSummary`). 22 는 스페이싱 10단에 없는
 * 값이라 각자 적어 두면 한쪽만 바뀌어도 아무도 모른다.
 */
export const cardPadding = {
  default: space.lg,
  loose: 22,
} as const;

/** `DESIGN.md` §4 */
export const radius = {
  small: 8, //   칩, 작은 버튼
  medium: 12, // 버튼, 입력 필드, 정보 블록
  large: 16, //  카드
  xlarge: 20, // 시트 · 모달
  frame: 28, //  기기 프레임
  full: 999, //  필, 아바타, 감정 도트, 입력 pill
} as const;

/**
 * 말풍선만 라운드가 비대칭이다(`DESIGN.md` §4) —
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
 * **안드로이드에서만** 시스템 바 인셋 위에 더 얹는 숨 — `layout.androidNavGap` 의 실제 값.
 * iOS 는 홈 인디케이터 인셋(≈34)이 이미 그 숨을 만들어 0 이다.
 */
const androidNavGap = Platform.OS === "android" ? space.lg : 0;

/**
 * 화면 틀(`DESIGN.md` §3·§10).
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
  /**
   * 탭 내용 **위** 여백. 시안은 아래(9)만 적어 뒀는데, 그러면 아이콘이 탭바
   * 위 hairline 에 붙어 눌린 것처럼 보인다 — 위아래를 짝지어 숨을 틔운다.
   */
  tabBarPaddingTop: 8,
  safeArea: 34,
  /**
   * 화면 **맨 아래 최소 여백**. Safe Area 인셋과 이 값 중 **큰 쪽**을 쓴다.
   *
   * ⚠ 인셋이 0 으로 오는 기기가 있다 — 안드로이드 **3버튼 내비게이션**은 시스템
   * 바가 창 밖에 있어 `insets.bottom` 이 0 이고, 그대로 두면 탭·버튼이 시스템
   * 버튼에 딱 붙는다(제스처 바 기기에서는 24 남짓이 저절로 생겨 안 보이던 문제다).
   *
   * 24 로 둔다 — 12 였을 때 3버튼 기기에서 하단 독(채팅 입력·「다음」·「이야기
   * 시작하기」·일정 입력)이 시스템 버튼에 붙어 보였다. iOS 는 홈 인디케이터
   * 인셋(≈34)이 이 값보다 커서 영향받지 않는다. 하단에 붙는 것은 전부 이 하한을
   * 지난다 — Screen · TabScreen · ScheduleEditBar · ToastHost.
   *
   * 안드로이드는 이 값 위에 `androidNavGap` 을 더 얹는다(아래).
   */
  minBottomInset: 24,
  /**
   * **안드로이드에서만** 시스템 바 인셋 위에 더 얹는 숨 — 16.
   *
   * 인셋(3버튼 내비 48 · 제스처 바 24)은 시스템 바 자리를 비울 뿐이라, 그대로 두면 하단 독
   * (「다음」·「이야기 시작하기」·채팅 입력·일정 입력)이 내비 바 윗변에 **딱 맞닿는다**.
   * 2026-09-11 에 한 번 지웠다가 실기기에서 붙어 보여 되살렸다(2026-10-06 · 사용자 결정).
   *
   * 인셋과 **더한다**(하한이 아니다). 지나는 곳: `Screen`(`useScreenBottomInset`) ·
   * `ScheduleEditBar`. 탭 화면 아래는 탭바가 면으로 이어져 있어 해당 없다. iOS 는 0 이다.
   */
  androidNavGap,
  /**
   * **키보드 윗변과 하단 독 사이의 숨.**
   *
   * `KeyboardAvoidingView` 의 `behavior="padding"` 은 독의 아래를 키보드 윗변에
   * **정확히** 맞춘다 — 그냥 두면 입력창이 키보드에 딱 붙는다. iOS 는 키보드가
   * 올라오는 순간 홈 인디케이터 인셋(≈34)이 키보드에 덮여 사라지므로 숨이 아예
   * 없어진다(2026-08-28 실기기에서 확인).
   *
   * ⚠ **예측 입력 줄(QuickType)을 따로 재지 않는다.** 그 줄은 설정·언어·기기마다
   * 있기도 없기도 한데, OS 가 알려주는 키보드 프레임에 **이미 포함돼** 온다 —
   * 우리는 「무엇이 포함됐는지」가 아니라 **윗변까지의 거리**만 쓰므로 두 경우 다
   * 같은 숨이 남는다. 줄의 유무를 감지하려 들면 그때부터 틀린다.
   *
   * 안드로이드도 같은 값이다. 예전에는 시스템 바 위에 얹던 숨(`androidNavGap` 16)과 **큰 쪽**을
   * 썼는데, 그 숨은 2026-09-11 에 사라졌다(`minBottomInset` 머리말) — 키보드 위 숨은 그것과 무관하게 필요하다.
   *
   * 이 값을 지나는 넷: `ChatScaffold` · `ScheduleEditBar` · `BasicInfoEditor` ·
   * `BottomSheet`(이쪽은 KAV 를 안 쓰고 직접 얹는다).
   */
  keyboardGap: space.md,
  /**
   * 하단 독에서 **주 버튼과 그 아래 보조 텍스트 버튼 사이** — 6 (2026-09-11 · 사용자 요청).
   *
   * 회고의 위기 안내(「홈으로 돌아가기 / 이어서 얘기하기」)에서 정하고 같은 짝을 쓰는 화면이 따라왔다:
   * 일기 저장(`retro/draft`) · 회고 완료(`retro/done`) · 온보딩의 캘린더 연결 · 회고 시각.
   * **같은 짝이 화면마다 다르게 떨어져 있지 않게** 한 곳에서 정한다.
   *
   * ⚠ 간격 단(2·4·8·12…)에 없는 값이다 — 「위아래 공간을 각각 반으로」라는 요청에서 12 의 절반으로 나왔다.
   * 이 짝에만 쓴다.
   */
  dockActionGap: space.xs + space.xs2,
  /** 스크롤 리스트 하단 클리어런스 — 탭바 56 + 20 */
  scrollClearance: 76,
  /** 모든 탭 대상 최소 (아이콘이 작으면 hitSlop 으로 채운다) */
  minTouch: 44,
} as const;

/**
 * `DESIGN.md` §5 — **경계는 border 가 아니라 hairline** 이다.
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
 * 그림자 두 단(`DESIGN.md` §5). **카드에는 그림자가 없다** — hairline 만 쓴다(홈 · 쉼터 첫 화면만 예외 · 아래 `raised`).
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
 * **번지지 않는 아래쪽 그림자** (2026-10-05 · 사용자 요청) — 쉼터 안 빈티지 버튼
 * (`restSceneSize.vintage`)의 손맛을 홈 · 쉼터 첫 화면에 옅게 옮긴다. 색은 `raisedShadow`.
 *
 * 누르는 것은 면이 `depth` 만큼 꾹 내려앉아 그림자를 덮는다(`RestCardPressable` ·
 * `GrassButton` · 일정 체크박스). 누르지 않는 카드는 `card` 스타일만 얹는다.
 * 빈티지(4)보다 얕다 — 앱 화면은 장면이 아니라서 한 단 조용해야 한다.
 */
export const raised = {
  depth: 3,
  /** 체크박스(20)는 작아서 한 단 얕다 */
  checkDepth: 2,
  card: { boxShadow: `0px 3px 0px ${raisedShadow.card}` },
} as const;

/**
 * 쌓임 순서 — `DESIGN.md` §11 「z-index」.
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
 * 컴포넌트 치수 — `DESIGN.md` §6~11 이 **시스템 차원에서** 정한 값만 둔다.
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
  chip: {
    height: 36,
    gap: space.sm,
    radius: radius.full,
    selectedBorderWidth: 2,
    /**
     * 감정 칩의 최소 폭 — 「행복함」(3글자)이 들어가는 크기다.
     *
     * 감정 10종은 「화남」만 2글자이고 나머지는 3글자다. 폭을 글자에 맡기면 「화남」만 좁아
     * 칸이 들쭉날쭉해진다. 셋을 담을 만큼만 잡아 <b>전부 같은 폭</b>으로 세운다 —
     * label2(13) 3글자 + 좌우 space.md.
     */
    emotionMinWidth: 68,
  },
  /** §10 — 아이콘 3단(24 그리드) */
  icon: { sm: 16, md: 20, lg: 24 },
  /** §11 — 시트/모달 r20 · 시간 휠 40px 행 */
  sheet: { radius: radius.xlarge, wheelRow: 40 },
} as const;

/**
 * 움직임. **`DESIGN.md` 에 모션 절이 없다** — 시안이 CSS 로 적어 둔 값만 있다:
 * `transition: background 120ms cubic-bezier(0.4,0,0.2,1)` (칩·버튼의 상태 전환).
 *
 * 그래서 **하나뿐이다.** 화면 전환도 같은 값을 쓴다 — 시안이 화면 전환 시간을
 * 따로 말하지 않는데 다른 값을 지어내면 그것이 정본 행세를 하게 된다.
 *
 * ⚠ **슬라이드를 만들지 않는다.** 화면 사이는 fade 하나다(옛 `theme.motion` 이
 * 지키던 규칙이고 시안도 전환 연출을 두지 않는다).
 */
export const motion = { duration: 120 } as const;

/**
 * 쉼터 카드를 **누른 자리에서 번지는 물결** (2026-09-11 · 사용자 요청 · `RestCardPressable`).
 *
 * 색은 **짙은 회색을 옅게**(`restRipple` · 8%) 얹는다 — 옅은 초록 → 짙은 아이보리를 거쳐,
 * 후보 비교 데모의 회색을 사용자가 골랐다(2026-09-11). 두 플랫폼이 똑같다(OS 리플을 쓰지 않는다).
 */
export const cardRipple = {
  /**
   * 손끝 크기의 작은 원에서 카드를 **다 덮을 때까지** — 이동은 이 시간이 지난 뒤다
   * (2026-09-11 · 「다 채워지면 이동」 사용자 요청). 길면 누르고 기다리게 되고, 짧으면
   * 채워지는 것이 보이지 않는다. 460 에서 **350** 으로 줄였다 — 실기기에서 누르고
   * 기다리는 느낌이 났다(2026-09-11 · 사용자 요청).
   */
  duration: 350,
  /** 다 덮은 뒤 옅어져 사라지는 시간 — 다음 화면으로 넘어가는 동안 */
  fade: 240,
  /** 번지는 동안의 짙기 — `restRipple` 을 이만큼 얹으면 카드 면과 1.17 이다(데모의 12% 에서 옅게 · 사용자 요청) */
  peakOpacity: 0.08,
  /** 시작 크기 — 다 번진 지름에 대한 비율 */
  fromScale: 0.08,
} as const;

/**
 * 입력창 위로 고개 내민 바바가 **눈을 깜빡이는** 박자 (2026-10-03 · 사용자 요청 · `RetroBabaPeek`).
 *
 * 사람이 보기에 편한 깜빡임은 몇 초에 한 번 · 0.1초 남짓이다. 늘 같은 간격이면 기계처럼 보여서
 * 간격을 `interval` 에서 `jitter` 만큼 흔들고, 가끔(`doubleChance`) 두 번 연달아 깜빡인다.
 */
export const babaBlink = {
  /** 깜빡임 사이 — 평균 */
  interval: 3200,
  /** 간격을 ± 이만큼 흔든다 */
  jitter: 1200,
  /** 눈을 감고 있는 시간 */
  closed: 110,
  /** 두 번 연달아 깜빡일 때 사이에 뜨고 있는 시간 */
  between: 140,
  /** 두 번 연달아 깜빡일 확률 */
  doubleChance: 0.25,
} as const;

/**
 * `S0` 의 기다림 표시(`components/entry/SplashLoader`) — iOS 기본 기다림 표시처럼 빗살 여덟이
 * **한 칸씩 끊어** 돈다. 한 바퀴(여덟 칸)의 시간이다.
 */
export const splashLoaderMotion = { turn: 960 } as const;

export const metrics = {
  space,
  radius,
  bubbleRadius,
  layout,
  hairline,
  elevation,
  raised,
  size,
  zIndex,
  motion,
} as const;
