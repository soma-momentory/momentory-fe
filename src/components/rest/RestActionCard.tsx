import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { Button, Icon, IconButton, Text } from "@/components/ds";
import { WishCardFields } from "@/components/diary/WishCardFields";
import {
  background,
  cardFrame,
  fill,
  hairline,
  label as labelColor,
  line,
  primary,
  radius,
  size,
  space,
  status,
  text,
} from "@/design/ds";
import type { ActionCard } from "@/features/diary/model/types";

/**
 * 행동 카드 한 장 (`Rest.dc.html` R2 · `DESIGN.md` 「쉼터」).
 *
 * ## 체크박스가 없다
 *
 * 시안 규칙: 「**왼쪽은 상태**(「아직 하지 않았어요」/「수행했어요」), **오른쪽은
 * 행동 버튼**(「했어요」/「수행 취소」) — 체크박스 없음」.
 *
 * 옛 카드는 체크박스 하나로 두 일을 했다 — 상태를 보여주는 일과 상태를 바꾸는 일.
 * 나눠 두면 **읽는 것과 누르는 것이 섞이지 않는다.**
 *
 * ## 수행 상태 3단계
 *
 * `a` 수행 전 → `b` 느낀 점 입력 → `c` 저장. 「했어요」를 누르면 **카드 안에서
 * 바로** 입력창이 열린다 — 화면을 옮기지 않는다.
 *
 * - **느낀 점은 선택이다** — 「남기지 않아도 괜찮아요.」. 비워 둬도 수행은 수행이다
 * - 저장하면 읽기 블록 + `고치기`. 입력창은 1줄(52)에서 **최대 3줄**까지만 자라고
 *   읽기 블록도 3줄에서 잘린다(`NOTE_LINES` — 갈 곳이 없어진 상태다)
 * - **`수행 취소` 로 되돌리면 입력도 초기화된다**(`DESIGN.md` 「쉼터」)
 * - **수행률·연속 일수를 세지 않는다**(`RULES.md` 4)
 */
type Props = {
  card: ActionCard;
  /** 카드가 만들어진 날. 머리에 날짜로 선다 */
  date: string;
  /** 「오늘」처럼 날짜 오른쪽에 붙는 한 마디. 없으면 두지 않는다 */
  dateNote?: string;
  /** 오늘 만든 카드인가 — 비어 있는 「작은 행동」에 예고 문구를 둔다(`WishCardFields`) */
  madeToday?: boolean;
  onToggleDone: () => void;
  onSetReflection: (text: string) => void;
  /**
   * ⋮ 를 누른 지점(창 기준 y) — 없으면 ⋮ 를 두지 않는다.
   * 메뉴 자체는 **화면이 그린다**(일기 상세의 ⋮ 와 같은 문법) — 카드가 자기
   * 위에 절대 배치 레이어를 얹으면 스크롤과 함께 밀린다.
   */
  onMore?: (atY: number) => void;
};

/**
 * 저장한 느낀 점을 **상태 줄에서** 몇 줄까지 보일지 (2026-09-06 · 3 → 2).
 *
 * 아래 읽기 블록에 있을 때는 3줄이었는데, 지금은 체크와 「수행 취소」 사이의 한
 * 자리라 3줄이면 그 줄이 카드 안에서 혼자 높아진다. 넘치는 뒷부분은 **「고치기」**로
 * 연다 — 입력창이 전체를 들고 그 안에서 스크롤한다.
 *
 * ⚠ 예전에는 「전체는 **자세히 보기**에서」가 짝이었는데 그 화면은 지웠다
 * (`docs/PRODUCT.md` 「상류와 차이」 #35) — 지금은 「고치기」가 그 자리를 맡는다.
 */
const NOTE_LINES = 2;

/**
 * 카드 머리의 날짜 단 — `headline1`(18)에서 **한 단 올렸다**(2026-09-06).
 *
 * 12단에 18 과 22 사이가 없어서 이것이 가장 작은 한 걸음이다 — 새 숫자를 만들지
 * 않는다(`CLAUDE.md` 「색·크기·시간을 하드코딩하지 않는다」).
 */
const DATE_TOKEN = "heading1";

/**
 * 날짜가 커지면서 늘어난 줄 높이 — 머리 줄을 그만큼 **위로 당긴다.**
 *
 * 그냥 키우면 줄이 아래로 자라 카드 안의 것이 전부 밀린다. 이 값만큼 올려 두면
 * 날짜의 **아랫변이 제자리**에 남고 위로만 커진다 — 늘어난 몫은 카드 위 여백이
 * 받는다. 토큰에서 빼는 이유는 `typeScale`(기기 폭 보정) 때문이다: 단이 커지면
 * 차이도 함께 커져야 아랫변이 기기마다 어긋나지 않는다.
 */
const DATE_RISE = text[DATE_TOKEN].lineHeight - text.headline1.lineHeight;

/**
 * 느낀 점 저장 버튼 지름 — 입력 한 줄이 이 높이의 가운데에 선다.
 * 하단 영역을 낮추려고 32 → 28 → **24** 로 줄였다(2026-08-24 · 2026-09-06).
 * 안에 든 아이콘이 16 이라 24 면 아직 여유가 있다.
 */
