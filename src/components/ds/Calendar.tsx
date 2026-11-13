import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle, Rect } from "react-native-svg";

import { archiveType, interaction, label as labelColor, primary, radius, space } from "@/design/ds";
import { formatKoreanMonth } from "@/lib/day";

import { columnWidth } from "./columnWidth";
import { IconButton } from "./IconButton";
import { Text, useEffectiveFontScale } from "./Text";

/**
 * 월 달력 — `Archive.dc.html` A1 · `Rest.dc.html` R2 가 **같은 그리드**를 쓴다.
 *
 * ## 그리드는 공유하고 **표시 규칙만 주입받는다**
 *
 * 보관함은 그날 감정을 얼굴 스티커로 놓고 쉼터는 수행한 날을 초록 점으로 찍는다 —
 * 같은 달력에 다른 뜻의 표시가 붙는다. 그래서 이 컴포넌트는 **무슨 표시인지 모른다**:
 * `markOf(date)` 가 칸마다 점 색·그림·날짜 색·강조·잠금을 돌려주고 여기는 그대로 그린다.
 * 감정 팔레트나 스티커 그림을 여기서 import 하면 쉼터가 쓰지 않는 것을 들고 다니게 된다.
 *
 * ## 그림에는 이름이 없다 — 그래서 아래에 카드가 있다
 *
 * 「**색만으로 판단하게 하지 않는다**」(`RULES.md`)는 규칙을 이 격자 안에서는 글자로
 * 지킬 수 없다 — 40px 남짓한 칸에 감정 이름이 들어가지 않는다. 스티커는 눈·입 **모양**이
 * 감정마다 달라 색이 안 보이는 눈도 갈라 주지만, 이름을 대신하지는 못한다. 그래서
 * **날짜를 누르면 아래 카드가 이름을 글자로 말하고**(`A1.md`), 칸의 낭독기 이름에도
 * `mark.label` 로 그 이름을 붙인다. 이 달력만 따로 떼어 쓰면 앞의 규칙이 함께 오지
 * 않는다는 뜻이다.
 *
 * ## 한 주는 **화면 폭과 무관하게** 일곱 칸이다
 *
 * 예전엔 칸을 `width: '14.2857%'` 로 뒀는데, 일곱 칸이 각자 기기 픽셀로
 * 반올림되면 합이 부모를 넘어 **토요일이 다음 줄로 넘어갔다**(좁은 기기에서
 * 한 주가 6+1 로 접혔다). 지금은 격자 폭을 재서 픽셀로 나눈다(`columnWidth`) —
 * 요일 머리글도 같은 값을 써서 줄이 어긋나지 않는다.
 *
 * ## 기록이 없는 날도 누를 수 있다
 *
 * 시안 주석은 「기록 없는 날은 비활성」이라고 적었지만 `DESIGN.md` 「보관함」은
 * A1 을 「선택한 날의 **일기+일정**」으로 정한다 — 일기가 없어도 일정이 있는 날이
 * 있고, 빈 날도 「같은 자리의 한 장」으로 답해야 한다(`A1.md`). 값이 어긋나면
 * `DESIGN.md` 가 이긴다. 정말 못 고르는 날은 `markOf` 가 `disabled` 로 말한다.
 */
export type CalendarMark = {
  /**
   * **작은 점**의 색. 없으면 찍지 않는다 — **점의 뜻은 부르는 쪽이 안다**.
   * 자리는 모드마다 다르다: 점 모드(쉼터)는 날짜 **아래**, 스티커 모드(보관함)는
   * 날짜와 얼굴 **사이**다. 어느 쪽이든 자리는 늘 잡아 둬서 줄 높이가 오르내리지 않는다.
   */
  dotColor?: string;
  /**
   * 점을 채우지 않고 **테두리만** 그린다 — 상태를 색이 아니라 「채움」으로 나눌 때
   * (쉼터: 수행 = 채운 점 · 미수행 = 빈 점). 두 상태의 색이 가까워도 모양으로
   * 갈려서 「색만으로 판단하게 하지 않는다」(`RULES.md`)를 지킨다. 없으면 채운다
   */
  dotHollow?: boolean;
  /**
   * 날짜 아래 **그림 한 장**(스티커 모드 전용 · `dateSticker`). 보관함은 그날 주 감정의
   * 얼굴을 준다(`EmotionSticker`). **무슨 그림인지는 부르는 쪽이 안다** — 여기는 받은
   * 노드를 정해진 자리에 그릴 뿐이라 감정을 모른다. 없으면 자리만 비워 둔다.
   */
  sticker?: ReactNode;
  /**
   * 칸의 낭독기 이름에 덧붙일 말 — 보관함은 그날 **감정 이름**을 준다(「13일, 기쁨」).
   * 그림·색은 낭독기에 읽히지 않으므로, 이 한 마디가 없으면 칸이 「13일」로만 읽힌다
   */
  label?: string;
  /** 날짜 글자를 진하게 (쉼터의 카드 있는 날) */
  emphasized?: boolean;
  /** 고를 수 없는 날 (쉼터의 카드 없는 날) */
  disabled?: boolean;
};

