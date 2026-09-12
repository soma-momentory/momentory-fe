import { AnalyticsResource } from "@/features/analytics/AnalyticsResource";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { DayScheduleList } from "@/components/archive/DayScheduleList";
import { Card, IconButton, Modal, Screen, Text, TopNavigation } from "@/components/ds";
import { ActionCardSection } from "@/components/diary/ActionCardSection";
import { DiaryEmotionRow } from "@/components/diary/DiaryEmotionRow";
import { iosVariant, label as labelColor, space } from "@/design/ds";
import { actionCardOf, useDiary } from "@/features/diary/model/diary";
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
 * ⋮ 에 **삭제**가 함께 붙는 것도 시안이 정한 것이다. 일기를 지우면 **그 일기의
 * 행동 카드도 함께** 지워지므로(1:1), 카드가 있는 날은 확인 모달이 그 사실을 먼저
 * 알린다. (반대로 쉼터(`R2`)의 카드 삭제는 카드만 지운다 — 일기는 남는다.)
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

  const [confirmDelete, setConfirmDelete] = useState(false);

  // 지워진 일기를 열고 있었다면 보관함으로 — 오류 화면을 만들지 않는다
  if (diary == null) return <Redirect href="/archive" />;

  const daySchedules = visibleSchedules(schedules).filter((s) => s.date === diary.date);
  // 「맑음 · 27℃」의 앞머리만 머리 줄에 쓴다 — 온도까지 넣으면 줄이 밀린다
  const weatherLabel = diary.weather?.split(" · ")[0] ?? null;

  return (
    <Screen>
      <AnalyticsResource kind="diary" id={diary.id} />
      <TopNavigation
        leading="arrow-left"
        onLeadingPress={() => router.back()}
        trailing={
          // ⋮ 메뉴(삭제 한 줄)를 없앴다 — 상세에서 할 일이 삭제뿐이라 쓰레기통 아이콘
          // 하나로 줄이고, 누르면 곧바로 삭제 확인 모달을 연다.
          <IconButton
            name="trash"
            size={20}
            accessibilityLabel="일기 삭제"
            onPress={() => setConfirmDelete(true)}
          />
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          {/* 날짜 제목은 손글씨 — 일기 본문과 한 서체로 「손으로 쓴 결」을 만든다(회고 저장 화면과 같다) */}
          <View style={styles.titleRow}>
            {/*
              iOS 에서만 한 단 내린다 (2026-09-13 · 사용자 요청) — 타입 보정(1.2)으로
              `title1Hand` 가 38 이 되면서 상세 머리가 홈 날짜만큼 커졌다. 손글씨 단 안에서
              바로 아래가 `title3Hand`(24 → 29)이고, 본문(`body1ReadingHand`)과 **짝으로
              정해져 있던 조합**이다(회고 일기 확인·저장 화면이 같은 짝을 쓴다).
            */}
            <Text
              variant={iosVariant("title3Hand", "title1Hand")}
              color={labelColor.strong}
              style={styles.title}
            >
              {`${formatKoreanDateShort(diary.date)}의 일기`}
            </Text>
            {/* 회고 직후 일기 확인(`C6`)과 같은 줄을 쓴다 — 날짜 제목 오른쪽이라 오른쪽으로 접힌다 */}
            <DiaryEmotionRow emotions={diary.emotions} align="flex-end" />
          </View>
          {/* 날씨는 있을 때만 한 줄로 */}
          {weatherLabel != null ? (
            <View style={styles.meta}>
              <Text variant="caption1" color={labelColor.alternative}>
                {weatherLabel}
              </Text>
            </View>
          ) : null}
        </View>

        {/* 「내가 남긴 오늘」 한 면만 둔다 — 「바바가 함께 본 오늘」은 상세에서 뺐다(2026-08-20) */}
        <Card padding="loose" style={styles.diaryCard}>
          {/* 본문도 손글씨 — 날짜 제목(title1Hand)과 짝을 이룬다. 읽기 전용이라 한 단 크게 읽는다 */}
          <Text
            variant={iosVariant("body1ReadingHand", "body1ReadingHandLg")}
            color={labelColor.normal}
          >
            {diary.body}
          </Text>
        </Card>

        {card != null ? (
          // 일기 상세는 **읽는 곳**이라 행동 카드를 읽기 전용으로 둔다 — 해봤어요·되돌리기·
          // 느낀 점 편집은 쉼터에서 한다(`docs/PRODUCT.md` 「상류와 차이」).
          <ActionCardSection card={card} diaryDate={diary.date} readOnly />
        ) : null}

        {/* 그날 일정 — 「이 일기의 행동 카드」와 **같은 제목 스타일**(label1/neutral, 왼쪽 살짝
            들여). 단 목록은 **카드 안에 넣지 않는다**(요청 2026-08-25) — 제목 아래 그대로 줄만 선다.
            일정이 없는 날은 블록 자체를 숨긴다(`app-flow.md` §2.3).
            완료 점을 앞에 둔다 — 채운 점 = 완료 · 빈 점 = 미완료. */}
        {daySchedules.length > 0 ? (
          <View style={styles.section}>
            <Text variant="label1" color={labelColor.neutral} style={styles.sectionLabel}>
              그날 일정
            </Text>
            {/* 목록만 제목보다 조금 오른쪽으로 들여 종속으로 보이게(요청 2026-08-25) */}
            <DayScheduleList schedules={daySchedules} showStatusDot inset={space.md} />
          </View>
        ) : null}
      </ScrollView>

      {/*
        삭제는 **무엇이 사라지는지 먼저 말한다**(`A4.md`). 일기를 지우면 그 일기의 행동 카드도
        함께 사라지므로, 카드가 있는 날은 그 사실을 문안으로 먼저 알린다(카드가 없으면 말하지 않는다).
        상세에서 바바 면을 뺐으므로 문안도 「바바의 문장」을 말하지 않는다.
      */}
      {confirmDelete ? (
        <Modal
          title="이 일기를 삭제할까요?"
          description={
            card != null
              ? "이 일기가 삭제돼요. 함께 만든 행동 카드도 같이 삭제돼요."
              : "이 일기가 삭제돼요."
          }
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

const styles = StyleSheet.create({
  // 남은 높이를 다 쓰고 그 안에서만 스크롤한다 — 안 잡으면 내용 높이만큼 자라 넘친다
  scroll: { flex: 1, minHeight: 0 },
  content: { gap: space.lg, paddingBottom: space.xl2 },

  head: { gap: space.xs },
  // 날짜 제목(왼쪽) + 감정(오른쪽) 한 줄. 감정이 여러 개여도 제목이 먼저 자리를 갖는다
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
  },
  title: { flexShrink: 1 },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: space.sm },

  diaryCard: { gap: space.md },
  // 「그날 일정」 섹션 — `ActionCardSection` 과 같은 값(제목 gap · 왼쪽 들여쓰기)
  section: { gap: space.md },
  sectionLabel: { paddingLeft: space.xs },
});