const NOTE_BUTTON = 24;
// 느낀 점은 손글씨(`body1ReadingHand`)로 쓴다 — 입력과 읽기의 결을 맞춘다.
// 높이 계산도 같은 단의 행간을 봐야 입력창이 글자를 자르지 않는다.
const NOTE_TEXT = text.body1ReadingHand;
/**
 * 입력칸의 줄 높이 — 읽기(26)보다 **좁다**(2026-09-06).
 *
 * 안드로이드는 커서(깜빡이는 세로줄) 길이를 **줄 높이**에 맞춰 그린다. 읽기 값을
 * 그대로 쓰면 한 줄짜리 낮은 칸에서 커서가 칸을 꽉 채워 길어 보였다. 글자 크기는
 * 그대로 두고 줄 높이만 좁은 단에서 빌려 쓴다 — **새 숫자를 만들지 않는다**
 * (`CLAUDE.md`). 26 → 22(`body2`) → **18**(`label2`)로 두 번 낮췄다(2026-09-06).
 *
 * ⚠ **18 이 바닥이다.** 글자 크기(16)의 1.125배라 그 아래로 내리면 손글씨의 위아래
 * 삐침이 잘린다 — 낮출 때는 한글 플레이스홀더(「느낀 점을 남겨보세요…」)가 온전한지
 * 실기기에서 보고 정한다.
 */
const NOTE_INPUT_LINE = text.label2.lineHeight;
const NOTE_PADDING_Y = (NOTE_BUTTON - NOTE_INPUT_LINE) / 2;

/**
 * 느낀 점 글자 수 상한 — **말줄임(…)이 생기지 않는 길이**다(2026-09-06 실측).
 *
 * 저장한 느낀 점은 상태 줄의 한 자리에서 `NOTE_LINES`(2)줄까지만 보이고 그 뒤는
 * 잘린다. 자르는 대신 **애초에 넘치지 않게** 막는다 — 잘린 뒤를 볼 자리가 없어서다
 * (누적 기록 화면을 지웠다 · `docs/PRODUCT.md` #35).
 *
 * 실기기(1080×2340)에서 잰 값 — 자리 폭 **495px × 2줄 = 990px**:
 *
 * | 잰 글자 | 단 | 자당 |
 * | --- | --- | --- |
 * | 「고치기」 3자 = 85px | `label2` 13dp | 0.726 em |
 * | 「했어요」 3자 = 88px | `label2` 13dp | 0.752 em |
 * | 「화」 1자 = 27px | `caption2` 11dp | **0.818 em**(가장 넓은 자소) |
 *
 * 가장 넓은 자소만 이어 붙인 최악(0.818 em ≈ 39.3px)이라도 24자면 943px 로 990 안에
 * 든다 — 47px 이 남는다. ⚠ **이모지는 예외**다(1 em 이 넘는다).
 *
 * ⚠ 다시 정할 때는 **자리 폭부터 다시 잰다** — 495 는 「수행 취소」와 나눠 쓰는
 * 값이라 그 버튼의 글자가 바뀌면 함께 바뀐다. 「고치기」를 같은 줄로 올리면 278 로
 * 줄어 상한이 14 가 된다(2026-09-06 실측 · 그래서 아래 줄에 뒀다).
 */
const NOTE_MAX = 24;

/** 액자의 크림 띠 폭 — 장식 칸이 들어앉을 만큼 */
const FRAME_BAND = space.md;
/** 바깥 선 굵기 — 종이에 손으로 그은 결이라 얇다 */
const FRAME_LINE = 1.5;
/** 안쪽 선 굵기 — 바깥과 **같다**. 두 선이 한 손으로 그은 것처럼 읽힌다 */
const FRAME_INNER_LINE = 1.5;
/** 바깥 모서리 반경 — 두꺼운 종이 카드의 모서리를 **뭉툭하게 다듬은** 정도(8 → 16) */
const FRAME_OUTER_R = 16;
/** 안쪽 경계의 평범한 두 모서리(우상 · 좌하) 반경 — 바깥과 같은 정도로 뭉툭하게 */
const FRAME_INNER_R = 14;
/**
 * **오목한 홈의 반경** — 좌상 · 우하에서 안쪽 경계가 콘텐츠 쪽으로 파고드는 **사분원**.
 *
 * ⚠ **호의 중심은 안쪽 모서리(`FRAME_BAND`, `FRAME_BAND`)** 다(2026-09-06 개정).
 * 예전에는 카드 **바깥** 모서리(0,0)를 중심으로 삼았는데, 그러면 호가 띠에 잘려
 * **48° 만 그려져** 동그랗지 않고 얕은 곡선으로 보였다. 안쪽 모서리로 옮기면
 * 온전한 **90°** 가 다 보여 원처럼 동그랗다.
 *
 * 덤으로 **직선과 직각으로 만난다** — 끝점에서 호의 접선이 변과 수직이라 접점이
 * 각지게 꺾인다. 필렛으로 부드럽게 잇던 것을 걷어낸 이유다.
 *
 * 25 → **30**(2026-09-06) — 콘텐츠 쪽으로 조금 더 파고든다. 모서리에서의 깊이가
 * `√2 × FRAME_BAND + 30` = 47 이다.
 *
 * ⚠ **날짜 글자가 상한을 정한다.** 날짜를 오른쪽으로 민 뒤(`headName` 의
 * `marginLeft`) 글자 상자가 (40, 28)에서 시작하는데, 안쪽 모서리(12,12)에서
 * 32.2 라 30 까지만 비켜선다. 더 키우려면 날짜를 더 밀어야 한다.
 */
