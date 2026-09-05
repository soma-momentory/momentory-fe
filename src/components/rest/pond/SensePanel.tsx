import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { background, label as labelColor, line, pondSize, space } from "@/design/ds";
import {
  SENSE_POND_PANEL_TITLE,
  SENSE_POND_STEPS,
  progressText,
  type SensePondStepId,
} from "@/features/rest/model/sensePond";

import { SensePointMark } from "./SensePointMark";

/**
 * 연못 아래에서 **살짝 올라온 크림 판**
 * (2026-09-05 레퍼런스 · 진행 중에는 한 줄로 줄었다 2026-09-06).
 *
 * ## 진행 중에는 거의 아무 말도 하지 않는다
 *
 * 옛 판은 셋을 늘 크게 펼쳐 놓았다(0 / 3 · 0 / 2 · 0 / 1). 그러면 지금 할 일보다
 * **남은 양**이 먼저 읽히고, 쉼터가 진도표가 된다. 지금은 진행 중에 지금 단계와
 * 거기까지의 셈만 **작고 조용한 한 줄**로 선다 — 「보이는 것 · 1 / 3」.
 * 손짓 안내는 위 문안이 이미 말하므로 여기 두지 않는다.
 *
 * ## 다 지나면 그때 한 번 펼친다
 *
 * 완료하면 셋을 나란히 보여 준다(3 / 3 · 2 / 2 · 1 / 1)와 돌아가는 길 하나.
 * 방금 지나온 것이 눈앞에 있어야 「했다」가 되고, 그 한 번이면 충분하다.
 * 재촉하지 않는 것은 그대로다 — 퍼센트도 막대도 시간도 없다(`RULES.md` 4).
 *
 * ## 판이 화면에서 뜨지 않게
 *
 * 위 모서리만 둥글고(`panelRadius`) 연못 그림의 아래를 조금 덮는다(`panelLift`) —
 * 장면과 판이 **한 몸**으로 이어져야 「연못 안에 있다」가 유지된다. 그림자를 두면
 * 판이 장면 위에 떠서 다시 「앱 화면 속 카드」가 된다.
 */
type Props = {
  /** 지금 단계 — 이 한 줄만 보여 준다. 완료하면 없다 */
  current: SensePondStepId | null;
  /** 단계별로 몇 개를 찾았나 */
  found: Record<SensePondStepId, number>;
  /** 판 아래에 붙는 것 — 완료의 「쉼터로 돌아가기」 */
  footer?: React.ReactNode;
};

export function SensePanel({ current, found, footer }: Props) {
  const step = SENSE_POND_STEPS.find((s) => s.id === current);

  // 진행 중 — 작고 조용한 한 줄
  if (step != null) {
    return (
      <View style={[styles.panel, styles.quiet]}>
        <Text variant="caption1" color={labelColor.alternative} style={styles.title}>
          {progressText(step, found[step.id])}
        </Text>
      </View>
    );
  }

  // 완료 — 지나온 셋과 돌아가는 길
  return (
    <View style={styles.panel}>
      <Text variant="label2" color={labelColor.alternative} style={styles.title}>
        {SENSE_POND_PANEL_TITLE}
      </Text>

      <View style={styles.row}>
        {SENSE_POND_STEPS.map((it) => (
          <View key={it.id} style={styles.cell} testID="pond-panel-cell">
            <SensePointMark kind={it.point} />
            <Text variant="caption1" color={labelColor.neutral}>
              {it.panelLabel}
            </Text>
            <Text variant="label1" color={labelColor.strong}>
              {found[it.id]} / {it.goal}
            </Text>
          </View>
        ))}
      </View>

      {footer != null ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: background.elevated,
    borderTopLeftRadius: pondSize.panelRadius,
    borderTopRightRadius: pondSize.panelRadius,
    // 그림 아래를 조금 덮는다 — 장면과 판이 한 몸으로 이어지게
    marginTop: -pondSize.panelLift,
    paddingTop: space.lg,
    paddingHorizontal: space.xl,
    gap: space.md,
    // 그림자 대신 실선 한 겹 — 판이 뜨지 않으면서 경계는 읽힌다
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: line.normal,
  },
  // 진행 중에는 한 줄뿐이라 판도 얇다 — 장면이 그만큼 넓어진다
  quiet: { paddingTop: space.md, paddingBottom: space.xs },
  title: { textAlign: "center" },
  row: { flexDirection: "row", justifyContent: "space-around", alignItems: "flex-start" },
  cell: { alignItems: "center", gap: space.xs, flex: 1 },
  footer: { paddingTop: space.xs, gap: space.sm, alignItems: "center" },
});
