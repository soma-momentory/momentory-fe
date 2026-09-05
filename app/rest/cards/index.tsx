import { AnalyticsResource } from "@/features/analytics/AnalyticsResource";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

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
import { label as labelColor, layout, primary, space, status } from "@/design/ds";
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
        <AnalyticsResource kind="wish_card" id={card?.id ?? null} source="cards" />
        <TopNavigation
          leading="arrow-left"
          title="바람카드"
          titleHand
          onLeadingPress={() => router.back()}
        />

        {/* **달력은 화면 바닥에 붙박여 있고, 6줄 자리를 늘 잡는다**(2026-09-06).

            한 달은 5줄일 때도 6줄일 때도 있다. 달력이 그 달의 줄 수만큼만 높으면
            달을 넘길 때마다 높이가 한 줄(40)씩 오르내리고, 바닥에 붙어 있는 이
            화면에서는 그게 곧 **달력 상단이 움직이는 것**으로 보인다. 그래서
            `reserveRows={6}` 으로 최대 줄 수 자리를 늘 잡는다 — 5줄인 달은 마지막
            줄 자리가 비어 있을 뿐 격자의 위치는 그대로다.

            남는 높이는 **카드 자리**(위)가 먹는다. 높이가 고정된 달력이 바닥에
            붙어 있으므로 달력 상단이 기기와 무관하게 「바닥에서 같은 거리」에
            선다 — 안드로이드와 iOS 에서 달력 자리가 달랐던 것이 이 때문이었다.

            ⚠ 2026-08-28 에는 반대로 했다 — 카드 자리를 340 으로 **고정**하고 남는
            높이를 달력 **아래**로 보냈다. 그러면 기기마다 달력이 바닥에서 다른
            거리에 서고, 짧은 기기에서는 `flexShrink` 가 카드 자리를 깎아 달마다
            달력이 위아래로 움직였다. 그때 걱정했던 「긴 기기에서 가운데가 크게
            빈다」는 남지만, 카드가 **위에 붙어** 있어 빈 자리는 카드 아래로 가고
            짧은 기기에서는 카드 자리만 스크롤된다. */}
        <View style={styles.body}>
          {/* 카드 자리는 이제 **스크롤하지 않는다** — 카드가 스스로 이 자리에 맞춰
              줄고, 넘치는 몫은 카드 안에서 스크롤한다(`RestActionCard` 의 `fields`).
              바깥이 자르던 때는 카드 아랫변이 평평하게 끊겨 달력과 이어져 보였다 */}
          <View style={styles.cardArea}>
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
                // 누른 지점(창 기준) 바로 아래에 메뉴가 선다 — 메뉴는 `Screen` 밖
                // 레이어라 인셋을 빼지 않는다
                onMore={(atY) => setMenuTop(atY + space.md)}
              />
            )}
          </View>

          {/* 「지난 바람카드」 머리글은 뺐다(2026-08-24). 카드가 화면의 주인공이라
              그 위 세로를 머리글에 내주지 않는다.

              달력은 **시스템 바 바로 위**에 앉는다 — `styles.calendarSeat` 주석 */}
          <View style={styles.calendarSeat}>
            <Calendar
              month={shownMonth}
              selectedDate={selected}
              onSelect={(date) => {
                setPicked(date);
                setMonth(date.slice(0, 7));
              }}
              onMonthStep={step}
              markOf={markOf}
              reserveRows={CALENDAR_ROWS}
            />
          </View>
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
 * 달력이 늘 잡아 두는 주 줄 수 — **한 달이 가질 수 있는 최대**다.
 *
 * 31일이 토요일에 시작하면 앞 빈칸 6 + 31 = 37 칸이라 6줄이 된다. 그보다 긴 달은
 * 없으므로 6 이 천장이고, 6 을 예약하면 어떤 달에도 격자가 잘리지 않으면서 높이가
 * 변하지 않는다.
 *
 * ⚠ **`design/ds` 로 올리지 않는다.** `metrics.ts` 의 `size` 는 「시스템 차원에서 정한
 * 값만」 두고 **화면 하나에서만 쓰는 숫자는 그 화면에 둔다**고 스스로 못박아 두었다
 * (`metrics.ts` `size` 머리말 · `CLAUDE.md` 「디자인 파일에 제품 규칙을 넣지 않는다」).
 * `Calendar` 의 칸 높이, `Slider` 의 엄지 지름도 같은 이유로 각자 파일에 있다.
 */