type Props = {
  /** `2026-08` */
  month: string;
  /** `2026-08-13` · 고른 날이 없으면 `null` */
  selectedDate: string | null;
  onSelect: (date: string) => void;
  /** `-1` 이전 달 · `1` 다음 달 */
  onMonthStep: (step: -1 | 1) => void;
  markOf?: (date: string) => CalendarMark;
  /**
   * **스티커 모드** — 날짜 **아래**에 `mark.sticker` 를 놓는다(보관함 · 일기 = 그날 주
   * 감정의 얼굴). 그림은 **칸 폭에 맞춰 커진다**(칸에서 좌우 여백만 남긴다 · 최대 34) —
   * 얼굴이 커야 눈·입 모양이 갈리고, 그게 이 격자에서 색을 거드는 유일한 채널이다.
   * 그림 자리는 기록이 없는 날에도 늘 잡아 둬서 줄 높이가 오르내리지 않는다.
   *
   * 고른 날은 **날짜를 감싸는 작은 알약**으로 표시한다(칸을 두르는 링이 아니다) —
   * 스티커가 칸을 거의 채워서 링을 두르면 그림에 달라붙어 보인다. 기본(false)은
   * 점 모드(쉼터의 수행/미수행 점).
   */
  dateSticker?: boolean;
  /**
   * HTML 보관함 시안처럼 46pt 줄에 작은 얼굴을 배치한다. 기본 달력 크기는 유지한다.
   *
   * **보관함 전용**이라 읽기 값도 여기에 함께 건다(2026-11-03 · 사용자 요청) — 요일과 날짜는
   * `archiveType` 크기에 읽히는 색이다. 쉼터(`R2`)는 이 값을 켜지 않아 그대로다.
   * 큰 글씨에서는 머리글과 날짜 줄이 함께 자라 점과 얼굴을 누르지 않는다.
   */
  compactDateSticker?: boolean;
  /**
   * **점 모드의 읽기 값**(쉼터 `R2` · 2026-11-05) — 요일 · 날짜 · 고른 날 알약을 보관함과 같게 그리고,
   * 날짜 아래에는 점만 둔다. 카드 없는 날의 날짜는 한 단 옅다. 없으면 전과 같다.
   */
  readable?: boolean;
  /** 월 이동 UI를 화면 제목 옆에 배치할 때 달력 안의 중복 행을 숨긴다. */
  showMonthControls?: boolean;
  /**
   * 격자가 **늘 잡아 두는 주 줄 수**. 한 달은 5줄일 때도 6줄일 때도 있어서, 그 달의
   * 줄 수만큼만 높으면 달을 넘길 때 격자 높이가 한 줄씩 오르내린다 — 달력을
   * 바닥에 붙여 놓은 화면(쉼터 `R2`)에서는 그때마다 **달력 상단이 움직인다.**
   * 최대 줄 수(6)를 주면 5줄인 달은 마지막 줄 자리를 비워 두고 높이가 고정된다.
   *
   * 없으면 그 달의 줄 수만큼만 높다 — 보관함은 달력이 스크롤 안에 있어서 높이가
   * 변해도 그 위가 밀리지 않고, 빈 줄을 그리면 카드 안이 괜히 비어 보인다.
   */
  reserveRows?: number;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const NO_MARK: CalendarMark = {};

/** `2026-08` + `13` → `2026-08-13` */
const isoOf = (month: string, day: number) => `${month}-${String(day).padStart(2, "0")}`;

export function Calendar({
  month,
  selectedDate,
  onSelect,
  onMonthStep,
  markOf,
  dateSticker = false,
  compactDateSticker = false,
  readable = false,
  showMonthControls = true,
  reserveRows,
}: Props) {
  const [gridWidth, setGridWidth] = useState(0);
  const cell = columnWidth(gridWidth, WEEKDAYS.length);
  // 재기 전 한 프레임만 퍼센트로 선다
  const cellSize = cell == null ? MEASURING_WIDTH : { width: cell };

  /**
   * 스티커 한 변 — **칸 폭에서 좌우 여백만 뺀 값**이다. 고정 px 로 두면 좁은 기기
   * (칸 35 남짓)에서 그림이 칸을 넘어 이웃과 겹치고, 넓은 기기에서는 얼굴이 작아
   * 표정이 안 보인다. 폭을 재기 전 한 프레임은 최대값으로 선다.
   */
  const stickerSize = compactDateSticker
    ? 22
    : cell == null
      ? STICKER_MAX
      : Math.max(STICKER_MIN, Math.min(STICKER_MAX, Math.round(cell - STICKER_GUTTER)));
  const schedDotTop = compactDateSticker ? 0 : SCHED_DOT_TOP;
  const fontScale = useEffectiveFontScale();
  const reading = compactDateSticker || readable;
  const headHeight = reading ? Math.ceil(COMPACT_HEAD_HEIGHT * fontScale) : HEAD_HEIGHT;
  const dateRow = reading ? Math.ceil(archiveType.date.lineHeight * fontScale) : DATE_ROW;
  const pillTop = reading ? Math.round(COMPACT_PILL_TOP * fontScale) : PILL_DROP;
  const pill = {
    width: reading
      ? Math.min(cell ?? Infinity, Math.round(COMPACT_PILL_WIDTH * fontScale))
      : DATE_PILL_WIDTH,
    height: reading ? dateRow - pillTop : DATE_ROW,
    top: pillTop,
  };

  const [y = "2026", m = "1"] = month.split("-");
  // 1일의 요일만큼 앞을 비운다 — 요일 머리글과 줄이 맞아야 달력으로 읽힌다
  const lead = new Date(Number(y), Number(m) - 1, 1).getDay();
  const days = new Date(Number(y), Number(m), 0).getDate();

  /**
   * 예약 높이 = 요일 머리글 + 줄 수 × (칸 + 줄 간격). **칸 높이는 모드마다 다르다** —
   * 스티커 모드는 날짜 아래에 일정 점과 얼굴이 더 서기 때문이다. ⚠ 이 식은 칸에 쌓는
   * 것을 **하나도 빠뜨리면 안 된다** — 빠뜨리면 내용이 칸보다 높아져 얼굴이 다음 줄을 누른다.
   *
   * `rowGap` 은 머리글과 첫 줄 사이에도 한 번 들어가서 **줄 수와 간격 수가 같다** —
   * 그래서 `(N-1)` 이 아니라 `N` 을 곱한다. 남는 자리는 `alignContent: flex-start`
   * 덕에 **아래**에 남는다(`styles.grid`).
   */
  const cellHeight = dateSticker
    ? (compactDateSticker ? 0 : DATE_TOP) +
      dateRow +
      schedDotTop +
      SCHED_DOT +
      STICKER_GAP +
      stickerSize
    : readable
      ? dateRow + READABLE_DOT_TOP + DOT + READABLE_CELL_PAD
      : CELL_HEIGHT;
  const reservedGridHeight =
    reserveRows == null ? null : headHeight + reserveRows * (cellHeight + ROW_GAP);

  return (
    <View style={styles.root}>
      {showMonthControls ? (
        <View style={styles.monthRow}>
          <IconButton
            name="chevron-left"
            size={20}
            accessibilityLabel="이전 달"
            onPress={() => onMonthStep(-1)}
            style={styles.monthButton}
          />
          <Text
            variant="label1"
            color={labelColor.strong}
            style={readable ? archiveType.diaryTitle : null}
          >
            {formatKoreanMonth(month)}
          </Text>
          <IconButton
            name="chevron-right"
            size={20}
            accessibilityLabel="다음 달"
            onPress={() => onMonthStep(1)}
            style={styles.monthButton}
          />
        </View>
      ) : null}

      <View
        style={[styles.grid, reservedGridHeight != null ? { minHeight: reservedGridHeight } : null]}
        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
      >
        {WEEKDAYS.map((d) => (
          <View key={d} style={[styles.head, { height: headHeight }, cellSize]}>
            <Text
              variant={reading ? "label1" : "caption2"}
              color={reading ? labelColor.neutral : labelColor.assistive}
              style={reading ? archiveType.weekday : null}
            >
              {d}
            </Text>
          </View>
        ))}

        {/* 앞의 빈 칸에는 누를 것이 없다 — 자리만 지킨다 */}
        {Array.from({ length: lead }, (_, i) => (
          <View
            key={`lead-${i}`}
            style={[
              styles.cell,
              cellSize,
              dateSticker || readable ? [styles.cellSticker, { height: cellHeight }] : null,
            ]}
          />
        ))}

        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const date = isoOf(month, day);
          const mark = markOf?.(date) ?? NO_MARK;
          const selected = date === selectedDate;

          return (
            <Pressable
              key={date}
              accessibilityRole="button"
              // 그림·색은 낭독기에 없다 — 감정 이름은 `mark.label` 로 온다
              accessibilityLabel={mark.label == null ? `${day}일` : `${day}일, ${mark.label}`}
              accessibilityState={{ selected, disabled: mark.disabled === true }}
              disabled={mark.disabled === true}
              hitSlop={readable ? READABLE_HIT_SLOP : undefined}
              onPress={() => onSelect(date)}
              style={[
                styles.cell,
                cellSize,
                dateSticker || readable ? [styles.cellSticker, { height: cellHeight }] : null,
                // 스티커 모드의 선택 표시는 칸의 링이 아니라 **날짜 알약**이다(아래)
                !dateSticker && !readable && selected ? styles.cellSelected : null,
              ]}
            >
              {dateSticker ? (
                // 스티커 모드(보관함) — 날짜 아래에 그날 감정의 얼굴이 선다.
                // 그림 자리는 **기록이 없는 날에도** 잡아 둔다(줄 높이 고정).
                <>
                  {/* 고른 날은 날짜를 **초록 알약**이 감싼다. 알약 자리(높이·최소 폭)는
                      늘 잡아 두고 색만 준다 — 고를 때 숫자가 움직이지 않게. 흰 글자가
                      얹히는 초록 면은 `primary.heavy` 하나뿐이다(`ds/color.ts` 머리말) */}
                  <View style={[styles.datePill, { width: pill.width, height: dateRow }]}>
                    {selected ? <PillFill {...pill} /> : null}
                    <Text
                      variant={
                        compactDateSticker
                          ? "label1"
                          : mark.emphasized === true
                            ? "caption1"
                            : "caption2"
                      }
                      color={selected ? labelColor.onFill : cellColor(mark, compactDateSticker)}
                      style={[styles.dateNum, compactDateSticker ? styles.dateNumCompact : null]}
                      numberOfLines={1}
                    >
                      {day}
                    </Text>
                  </View>
                  {/* 그날 일정 — 날짜와 얼굴 **사이**의 작은 점. 그림(일기)과 점(일정)이라
                      채널이 갈려서 둘 다 있는 날도 섞이지 않는다. 색은 부르는 쪽이 준다
                      (보관함=홈 CTA 색). 자리는 늘 잡고 색이 있는 날만 그린다. SVG 원이라
                      first-paint 에 네모로 굳지 않는다(아래 `Dot` 주석) */}
                  <View
                    style={[styles.schedSlot, { marginTop: schedDotTop }]}
                    testID={mark.dotColor != null ? SCHEDULE_DOT : undefined}
                  >
                    <Dot size={SCHED_DOT} color={mark.dotColor} />
                  </View>
                  <View style={[styles.stickerSlot, { width: stickerSize, height: stickerSize }]}>
                    {mark.sticker}
                  </View>
                </>
              ) : readable ? (
                // 읽기 값의 점 모드(쉼터 R2) — 보관함과 같은 날짜 · 알약 아래에 점 하나
                <>
                  <View style={[styles.datePill, { width: pill.width, height: dateRow }]}>
                    {selected ? <PillFill {...pill} /> : null}
                    <Text
                      variant="label1"
                      color={
                        selected
                          ? labelColor.onFill
                          : mark.emphasized === true
                            ? labelColor.strong
                            : labelColor.neutral
                      }
                      style={[styles.dateNum, styles.dateNumCompact]}
                      numberOfLines={1}
                    >
                      {day}
                    </Text>
                  </View>
                  <View style={styles.readableDot}>
                    <Dot
                      size={DOT}
                      color={mark.dotColor}
                      hollow={mark.dotHollow === true}
                      borderWidth={DOT_BORDER}
                    />
                  </View>
                </>
              ) : (
                // 점 모드(쉼터) — 숫자 아래 점(수행=채움/미수행=빈 점). 일정 밑줄은
                // 숫자 밑 고정 바. ⚠ 폭을 **숫자**에 주면 「22」가 줄바꿈돼 깨진다
                <>
                  <Text
                    variant={mark.emphasized === true ? "caption1" : "caption2"}
                    color={cellColor(mark)}
                  >
                    {day}
                  </Text>
                  {/* 점 자리는 늘 잡아 둔다 — 채운 점(수행)과 빈 점(미수행)은 모양으로 갈린다.
                      SVG 원이라 first-paint 에 네모로 굳지 않는다(아래 `Dot` 주석) */}
                  <View style={styles.dotSlot}>
                    <Dot
                      size={DOT}
                      color={mark.dotColor}
                      hollow={mark.dotHollow === true}
                      borderWidth={DOT_BORDER}
                    />
                  </View>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * 고른 날의 **초록 알약 면** — `Dot` 과 같은 이유로 **SVG** 로 그린다.
 *
 * `View` + `borderRadius` 로 뒀더니 실기기(안드로이드 New Architecture)에서 **선택이
 * 옮겨간 칸의 알약이 모서리를 잃고 네모로 나왔다** — 처음 그린 칸은 둥글고, 그 뒤
 * 배경색이 붙는 칸은 반지름 계산이 다시 돌지 않는다(위 `Dot` 주석의 그 버그다).
 * SVG 는 그 래스터 경로를 타지 않아 **늘 둥글다.**
 *
 * 글자 뒤에 깔린다 — 자리(`absoluteFill`)만 차지하고 크기는 알약과 같다.
 * `testID` 는 화면 테스트가 「고른 날에만 면이 생긴다」를 보는 손잡이다.
 */
function PillFill({ width, height, top }: { width: number; height: number; top: number }) {
  return (
    <View testID="date-pill" style={[StyleSheet.absoluteFill, { top }]} pointerEvents="none">
      <Svg width={width} height={height}>
        <Rect width={width} height={height} rx={height / 2} ry={height / 2} fill={primary.heavy} />
      </Svg>
    </View>
  );
}

function cellColor(mark: CalendarMark, compact = false) {
  if (mark.disabled === true) return labelColor.disabled;
  if (mark.emphasized === true) return labelColor.strong;
  return compact ? labelColor.normal : interaction.inactive;
}

/**
 * 캘린더 점 — **SVG 원**으로 그린다. `View` + `borderRadius` 는 안드로이드 New Architecture 에서
 * 반지름을 `min(반지름, 크기/2)` 로 깎는데, 그 계산이 **크기가 확정되기 전**(칸 폭을 `onLayout` 으로
 * 재는 첫 프레임)에 돌면 0 이 되어 **네모로 굳고**, 나중에 크기가 바뀌어도 다시 계산하지 않는다 —
 * 「처음엔 네모, 탭을 바꿨다 오면 동그라미」의 원인이었다. SVG 는 그 래스터 경로를 타지 않아
 * 레이아웃 타이밍과 무관하게 **늘 원**이다. 색이 없으면 자리(`size`)만 잡고 아무것도 안 그린다.
 */
function Dot({
  size,
  color,
  hollow = false,
  borderWidth = 0,
}: {
  size: number;
  color?: string;
  hollow?: boolean;
  borderWidth?: number;
}) {
  return (
    <Svg width={size} height={size}>
      {color != null ? (
        <Circle
          cx={size / 2}
          cy={size / 2}
          // 빈 점은 획이 안쪽으로 물리게 반지름을 획 절반만큼 줄인다
          r={(size - (hollow ? borderWidth : 0)) / 2}
          fill={hollow ? "none" : color}
          stroke={hollow ? color : undefined}
          strokeWidth={hollow ? borderWidth : undefined}
        />
      ) : null}
    </Svg>
  );
}

const CELL_HEIGHT = 38;
/** 요일 머리글 줄 높이 — 예약 높이(`reserveRows`)가 이 값을 쓴다 */
const HEAD_HEIGHT = 24;
/** 줄 사이 간격(시안 2px) — 머리글과 첫 줄 사이에도 같은 값이 들어간다 */
const ROW_GAP = 2;
const DOT = 8;
/** 빈 점의 테두리 굵기 — 점 가운데가 뚫려 보이는 최소값 */
const DOT_BORDER = 1.5;
/**
 * 스티커 모드의 일정 점 지름 — 날짜와 얼굴 사이에 서는 작은 점. 색이 아주 옅어서
 * (`scheduleDot` 대비 1.35) 5 로는 잘 안 보였다 — **6** 이 그 색으로 읽히는 최소값이다
 */
const SCHED_DOT = 6;
/** 그 점을 날짜에서 떨어뜨리는 값 — 숫자보다 얼굴 쪽에 가깝게 앉는다 */
const SCHED_DOT_TOP = 6;
/** 그 점이 그려졌을 때만 붙는 테스트 손잡이 — 화면 테스트가 「일정 있는 날」을 본다 */
const SCHEDULE_DOT = "schedule-dot";
/**
 * 스티커가 칸 안에서 남기는 좌우 여백(합) — 2026-09-07 에 7 → **5** 로 줄였다
 * (사용자 요청 「조금 더 키워라」). 얼굴 사이가 2.5px 남짓이라 더 줄이면 붙어 보인다
 */
const STICKER_GUTTER = 5;
/** 스티커 한 변의 위·아래 한계 — 넓은 기기에서 무한정 커지지 않고, 좁은 기기에서도 표정이 남는다 */
const STICKER_MAX = 37;
const STICKER_MIN = 22;
/**
 * 날짜 알약 줄의 높이 — 알약이 그대로 줄 높이다. **글줄(11/14) 딱 그만큼**이라
 * 숫자를 감싸는 최소 크기다(2026-09-07 에 16 → 14 · 사용자 요청). 더 키우면 숫자와
 * 얼굴 사이에 빈 자리가 생겨 둘이 한 칸으로 안 읽힌다
 */
const DATE_ROW = 14;
/**
 * 날짜 알약의 고정 폭 — 2026-09-07 에 24 → **20** 으로 줄였다(사용자 요청).
 * 두 자리 숫자의 잉크가 9dp 남짓이라 좌우로 5dp 씩 남는다
 */
const DATE_PILL_WIDTH = 20;
/**
 * 칸 위쪽 여백 — 날짜 알약이 칸 천장에 붙지 않게 내려 앉힌다
 * (2026-09-07 · 사용자 요청). 줄 사이(`ROW_GAP` 2)와 합쳐 위 칸의
 * 얼굴과 4 가 벌어져서, 알약이 **자기 줄의 것**으로 읽힌다.
 */
const DATE_TOP = 2;
/**
 * 일정 점과 그림 사이. 날짜와 그림 사이의 총 간격은 `SCHED_DOT_TOP` + 점 + 이 값이다
 * (2026-09-07 · 사용자 요청으로 점을 아래로 내리면서 이쪽을 1 로 줄였다).
 * 음수로도 갈 수 있게 `gap` 이 아니라 그림 자리의 `marginTop` 으로 준다.
 */
const STICKER_GAP = 0;
/**
 * 알약 안 숫자의 **시각 보정**(1px 아래로). 숫자는 baseline 아래로 뻗는 획이 없는데
 * 글줄 상자는 그 자리를 늘 비워 둬서, 상자를 가운데 맞추면 숫자가 그 절반만큼 떠 보인다.
 */
const DIGIT_NUDGE = 1;
/**
 * 알약 **면**만 내리는 값(글자는 그대로 둔다). 숫자는 글줄 상자 안에서 baseline 위에
 * 앉고 그 아래(내려가는 획 자리)는 비어 있어서, 면을 글줄에 맞추면 **숫자가 알약
 * 아래쪽에 몰려 보인다** — 실기기에서 재니 42px 알약 안에서 위 17 / 아래 7 이었다
 * (2026-09-07). 면을 그만큼 내려 **숫자를 알약 한가운데** 둔다.
 *
 * 글자를 올리지 않는 이유: 알약이 없는 날의 숫자와 **같은 줄에 서 있어야** 한다.
 */
const PILL_DROP = 1.7;
/** 읽기 값의 점 모드 — 날짜와 점 사이 · 칸 아래 남기는 자리 */
const READABLE_DOT_TOP = 3;
/** 칸 42 + 줄 간격 2 = 44 — 터치 목표를 위아래 `hitSlop` 1 로 채운다 */
const READABLE_CELL_PAD = 11;
const READABLE_HIT_SLOP = { top: 1, bottom: 1 };
/** 보관함 요일 머리글 높이 — `archiveType.weekday` 의 행간이 들어가는 값 */
const COMPACT_HEAD_HEIGHT = 24;
/** 보관함의 고른 날 알약 폭 — 두 자리 숫자(폭 21)의 좌우에 5 남짓 남긴다 */
const COMPACT_PILL_WIDTH = 28;
/** 보관함 알약 면을 내리는 값 — 면의 아래끝이 점 자리에 닿지 않게 날짜 줄 안에서 끝난다 */
const COMPACT_PILL_TOP = 2;

/** 폭을 재기 전 한 프레임 — 퍼센트로 서 있다가 다음 프레임에 픽셀로 갈아탄다 */
const MEASURING_WIDTH = { width: `${100 / WEEKDAYS.length}%` } as const;

const styles = StyleSheet.create({
  root: { gap: space.md },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  // 히트 44 는 유지하되 칸 높이를 밀지 않게 세로로 당긴다
  monthButton: { height: 32, marginVertical: -6 },

  // 7칸 고정 — 폭을 재서 픽셀로 나눈다(위 주석). 줄 간격은 시안의 2px
  // ⚠ **가운데 정렬하지 않는다** — 마지막 주는 칸이 일곱보다 적어서, 가운데로
  // 모으면 그 주의 날짜가 요일 머리글과 어긋난다. 내림하고 남는 2px 남짓은
  // 오른쪽 끝에 그대로 둔다
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: ROW_GAP,
    columnGap: 0,
    // 남는 줄 자리는 **아래**에 남긴다 — `reserveRows` 로 6줄을 잡아 둔 달력에서
    // 5줄인 달이 가운데로 내려오면 상단이 움직여 예약한 뜻이 사라진다
    alignContent: "flex-start",
  },
  head: { height: HEAD_HEIGHT, alignItems: "center", justifyContent: "center" },
  cell: {
    height: CELL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    borderRadius: radius.small,
  },
  // 스티커 모드 — 날짜 알약과 얼굴을 위에서부터 쌓는다. 높이는 그림 크기에 따라
  // 달라져서(칸 폭에 맞춰 커진다) 인라인으로 준다.
  // ⚠ `gap` 을 **0 으로 되돌린다** — `cell` 의 3 을 물려받으면 내용이 칸보다 3px 높아져
  // (16 + 3 − 2 + 그림) 얼굴이 칸 밖으로 밀리고 다음 줄의 날짜를 위에서 누른다.
  // 줄 사이를 좁히는 일은 `STICKER_GAP`(음수 마진) 하나가 맡는다
  cellSticker: { gap: 0, justifyContent: "flex-start" },
  // 날짜 알약 — 자리는 늘 잡고 고른 날만 초록 면(`PillFill`)이 깔린다. 폭이 고정이라
  // 「1」과 「22」의 알약이 같은 크기로 선다
  datePill: {
    // 폭은 **고정**이다 — 「30」이 들어가고 이웃 칸과 붙지 않는 값. 면은 `PillFill`(SVG)이
    // 그리므로 여기엔 반지름을 두지 않는다(`View` 반지름은 실기기에서 네모로 굳었다)
    width: DATE_PILL_WIDTH,
    height: DATE_ROW,
    alignItems: "center",
    justifyContent: "center",
  },
  /**
   * 알약 안의 숫자 — **글줄 상자를 알약 높이에 맞춘다.**
   *
   * `variant` 가 행간을 정한다는 규칙(`ds/Text.tsx`)을 여기서만 덮는다. 이유가 있다:
   * 고정 높이 그릇 안에서 `justifyContent: center` 는 **글줄 상자**를 가운데 두지
   * 글리프를 두지 않는다. caption2 는 11/14 라 16 짜리 알약 안에서 위아래 1씩 남고,
   * 거기에 안드로이드의 `includeFontPadding`(글꼴 위아래로 더 붙는 여백)이 비대칭으로
   * 얹혀 **숫자가 한두 픽셀 떠 보인다** — 「타원 가운데가 안 맞는다」의 정체다.
   * 글줄 상자를 알약과 같게 하고 그 패딩을 끄면 두 플랫폼에서 같은 자리에 선다.
   */
  dateNum: {
    lineHeight: DATE_ROW,
    includeFontPadding: false,
    textAlign: "center",
    textAlignVertical: "center",
    // 숫자에는 **내려가는 획이 없다**(g·y 처럼 baseline 아래로 뻗는 부분). 글줄 상자는
    // 그 자리를 늘 비워 두므로, 상자를 가운데 맞추면 숫자만 1px 떠서 **알약이 내려앉아
    // 보인다**. 그 자리만큼 되돌린다 — 레이아웃이 아니라 그림만 옮기는 보정이다
    transform: [{ translateY: DIGIT_NUDGE }],
  },
  // 보관함 — 글줄 상자가 날짜 줄과 같아서 보정 없이도 숫자가 알약 가운데에 선다.
  // 행간은 배율 전 값이다 — `Text` 가 글꼴과 함께 키운다
  dateNumCompact: { ...archiveType.date, transform: [{ translateY: 0 }] },
  // 일정 점 자리 — 일정이 없는 날에도 잡아 둔다(줄 높이가 오르내리지 않게).
  // 날짜에서 조금 떨어뜨려 **얼굴 쪽에 붙인다**(2026-09-07 · 사용자 요청)
  schedSlot: {
    height: SCHED_DOT,
    marginTop: SCHED_DOT_TOP,
    alignItems: "center",
    justifyContent: "center",
  },
  // 얼굴 자리 — 크기는 인라인(칸 폭에서 나온다). 기록이 없는 날에도 잡아 둔다.
  // 음수 여백으로 날짜에 바짝 붙인다(위 `STICKER_GAP`)
  stickerSlot: { marginTop: STICKER_GAP, alignItems: "center", justifyContent: "center" },
  // 감정 점(쉼터)은 `Dot`(SVG 원)이 그린다 — borderRadius 를 쓰지 않아 first-paint
  // 네모 버그가 원천 사라졌다(위 `Dot` 주석). 여기엔 자리·위치만 남는다
  /**
   * 선택은 **테두리 2px 만**으로 표시한다(2026-08-24 · 초록 면 채움을 뺐다).
   * 굵기 변화(1→2px)가 색이 아닌 신호라 「선택을 색만으로 표시하지 않는다」는
   * 규칙은 그대로 지킨다. `A1.md` 는 면+테두리였으나 배경을 투명으로 바꿨다 —
   * 스펙과 어긋나므로 굳으면 `docs/PRODUCT.md` 「상류와 차이」에 남긴다.
   */
  cellSelected: { borderWidth: 2, borderColor: primary.normal },
  // 점 모드(쉼터 행동 카드) — 날짜 아래 점의 자리. 숫자에 조금 더 붙게 위로 당긴다.
  // 원 자체는 `Dot`(SVG)이 그리고, 여기는 위치만 잡는다
  dotSlot: { marginTop: -3 },
  readableDot: { marginTop: READABLE_DOT_TOP },
});
