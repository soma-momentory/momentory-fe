import { router } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import {
  Calendar,
  Menu,
  Modal,
  Screen,
  Text,
  TopNavigation,
  type CalendarMark,
} from "@/components/ds";
import { RestActionCard } from "@/components/rest/RestActionCard";
import { label as labelColor, primary, space, status } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import { cardDaysIn, cardOn, datedCards, latestCardDay } from "@/features/rest/model/cards";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `R2` · 날짜별 행동카드 (`Rest.dc.html` R2-a·b·c).
 *
 * **위계가 둘이다**(시안 주석): 고른 날의 카드만 **흰 카드**(Primary)이고,
 * 「지난 행동카드」는 **배경 위에 직접** 놓인다(Secondary). 카드가 둘로 보이면
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
 * 카드가 **없는 날도 고를 수 있다** — 그 자리에 「그 날 만들어진 행동카드가 없어요」를
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
   * 카드 존재 · 수행 · 선택을 **셋으로 나눠** 표시한다(시안 규칙).
   * **카드가 없는 날도 고를 수 있다** — 강조·점 없이 두되 잠그지 않는다.
   * 카드가 있으면 날짜를 진하게(존재), 점 색으로 수행 여부를 나눈다:
   * 초록 = 수행함 · 브랜드색 = 아직 안 함.
   */
  const markOf = (date: string): CalendarMark => {
    const dayCard = days.includes(date) ? cardOn(all, date) : null;
    if (dayCard == null) return {};
    return { emphasized: true, dotColor: dayCard.done ? status.positive : primary.normal };
  };

  const step = (by: -1 | 1) => {
    const [y, m] = [Number(shownMonth.slice(0, 4)), Number(shownMonth.slice(5, 7))];
    const next = new Date(y, m - 1 + by, 1);
    setMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`);
  };

  /**
   * 고른 날짜를 놓아 준다 — `picked` 를 비우면 `latestCardDay` 가 다시 고른다.
   * 빈 날에 머물러 있으면 방금 지운 자리에서 「행동카드가 없어요」를 보게 되고,
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
        <TopNavigation leading="arrow-left" title="행동카드" onLeadingPress={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {card == null || selected == null ? (
            // 카드가 놓일 자리에 「없다」를 말한다. 고른 날이 있으면 그 날 카드가
            // 없다는 것을, 아직 아무 날도 안 골랐으면 회고가 먼저라는 것을 말한다.
            <Text variant="body2" color={labelColor.neutral} style={styles.empty}>
              {selected == null
                ? "회고를 마치면 그날의 행동카드가 여기 남아요."
                : `${formatKoreanDateShort(selected)}에 만들어진 행동카드가 없어요.`}
            </Text>
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

          {/* 배경 위에 직접 — 흰 카드로 감싸면 위 카드와 같은 무게가 된다 */}
          <View style={styles.past}>
            <View style={styles.pastHead}>
              <Text variant="label1" color={labelColor.neutral}>
                지난 행동카드
              </Text>
              <Text variant="caption1" color={labelColor.alternative}>
                카드가 있었던 날을 골라보세요.
              </Text>
            </View>

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
          </View>
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
          title="이 행동카드를 삭제할까요?"
          description="삭제한 행동카드는 되돌릴 수 없어요."
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
  content: { gap: space.md, paddingBottom: space.xl },
  empty: { paddingVertical: space.xl },
  // 지난 카드 블록은 위 카드와 16 띄운다 (시안 `margin-top:16`)
  past: { gap: 10, marginTop: space.lg },
  pastHead: { gap: 2, paddingHorizontal: space.xs },
});
