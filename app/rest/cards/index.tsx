import { AnalyticsResource } from "@/features/analytics/AnalyticsResource";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Calendar, Menu, Modal, Screen, Text, type CalendarMark } from "@/components/ds";
import { DESIGN_WIDTH } from "@/components/ds/DesignViewport";
import { NotchedTapeLabel } from "@/components/ds/NotchedTapeLabel";
import { TabPaperBackground } from "@/components/ds/TabPaperBackground";
import { RestActionCard } from "@/components/rest/RestActionCard";
import { RestPaperClip, RestPaperPin, RestPaperSheet } from "@/components/rest/RestPaperSheet";
import { SCENE_BACK_SIZE, SceneBackButton } from "@/components/rest/scene/SceneChrome";
import { homeV2, primary, restCards, space, status } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import { cardDaysIn, cardOn, datedCards, latestCardDay } from "@/features/rest/model/cards";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `R2` · 날짜별 바람카드 — 달력 한 장 아래 쪽지 한 장(2026-11-05 · `DESIGN.md` 「쉼터」).
 *
 * 홈 메모와 같은 종이 · 윤곽이고, 보관함처럼 달력이 위 · 그날의 기록이 아래다. **화면 전체가 스크롤**하므로
 * 달력과 카드의 높이를 나누지 않는다 — 나누면 긴 카드의 안쪽이 표시 없이 잘린다. 날짜를 눌러도 달력은
 * 움직이지 않는다(위에 있어서 카드 길이의 영향을 받지 않는다).
 *
 * ## 캘린더는 날짜 탐색만 한다
 *
 * 카드 존재는 **날짜 글자의 진하기**, 수행은 날짜 아래 **점의 모양**, 선택은 **날짜 알약**이다. 범례는 없다.
 * **수행률·연속 일수를 세지 않는다**(`RULES.md` 4) — 달력은 「있었다」와 「했다」를 말할 뿐 잘했는지를 말하지 않는다.
 *
 * 카드가 **없는 날도 고를 수 있다** — 그 자리에 「그 날 만들어진 바람카드가 없어요」를 보여준다.
 *
 * ## 삭제는 ⋮ → 확인 모달 → 토스트
 *
 * 일기 상세와 **같은 문법**이다. 삭제는 서버로 간다(`DELETE /action-cards/{id}` · `model/diary.ts`
 * 의 `removeActionCard`).
 */