const CALENDAR_ROWS = 6;

const styles = StyleSheet.create({
  body: { flex: 1 },
  /**
   * 카드 자리 — **남는 높이를 전부 먹는다.**
   *
   * 달력이 6줄 높이로 바닥에 붙박여 있으므로 기기마다 다른 남는 높이는 전부 이리로
   * 온다. 카드는 이 자리에 **맞춰 줄고**(`RestActionCard` 의 `card`), 넘치는 몫은
   * 카드 안에서 스크롤한다 — 달력은 따라 움직이지 않고, 「했어요」를 눌러 카드가
   * 커졌다 작아져도 마찬가지다.
   */
  // 아래 여백이 **카드와 달력 사이의 유일한 간격**이다 — 카드가 자리를 꽉 채우므로
  // (`RestActionCard` 의 `card`) 이 값이 곧 둘 사이의 거리다. 16 → 8 → **4** 로
  // 좁혔다(2026-09-06). 달력이 자기 위로 12(`calendarSeat` 의 `paddingTop`)를 더
  // 잡고 있어서, 둘이 붙어 보이지 않는 몫은 그쪽이 맡는다
  cardArea: { flex: 1, paddingBottom: space.xs },
  /**
   * 달력이 앉는 자리 — **시스템 바 바로 위, 다만 딱 붙지는 않게.**
   *
   * `Screen` 의 아래 여백은 `max(인셋, 하한) + androidNavGap` 인데, 뒤의 한 뼘은
   * 「하단 독이 시스템 바에 **딱 맞닿지** 않게」 두는 숨이다(`Screen` 머리말).
   * 달력은 독이 아니라 격자라서 그 숨을 통째로 두면 화면 끝에서 떠 보였다 —
   * 그래서 되가져오되 **`space.xs2` 만 남긴다.** 6줄인 달은 마지막 줄이 실제로
   * 이 끝까지 내려오므로, 0 으로 두면 날짜가 제스처 바에 닿는다.
   *
   * `Math.max(…, 0)` 이 **iOS 를 지킨다** — 거기서는 `androidNavGap` 이 0 이라
   * 빼면 음수가 되어 달력이 되레 위로 밀린다. 홈 인디케이터 인셋이 이미 그 자리를
   * 맡고 있어 iOS 는 **화면 끝에서부터** 재는 것이 맞다(2026-09-06 결정).
   *
   * 위쪽 `paddingTop` 은 **달 표기 위로 차지하는 자리**다. 카드 자리와 달력 사이에는
   * 선이 없어서, 스크롤로 잘린 카드의 아랫변과 달 표기가 바짝 붙으면 한 덩어리로
   * 읽힌다. 달력이 바닥에 붙박여 있으므로 이 자리는 **위로** 자란다 — 그만큼 카드
   * 자리가 줄고 달력 안의 것들은 움직이지 않는다.
   *
   * 값은 달력이 **자기 안에서 쓰는 간격**과 같은 `space.md` 다(`Calendar` 의
   * `root: { gap: space.md }` — 달 표기와 격자 사이). 그래서 달 표기는 위아래로
   * 같은 여백을 두고 서고, 새 숫자를 만들지 않는다.
   */
  calendarSeat: {
    paddingTop: space.md,
    marginBottom: -Math.max(layout.androidNavGap - space.xs2, 0),
  },
});
