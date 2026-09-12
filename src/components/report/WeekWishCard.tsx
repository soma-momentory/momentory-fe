import { StyleSheet, View } from "react-native";

import { Card, Icon, Text } from "@/components/ds";
import { fill, label as labelColor, line, radius, space, status as statusColor } from "@/design/ds";
import type { PracticedWish, WeeklyNeed, WeeklyReport } from "@/features/report/model/weeklyReport";

/**
 * `W1` · 그 주에 **찾은 바람**과 **실천한 것**을 적는 카드 (2026-09-12 · 사용자 시안 3번).
 *
 * ⚠ 카드 제목(「바람카드」)은 두지 않는다 — 화면의 카드 제목 셋을 함께 걷었다(사용자 결정
 * 2026-09-12). 첫 줄의 「이번 주에 찾은 바람들」이 곧 이 카드가 무엇인지 말한다.
 *
 * ## 세던 자리를 말하는 자리로
 *
 * 전에는 「이번 주 한눈에」의 한 줄(「5개 중 3개 실천」)이 바람카드의 전부였다. 그 줄은
 * **몇 장이었나**만 말할 뿐 **무엇을 바랐고 무엇을 해봤는지**는 말하지 않는다 — 그래서
 * 카드 한 장을 내어 주고, 셈 카드에서는 그 줄을 뺐다(`WeekCountList`).
 *
 * **평가하지 않는다**(`RULES.md` 4 · `DESIGN.md` 「리포트」): 실천율·연속·못 한 개수를
 * 적지 않고, 「n개 중 m개」도 여기서는 쓰지 않는다. 찾은 바람은 **그대로 늘어놓고**,
 * 실천한 것은 **한 것만** 적는다 — 안 한 카드를 목록에 세우면 그 자리가 곧 할 일 목록이 된다.
 *
 * ## 같은 바람은 한 알약으로 모으고 「×2」를 붙인다
 *
 * 한 주에 같은 바람이 여러 번 나오는 일은 흔하다(서버가 합쳐서 센다 · BE `WeeklyWishes`).
 * 알약을 두 개 세우면 다른 바람처럼 보이고, 합치기만 하면 두 번이었다는 사실이 사라진다.
 *
 * ⚠ **알약은 `Chip` 이 아니다.** DS 의 칩은 **필터·선택 전용**이고(「정보 장식용 칩을 만들지
 * 않는다」 · `Chip` 머리말), 이 알약은 누르는 것이 아니라 읽는 것이다. 그래서 테두리 대신
 * 옅은 면 하나로 서고, 눌리는 것들과 문법을 공유하지 않는다.
 *
 * ## 작은 행동을 안 정하고 해본 카드도 목록에 선다
 *
 * 「오늘은 여기까지」로 끝낸 카드도 「해봤어요」를 누를 수 있다(BE `ActionCard`). 그런 줄은
 * 일기 상세와 **같은 말**로 「아직 정하지 않음」이라 적는다(`WishCardFields`) — 목록에서 빼면
 * 실천한 수와 줄 수가 어긋나 보인다.
 */
type Props = {
  report: WeeklyReport;
  thisWeek: boolean;
};

/** 일기 상세와 같은 말 — 자리를 비워 두지 않고 안 정했다고 적는다(`WishCardFields`) */
const UNSET = "아직 정하지 않음";