const FRAME_NOTCH = 30;
/** 호가 직선과 만나는 지점 — 안쪽 모서리에서 반경만큼 떨어진 자리다 */
const NOTCH_EDGE = FRAME_BAND + FRAME_NOTCH;
/**
 * 장식 칸 안 마름모의 **가로** 대각선 절반 — 4.25 → 5.5 → **7.5**(2026-09-06).
 *
 * 칸은 대각선 위로 6.6 부터 42 까지라 한가운데(24.3)에서 양쪽 테두리까지 17.7 이
 * 있다. 7.5 여도 10.2 씩 남아 선에 닿지 않는다.
 */
const FRAME_CORNER = 7.5;
/** **세로** 대각선 절반 — 가로보다 길다. 정사각이 아니라 **세로로 선 마름모**다 */
const FRAME_CORNER_V = 9.5;

/** 둥근 모서리 하나 — 시작점에서 호를 그려 다음 변으로 넘어간다 */
const arc = (x: number, y: number, r: number) => `A ${r} ${r} 0 0 1 ${x} ${y}`;

/**
 * 바깥 프레임 — 모서리가 살짝만 둥근 세로형 카드.
 *
 * 선이 잘리지 않게 굵기의 절반만큼 안으로 들여 그린다.
 */
const outerPath = (w: number, h: number) => {
  const o = FRAME_LINE / 2;
  const r = FRAME_OUTER_R;
  const [x0, y0, x1, y1] = [o, o, w - o, h - o];
  return [
    `M ${x0 + r} ${y0}`,
    `L ${x1 - r} ${y0}`,
    arc(x1, y0 + r, r),
    `L ${x1} ${y1 - r}`,
    arc(x1 - r, y1, r),
    `L ${x0 + r} ${y1}`,
    arc(x0, y1 - r, r),
    `L ${x0} ${y0 + r}`,
    arc(x0 + r, y0, r),
    "Z",
  ].join(" ");
};

/**
 * 안쪽 경계 — **오목한 홈이 들어간 비대칭 한 줄**이다.
 *
 * 우상 · 좌하는 평범한 모서리(`FRAME_INNER_R`)로 잇고, **좌상 · 우하만** 다르다:
 * 위쪽 선이 왼쪽 끝까지 가지 않고 `NOTCH_EDGE` 에서 멈추고, 왼쪽 선도 위쪽 끝까지
 * 가지 않고 같은 자리에서 멈춘다. 그 둘을 **오목한 사분원**이 잇는다.
 *
 * ⚠ 접점은 **각지다.** 호의 끝에서 접선이 변과 직각이라 자연히 꺾인다 — 부드럽게
 * 잇던 필렛은 2026-09-06 에 걷어냈다.
 *
 * ⚠ **sweep flag 가 0 이다.** 평범한 모서리(1)와 반대다 — 1 로 두면 모서리를 감싸는
 * 볼록한 곡선이 되어 그냥 둥근 사각형으로 보인다(2026-09-06 실기기에서 그랬다).
 */
const innerPath = (w: number, h: number) => {
  const b = FRAME_BAND;
  const [r, n, k] = [FRAME_INNER_R, FRAME_NOTCH, NOTCH_EDGE];
  const [x1, y1] = [w - b, h - b];
  /** 오목한 사분원 — 안쪽 모서리를 중심으로 콘텐츠 쪽으로 부푼다(`0` = 반대 방향) */
  const notch = (x: number, y: number) => `A ${n} ${n} 0 0 0 ${x} ${y}`;
  return [
    // 위쪽 선 — 좌상 홈이 끝나는 자리에서 시작한다
    `M ${k} ${b}`,
    `L ${x1 - r} ${b}`,
    arc(x1, b + r, r),
    // 오른쪽 선 — 우하 홈이 시작되는 자리에서 **직각으로** 끊긴다
    `L ${x1} ${h - k}`,
    notch(w - k, y1),
    `L ${b + r} ${y1}`,
    arc(b, y1 - r, r),
    // 왼쪽 선 — 좌상 홈이 시작되는 자리에서 **직각으로** 끊긴다
    `L ${b} ${k}`,
    notch(k, b),
    "Z",
  ].join(" ");
};

/**
 * 한가운데에서 미는 양 — **양수면 콘텐츠 쪽, 음수면 모서리 쪽**이다. x · y 를 함께
 * 밀므로 대각선을 따라 움직인다(좌상은 왼쪽 위, 우하는 오른쪽 아래).
 *
 * `+4` → `-2` → `0`(정중앙) → **`1`**(2026-09-06 · 눈으로 맞춘 값). 4 는 카드 안쪽에
 * 붙어 보였고 −2 는 너무 멀었다. 1 은 정중앙에서 **한 칸**만 콘텐츠 쪽으로 옮긴
 * 값이다 — 화면에서 3px 이라 눈에 겨우 잡힌다. 이 자리에서도 오목한 호까지 20,
 * 바깥 선까지 20.8 로 사방이 고르게 남는다.
 */
