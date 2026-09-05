import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { interaction, label as labelColor, primary, radius, space, withAlpha } from "@/design/ds";
import { formatKoreanMonth } from "@/lib/day";

import { columnWidth } from "./columnWidth";
import { IconButton } from "./IconButton";
import { Text } from "./Text";

/**
 * 월 달력 — `Archive.dc.html` A1 · `Rest.dc.html` R2 가 **같은 그리드**를 쓴다.
 *
 * ## 그리드는 공유하고 **표시 규칙만 주입받는다**
 *
 * 보관함은 그날 감정을 점으로 찍고 쉼터는 수행한 날을 초록 점으로 찍는다 —
 * 같은 달력에 다른 뜻의 점이 붙는다. 그래서 이 컴포넌트는 **무슨 점인지 모른다**:
 * `markOf(date)` 가 칸마다 점 색·강조·잠금을 돌려주고 여기는 그대로 그린다.
 * 감정 팔레트를 여기서 import 하면 쉼터가 쓰지 않는 것을 들고 다니게 된다.
 *
 * ## 점에는 이름이 없다 — 그래서 아래에 카드가 있다
 *
 * 「**색만으로 판단하게 하지 않는다**」(`RULES.md`)는 규칙을 이 격자 안에서는
 * 지킬 수 없다 — 38px 칸에 감정 이름이 들어가지 않는다. 대신 **날짜를 누르면
 * 아래 카드가 이름을 글자로 말한다**(`A1.md`). 이 달력만 따로 떼어 쓰면 그
 * 규칙이 함께 오지 않는다는 뜻이다.
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
  /** 칸 아래 점. 없으면 찍지 않는다 — **점의 뜻은 부르는 쪽이 안다** */
  dotColor?: string;
  /**
   * 점을 채우지 않고 **테두리만** 그린다 — 상태를 색이 아니라 「채움」으로 나눌 때
   * (쉼터: 수행 = 채운 점 · 미수행 = 빈 점). 두 상태의 색이 가까워도 모양으로
   * 갈려서 「색만으로 판단하게 하지 않는다」(`RULES.md`)를 지킨다. 없으면 채운다
   */
  dotHollow?: boolean;
  /**
   * 「그날 일정이 있다」를 **일기와 다른 채널**로 표시하는 색. 렌더는 모드마다 다르다:
   * 점 모드(쉼터)는 숫자 밑 **밑줄**, 채움 모드(보관함)는 감정 박스 **아래 동그란 점**이다.
   * 어느 쪽이든 일기 채널(dot/채움)과 겹치지 않아 둘 다 있는 날도 색 없이 갈린다.
   * 없으면 그리지 않는다 — **뜻·색은 부르는 쪽이 안다**(보관함은 홈 CTA 색을 준다).
   */
  underlineColor?: string;
  /** 기록이 있는 날 — 날짜 글자를 진하게 */
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
   * **채움 모드** — `dotColor` 를 날짜 아래 점이 아니라 날짜를 담는 **가로로 조금
   * 좁은 색 박스**로 채운다(보관함 · 일기 = 감정 색). 일정(`underlineColor`)은 그
   * 박스 아래 **동그란 점**으로 선다. 기본(false)은 점 모드(쉼터의 수행/미수행 점).
   */
  dateFill?: boolean;
  /**
   * 격자가 **늘 잡아 두는 주 줄 수**. 한 달은 5줄일 때도 6줄일 때도 있어서, 그 달의
   * 줄 수만큼만 높으면 달을 넘길 때 격자 높이가 한 줄(40)씩 오르내린다 — 달력을
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
  dateFill = false,
  reserveRows,
}: Props) {
  const [gridWidth, setGridWidth] = useState(0);
  const cell = columnWidth(gridWidth, WEEKDAYS.length);
  // 재기 전 한 프레임만 퍼센트로 선다
  const cellSize = cell == null ? MEASURING_WIDTH : { width: cell };

  const [y = "2026", m = "1"] = month.split("-");
  // 1일의 요일만큼 앞을 비운다 — 요일 머리글과 줄이 맞아야 달력으로 읽힌다
  const lead = new Date(Number(y), Number(m) - 1, 1).getDay();
  const days = new Date(Number(y), Number(m), 0).getDate();

  /**
   * 예약 높이 = 요일 머리글 + 줄 수 × (칸 + 줄 간격).
   *
   * `rowGap` 은 머리글과 첫 줄 사이에도 한 번 들어가서 **줄 수와 간격 수가 같다** —
   * 그래서 `(N-1)` 이 아니라 `N` 을 곱한다. 남는 자리는 `alignContent: flex-start`
   * 덕에 **아래**에 남는다(`styles.grid`).
   */
  const reservedGridHeight =
    reserveRows == null ? null : HEAD_HEIGHT + reserveRows * (CELL_HEIGHT + ROW_GAP);

  return (
    <View style={styles.root}>
      <View style={styles.monthRow}>
        <IconButton
          name="chevron-left"
          size={20}
          accessibilityLabel="이전 달"
          onPress={() => onMonthStep(-1)}
          style={styles.monthButton}
        />
        <Text variant="label1" color={labelColor.strong}>
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

      <View
        style={[styles.grid, reservedGridHeight != null ? { minHeight: reservedGridHeight } : null]}
        onLayout={(e) => setGridWidth(e.nativeEvent.layout.width)}
      >
        {WEEKDAYS.map((d) => (
          <View key={d} style={[styles.head, cellSize]}>
            <Text variant="caption2" color={labelColor.assistive}>
              {d}
            </Text>
          </View>
        ))}

        {/* 앞의 빈 칸에는 누를 것이 없다 — 자리만 지킨다 */}
        {Array.from({ length: lead }, (_, i) => (
          <View key={`lead-${i}`} style={[styles.cell, cellSize]} />
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
              accessibilityLabel={`${day}일`}
              accessibilityState={{ selected, disabled: mark.disabled === true }}
              disabled={mark.disabled === true}
              onPress={() => onSelect(date)}
              style={[
                styles.cell,
                cellSize,
                dateFill ? styles.cellFill : null,
                !dateFill && selected ? styles.cellSelected : null,
              ]}
            >
              {dateFill ? (
                // 채움 모드(보관함) — 일기가 있는 날은 그 감정 색으로 **박스를 채운다**
                // (가로로 조금 좁은 라운드 박스). 테두리 없이 감정 배경색(55% 틴트)만 두고,
                // 박스가 **날짜와 그 아래 일정 점을 함께 감싼다**. 선택만 2px primary 테두리.
                <View
                  style={[
                    styles.fillBox,
                    mark.dotColor != null
                      ? { backgroundColor: withAlpha(mark.dotColor, 0.55) }
                      : null,
                    selected ? styles.fillBoxSelected : null,
                  ]}
                >
                  <Text
                    variant={mark.emphasized === true ? "caption1" : "caption2"}
                    color={cellColor(mark)}
                  >
                    {day}
                  </Text>
                  {/* 그날 일정 — 감정 배경 **안**, 날짜 아래 동그란 점. 감정 채움과 다른
                      채널이라 둘 다 있는 날도 갈린다. 색은 부르는 쪽이 준다(보관함=홈 CTA 색).
                      늘 자리를 잡고(색 없으면 투명) 일정 있는 날만 색을 준다. SVG 원이라
                      first-paint 에 네모로 굳지 않는다(위 `Dot` 주석) */}
                  <Dot size={SCHED_DOT} color={mark.underlineColor} />
                </View>
              ) : (
                // 점 모드(쉼터) — 숫자 아래 점(수행=채움/미수행=빈 점). 일정 밑줄은
                // 숫자 밑 고정 바. ⚠ 폭을 **숫자**에 주면 「22」가 줄바꿈돼 깨진다
                <>
                  <View style={styles.num}>
                    <Text
                      variant={mark.emphasized === true ? "caption1" : "caption2"}
                      color={cellColor(mark)}
                    >
                      {day}
                    </Text>
                    <View
                      style={[
                        styles.underbar,
                        mark.underlineColor != null
                          ? { backgroundColor: mark.underlineColor }
                          : null,
                      ]}
                    />
                  </View>
                  {/* 점 자리는 늘 잡아 둔다 — 채운 점(수행)과 빈 점(미수행)은 모양으로 갈린다.
                      SVG 원이라 first-paint 에 네모로 굳지 않는다(위 `Dot` 주석) */}
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

function cellColor(mark: CalendarMark) {
  if (mark.disabled === true) return labelColor.disabled;
  return mark.emphasized === true ? labelColor.strong : interaction.inactive;
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
/** 일정 밑줄 바의 고정 폭 — 숫자 폭과 무관하게 **같은 (짧은) 길이**로 서게 한다 */
const BAR_WIDTH = 8;
/** 채움 모드 감정 박스의 높이 — 날짜와 그 아래 일정 점을 **함께** 담는다 */
const FILL_HEIGHT = 34;
/** 감정 박스 좌우 여백 — 칸보다 **가로로 조금 좁게** 서서 이웃과 벌어진다 */
const FILL_HMARGIN = 4;
/** 채움 모드 일정 점 지름 — 날짜 아래 동그라미(홈 CTA 색) */
const SCHED_DOT = 6;

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
  // 채움 모드 — 감정 박스와 일정 점을 세로로 담는다
  cellFill: { paddingBottom: 2 },
  // 감정 박스 — 칸 폭에서 좌우로 조금 물러나(가로로 좁게) 세로로 선다. **테두리
  // 없이 55% 틴트 배경만** 두고, 일기 있는 날만 색을 준다. 1.5px 테두리 자리는 늘
  // 잡아 두되 투명이라 안 보인다 — 선택 시 2px 로 커져도 칸이 밀리지 않게 한다.
  // 숫자를 가운데 감싼다
  fillBox: {
    alignSelf: "stretch",
    marginHorizontal: FILL_HMARGIN,
    height: FILL_HEIGHT,
    borderRadius: radius.small,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    // 날짜와 그 아래 일정 점 사이 간격
    gap: 2,
  },
  // 선택은 박스 링을 2px primary 로 덮는다 — 감정 채움(배경)은 그대로 남는다
  fillBoxSelected: { borderWidth: 2, borderColor: primary.normal },
  // 일정 점(보관함)·감정 점(쉼터)은 이제 `Dot`(SVG 원)이 그린다 — borderRadius 를 쓰지 않아
  // first-paint 네모 버그가 원천 사라졌다(위 `Dot` 주석). 여기엔 자리·위치만 남는다.
  // 숫자와 그 밑줄 바를 세로로 묶는다 — **폭을 주지 않아** 「22」가 줄바꿈되지 않는다
  num: { alignItems: "center", gap: 2 },
  // 일정 밑줄 — 숫자와 무관한 **고정 폭 바**. 늘 자리를 잡고(투명) 일정 있는 날만 색.
  // 폭이 고정이라 「22」든 「1」이든 밑줄 길이가 같다(작게 통일)
  underbar: { width: BAR_WIDTH, height: 2, borderRadius: 1, backgroundColor: "transparent" },
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
});
