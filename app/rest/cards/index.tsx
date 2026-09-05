import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";

import {
  Calendar,
  Card,
  Menu,
  Modal,
  Screen,
  Text,
  TopNavigation,
  type CalendarMark,
} from "@/components/ds";
import { RestActionCard } from "@/components/rest/RestActionCard";
import { label as labelColor, maxFontScale, primary, space, status } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import { cardDaysIn, cardOn, datedCards, latestCardDay } from "@/features/rest/model/cards";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `R2` · 날짜별 바람카드 (`Rest.dc.html` R2-a·b·c).
 *
 * **위계가 둘이다**(시안 주석): 고른 날의 카드만 **흰 카드**(Primary)이고,
 * 「지난 바람카드」는 **배경 위에 직접** 놓인다(Secondary). 카드가 둘로 보이면
 * 어느 것이 오늘 할 일인지가 흐려진다.
 *
 * ## 캘린더는 날짜 탐색만 한다
 *
 * 시안 규칙: 「**R2 캘린더는 3가지를 분리해요** — 카드 존재는 **텍스트 대비**,
 * 수행은 날짜 아래 **작은 초록 dot**, 선택은 **초록 아웃라인** (배경 채움·범례 없음)」.
 *
 * 셋을 한 자리에 겹쳐 칠하면(옛 화면의 배경 채움) 「카드가 있다」와 「해냈다」가
 * 같은 신호로 읽힌다. **수행률·연속 일수를 세지 않는다**(`RULES.md` 4) —
 * 달력은 「있었다」와 「했다」를 말할 뿐 잘했는지를 말하지 않는다. 카드가 있는 날은
 * 점 색으로 **수행 여부**를 나눈다(초록 = 수행함 · 브랜드색 = 아직 안 함).
 *
 * 카드가 **없는 날도 고를 수 있다** — 그 자리에 「그 날 만들어진 바람카드가 없어요」를
 * 보여준다. 카드가 없어 못 들어오는 화면이 아니라, 들어와서 날짜로 둘러보는 화면이다.
 *
 * ## 삭제는 ⋮ → 확인 모달 → 토스트
 *
 * 일기 상세와 **같은 문법**이다(⋮ 메뉴 · 되돌릴 수 없는 행동만 모달 · 결과는
 * 한 줄). 2026-08-21 부터 **일기도 되돌리기 줄을 두지 않아** 둘이 완전히 같아졌다 —
 * 확인을 이미 한 번 받았으므로 되돌리기는 같은 것을 두 번 묻는 셈이었다.
 *
 * 삭제는 **서버로 간다**(`DELETE /action-cards/{id}`) — 일기 삭제와 같은 결이다. 회고를 막
 * 끝낸 카드도 완료 응답이 준 서버 id 를 들고 있어 그 자리에서 지워진다(`model/diary.ts`
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

  const card = selected == null ? null : cardOn(all, selected);
  const days = cardDaysIn(all, shownMonth);

  /**
   * 카드 자리 높이는 **글자 높이를 따라간다.**
   *
   * 안에 든 것이 거의 전부 글자라, 시스템 글꼴 배율이 오르면 같은 카드가 그만큼
   * 높아진다 — 높이를 고정 숫자로만 두면 그 사용자에게만 카드가 조금씩 잘린다.
   * 천장은 `Text` 가 쓰는 것과 **같은 `maxFontScale`(1.3)** 이다. 다른 천장을 쓰면
   * 글자는 1.3 에서 멈췄는데 그릇만 더 커진다.
   */
  const { fontScale } = useWindowDimensions();
  const cardAreaHeight = CARD_AREA * Math.min(fontScale, maxFontScale);

  /**
   * 카드 존재 · 수행 · 선택을 **셋으로 나눠** 표시한다(시안 규칙).
   * **카드가 없는 날도 고를 수 있다** — 강조·점 없이 두되 잠그지 않는다.
   * 카드가 있으면 날짜를 진하게(존재), **점의 모양**으로 수행 여부를 나눈다:
   * **채운 초록 점 = 수행함 · 빈 점 = 아직 안 함**.
   *
   * ⚠ 색만으로 나누지 않는다 — 브랜드색(`primary.normal` #6F947A)과 완료
   * 초록(`status.positive` #6D9757)이 거의 같은 초록이라 점 색만으로는 구분이
   * 안 됐다(2026-08-24). 채움/비움이라는 **모양**이 실제 신호이고, 색은 거든다.
   * 「했어요」를 누르면 store 가 그 자리에서 바뀌어 점이 바로 채워진다.
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
   * **결과 한 줄은 store 가 알린다** — 묘비를 남긴 뒤에야 성공인지 알 수 있어서다
   * (`features/diary/model/diary.ts` `removeActionCard`).
   */
  const confirmDelete = () => {
    setAsking(false);
    if (card == null) return;
    removeCard(card.id);
    setPicked(null);
  };

  return (
    <>
      <Screen>
        <TopNavigation
          leading="arrow-left"
          title="바람카드"
          titleHand
          onLeadingPress={() => router.back()}
        />

        {/* **달력은 화면 위에서 늘 같은 자리에 선다.**

            카드 자리(`cardArea`)의 높이가 고정이라 달력이 그 아래 붙박여 있다 —
            「했어요」를 눌러 카드가 커졌다 작아져도 달력이 따라 움직이지 않고,
            카드가 없는 날에도 같은 자리에 있다. 화면이 길든 짧든 달력의 자리가
            같고, 남는 높이는 **달력 아래**로 흘러간다(2026-08-28).

            옛 구조는 달력을 화면 **바닥**에 고정했는데, 그러면 위 칸이 남는 높이를
            전부 먹어 세로가 긴 기기에서 가운데가 크게 비고(17 Pro Max) 짧은
            기기(SE)에서는 카드가 잘린 채 갇혔다. */}
        <View style={styles.body}>
          <ScrollView
            style={[styles.cardArea, { height: cardAreaHeight }]}
            contentContainerStyle={styles.cardAreaContent}
            showsVerticalScrollIndicator={false}
            // 키보드가 올라온 채로도 카드 안 버튼이 한 번에 눌린다
            keyboardShouldPersistTaps="handled"
          >
            {card == null || selected == null ? (
              // 카드가 놓일 자리에 「없다」를 **같은 카드 모양으로** 말한다 — 면이
              // 사라지면 그 날만 화면 구조가 달라 보인다. 고른 날이 있으면 그 날
              // 카드가 없다는 것을, 아직 아무 날도 안 골랐으면 회고가 먼저라는 것을.
              <Card padding="loose">
                <Text variant="body2" color={labelColor.neutral}>
                  {selected == null
                    ? "회고를 마치면 그날의 바람카드가 여기 남아요."
                    : `${formatKoreanDateShort(selected)}에 만들어진 바람카드가 없어요.`}
                </Text>
              </Card>
            ) : (
              <RestActionCard
                card={card}
                date={formatKoreanDateShort(selected)}
                dateNote={selected === today ? "오늘" : undefined}
                onToggleDone={() => (card.done ? undoDone(card.id) : markDone(card.id))}
                onSetReflection={(t) => {
                  // 쉼터는 저장 버튼에서 한 번에 커밋한다 — 로컬 반영 뒤 곧장 서버로
                  setReflection(card.id, t);
                  saveReflection(card.id);
                }}
                onOpenTrail={() =>
                  router.push({ pathname: "/rest/cards/[date]", params: { date: selected } })
                }
                // 누른 지점(창 기준) 바로 아래에 메뉴가 선다 — 메뉴는 `Screen` 밖
                // 레이어라 인셋을 빼지 않는다
                onMore={(atY) => setMenuTop(atY + space.md)}
              />
            )}
          </ScrollView>

          {/* 「지난 바람카드」 머리글은 뺐다(2026-08-24). 카드가 화면의 주인공이라
              그 위 세로를 머리글에 내주지 않는다 */}
          <Calendar
            month={shownMonth}
            selectedDate={selected}
            onSelect={(date) => {
              setPicked(date);
              setMonth(date.slice(0, 7));
            }}
            onMonthStep={step}
            markOf={markOf}
          />

          {/* 달력 아래 숨 — 짧은 기기에서는 이 자리를 카드에 내준다(아래 주석) */}
          <View style={styles.belowCalendar} />
        </View>
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

/**
 * 카드 자리 높이(글꼴 배율 1 기준) — **상태에 따라 변하지 않는다.**
 *
 * 달력이 늘 같은 자리에 서려면 그 위 칸이 「했어요」·「수행 취소」에 따라 늘었다 줄면
 * 안 된다. 입력창이 열린 **가장 큰 카드**가 들어가는 높이로 잡았고(≈317 + 숨),
 * 그보다 긴 카드(아주 긴 상황·저장된 느낀 점)는 **이 칸만** 스크롤한다. 실제로 쓰는
 * 값은 여기에 글꼴 배율을 곱한 것이다(`cardAreaHeight`).
 *
 * ⚠ **`design/ds` 로 올리지 않는다.** `metrics.ts` 의 `size` 는 「시스템 차원에서 정한
 * 값만」 두고 **화면 하나에서만 쓰는 숫자는 그 화면에 둔다**고 스스로 못박아 두었다
 * (`metrics.ts` `size` 머리말 · `CLAUDE.md` 「디자인 파일에 제품 규칙을 넣지 않는다」).
 * `Calendar` 의 칸 높이, `Slider` 의 엄지 지름도 같은 이유로 각자 파일에 있다.
 */
const CARD_AREA = 340;

const styles = StyleSheet.create({
  body: { flex: 1 },
  /**
   * 높이는 `cardAreaHeight` 가 인라인으로 준다 — 여기 있는 것은 그 높이가 지켜지게
   * 하는 두 값이다.
   *
   * ⚠ **`flexGrow: 0` 을 반드시 적는다.** `ScrollView` 의 기본 스타일에 `flexGrow: 1`
   * 이 들어 있어서(`ScrollView.js` 의 `baseVertical`), 높이만 주면 그 위를 덮지 못하고
   * **남는 높이를 그대로 먹는다** — 높이를 340 으로 주든 200 으로 주든 화면이 똑같이
   * 그려져서 한참 헤맸다(2026-08-28).
   *
   * `flex: 1` 이 아닌 이유는 그 반대다 — 남는 높이를 먹으면 기기마다 달력의 자리가
   * 달라진다. 다만 화면이 짧아 다 못 담을 때는(SE) 줄어든다(`flexShrink`) —
   * 안 그러면 달력 아랫줄이 잘린다.
   */
  cardArea: { flexGrow: 0, flexShrink: 1 },
  cardAreaContent: { paddingBottom: space.lg },
  /**
   * 달력 아래 숨. **짧은 기기에서는 이 숨이 먼저 줄어 카드 자리를 지킨다** —
   * 줄어드는 양이 `flexShrink × 높이` 로 나뉘므로, 카드 자리(340)보다 훨씬 작은 이
   * 칸이 같은 비중으로 줄면 티도 안 난다. 그래서 4 를 준다.
   */
  belowCalendar: { height: space.xl5, flexShrink: 4 },
});