const POCKET_SHIFT = 1;

/**
 * 장식 칸 한가운데 — 모서리 대각선 위에서 **바깥 선과 오목한 호의 중간**이고,
 * 거기서 `POCKET_SHIFT` 만큼 콘텐츠 쪽으로 민 자리다.
 *
 * 모서리에서의 거리로 재면 바깥 선이 `FRAME_OUTER_R × (√2 − 1)`(6.6), 호의 가장
 * 깊은 곳이 `√2 × FRAME_BAND + FRAME_NOTCH`(42)다. 그 중간(24.3)을 다시 x · y 로
 * 풀면 각각 `24.3 / √2` 다.
 */
const POCKET_MID =
  (FRAME_OUTER_R * (Math.SQRT2 - 1) + (Math.SQRT2 * FRAME_BAND + FRAME_NOTCH)) / 2 / Math.SQRT2 +
  POCKET_SHIFT;

/** 마름모 — 장식 칸에 놓이는 **세로로 조금 긴** 마름모 하나 */
const diamond = (cx: number, cy: number) => {
  const [x, y] = [FRAME_CORNER, FRAME_CORNER_V];
  return `M ${cx} ${cy - y} L ${cx + x} ${cy} L ${cx} ${cy + y} L ${cx - x} ${cy} Z`;
};

/** 구분선 아래 첫 줄까지의 여백 */
const FOOT_PAD = space.sm;
/** 상태 줄과 그 아래 줄 사이 */
const FOOT_GAP = space.xs;
/** 입력칸 안쪽 여백 — 저장 버튼(24)과 더해 한 줄 높이가 된다 */
const NOTE_INPUT_PAD = 2;

/**
 * 입력칸이 **다 자랐을 때**(`NOTE_LINES` 줄)의 높이.
 *
 * 안쪽 여백 위아래 + 글줄 두 개 + 한 줄일 때 저장 버튼과 중심을 맞추던 여백이다.
 */
const NOTE_INPUT_MAX = NOTE_INPUT_LINE * NOTE_LINES + NOTE_PADDING_Y * 2 + NOTE_INPUT_PAD * 2;

/**
 * 하단 영역의 **고정 높이** — 상태 줄이 어느 상태에서든 **같은 자리**에 서게 한다.
 *
 * 카드 높이가 고정이고 하단이 카드 바닥에 붙어 있어서, 하단이 재는 대로 두면
 * 그 안의 것이 바뀔 때마다(한 줄 → 두 줄) **위가 밀려 올라갔다.** 늘 잡아 두고
 * 내용을 위에 붙이면(`alignItems: flex-start`) 상태 줄의 자리가 고정되고, 입력칸은
 * **아래 빈자리로** 자란다.
 *
 * 잡아 두는 양은 **입력칸이 다 자랐을 때까지, 딱 거기까지**다(2026-09-06). 예전에는
 * 「상태 줄 + 아래 한 줄」만큼 잡아서, 안 쓰는 동안 그만큼이 빈 채로 남고 느낀 점
 * 줄이 카드 안에서 높이 떠 보였다 — 지금은 그 줄이 **자랄 자리 끝까지 내려앉는다.**
 *
 * 잡는 양은 **입력칸 2줄**과 **저장한 느낀 점 2줄** 중 큰 쪽이다. 아래에 「고치기」
 * 줄을 두던 것을 접고 **느낀 점 글 자체를 누르게 하면서**(2026-09-06) 이 둘만 남았다 —
 * 그래서 모든 상태의 하단 높이가 같고, 그 줄만큼 느낀 점 자리가 아래로 내려앉았다.
 */
const FOOT_HEIGHT =
  FOOT_PAD + Math.max(NOTE_INPUT_MAX, text.body1ReadingHand.lineHeight * NOTE_LINES);
/**
 * 느낀 점 입력창 최소 높이 — 옛 `size.input.compact`(52) → 40 → **32**(2026-09-06).
 *
 * 32 는 **더 낮출 수 없는 바닥**이다: 같은 줄의 「수행 취소」가 `small` 버튼(32)이라
 * 여기를 더 줄여도 줄 높이가 안 준다(`ds/Button.tsx` 머리말의 크기 표). 대신 카드
 * 안에서 **본문이 차지하는 몫이 그만큼 늘었다** — 느낀 점은 쓰는 동안만 필요하고,
 * 늘 보이는 것은 다섯 항목이다.
 */
/**
 * ⚠ **`small` 버튼과 같은 높이여야 한다.** 상태 줄 왼쪽 자리에는 상태 글자 ·
 * 「느낀 점 적기」 · 입력칸이 번갈아 서는데, 셋의 그릇 높이가 다르면 **글자가 서로
 * 다른 높이에 앉는다**(위에 붙여 놓았으므로 · 2026-09-06 실기기). 오른쪽
 * 「수행 취소」가 `small`(32)이라 그것을 기준으로 셋을 맞춘다.
 */
const NOTE_INPUT_MIN = size.button.small;

