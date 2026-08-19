import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { DayScheduleList } from "@/components/archive/DayScheduleList";
import {
  Card,
  Chip,
  EmotionDot,
  IconButton,
  Modal,
  Screen,
  Text,
  TopNavigation,
} from "@/components/ds";
import { ActionCardSection, UndoActionConfirm } from "@/components/diary/ActionCardSection";
import { DiaryBabaFace } from "@/components/diary/DiaryBabaFace";
import {
  background,
  elevation,
  hairline,
  label as labelColor,
  layout,
  radius,
  space,
  status,
  zIndex,
} from "@/design/ds";
import { actionCardOf, useDiary } from "@/features/diary/model/diary";
import { emotionName } from "@/features/emotion/model/emotion";
import { useDay, visibleSchedules } from "@/features/home/model/day";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `A3` 내가 남긴 오늘 + 행동 카드 · `A3-b` 바바가 함께 본 오늘 · `A3-c` 해본 뒤
 *
 * **일기 한 장은 두 면을 가진다**(`A3.md`) — 내가 쓴 문장과 바바가 함께 본 오늘.
 * **두 면을 한 화면에 섞지 않는다.**
 *
 * 이 파일은 **면 전환과 조합만** 한다 — 행동 카드의 규칙(`A3-c` 는 상태다 ·
 * 되돌릴 때만 확인)은 `ActionCardSection`, 바바 면의 규칙(고정 스냅샷 · 근거
 * 인용 · 그날의 기록 두 줄)은 `DiaryBabaFace` 에 있다.
 *
 * ## 새 디자인 (`PLAN.md` A Phase 4 · `design-reference/Archive.dc.html` A3)
 *
 * 뒤로 + ⋮ 상단 내비 → 날짜 제목 → 감정·날씨 한 줄 → 두 면 → 일기 카드 →
 * 행동 카드 → 그날 일정. **읽기 레이아웃**이고 `design.md` 「보관함」이 정한
 * 「A3 상세는 읽기 레이아웃 + **⋮ 수정·삭제**」를 따른다.
 *
 * ⚠ **`[수정하기]` 가 바닥 알약에서 ⋮ 메뉴로 옮겨갔다.** 갈 곳은 그대로 `A4` 다
 * (`A3.md` 「`[수정하기]` 는 실제 화면으로 이어진다」) — 자리만 바뀌었다.
 * ⋮ 에 **삭제**가 함께 붙는 것도 시안이 정한 것이고, 삭제의 문안·되돌리기는
 * `A4` 와 같은 것을 쓴다(지워지는 것이 같은 한 벌이라 다른 말을 쓸 이유가 없다).
 *
 * ⚠ **캐릭터 그림·날씨 아이콘이 없다** — `DiaryBabaFace` 주석 참조.
 * 면의 이름은 시안이 아니라 스펙 문안이다(`A3.md`).
 */
const FACES: readonly [string, string] = ["내가 남긴 오늘", "바바가 함께 본 오늘"];

