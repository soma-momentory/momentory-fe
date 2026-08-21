import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { DayScheduleList } from "@/components/archive/DayScheduleList";
import { Card, EmotionDot, IconButton, Modal, Screen, Text, TopNavigation } from "@/components/ds";
import { ActionCardSection } from "@/components/diary/ActionCardSection";
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
 * `A3` 내가 남긴 오늘 + 행동 카드 (읽기 레이아웃)
 *
 * ⚠ **「바바가 함께 본 오늘」(`A3-b`) 면을 상세에서 뺐다**(2026-08-20 결정) — 상세는
 * **내가 쓴 문장 한 면만** 보여준다. 그래서 면 전환 칩과 바바 면 컴포넌트를 지웠다.
 * (서버 조회분은 `babaView` 가 `null` 이고, 이제 로컬 저장분의 바바 문장도 상세에서
 * 그리지 않는다.)
 *
 * ⚠ **행동 카드는 읽기 전용이다**(2026-08-20 결정) — 「해봤어요」·되돌리기·느낀 점 편집은
 * **쉼터(`R2`)에서** 한다(`docs/PRODUCT.md` 「상류와 차이」). 상세는 그날의 기록을 읽는
 * 곳이라, 읽는 화면에서 "지울까요?" 같은 조작 확인이 뜨는 어색함을 없앴다.
 *
 * 이 파일은 **조합만** 한다 — 행동 카드는 `ActionCardSection` 을 `readOnly` 로 그린다.
 *
 * ## 새 디자인 (`PLAN.md` A Phase 4 · `docs/DESIGN.md` 「보관함」 A3)
 *
 * 뒤로 + ⋮ 상단 내비 → 날짜 제목 → 감정·날씨 한 줄 → 일기 카드 → 행동 카드 →
 * 그날 일정. **읽기 레이아웃**이고 `DESIGN.md` 「보관함」이 정한 「A3 상세는 읽기
 * 레이아웃 + **⋮ 수정·삭제**」를 따른다.
 *
 * ⚠ **`[수정하기]` 가 바닥 알약에서 ⋮ 메뉴로 옮겨갔다.** 갈 곳은 그대로 `A4` 다
 * (`A3.md` 「`[수정하기]` 는 실제 화면으로 이어진다」) — 자리만 바뀌었다.
 * ⋮ 에 **삭제**가 함께 붙는 것도 시안이 정한 것이다. 되돌리기는 `A4` 와 같지만,
 * **지우는 것은 일기뿐**이라(행동 카드는 자기 보관함에 남는다 · `docs/PRODUCT.md`
 * 「상류와 차이」) 문안이 「회고 한 벌」보다 좁다.
 */

export default function DiaryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const diary = useDiary((s) => s.diaries.find((d) => d.id === id));
  const card = useDiary((s) => actionCardOf(s.actionCards, id ?? ""));
  const remove = useDiary((s) => s.remove);
  /**
   * 그날 일정 — **그 날짜의 줄만** 골라 온다(`app-flow.md` §2.3). 지금 일정
   * store 는 서버에서 **오늘 하루치**만 받아 두므로, 지난 일기를 열면 고를 줄이
   * 없어 블록이 통째로 숨는다 — 그것이 「일정이 없는 날」과 같은 처리다.
   * 날짜별 조회가 붙으면 이 selector 안쪽만 바뀐다.
   */
  const schedules = useDay((s) => s.schedules);

  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
            // ⋮ 를 다시 누르면 닫힌다 (`DESIGN.md` 「일정」의 ⋮ 문법과 같다)
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

        {/* 「내가 남긴 오늘」 한 면만 둔다 — 「바바가 함께 본 오늘」은 상세에서 뺐다(2026-08-20) */}
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
          // 일기 상세는 **읽는 곳**이라 행동 카드를 읽기 전용으로 둔다 — 해봤어요·되돌리기·
          // 느낀 점 편집은 쉼터에서 한다(`docs/PRODUCT.md` 「상류와 차이」).
          <ActionCardSection card={card} diaryDate={diary.date} readOnly />
        ) : null}

        {/* 그날 일정 — **일정이 없는 날은 블록 자체를 숨긴다**(`app-flow.md` §2.3) */}
        <DayScheduleList schedules={daySchedules} title="그날 일정" />
      </ScrollView>

      {/*
        ⋮ 메뉴. **바깥을 탭하면 닫힌다**(`DESIGN.md` 「일정」) — 딤을 깔지 않고
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
            {/*
              ⚠ **「수정하기」가 사라졌다** (2026-08-20). 저장된 일기를 고치는 화면
              (`A4`)은 **기능이 아니다** — 고칠 기회는 저장 전(`C6` 의 `직접 고치기`)
              하나이고, 저장한 뒤의 일기는 그날의 기록으로 남는다.
              메뉴에 남은 것은 삭제뿐이다.
            */}
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

      {/*
        삭제는 **무엇이 사라지는지 먼저 말한다**(`A4.md`). 단 상류 스냅샷과 달리 **일기만**
        지운다 — 행동 카드는 자기 보관함(쉼터)에 남는다(`docs/PRODUCT.md` 「상류와 차이」).
        상세에서 바바 면을 뺐으므로 문안도 「바바의 문장」을 말하지 않는다.
      */}
      {confirmDelete ? (
        <Modal
          title="이 일기를 삭제할까요?"
          description="이 일기가 삭제돼요. 행동 카드는 보관함에 남아요."
          cancelLabel="그대로 두기"
          confirmLabel="일기 삭제"
          destructive
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            remove(diary.id);
            // 확인을 지났으므로 그 자리에서 지운다 — 되돌리기 줄은 없앴다(2026-08-21)
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