export function RestActionCard({
  card,
  date,
  dateNote,
  madeToday = false,
  onToggleDone,
  onSetReflection,
  onMore,
}: Props) {
  const saved = card.reflection != null && card.reflection.length > 0;
  const [draft, setDraft] = useState("");
  /**
   * 느낀 점을 **적는 중**인지 (2026-09-06 개정).
   *
   * 예전에는 「했어요」를 누르면 입력창이 **저절로 열렸다.** 대부분은 적지 않고
   * 넘어가는데도 카드가 늘 입력창을 물고 있어서, 닫을 길이 없었다. 지금은 수행하면
   * **체크와 「느낀 점 적기」**만 서고, 적겠다고 누른 사람에게만 자리를 연다.
   *
   * ⚠ **기기에만 있다.** 계약에 「적는 중」을 담을 자리가 없다 — 앱을 다시 열면
   * 닫힌 채로 시작한다(적어서 저장한 것은 `reflection` 으로 남으니 그대로 보인다).
   * 날짜를 옮길 때는 `key={card.id}` 가 카드마다 갈라 준다
   * (`app/rest/cards/index.tsx`).
   */
  const [open, setOpen] = useState(false);
  /** 액자를 그리려면 실제 크기가 필요하다 — `onLayout` 으로 잰다 */
  const [frame, setFrame] = useState({ width: 0, height: 0 });

  const writing = card.done && open;
  /**
   * 입력칸이 비어 있는지 — 보내기 버튼의 **색과 뜻**이 여기서 갈린다.
   *
   * 비어 있어도 **눌린다**: 빈 채로 누르면 적지 않고 자리를 닫는다. ⚠ 색은 갈리되
   * **잠긴 색(`label.disabled`)을 쓰지 않는다** — 눌리는데 못 누르는 것처럼 보이면
   * 안 된다.
   */
  const empty = draft.trim().length === 0;

  const save = () => {
    const trimmed = draft.trim();
    // 빈 채로 눌렀으면 **적지 않고 닫는다** — 서버로 보낼 것이 없다
    if (trimmed.length > 0) onSetReflection(trimmed);
    setOpen(false);
    setDraft("");
  };

  /** 적으러 들어간다 — 저장된 것이 있으면 그것을 초안으로 삼는다(「고치기」) */
  const openNote = () => {
    setDraft(card.reflection ?? "");
    setOpen(true);
  };

  const toggle = () => {
    // 되돌리면 적던 것도 함께 지운다 — 남겨 두면 다음 수행의 초안으로 읽힌다
    setOpen(false);
    setDraft("");
    onToggleDone();
  };

  return (
    /* **타로 카드 결의 액자**(2026-09-06 · 사용자 제공 시안의 **테두리만** 참고).
       크림 띠 + 진한 외곽선, 그 안에 한 겹 더 두른 카드. 좌상·우하 모서리에는
       마름모 하나씩 — 시안의 「C」 자리를 그대로 쓰되 문양만 바꿨다.
       ⚠ 띠가 자리를 먹는 만큼 안쪽 여백을 `loose`(22)에서 기본(16)으로 낮췄다 —
       그러지 않으면 다섯 항목이 카드 안에서 스크롤된다 */
    <View style={styles.frame} onLayout={(e) => setFrame(e.nativeEvent.layout)}>
      {/* **액자를 SVG 로 그린다.** `borderRadius` 로는 「모서리가 둥근 사각형」밖에
          안 나오는데, 안쪽 경계는 좌상·우하만 크게 파고드는 **비대칭**이라서다.
          폭·높이를 재기 전 한 프레임은 아무것도 그리지 않는다(`Calendar` 와 같은 결) */}
      {frame.width > 0 ? (
        <Svg style={StyleSheet.absoluteFill} width={frame.width} height={frame.height}>
          <Path
            d={outerPath(frame.width, frame.height)}
            fill={background.alternative}
            stroke={cardFrame.stroke}
            strokeWidth={FRAME_LINE}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={innerPath(frame.width, frame.height)}
            fill={background.elevated}
            stroke={cardFrame.stroke}
            strokeWidth={FRAME_INNER_LINE}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path d={diamond(POCKET_MID, POCKET_MID)} fill={cardFrame.ornament} />
          <Path
            d={diamond(frame.width - POCKET_MID, frame.height - POCKET_MID)}
            fill={cardFrame.ornament}
          />
        </Svg>
      ) : null}
      <View style={styles.card}>
        <View style={styles.head}>
          <View style={styles.headName}>
            <Text variant={DATE_TOKEN} color={labelColor.strong}>
              {date}
            </Text>
            {dateNote != null ? (
              <Text variant="caption1" color={labelColor.alternative}>
                {dateNote}
              </Text>
            ) : null}
          </View>
          {onMore != null ? (
            <IconButton
              name="more-vertical"
              size={20}
              accessibilityLabel="더보기"
              color={labelColor.alternative}
              onPress={(e) => onMore(e.nativeEvent.pageY)}
              style={styles.more}
            />
          ) : null}
        </View>

        {/* **긴 카드는 이 칸만 스크롤한다.** 머리(날짜·⋮)와 하단(상태·「했어요」·느낀 점)은
            제자리에 남아, 카드가 잘려 보이지 않고 늘 **한 장**으로 읽힌다 */}
        <ScrollView
          style={styles.fields}
          showsVerticalScrollIndicator={false}
          // 키보드가 올라온 채로도 카드 안 버튼이 한 번에 눌린다
          keyboardShouldPersistTaps="handled"
        >
          <WishCardFields
            situation={card.situation}
            emotions={card.emotions}
            needs={card.needs}
            desiredState={card.desiredState}
            smallAction={card.targetAction}
            positive={card.sentiment === "positive"}
            madeToday={madeToday}
            // 「상황: …」 한 줄 배치 — 달력 위 정해진 자리에 다섯 항목이 다 들어오게
            // (`WishCardFields` 의 「배치가 둘이다」)
            inline
          />
        </ScrollView>

        {/* **할 일이 없으면 하단 줄째로 숨긴다**(2026-10-27). 작은 행동은 다음 날 편지에서
            고른다 — 고르기 전에는 「했어요」를 누를 대상이 없다. 작은 행동 없이 이미 「했어요」를
            누른 예전 카드는 「수행 취소」가 남아야 하니 그대로 둔다 */}
        {card.done || (card.targetAction ?? "").length > 0 ? (
          <View style={styles.foot}>
            {/* **입력창은 상태 줄의 자리에 선다** — 아래에 줄을 하나 더 두지 않는다.
              카드 높이가 정해져 있어서(달력 위 자리) 줄이 늘면 위의 「작은 행동」이
              카드 밖으로 밀렸다. 상태를 잠깐 내주는 대신 다섯 항목이 남는다 —
              그 사이 상태는 오른쪽 버튼(「수행 취소」)이 말한다 */}
            <View style={styles.statusRow}>
              {writing ? (
                <View style={[styles.noteInput, styles.noteSeat]}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="느낀 점을 남겨보세요…"
                    placeholderTextColor={labelColor.assistive}
                    accessibilityLabel="느낀 점"
                    multiline
                    // 넘치면 자르는 대신 **애초에 막는다** — 위 `NOTE_MAX` 주석
                    maxLength={NOTE_MAX}
                    style={styles.noteField}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={empty ? "느낀 점 없이 넘어가기" : "느낀 점 저장"}
                    onPress={save}
                    style={[styles.send, empty ? styles.sendIdle : styles.sendReady]}
                  >
                    <Icon
                      name="send"
                      size={16}
                      color={empty ? labelColor.alternative : labelColor.onFill}
                    />
                  </Pressable>
                </View>
              ) : (
                /* **체크 옆 한 자리가 상태에 따라 셋으로 바뀐다**(2026-09-06).
                 수행 전에는 「아직 하지 않았어요」, 수행하면 **「느낀 점 적기」**,
                 적고 나면 **그 느낀 점**이 선다. 「수행했어요」라는 글자는 두지 않는다 —
                 체크와 오른쪽 「수행 취소」가 이미 말하고 있어서, 그 자리를 되풀이에
                 쓰는 대신 **지금 할 수 있는 일**이나 **적어 둔 말**에 내준다 */
                <View style={styles.statusSide}>
                  {/* **첫 줄에 맞춰 선다** — 느낀 점이 두 줄이 돼도 체크는 안 내려간다
                    (`statusSide` 가 위 정렬이고 이 그릇이 한 줄 높이를 잡는다) */}
                  <View style={styles.slotLine}>
                    <Icon
                      name={card.done ? "circle-check" : "clock"}
                      size={16}
                      color={card.done ? status.positive : labelColor.alternative}
                    />
                  </View>
                  {!card.done ? (
                    <View style={styles.slotLine}>
                      <Text variant="label1" color={labelColor.alternative}>
                        아직 하지 않았어요
                      </Text>
                    </View>
                  ) : saved ? (
                    /* **적어 둔 느낀 점을 누르면 고친다**(2026-09-06) — 따로 「고치기」
                     버튼을 두지 않는다. 버튼을 아래 줄에 두면 그 줄만큼 하단이 커지고,
                     같은 줄에 두면 느낀 점이 쓸 폭이 반으로 줄어(495 → 278px) 상한이
                     24 → 14 자가 됐다. 글 자체를 누르게 하면 **자리도 폭도 그대로**다.
                     ⚠ 대신 **눈에 보이는 표시가 없다** — 쉼터 `R1` 의 「카드 전체가
                     진입점」과 같은 결이되, 거기 있던 「보기」 같은 표시는 없다.
                     느낀 점은 손글씨(교보 2025) — 입력창과 같은 결이라 저장해도 서체가
                     바뀌지 않는다 */
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="느낀 점 고치기"
                      onPress={openNote}
                      style={styles.noteSaid}
                    >
                      <Text
                        variant="body1ReadingHand"
                        color={labelColor.neutral}
                        numberOfLines={NOTE_LINES}
                      >
                        {card.reflection}
                      </Text>
                    </Pressable>
                  ) : (
                    <Button label="느낀 점 적기" variant="text" size="small" onPress={openNote} />
                  )}
                </View>
              )}
              <Button
                label={card.done ? "수행 취소" : "했어요"}
                variant="outlined"
                size="small"
                onPress={toggle}
              />
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * **자리를 꽉 채우고, 그 높이로 고정된다**(2026-09-06).
   *
   * 처음엔 카드가 자기 높이대로 자라고 바깥 `ScrollView` 가 잘랐다 — 달력 바로 위에서
   * 둥근 아랫변이 사라진 채 평평하게 끊겼다. 그다음엔 `flexShrink` 로 내용만큼만 서게
   * 했는데, 이번엔 **상태마다 높이가 달라지고**(느낀 점 입력창) 달력과의 사이가 크게
   * 비었다. 지금은 `flex: 1` 로 자리를 통째로 차지한다 — 카드 높이가 **내용과 무관하게
   * 늘 같고**, 아랫변이 달력 바로 위에 선다. 넘치는 몫은 안쪽 `fields` 가 스크롤로 받는다.
   */
  /**
   * 액자 — 크림 띠 + 진한 외곽선. 카드가 이 안에 한 겹 더 든다.
   *
   * 시안(타로 카드)의 **테두리만** 가져왔다: 바깥 둥근 사각 · 그 안쪽 띠 · 다시 한 겹
   * 테두리. 띠 폭(`FRAME_BAND`)은 모서리 문양이 들어앉을 만큼은 돼야 해서 12 다.
   */
  // 액자 — **면과 선은 SVG 가 그린다.** 여기는 자리와 띠 폭만 잡는다
  frame: { flex: 1, padding: FRAME_BAND },
  /**
   * 카드 안쪽 — **면도 테두리도 없다.** 둘 다 SVG 액자가 그리므로 여기는 내용의
   * 자리(여백 · 간격)만 든다. 여백은 예전 `Card` 의 기본값 그대로 16 이다.
   */
  card: { flex: 1, gap: 10, padding: space.lg },
  /**
   * 질문 다섯 칸 — **카드 안에서 스크롤하는 유일한 칸**이자 **남는 높이를 받는 칸**이다.
   *
   * `flex: 1` 이라 카드가 내용보다 클 때 그 여백이 여기 모이고, 아래 하단 줄(구분선 ·
   * 상태 · 「했어요」)은 **카드 바닥에 붙는다.** 머리와 하단이 제자리에 고정되므로
   * 카드가 늘 한 장으로 읽힌다.
   */
  fields: {
    flex: 1,
    /**
     * 날짜와 한 칸 더 띄운다(2026-09-06) — 날짜가 오른쪽으로 물러난 만큼 아래
     * 항목과의 사이도 벌려야 머리와 본문이 갈린다.
     *
     * ⚠ 카드 `gap`(10)을 키우지 않는다 — 그러면 **하단과의 사이까지** 함께 벌어진다.
     * 이 칸은 남는 높이를 받는 쪽이라(`flex: 1`) 여기서 먹은 만큼 스크롤 여유만 준다.
     */
    marginTop: space.sm,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
    // 날짜가 **위로만** 커진다 — 위 `DATE_RISE` 주석
    marginTop: -DATE_RISE,
  },
  headName: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.sm,
    flexShrink: 1,
    /**
     * 날짜를 오른쪽으로 조금 민다 — **좌상 장식 칸을 비켜서게**(2026-09-06).
     *
     * 홈이 위쪽 변과 만나는 자리가 모서리에서 `FRAME_BAND + FRAME_NOTCH`(42)인데
     * 날짜는 28 에서 시작해 그 아래를 지났다. 12 → **16** 을 밀어 44 에서 시작하면
     * 홈을 지나서 선다. ⚠ **날짜 줄에만 준다** — 카드 전체 여백을 건드리면 아래
     * 항목까지 따라 밀린다. 오른쪽 ⋮ 는 `space-between` 이라 제자리다.
     */
    marginLeft: space.lg,
  },
  // 44 히트는 지키되 머리 줄의 높이를 밀지 않게 위아래·오른쪽으로 당긴다
  more: { marginVertical: -space.md, marginRight: -space.md },

  // 상태·느낀 점은 카드 안에서 한 겹 아래다 — 위 선 하나로 나눈다
  foot: {
    // 하단이 카드 안에서 차지하는 몫을 줄였다(2026-09-06) — 간격 8 → 4 · 위 여백 10 → 8
    gap: FOOT_GAP,
    paddingTop: FOOT_PAD,
    // 어느 상태에서든 같은 높이 — 위 `FOOT_HEIGHT` 주석
    minHeight: FOOT_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line.alternative,
  },
  // ⚠ paddingTop 을 두지 않는다 — 상태줄이 위 구분선에 붙는다(`foot` 의 여백만 띄운다)
  /**
   * 상태 줄 — **입력창 높이를 늘 예약한다.**
   *
   * 왼쪽 자리가 상태(아이콘+글자 · 낮다)와 입력창(`NOTE_INPUT_MIN` · 높다) 사이를
   * 오가는데, 자리를 그때그때 재면 「했어요」·「수행 취소」를 누를 때마다 카드
   * 높이가 달라진다. 가장 높은 쪽을 늘 잡아 두면 **두 상태의 높이 차가 0** 이다 —
   * 달력 위 자리에 앉은 카드라 높이가 흔들리면 그 위 항목이 밀렸다 돌아온다.
   */
  statusRow: {
    flexDirection: "row",
    // **위에 붙인다** — 잡아 둔 자리 안에서 입력칸이 아래로 자란다
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.md,
  },
  /**
   * 상태 줄의 **왼쪽 한 덩어리** — 「✓ 수행했어요」와 그 옆 「느낀 점 적기」.
   *
   * 오른쪽 「수행 취소」와는 `statusRow` 의 `space-between` 으로 갈리고, 이 안의 둘은
   * 서로 붙어 선다. `flexShrink` 를 줘서 셋이 한 줄에 빠듯할 때 오른쪽 버튼을 밀지
   * 않고 이쪽이 먼저 줄어든다.
   */
  statusSide: {
    flexDirection: "row",
    gap: space.sm,
    flexShrink: 1,
    /**
     * 버튼과 **같은 높이를 잡아 둔다** — 상태 글자(20)만 낮으면 그 글자만 위에 앉는다
     * (아래 `slotLine`).
     *
     * ⚠ **`height` 가 아니라 `minHeight` 다.** 못박아 두면 저장한 느낀 점이 두 줄
     * (52)일 때 이 그릇(32)에 **잘린다** — 실제로 끊겨 보였다(2026-09-06).
     */
    minHeight: size.button.small,
    /**
     * **위에 붙인다**(2026-09-06). 가운데로 두면 느낀 점이 두 줄이 될 때 그 중심에
     * 맞춰 **체크까지 내려갔다** — 위 정렬이면 첫 줄 자리에 그대로 남고 글만 아래로
     * 자란다. 대신 한 줄짜리(체크 · 상태 글자)는 `slotLine` 이 높이를 잡아 준다.
     */
    alignItems: "flex-start",
  },
  /**
   * 한 줄 높이의 그릇 — 안의 것을 **첫 줄 가운데**에 세운다.
   *
   * `statusSide` 가 위 정렬이라 그냥 두면 낮은 것(아이콘 16 · 상태 글자 20)이 줄
   * 꼭대기에 붙는다. 버튼(`small` 32)과 같은 높이를 잡아 셋이 같은 줄에 앉는다.
   */
  slotLine: { height: size.button.small, justifyContent: "center" },
  /**
   * 적어 둔 느낀 점이 그 자리를 쓴다 — 길면 남는 폭까지만 쓰고 잘린다.
   * 누르면 고치는 자리라 `Pressable` 이 이 스타일을 든다.
   *
   * `paddingTop` 은 **첫 줄을 체크와 같은 높이에 앉히는 값**이다(2026-09-04 → 06).
   * 왼쪽 자리는 위 정렬이라(`statusSide`) 글이 그냥 꼭대기에 붙는데, 체크는
   * `slotLine`(32) 한가운데에 선다. 글줄(26)과의 차이 절반만큼 내리면 둘의 중심이
   * 맞는다 — **두 줄이 돼도 첫 줄 기준이라 그대로 맞는다.**
   */
  noteSaid: {
    flexShrink: 1,
    paddingTop: (size.button.small - text.body1ReadingHand.lineHeight) / 2,
  },

  /**
   * 입력창이 **상태 줄의 왼쪽 자리**를 차지한다 — 남는 폭을 다 먹되(`flex: 1`)
   * 오른쪽 「수행 취소」 버튼의 자리는 건드리지 않는다. `minWidth: 0` 이 없으면
   * 안쪽 `TextInput` 의 본래 폭이 하한이 되어 버튼을 밀어낸다.
   */
  noteSeat: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0 },
  noteInput: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space.sm,
    minHeight: NOTE_INPUT_MIN,
    paddingLeft: 10,
    // 2 + 저장 버튼(28) + 2 = 32 — `NOTE_INPUT_MIN` 과 딱 맞아 그릇이 커지지 않는다
    padding: NOTE_INPUT_PAD,
    borderRadius: 12,
    backgroundColor: background.elevated,
    ...hairline.neutral,
    borderColor: primary.normal,
  },
  noteField: {
    /**
     * ⚠ **`flex: 1` 이 아니라 `width: 0` + `flexGrow` 다.**
     *
     * 안드로이드의 여러 줄 `TextInput` 은 **내용 폭을 자기 고유 폭으로 보고한다** —
     * 글이 길어지면 그 폭이 줄 전체를 밀어 오른쪽 「수행 취소」가 카드 밖으로
     * 나갔다(2026-09-06 실기기). `flex: 1`(=`flexBasis: 0%`)만으로는 그 보고를
     * 이기지 못해서, **폭을 0 으로 못박고** 남는 자리만 `flexGrow` 로 받는다.
     */
    width: 0,
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    // 한 줄일 때 저장 버튼(32)과 세로 중심이 맞는다 — 플레이스홀더가 위에
    // 떠 보이지 않게. 안드로이드는 여러 줄 입력의 글자를 위에 붙인다
    minHeight: NOTE_BUTTON,
    textAlignVertical: "center",
    // 보이는 자리와 같은 줄 수까지만 자란다 — 그 위는 `NOTE_MAX` 가 애초에 막는다
    maxHeight: NOTE_INPUT_LINE * NOTE_LINES + NOTE_PADDING_Y * 2,
    paddingVertical: NOTE_PADDING_Y,
    paddingHorizontal: 0,
    ...NOTE_TEXT,
    // 글자 크기는 읽기와 같게 두고 **줄 높이만** 좁힌다 — 커서(세로줄)가 짧아진다
    lineHeight: NOTE_INPUT_LINE,
    color: labelColor.normal,
  },
  send: {
    width: NOTE_BUTTON,
    height: NOTE_BUTTON,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sendReady: { backgroundColor: primary.heavy },
  sendIdle: { backgroundColor: fill.normal },
});
