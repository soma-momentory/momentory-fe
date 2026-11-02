import { track } from "@/features/analytics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo } from "react";

import { TabScreen } from "@/components/ds";
import { RestRecommendSheet } from "@/components/rest/RestRecommendSheet";
import { restRecommendMotion } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import { useTodayContext } from "@/features/home/model/day";
import { cardOn, datedCards, latestCardDay } from "@/features/rest/model/cards";
import { REST_CONTENTS } from "@/features/rest/model/contents";
import { useRestRecommendation } from "@/features/rest/model/useRestRecommendation";
import { RestHubView } from "@/features/rest/ui/RestHubView";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * `R1` · 쉼터 진입 — **바람카드가 있다는 사실만** 말한다.
 *
 * `Rest.dc.html` 규칙: 「R1 = 진입 — 바람카드가 있다는 사실만, **카드 전체가
 * 진입점**(「보기 →」)」 · 「**R1에서는 캘린더·수행 기록을 설명하지 않아요**」.
 *
 * ## 탭이 카드 화면 그 자체이던 것에서 바뀌었다
 *
 * 2세대에서는 이 탭이 곧 행동 카드 화면이었다(`PLAN.md` D1 — 룸 3종이 범위 밖이라
 * 허브를 두지 않았다). 새 시안은 **허브를 되살렸다** — 대신 룸이 아니라 **항목
 * 하나**다. 「쉼터에는 아직 바람카드만 — 기능이 늘면 R1에 항목을 더해요」가 시안
 * 주석에 그대로 적혀 있다. 늘어날 자리를 비워 두는 것과, 없는 것을 그리는 것은 다르다.
 *
 * **카드가 하나도 없어도 들어갈 수 있다** — 안에서 날짜로 둘러보고, 카드가 없는 날은
 * 「그 날 만들어진 바람카드가 없어요」로 답한다(2026-08-23). 요약 줄은 카드가 없으면
 * 회고가 먼저라는 사실만 말한다.
 *
 * ## 바람카드 아래에 쉼 콘텐츠 넷이 붙었다 (2026-09-02)
 *
 * 「기능이 늘면 R1 에 항목을 더해요」가 그 자리다 — 감각연못 · 걱정상자 · 오늘의
 * 보물함 · 몸에 힘 빼기를 **2×2** 로 놓는다(`features/rest/model/contents.ts`).
 * 바람카드는 그대로 첫 항목이고 진입점이다. 콘텐츠는 **화면이 생긴 것만 눌린다** —
 * 감각연못이 첫 번째다(2026-09-03 · `/rest/sense-pond`). 나머지 셋은 아직
 * 눌리지 않는다(`RestContentGrid`).
 *
 * ## 일기를 쓴 날에는 쉼 하나를 권한다 (2026-10-12)
 *
 * 오늘 쓴 일기가 있고 오늘 아직 매듭짓지 않았으면, 들어오고 0.6초 뒤에 **추천 시트**가 올라온다
 * (`useRestRecommendation` · `RestRecommendSheet`). 일기 완료 경로로 들어오면 날짜·닫은 횟수와
 * 관계없이 매번 연다. 일반 탭 진입에서 세 번 연달아 닫은 사람에게는 「오늘 추천」만 붙인다.
 */
export default function Rest() {
  const { afterDiary } = useLocalSearchParams<{ afterDiary?: string }>();
  const cards = useDiary((s) => s.actionCards);

  const all = useMemo(() => datedCards(cards), [cards]);
  const latest = latestCardDay(all);
  const { date: today } = useTodayContext();
  const hasToday = cardOn(all, today) != null;
  const recommend = useRestRecommendation(today, restRecommendMotion.delay, afterDiary === "1");
  useEffect(() => {
    // 이번 완료 진입에만 적용한다. 이후 일반 탭 진입까지 반복 표시하지 않는다.
    if (afterDiary === "1" && recommend.sheet != null) router.setParams({ afterDiary: "" });
  }, [afterDiary, recommend.sheet]);
  const recommended =
    recommend.sheet != null ? REST_CONTENTS.find((c) => c.id === recommend.sheet?.content) : null;
  const hinted = recommend.hint?.content;
  const contents =
    hinted == null
      ? REST_CONTENTS
      : REST_CONTENTS.map((c) => (c.id === hinted ? { ...c, note: REST_RECOMMEND_HINT } : c));

  const summary =
    latest == null
      ? // 「아직 없어요」라고 말하지 않는다 — 회고가 먼저다
        "회고를 마치면 그날의 바람카드가 여기 남아요"
      : hasToday
        ? "오늘의 바람카드가 있어요"
        : `가장 최근 카드는 ${formatKoreanDateShort(latest)}이에요`;

  const open = () => {
    track("wish_card_open_clicked", { source: "rest" });
    router.push("/rest/cards");
  };

  return (
    <TabScreen
      active="쉼터"
      overlay={
        recommended != null && recommend.sheet != null ? (
          <RestRecommendSheet
            content={recommended}
            emotion={recommend.sheet.emotion}
            title={recommend.sheet.title}
            onAccept={() => {
              recommend.accept("sheet");
              if (recommended.route != null) router.push(recommended.route);
            }}
            onDismiss={recommend.dismiss}
          />
        ) : null
      }
    >
      <RestHubView
        summary={summary}
        contents={contents}
        onOpenCards={open}
        onOpenContent={(item) => {
          if (item.id === hinted) recommend.accept("hint");
          if (item.route != null) router.push(item.route);
        }}
      />
    </TabScreen>
  );
}

/** 세 번 연달아 닫은 뒤 시트 대신 그 칸에 붙이는 한 줄 — 재촉하지 않고 자리만 알린다 */
const REST_RECOMMEND_HINT = "오늘 추천";
