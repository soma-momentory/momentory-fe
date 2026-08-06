import { Pressable, StyleSheet, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { CheckCircleIcon } from "@/components/icons/LineIcons";
import { AppText } from "@/components/primitives/AppText";
import { home } from "@/design/tokens.mvp";
import type { Schedule } from "@/mocks/sample";

/**
 * 일정 한 줄 — `momentory.css` `.ir` · `.chk` · `.it` · `.epill`.
 *
 * **한 줄에 터치가 둘이다**(`12.md` · `RULES.md` 「홈」):
 * - **체크 원** → 즉시 마침/취소(토글). 확인 모달 없음
 * - **제목·행** → 상세 시트(`12-c`)
 *
 * 힌트 줄("체크하면 마침으로 표시돼요 · 일정을 누르면 감정을 남길 수 있어요")이
 * 그 둘을 그대로 말하므로, 여기서 둘을 합치면 화면의 설명이 거짓이 된다.
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
};

export function ScheduleRow({ schedule, onToggleDone, onOpen }: Props) {
  const { id, title, done, emotions } = schedule;

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={`${title} 마침`}
        hitSlop={home.check.hitSlop}
        onPress={() => onToggleDone(id)}
      >
        {done ? (
          <CheckCircleIcon size={home.check.size} />
        ) : (
          <View style={styles.checkOff} />
        )}
      </Pressable>

      {/* 제목·행은 상세 시트로 — 체크 원과 다른 동작이다 */}
      <Pressable style={styles.titleArea} accessibilityRole="button" onPress={() => onOpen(id)}>
        <AppText
          tone={done ? "caption" : "strong"}
          weight="500"
          numberOfLines={1}
          style={styles.title}
        >
          {title}
        </AppText>
      </Pressable>

      {emotions.map((e) => (
        <EmotionPill key={e} id={e} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: home.list.rowGap },
  // .chkOff — 면 없이 테두리만. 켜진 상태는 CheckCircleIcon(primaryDeep 원)이다
  checkOff: {
    width: home.check.size,
    height: home.check.size,
    borderRadius: home.check.size / 2,
    borderWidth: home.check.borderWidth,
    borderColor: home.check.borderOff,
  },
  // 감정 알약이 먼저 자리를 잡고 제목이 남은 폭을 쓴다
  titleArea: { flex: 1, minWidth: 0 },
  title: { fontSize: home.itemTitle.fontSize, lineHeight: home.itemTitle.lineHeight },
});
