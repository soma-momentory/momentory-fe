import { Pressable, StyleSheet, View } from "react-native";

import { Text, useEffectiveFontScale } from "@/components/ds/Text";
import { homeV2, maxFontScale } from "@/design/ds";
import { remainingLabel } from "@/features/home/model/presentation";
import type { Schedule } from "@/features/home/model/types";

import { ScheduleList } from "../ScheduleList";

const EMPTY_BODY = ["여유로운 하루예요.", "하고 싶은 일 하나 적어둘까요?"] as const;

/**
 * 홈 v2 의 **오늘 일정** — 머리(고정)와 목록(스크롤)을 따로 낸다(계획 §2.1).
 *
 * 머리(「오늘 일정」 · 남은 수 · 「+ 추가」)는 **고정 영역의 끝**에 선다 — 목록을 내려도 추가 버튼이
 * 사라지지 않는다. 목록은 운영 홈과 **같은 `ScheduleList`** 를 `appearance="paper"` 로 그린다 —
 * 체크 · 끝맺음 · ⋮ 메뉴 · 끌기 · 접근성 이동이 그대로다(HD-4 · §1.3 S1~S20).
 */
export function ScheduleSectionHeader({
  schedules,
  empty,
  onAdd,
}: {
  schedules: readonly Schedule[];
  empty: boolean;
  onAdd: () => void;
}) {
  const fontScale = useEffectiveFontScale();
  const scale = Math.min(fontScale, maxFontScale);
  return (
    <View style={styles.header}>
      <View style={styles.heading}>
        <Text
          style={[styles.title, { lineHeight: homeV2.type.sectionTitle.lineHeight * scale }]}
          color={homeV2.color.ink}
        >
          오늘 일정
        </Text>
        {/* 남은 수 — 다 마치면 「모두 완료」(S13). 일정이 없으면 「0개」(v2) */}
        <Text
          style={[styles.count, { lineHeight: homeV2.type.count.lineHeight * scale }]}
          color={homeV2.color.muted}
        >
          {empty ? "0개" : remainingLabel(schedules)}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="일정 추가"
        onPress={onAdd}
        hitSlop={ADD_HIT_SLOP}
        style={styles.add}
      >
        <Text
          style={[styles.addText, { lineHeight: homeV2.type.add.lineHeight * scale }]}
          color={homeV2.color.ink}
        >
          + 추가
        </Text>
      </Pressable>
    </View>
  );
}

type BodyProps = {
  /** 접기까지 끝낸 줄 */
  rows: Schedule[];
  empty: boolean;
  /** 접혀 남은 줄 수 — 0 이면 「더 보기」가 없다 */
  hiddenCount: number;
  allDone: boolean;
  onExpand: () => void;
  onToggleDone: (id: string) => void;
  onMore: (id: string, topPageY: number, bottomPageY: number) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onReorder: (id: string, toIndex: number) => void;
  onDragStateChange: (dragging: boolean) => void;
  onRowPitch?: (pitch: number) => void;
};

export function ScheduleSection({
  rows,
  empty,
  hiddenCount,
  allDone,
  onExpand,
  onToggleDone,
  onMore,
  onMove,
  onReorder,
  onDragStateChange,
  onRowPitch,
}: BodyProps) {
  const fontScale = useEffectiveFontScale();
  const scale = Math.min(fontScale, maxFontScale);
  // 빈 상태 전용 레이아웃을 만들지 않는다 — 같은 자리에 빈 카드 한 장(S18). 머리 · 히어로 · 도크는 그대로다
  if (empty) {
    return (
      <View style={styles.empty}>
        <Text
          style={[styles.emptyTitle, { lineHeight: homeV2.type.emptyTitle.lineHeight * scale }]}
          color={homeV2.color.ink}
        >
          오늘은 일정이 없어요
        </Text>
        <Text
          style={[styles.emptyBody, { lineHeight: homeV2.type.emptyBody.lineHeight * scale }]}
          color={homeV2.color.muted}
          accessibilityLabel={EMPTY_BODY.join(" ")}
        >
          {EMPTY_BODY.join("\n")}
        </Text>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.card}>
        <ScheduleList
          appearance="paper"
          schedules={rows}
          onToggleDone={onToggleDone}
          onMore={onMore}
          onMove={onMove}
          onReorder={onReorder}
          onDragStateChange={onDragStateChange}
          onRowPitch={onRowPitch}
        />
      </View>

      {/* 5개까지 펼치고 접는다(S12) — 목록 스크롤 안쪽 마지막 줄 */}
      {hiddenCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${hiddenCount}개 더 보기`}
          onPress={onExpand}
          style={styles.more}
        >
          <Text style={styles.moreText} color={homeV2.color.ink}>
            {`${hiddenCount}개 더 보기`}
          </Text>
        </Pressable>
      ) : null}

      {/* 다 마치면 사실 한 줄 — 점수 · 진행률 · 배지가 아니다(S14 · S17) */}
      {allDone ? (
        <Text style={styles.done} color={homeV2.color.muted}>
          오늘 일정을 모두 마쳤어요.
        </Text>
      ) : null}
    </View>
  );
}

/** 「+ 추가」 스티커는 글자 높이(24)만큼 작다 — 44 타깃을 시각 크기를 키우지 않고 채운다 */
const ADD_HIT_SLOP = { top: 10, bottom: 10, left: 4, right: 4 } as const;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 30,
  },
  heading: {
    flexDirection: "row",
    flexShrink: 1,
    flexWrap: "wrap",
    alignItems: "baseline",
    gap: 8,
  },
  title: { fontFamily: homeV2.font.bold, ...homeV2.type.sectionTitle },
  count: { fontFamily: homeV2.font.regular, ...homeV2.type.count },
  add: {
    flexShrink: 0,
    backgroundColor: homeV2.color.card,
    paddingHorizontal: 12,
    paddingVertical: 2,
    transform: [{ rotate: homeV2.tilt.add }],
    boxShadow: homeV2.shadow.sticker,
  },
  addText: { fontFamily: homeV2.font.bold, ...homeV2.type.add },
  card: {
    marginTop: 10,
    borderRadius: homeV2.size.list.radius,
    backgroundColor: homeV2.color.card,
    paddingHorizontal: homeV2.size.list.paddingX,
  },
  more: { alignSelf: "flex-start", minHeight: 44, justifyContent: "center", paddingTop: 4 },
  moreText: { fontFamily: homeV2.font.bold, ...homeV2.type.add },
  done: { fontFamily: homeV2.font.regular, ...homeV2.type.count, paddingTop: 10 },
  empty: {
    marginTop: 10,
    borderRadius: homeV2.size.list.radius,
    backgroundColor: homeV2.color.card,
    borderWidth: 1.5,
    borderColor: homeV2.color.emptyBorder,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontFamily: homeV2.font.bold,
    ...homeV2.type.emptyTitle,
    alignSelf: "stretch",
    textAlign: "center",
  },
  emptyBody: {
    fontFamily: homeV2.font.regular,
    ...homeV2.type.emptyBody,
    alignSelf: "stretch",
    textAlign: "center",
  },
});
