import { Pressable, StyleSheet, View } from "react-native";

import { CheckCircleIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import theme, { type EmotionId } from "@/design/theme";
import { emotionGrid } from "@/design/tokens.mvp";

/**
 * 감정 9종 격자 — `momentory.css` `.egrid` · `.em` · `.emBig` · `.emOn` · `.emd`.
 *
 * **감정은 `theme.emotions` 9종뿐**이고 이모지 척도로 대체하지 않는다(§9-1).
 * 아홉을 다 보이고 접지 않는다 — 감춘 감정은 사실상 선택되지 않는다.
 *
 * **선택을 색만으로 표시하지 않는다**(`RULES.md` 「접근성」):
 * 테두리 1→**2px** + 그 감정의 `ink` 색 · 글자 굵기 500→**600** · 면 색까지
 * 함께 바뀐다. 색각 이상에서도 굵기와 두께로 읽힌다.
 *
 * **다시 누르면 취소되는 토글**이고 확인 모달을 두지 않는다(`12-c.md`).
 * 단 `single` 이면 하나만 남는다 — `C3` 의 "지금 가장 가까운" 은 여럿을 허용하면
 * 질문 자체가 무너진다(`C3.md`).
 *
 * `size="big"`(`.emBig`)은 `C3` 전용이다 — 64 높이에 점이 이름 위로 가고,
 * **점은 선택 여부와 무관하게 원색**이다(`C3.md`).
 */
type Props = {
  /** 켜진 감정들. 단일 선택이면 길이 1 로 넘긴다 */
  selected: readonly EmotionId[];
  onToggle: (id: EmotionId) => void;
  /** `big` 은 `C3` 시작 감정 — 점이 이름 위로 간다 */
  size?: "default" | "big";
  /**
   * 켜진 칸에 체크를 더 붙인다(`.emck`) — `A4` 가 쓴다. 여럿을 고르는 화면이라
   * 테두리·굵기만으로는 어느 것이 켜졌는지 훑기 어렵다.
   */
  showCheck?: boolean;
};

export function EmotionGrid({ selected, onToggle, size = "default", showCheck = false }: Props) {
  const big = size === "big";

  return (
    <View style={[styles.grid, big ? styles.gridBig : null]}>
      {theme.emotions.map((e) => {
        const on = selected.includes(e.id);
        return (
          <Pressable
            key={e.id}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={e.name}
            onPress={() => onToggle(e.id)}
            style={[
              styles.cell,
              big ? styles.cellBig : null,
              on
                ? {
                    backgroundColor: `${e.base}${emotionGrid.onAlpha}`,
                    borderColor: e.ink,
                    borderWidth: 2,
                  }
                : null,
            ]}
          >
            {/*
              기본 크기는 꺼짐이면 감정색, 켜지면 진한 잉크 — 대비가 함께 올라간다.
              `big`(C3)은 **선택과 무관하게 원색**이다 — 아홉을 나란히 놓고 고르는
              화면이라 점이 색 견본 노릇을 한다.
            */}
            <View
              style={[
                styles.dot,
                big ? styles.dotBig : null,
                { backgroundColor: big || !on ? e.base : e.ink },
              ]}
            />
            <AppText
              weight={on ? "600" : "500"}
              style={[styles.label, { color: on ? e.ink : theme.colors.semantic.textBody }]}
            >
              {e.name}
            </AppText>

            {/* .emck — 선택을 색 말고 체크로도 알린다 */}
            {showCheck && on ? (
              <View style={styles.check}>
                <CheckCircleIcon size={13} />
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: emotionGrid.gap },
  gridBig: { gap: emotionGrid.big.flowGap },
  cell: {
    // 3열 — gap 두 칸을 뺀 나머지를 셋으로 나눈다
    width: `${100 / emotionGrid.columns}%`,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    minHeight: emotionGrid.cell.minHeight,
    borderRadius: emotionGrid.cell.radius,
    backgroundColor: emotionGrid.cell.background,
    borderWidth: 1,
    borderColor: emotionGrid.cell.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: emotionGrid.cell.gap,
  },
  cellBig: {
    minHeight: emotionGrid.big.minHeight,
    flexDirection: "column",
    gap: emotionGrid.big.gap,
  },
  dot: {
    width: emotionGrid.cell.dot,
    height: emotionGrid.cell.dot,
    borderRadius: emotionGrid.cell.dot / 2,
  },
  dotBig: {
    width: emotionGrid.big.dot,
    height: emotionGrid.big.dot,
    borderRadius: emotionGrid.big.dot / 2,
  },
  label: { fontSize: emotionGrid.cell.fontSize, lineHeight: emotionGrid.cell.fontSize * 1.3 },
  check: { position: "absolute", top: 5, right: 5 },
});
