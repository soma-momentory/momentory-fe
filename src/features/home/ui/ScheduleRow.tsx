import { Pressable, StyleSheet, View, type GestureResponderHandlers } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { CheckCircleIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { paperColors, paperEmotionColor } from "@/design/paper";
import theme from "@/design/theme";
import { addEmotionChip, home } from "@/design/tokens.mvp";
import type { Schedule } from "@/features/home/model/types";

/**
 * 일정 한 줄 — `momentory.css` `.ir` · `.chk` · `.it` · `.epill`.
 *
 * **한 줄에 터치가 셋이다**(`12.md` · `RULES.md` 「홈」 · 새 디자인 `PLAN.md` D11):
 * - **체크 원** → 마침 토글. **켤 때 감정 시트가 뜬다**(`/home/emotion/[id]`)
 * - **제목·행** → 수정·삭제 입력 바(`12-c`)
 * - **손잡이** → 꾹 눌러 순서 바꾸기(`ScheduleList`)
 *
 * 카드 아래 힌트 줄이 그 셋을 그대로 말하므로, 여기서 둘을 합치면 화면의 설명이
 * 거짓이 된다.
 *
 * - **긴 제목은 한 줄 말줄임**(`.it`)이고 **감정 알약이 먼저 자리를 잡는다** —
 *   그래서 제목이 `flex:1`, 알약이 고정이다
 * - 마침한 줄은 제목 색이 `caption` 으로 내려간다(`.itDone`). 취소선을 긋지 않는다
 * - 체크 원은 22 라서 **hitSlop 으로 44 를 채운다**(`RULES.md` 「접근성」) —
 *   시각 크기를 키우지 않는다
 */
type Props = {
  schedule: Schedule;
  onToggleDone: (id: string) => void;
  onOpen: (id: string) => void;
  /**
   * 감정이 비어 있는 줄에 **`[감정 추가]` 점선 알약**을 붙인다(`.addemo` · `C2`).
   * 홈(`12`)은 붙이지 않고 회고 확인(`C2`)만 붙인다 — 밤에 한 번 훑으며
   * 비어 있는 줄을 채우는 자리이기 때문이다.
   *
   * ⚠ **마침 여부를 보지 않는다** — 마침과 감정은 서로를 요구하지 않는다
   * (`12-c`). 「운동 가기」는 아직 안 마쳤지만 칩이 붙는다.
   */
  addEmotion?: boolean;
  /**
   * 새 디자인(`paper`)은 마침 원을 **그날 감정색**으로 채우고(미선택은 중립색)
   * 제목을 잉크 톤으로 그린다. 리스킨된 화면만 opt-in 한다 — 한 화면 안에서
   * 두 체계를 섞지 않는다(`PLAN.md` §5).
   */
  variant?: "default" | "paper";
  /**
   * 줄 맨 오른쪽의 **끌기 손잡이**(가로선 3개)를 붙인다. 끌기 자체는
   * `ScheduleList` 가 쥐고, 여기서는 손잡이를 그리고 **접근성 동작**을 단다.
   * 넘기지 않으면 그리지 않는다 — 목록이 아닌 자리(`C2`)에는 순서가 없다.
   */
  onMove?: (id: string, direction: "up" | "down") => void;
  /** `ScheduleList` 의 PanResponder — 손잡이에만 붙는다 */
  dragHandlers?: GestureResponderHandlers;
  /** 줄 사이 구분선. 마지막 줄과 끄는 동안에는 긋지 않는다 */
  dividerBelow?: boolean;
};

/** 시안의 줄 높이. `ScheduleList` 가 **몇 칸 옮겼는지 세는 기준**이라 고정이다 */
export const ROW_HEIGHT = 58;

export function ScheduleRow({
  schedule,
  onToggleDone,
  onOpen,
  addEmotion = false,
  variant = "default",
  onMove,
  dragHandlers,
  dividerBelow = false,
}: Props) {
  const { id, title, done, emotions } = schedule;
  const paper = variant === "paper";

  return (
    <View
      style={[styles.row, paper ? styles.rowPaper : null, dividerBelow ? styles.divider : null]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${title} 마침`}
        hitSlop={home.check.hitSlop}
        onPress={() => onToggleDone(id)}
      >
        {done ? (
          <CheckCircleIcon
            size={home.check.size}
            color={paper ? paperEmotionColor(emotions[0]) : undefined}
          />
        ) : (
          <View style={[styles.checkOff, paper ? styles.checkOffPaper : null]} />
        )}
      </Pressable>

      {/* 제목·행은 상세 시트로 — 체크 원과 다른 동작이다 */}
      <Pressable style={styles.titleArea} accessibilityRole="button" onPress={() => onOpen(id)}>
        <AppText
          tone={done ? "caption" : "strong"}
          weight="500"
          numberOfLines={1}
          style={[styles.title, paper ? (done ? styles.titleDonePaper : styles.titlePaper) : null]}
        >
          {title}
        </AppText>
      </Pressable>

      {emotions.map((e) => (
        <EmotionPill key={e} id={e} variant={paper ? "paper" : "default"} />
      ))}

      {/* 비어 있는 줄에만 붙는다 — 감정이 하나라도 있으면 알약이 그 자리를 쓴다 */}
      {addEmotion && emotions.length === 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${title} 감정 추가`}
          hitSlop={10}
          onPress={() => onOpen(id)}
          style={styles.addEmotion}
        >
          <AppText tone="caption" weight="500" style={styles.addEmotionLabel}>
            감정 추가
          </AppText>
        </Pressable>
      ) : null}

      {/* 끌기 손잡이 — 가로선 3개. 꾹 누르면 줄이 들린다(`ScheduleList`).
       **끌 수 없는 사람을 위해** 접근성 동작으로 같은 일을 열어 둔다 */}
      {onMove != null ? (
        <View
          {...dragHandlers}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${title} 순서 변경`}
          accessibilityHint="꾹 눌러 위아래로 끌면 순서가 바뀌어요"
          accessibilityActions={ORDER_ACTIONS}
          onAccessibilityAction={(e) =>
            onMove(id, e.nativeEvent.actionName === "moveUp" ? "up" : "down")
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.handle}
        >
          <View style={styles.handleBar} />
          <View style={styles.handleBar} />
          <View style={styles.handleBar} />
        </View>
      ) : null}
    </View>
  );
}

const ORDER_ACTIONS = [
  { name: "moveUp", label: "위로 이동" },
  { name: "moveDown", label: "아래로 이동" },
];

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: home.list.rowGap },
  // 시안의 줄 높이 58 · 간격 14 (홈.dc.html). 22 짜리 원의 44 타깃도 이 높이가 만든다
  rowPaper: { height: ROW_HEIGHT, gap: 14 },
  divider: { borderBottomWidth: 1, borderBottomColor: paperColors.line.soft },
  // .chkOff — 면 없이 테두리만. 켜진 상태는 CheckCircleIcon(primaryDeep 원)이다
  checkOff: {
    width: home.check.size,
    height: home.check.size,
    borderRadius: home.check.size / 2,
    borderWidth: home.check.borderWidth,
    borderColor: home.check.borderOff,
  },
  // 새 디자인의 미완료 원 — 테두리만, 조금 더 굵다
  checkOffPaper: { borderWidth: 2, borderColor: paperColors.neutral.task },
  // 감정 알약이 먼저 자리를 잡고 제목이 남은 폭을 쓴다
  titleArea: { flex: 1, minWidth: 0 },
  title: { fontSize: home.itemTitle.fontSize, lineHeight: home.itemTitle.lineHeight },
  titlePaper: { color: paperColors.text.primaryHome },
  // 마침한 줄은 색이 한 단 내려간다 — 취소선을 긋지 않는다.
  // 시안의 `#A79883` 은 카드 위 2.8 이라 읽히지 않는다 → AA 를 지키는 보조 글자색으로
  titleDonePaper: { color: paperColors.text.mutedWarmText },
  // .addemo — 점선이라 「아직 없다」가 모양으로 읽힌다. 채운 알약과 헷갈리지 않는다
  addEmotion: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: addEmotionChip.border,
    borderRadius: theme.radius.pill,
    paddingVertical: addEmotionChip.paddingVertical,
    paddingHorizontal: addEmotionChip.paddingHorizontal,
  },
  addEmotionLabel: { fontSize: addEmotionChip.fontSize, lineHeight: addEmotionChip.fontSize },
  // 시안의 끌기 손잡이 — 26×26 안에 1.5 두께 가로선 셋, 간격 3
  handle: { width: 26, height: 26, justifyContent: "center", gap: 3, paddingHorizontal: 6 },
  handleBar: { height: 1.5, borderRadius: 1, backgroundColor: paperColors.line.handle },
});