export default function DiaryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const diary = useDiary((s) => s.diaries.find((d) => d.id === id));
  const card = useDiary((s) => actionCardOf(s.actionCards, id ?? ""));
  const markDone = useDiary((s) => s.markActionDone);
  const undoDone = useDiary((s) => s.undoActionDone);
  const setReflection = useDiary((s) => s.setReflection);
  const remove = useDiary((s) => s.remove);
  /**
   * 그날 일정 — **그 날짜의 줄만** 골라 온다(`app-flow.md` §2.3). 지금 일정
   * store 는 서버에서 **오늘 하루치**만 받아 두므로, 지난 일기를 열면 고를 줄이
   * 없어 블록이 통째로 숨는다 — 그것이 「일정이 없는 날」과 같은 처리다.
   * 날짜별 조회가 붙으면 이 selector 안쪽만 바뀐다.
   */
  const schedules = useDay((s) => s.schedules);

  const [face, setFace] = useState<0 | 1>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /**
   * 되돌리기를 물어보는 중인 행동 카드. **오버레이는 스크롤 밖에 산다** —
   * 스크롤 안에 두면 화면이 아니라 콘텐츠 높이를 덮어 보이지 않는 곳에 뜬다.
   */
  const [undoCardId, setUndoCardId] = useState<string | null>(null);

  // 지워진 일기를 열고 있었다면 보관함으로 — 오류 화면을 만들지 않는다
  if (diary == null) return <Redirect href="/archive" />;

  const daySchedules = visibleSchedules(schedules).filter((s) => s.date === diary.date);
  // 「맑음 · 27℃」의 앞머리만 머리 줄에 쓴다 — 온도까지 넣으면 줄이 밀린다
  const weatherLabel = diary.weather?.split(" · ")[0] ?? null;

  return (
    <Screen>
      <TopNavigation
        leading="arrow-left"
        onLeadingPress={() => router.back()}
        trailing={
          <IconButton
            name="more-vertical"
            accessibilityLabel="더보기"
            accessibilityState={{ expanded: menuOpen }}
            // ⋮ 를 다시 누르면 닫힌다 (`design.md` 「일정」의 ⋮ 문법과 같다)
            onPress={() => setMenuOpen((open) => !open)}
          />
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text variant="title3" color={labelColor.strong}>
            {`${formatKoreanDateShort(diary.date)}의 일기`}
          </Text>
          {/* 감정은 **도트 + 이름**이다 — 색만으로 판단하게 하지 않는다 */}
          <View style={styles.meta}>
            {diary.emotions.map((e, i) => (
              <View key={`${e}-${i}`} style={styles.metaItem}>
                <EmotionDot id={e} />
                <Text variant="caption1" color={labelColor.alternative}>
                  {emotionName(e)}
                </Text>
              </View>
            ))}
            {weatherLabel != null ? (
              <Text variant="caption1" color={labelColor.alternative}>
                {weatherLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {/* 두 면은 고르는 것이라 칩이다 — 선택은 면 + 테두리 2px + 글자로 말한다 */}
        <View style={styles.faces}>
          {FACES.map((name, i) => (
            <Chip
              key={name}
              label={name}
              selected={face === i}
              onPress={() => setFace(i === 0 ? 0 : 1)}
            />
          ))}
        </View>

        {face === 0 ? (
          <>
            <Card padding="loose" style={styles.diaryCard}>
              {/* 고친 뒤에는 언제 고쳤는지까지 말한다 — 「수정함」은 언제인지를 말하지 못한다 */}
              <Text variant="caption1" color={labelColor.alternative}>
                {diary.editedAt != null
                  ? `회고 대화에서 작성 · ${formatKoreanDateShort(diary.editedAt.slice(0, 10))} 수정`
                  : "회고 대화에서"}
              </Text>
              <Text variant="body1Reading" color={labelColor.normal}>
                {diary.body}
              </Text>
            </Card>

            {card != null ? (
              <ActionCardSection
                card={card}
                diaryDate={diary.date}
                onMarkDone={markDone}
                onRequestUndo={setUndoCardId}
                onSetReflection={setReflection}
              />
            ) : null}
          </>
        ) : (
          <DiaryBabaFace diary={diary} />
        )}

        {/* 그날 일정 — **일정이 없는 날은 블록 자체를 숨긴다**(`app-flow.md` §2.3).
            두 면 어느 쪽에서 보든 같은 하루의 사실이라 면 밖에 둔다 */}
        <DayScheduleList schedules={daySchedules} title="그날 일정" />
      </ScrollView>

      {/*
        ⋮ 메뉴. **바깥을 탭하면 닫힌다**(`design.md` 「일정」) — 딤을 깔지 않고
        투명한 면으로 받는다. 메뉴는 결정이 아니라 길이라 어둡게 덮지 않는다.

        ⚠ 공용 `Menu` 를 아직 만들지 않았다(`components/ds` 「아직 없는 것」) —
        일정(`Schedule`)이 같은 문법의 ⋮ 를 쓰므로 **그쪽이 만들 때 옮겨탄다.**
        먼저 만들어 두면 실제로 필요한 모양과 어긋난 채 굳는다.
      */}
      {menuOpen ? (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="메뉴 닫기"
            onPress={() => setMenuOpen(false)}
            style={styles.menuScrim}
          />
          <Card padding="none" style={styles.menu}>
            {/* 이 면의 본문만 고칠 수 있다 — 바바의 면에서는 수정으로 가지 않는다 */}
            {face === 0 ? (
              <MenuItem
                label="수정하기"
                onPress={() => {
                  setMenuOpen(false);
                  router.push(`/diary/${diary.id}/edit`);
                }}
              />
            ) : null}
            <MenuItem
              label="삭제하기"
              destructive
              onPress={() => {
                setMenuOpen(false);
                setConfirmDelete(true);
              }}
            />
          </Card>
        </>
      ) : null}

      {/* 되돌릴 때만 확인을 묻는다 — 완료 기록과 느낀 점이 함께 사라진다 */}
      {undoCardId != null ? (
        <UndoActionConfirm
          onCancel={() => setUndoCardId(null)}
          onConfirm={() => {
            undoDone(undoCardId);
            setUndoCardId(null);
          }}
        />
      ) : null}

      {/* 삭제는 **무엇이 사라지는지 먼저 말한다**(`A4.md`) — 문안은 `A4` 와 같다 */}
      {confirmDelete ? (
        <Modal
          title="이 회고를 삭제할까요?"
          description="내 문장, 바바의 문장, 행동 카드가 함께 삭제돼요."
          cancelLabel="그대로 두기"
          confirmLabel="회고 삭제"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            remove(diary.id);
            // 지운 한 벌은 보관함의 되돌리기 줄이 잠시 들고 있는다
            router.replace("/archive");
          }}
        />
      ) : null}
    </Screen>
  );
}

/** 메뉴 한 줄. 위험한 쪽만 위험색이고 **면을 채우지 않는다** */
function MenuItem({
  label,
  destructive = false,
  onPress,
}: {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.menuItem}>
      <Text variant="body2" color={destructive ? status.negative : labelColor.normal}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 남은 높이를 다 쓰고 그 안에서만 스크롤한다 — 안 잡으면 내용 높이만큼 자라 넘친다
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: space.lg, paddingBottom: space.xl2 },

  head: { gap: space.xs },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },
  metaItem: { flexDirection: "row", alignItems: "center", gap: space.xs },

  faces: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },

  diaryCard: { gap: space.md },

  // 바깥 탭을 받는 투명한 면 — 메뉴보다 아래, 본문보다 위
  menuScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: zIndex.frame,
  },
  menu: {
    position: "absolute",
    // 상단 내비 바로 아래에서 열린다 — ⋮ 가 있던 자리에서 이어지도록
    top: layout.topNav + space.xs,
    right: 0,
    minWidth: 140,
    zIndex: zIndex.overlay,
    backgroundColor: background.elevated,
    borderRadius: radius.medium,
    ...hairline.neutral,
    ...elevation.floating,
  },
  menuItem: { minHeight: 44, justifyContent: "center", paddingHorizontal: space.lg },
});
