import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Icon, Text } from "@/components/ds";
import { label as labelColor, space, status, text, type TextToken } from "@/design/ds";
import type { Schedule } from "@/features/home/model/types";

/**
 * 그날 일정 — 읽기 전용. `A1` 선택 날짜와 `A3` 기록 상세가 **같은 줄**을 쓴다
 * (`Archive.dc.html` A1·A3 이 실제로 같은 마크업이다).
 *
 * - 완료: **초록 체크 + 취소선 + `Label/Neutral`**. `DESIGN.md` §1 이 Label/Neutral 을
 *   「완료 일정」 자리로 못박았다 — 시안의 `Label/Alternative` 보다 이쪽을 따른다
 * - 미완료: 체크 자리만큼 들여쓴다 — 체크 대신 빈 동그라미를 두지 않는다.
 *   **안 한 일에 표식을 붙이면 목록이 미달의 목록이 된다**(`RULES.md` 「숫자로 압박 금지」와 같은 결)
 * - 여기서 완료를 **바꾸지 않는다** — 지난 날의 기록이고, 완료는 홈에서 한다
 *
 * ⚠ 일정 store 는 아직 **오늘 하루치**만 든다. 지난 날을 열면 넘어오는 줄이 없어
 * 이 블록이 통째로 숨는다 — 그것이 「일정이 없는 날」과 같은 처리다(`app-flow.md` §2.3).
 * 날짜별 조회가 붙으면 부르는 쪽의 selector 만 바뀐다.
 */
type Props = {
  schedules: readonly Schedule[];
  /** 블록 제목. 없으면 줄만 그린다 (`A1` 은 위 카드가 이미 날짜를 말한다) */
  title?: string;
  /** 제목 크기 — 기본 `headline1`. 보관함은 작은 라벨로 낮춘다 */
  titleVariant?: ComponentProps<typeof Text>["variant"];
  /** 제목 색 — 기본 강한 잉크. 보관함은 갈색 라벨색을 준다 */
  titleColor?: string;
  /** 블록 전체를 오른쪽으로 들여쓴다 — 일기 아래 종속으로 보이게. 기본 0 */
  inset?: number;
  /**
   * 줄마다 **완료 점**을 앞에 둔다 — 채운 초록 점 = 완료 · 빈 점 = 미완료.
   * 보관함이 홈의 완료를 한눈에 보이려고 켠다(쉼터 달력의 채움/비움과 같은 결).
   *
   * ⚠ 기본은 끈다. 안 켜면 완료만 초록 체크로 표시하고 미완료엔 표식을 두지
   * 않는다 — 「안 한 일에 표식을 붙이면 미달의 목록이 된다」는 결(회고 초안의
   * 「오늘 일정」이 이 얼굴이다). 완료를 **대조**로 보여야 하는 보관함만 켠다.
   */
  showStatusDot?: boolean;
  /**
   * 줄 글자의 단 — 기본 `body2`. 일기 확인(`C6`)의 일정 메모는 일기와 같은 **손글씨**로 쓴다.
   * 완료 점은 이 단의 첫 줄 가운데에 선다.
   */
  itemVariant?: TextToken;
  /** 제목 · 줄 글자의 크기를 덮는다 — 보관함만 자기 값을 준다(`archiveType`) */
  titleType?: TextType;
  itemType?: TextType;
};

type TextType = { fontSize: number; lineHeight: number };

export function DayScheduleList({
  schedules,
  title,
  titleVariant = "headline1",
  titleColor = labelColor.strong,
  inset = 0,
  showStatusDot = false,
  itemVariant = "body2",
  titleType,
  itemType,
}: Props) {
  if (schedules.length === 0) return null;

  // 점을 줄의 첫 줄 세로 가운데에 — body2(22) 면 7 이다
  const dotTop = ((itemType ?? text[itemVariant]).lineHeight - DOT) / 2;

  return (
    <View style={[styles.root, inset > 0 ? { paddingLeft: inset } : null]}>
      {title != null ? (
        <Text variant={titleVariant} color={titleColor} style={titleType}>
          {title}
        </Text>
      ) : null}

      {schedules.map((s) => {
        // 점 모드: 완료/미완료 모두 점을 둔다(채운=완료 · 빈=미완료). 기본 모드: 완료만 초록 체크.
        // 점은 **SVG 원**이다 — View+borderRadius 는 안드로이드 New Arch 에서 크기 확정 전 반지름이
        // 0 으로 깎여 first-paint 에 네모로 굳는다(`ds/Calendar.tsx` 의 `Dot` 과 같은 이유).
        const marker = showStatusDot ? (
          <View style={{ marginTop: dotTop }}>
            <Svg width={DOT} height={DOT}>
              <Circle
                cx={DOT / 2}
                cy={DOT / 2}
                r={(DOT - (s.done ? 0 : DOT_BORDER)) / 2}
                fill={s.done ? status.positive : "none"}
                stroke={s.done ? undefined : labelColor.assistive}
                strokeWidth={s.done ? undefined : DOT_BORDER}
              />
            </Svg>
          </View>
        ) : s.done ? (
          <Icon name="circle-check" size={16} color={status.positive} />
        ) : null;

        return (
          <View key={s.id} style={[styles.row, marker == null ? styles.rowOpen : null]}>
            {marker}
            <Text
              variant={itemVariant}
              color={s.done ? labelColor.neutral : labelColor.strong}
              style={[s.done ? styles.done : null, itemType]}
            >
              {s.title}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// 체크(16) + 사이 여백(6) 만큼 — 완료한 줄과 글자 왼끝이 맞는다
const INDENT = 22;
/**
 * 완료/미완료 점 지름. 줄 단의 첫 줄 가운데에 서게 위 여백을 준다(`dotTop`) — 원은
 * `Svg`+`Circle` 이 그리고 감싼 View 는 위치만 잡는다(네모 버그 원천 차단)
 */
const DOT = 8;
/** 빈 점(미완료)의 획 굵기 — 가운데가 뚫려 보이는 최소값 */
const DOT_BORDER = 1.5;

const styles = StyleSheet.create({
  root: { gap: space.md },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  rowOpen: { paddingLeft: INDENT },
  done: { textDecorationLine: "line-through" },
});