export function WeekWishCard({ report, thisWeek }: Props) {
  const { needs, practicedWishes } = report;
  // 「이번 주」는 이번 주에만 쓴다 — 지난 주를 넘겨보는 동안에는 「이 주」다(다른 카드와 같은 규칙)
  const week = thisWeek ? "이번 주" : "이 주";

  return (
    <Card padding="loose" style={styles.card}>
      {/* 카드가 한 장도 없는 주 — 「0개」라고 적지 않는다(`WeekCountList` 와 같은 판단) */}
      {needs.length === 0 && practicedWishes.length === 0 ? (
        <Text variant="body2Reading" color={labelColor.alternative}>
          {`${week}에 찾은 바람이 아직 없어요`}
        </Text>
      ) : (
        <>
          {needs.length > 0 ? (
            <View style={styles.section}>
              {/* 아래 「…개의 바람을 실천했어요.」와 **같은 단·같은 색**이다(2026-09-12 ·
                  사용자 요청). 카드 제목이 사라진 뒤로 이 줄이 라벨(작고 흐린 글자)로 서면
                  카드가 이름표부터 시작하는 것처럼 보였다 — 두 줄은 대등한 두 마디다 */}
              <Text variant="body1Reading" color={labelColor.normal}>
                {`${week}에 찾은 바람들`}
              </Text>
              <View style={styles.pills}>
                {needs.map((need) => (
                  <WishPill key={need.word} need={need} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={styles.practiced}>
            <Text variant="body1Reading" color={labelColor.normal}>
              {practicedWishes.length > 0
                ? `${week}에는 ${practicedWishes.length}개의 바람을 실천했어요.`
                : `${week}에는 아직 실천한 바람이 없어요.`}
            </Text>
            {practicedWishes.map((wish, i) => (
              <PracticedRow key={`${wish.action ?? ""}-${i}`} wish={wish} />
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

/**
 * 찾은 바람 한 알약 — 여러 번 나온 바람만 「×2」를 단다.
 *
 * 낭독기는 「휴식, 2번」으로 읽는다 — 「곱하기 2」로 읽히면 무슨 말인지 알 수 없다.
 */
function WishPill({ need }: { need: WeeklyNeed }) {
  return (
    <View
      accessible
      accessibilityLabel={need.count > 1 ? `${need.word}, ${need.count}번` : need.word}
      style={styles.pill}
    >
      <Text variant="body2" color={labelColor.normal}>
        {need.word}
      </Text>
      {need.count > 1 ? (
        <Text variant="caption1" color={labelColor.alternative}>
          {`×${need.count}`}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * 실천한 것 한 줄 — 「✓ 실천 내용 — 바람」.
 *
 * 바람을 **행동 글자 안에 중첩**한다 — 나란한 두 `Text` 를 가로로 두면 행동이 길어 접힐 때
 * 바람 왼쪽의 좁은 폭 안에서만 접힌다(`WishCardFields` 의 같은 판단). 낭독기도 한 문장으로 읽는다.
 */
function PracticedRow({ wish }: { wish: PracticedWish }) {
  return (
    <View style={styles.row}>
      {/* 체크는 **아이콘 전용 초록**이다 — 글자로 쓰지 않는다(`ds/color.ts`).
          아이콘(16)이 글줄(20)보다 작아 첫 줄 가운데에 서도록 상자로 한 번 감싼다 */}
      <View style={styles.check}>
        <Icon name="check" size={16} color={statusColor.positive} />
      </View>
      <Text variant="body2" color={labelColor.strong} style={styles.action}>
        {wish.action ?? UNSET}
        {wish.needs.length > 0 ? (
          <Text variant="caption1" color={labelColor.alternative}>
            {` — ${wish.needs.join(", ")}`}
          </Text>
        ) : null}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.lg },
  section: { gap: space.md },
  // 알약이 여럿이면 줄을 바꿔 내려온다 — 가로로 흐르게 두면 긴 바람이 잘린다
  pills: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  // 위아래 여백은 좌우의 **절반 이하**다(2026-09-12 · 사용자 요청 「높이를 조금 줄여」) —
  // 알약은 글자를 감싸는 자국이지 버튼이 아니라, 눌릴 만한 높이를 가질 이유가 없다
  pill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    backgroundColor: fill.normal,
  },
  // 구분선은 hairline 이다 — 카드 안에 또 하나의 카드를 만들지 않는다(`DESIGN.md` §5)
  practiced: {
    gap: space.md,
    paddingTop: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: line.alternative,
  },
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  check: { marginTop: space.xs2 },
  action: { flex: 1, minWidth: 0 },
});