export default function RestCards() {
  const cards = useDiary((s) => s.actionCards);
  const markDone = useDiary((s) => s.markActionDone);
  const undoDone = useDiary((s) => s.undoActionDone);
  const setReflection = useDiary((s) => s.setReflection);
  const saveReflection = useDiary((s) => s.saveReflection);
  const removeCard = useDiary((s) => s.removeActionCard);

  const all = useMemo(() => datedCards(cards), [cards]);
  const [menuTop, setMenuTop] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const selected = picked ?? latestCardDay(all);
  const [month, setMonth] = useState<string | null>(null);
  const { date: today } = useTodayContext();
  const shownMonth = month ?? (selected ?? today).slice(0, 7);
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);

  const card = selected == null ? null : cardOn(all, selected);
  const days = cardDaysIn(all, shownMonth);

  /**
   * 이 화면의 입력은 쪽지 끝의 느낀 점 하나다 — 키보드가 오르면 그 자리까지 내려간다.
   *
   * ⚠ `KeyboardAvoidingView` 를 쓰지 않는다. 비례 캔버스(`Screen proportional`) 안에서는 자기 좌표가
   * 배율만큼 달라 키보드와 겹치는 양을 잘못 재고, 큰 iPhone 에서 여백이 모자란다. 키보드 높이를 캔버스
   * 단위로 바꿔 바닥 여백으로 쓴다. 안드로이드는 창이 줄어들어 여백이 따로 필요 없다.
   */
  const { width } = useWindowDimensions();
  const [keyboard, setKeyboard] = useState(0);
  useEffect(() => {
    const shown = Keyboard.addListener("keyboardDidShow", (e) => {
      if (Platform.OS === "ios") setKeyboard((e.endCoordinates.height * DESIGN_WIDTH) / width);
      requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: true }));
    });
    const hidden = Keyboard.addListener("keyboardDidHide", () => setKeyboard(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, [width]);

  /**
   * 카드가 있으면 날짜를 진하게(존재), **점의 모양**으로 수행 여부를 나눈다:
   * **채운 초록 점 = 수행함 · 빈 점 = 아직 안 함**.
   *
   * ⚠ 색만으로 나누지 않는다 — 브랜드색과 완료 초록이 거의 같은 초록이라 점 색만으로는 구분이
   * 안 됐다(2026-08-24). 채움/비움이라는 **모양**이 실제 신호이고, 색은 거든다.
   */
  const markOf = (date: string): CalendarMark => {
    const dayCard = days.includes(date) ? cardOn(all, date) : null;
    if (dayCard == null) return {};
    return dayCard.done
      ? { emphasized: true, dotColor: status.positive }
      : { emphasized: true, dotColor: primary.normal, dotHollow: true };
  };

  const step = (by: -1 | 1) => {
    const [y, m] = [Number(shownMonth.slice(0, 4)), Number(shownMonth.slice(5, 7))];
    const next = new Date(y, m - 1 + by, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };

  /**
   * 고른 날짜를 놓아 준다 — `picked` 를 비우면 `latestCardDay` 가 다시 고른다.
   * 빈 날에 머물러 있으면 방금 지운 자리에서 「바람카드가 없어요」를 보게 되고,
   * 삭제가 실패해 카드가 되돌아오면 그 카드의 날짜로 다시 선다.
   *
   * **결과 한 줄은 store 가 알린다**(`features/diary/model/diary.ts` `removeActionCard`).
   */
  const confirmDelete = () => {
    setAsking(false);
    if (card == null) return;
    removeCard(card.id);
    setPicked(null);
  };

  return (
    <>
      <Screen proportional grid={false} padded={false} edges={["top"]} topGap={space.sm}>
        <TabPaperBackground tab="쉼터" />
        <AnalyticsResource kind="wish_card" id={card?.id ?? null} source="cards" />
        <ScrollView
          ref={scroll}
          testID="rest-cards-scroll"
          showsVerticalScrollIndicator={false}
          // 키보드가 올라온 채로도 쪽지 안 버튼이 한 번에 눌린다
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, keyboard) + restCards.size.bottom },
          ]}
        >
          <View style={styles.header}>
            <NotchedTapeLabel
              color={homeV2.color.date}
              style={styles.title}
              textStyle={restCards.type.title}
            >
              바람카드
            </NotchedTapeLabel>
          </View>
          {/* 머리 줄 **뒤에** 그린다 — 앞에 두면 머리 줄이 위에 덮여 원이 눌리지 않는다 */}
          <SceneBackButton top={0} onPress={() => router.back()} />

          <RestPaperSheet testID="rest-calendar-sheet" decoration={<RestPaperPin />}>
            <Calendar
              month={shownMonth}
              selectedDate={selected}
              onSelect={(date) => {
                setPicked(date);
                setMonth(date.slice(0, 7));
              }}
              onMonthStep={step}
              markOf={markOf}
              readable
            />
          </RestPaperSheet>

          {card == null || selected == null ? (
            // 카드가 놓일 자리에 「없다」를 **같은 쪽지로** 말한다 — 그 날만 화면 구조가 달라 보이지 않게
            <RestPaperSheet
              tilt={restCards.tilt.note}
              decoration={<RestPaperClip />}
              style={styles.empty}
            >
              <Text style={styles.emptyText} color={restCards.color.muted}>
                {selected == null
                  ? "회고를 마치면 그날의 바람카드가 여기 남아요."
                  : `${formatKoreanDateShort(selected)}에 만들어진 바람카드가 없어요.`}
              </Text>
            </RestPaperSheet>
          ) : (
            <RestActionCard
              // 날짜를 옮기면 **카드 안 상태를 새로 시작한다** — 적던 초안과
              // 「적지 않기로」가 다음 카드로 따라가면 남의 자리에서 보인다
              key={card.id}
              card={card}
              date={formatKoreanDateShort(selected)}
              dateNote={selected === today ? "오늘" : undefined}
              madeToday={selected === today}
              onToggleDone={() => (card.done ? undoDone(card.id) : markDone(card.id))}
              onSetReflection={(t) => {
                // 쉼터는 저장 버튼에서 한 번에 커밋한다 — 로컬 반영 뒤 곧장 서버로
                setReflection(card.id, t);
                saveReflection(card.id);
              }}
              // 누른 지점(창 기준) 바로 아래에 메뉴가 선다 — 메뉴는 `Screen` 밖
              // 레이어라 인셋을 빼지 않는다
              onMore={(atY) => setMenuTop(atY + space.md)}
            />
          )}
        </ScrollView>
      </Screen>

      {/* 메뉴·모달은 `Screen` **밖**이다 — 안에 두면 Safe Area 안쪽만 덮어
          바깥 탭이 상태바 자리에서 먹히지 않는다(`TabScreen` 과 같은 이유) */}
      {menuTop != null ? (
        <Menu
          actions={[
            {
              label: "삭제하기",
              icon: "trash",
              negative: true,
              onPress: () => {
                setMenuTop(null);
                setAsking(true);
              },
            },
          ]}
          top={menuTop}
          onDismiss={() => setMenuTop(null)}
        />
      ) : null}

      {/* 되돌릴 수 없는 행동이라 **묻는다** — 오류가 아니므로 규칙과 어긋나지 않는다 */}
      {asking ? (
        <Modal
          title="이 바람카드를 삭제할까요?"
          description="삭제한 바람카드는 되돌릴 수 없어요."
          cancelLabel="그대로 두기"
          confirmLabel="삭제"
          destructive
          onCancel={() => setAsking(false)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: restCards.size.paddingX, gap: restCards.size.sheetGap },
  // 뒤로가기 원은 절대 배치라 머리 줄의 높이를 원이 잡아 준다 — 간격은 `sheetGap` 을 물려받는다
  header: { minHeight: SCENE_BACK_SIZE, justifyContent: "center" },
  // 띠는 제 글자만큼만 넓다 — 뒤로가기 원과 겹치지 않게 가운데에 세운다
  title: { alignSelf: "center" },
  empty: { paddingVertical: space.xl },
  emptyText: {
    fontFamily: restCards.font.regular,
    ...restCards.type.empty,
    textAlign: "center",
  },
});
