import { StyleSheet, View } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import { splitMoodMessage, type WeeklyReport } from "@/features/report/model/weeklyReport";

/**
 * `W1` · 화면 첫 줄 — 그 주를 **한 문장으로** 말한다.
 *
 * ## 일곱 칸이 여기서 떠났다 (2026-09-12)
 *
 * 예전에는 이 카드가 「제목 → 7일 점 줄 → 구분선 → 요약」 한 벌이었다. 시안이 둘을
 * 갈랐다 — 요약은 이 카드에 남고, 하루하루는 **제 카드**로 나갔다(`WeekEmotionCard` ·
 * 쌓이는 조약돌). 한 카드 안에 있는 동안에는 「그 주가 어땠나」와 「어느 날이 어땠나」가
 * 같은 자리에서 겹쳤고, 구분선 하나가 그 둘을 갈라 보려 애쓰고 있었다.
 *
 * 그래서 이 카드에는 이제 **문장만 있다** — 구분선도 함께 없앴다(가를 것이 없다).
 * 감정 **비율**(도넛·%)은 여기에도 어디에도 없다(`DESIGN.md` 「리포트」).
 *
 * ## 문장을 지어내지 않는다
 *
 * 요약은 **서버가 감정에 따라 고른 고정 문장**이다(BE `WeeklyMood` — AI 를 쓰지
 * 않는다). 화면은 그 한 덩이를 첫 마침표에서 둘로 갈라 **관찰**과 **권유**를 다른
 * 굵기로 세울 뿐이고(`splitMoodMessage`), 문장을 고치거나 보태지 않는다. 한 문장뿐인
 * 주(여러 감정이 최다를 나눠 가진 주 · 기록이 없는 주)는 그대로 한 줄이다.
 *
 * ## 제목도 카드도 없다 (2026-09-12)
 *
 * 한때 「이번 주의 마음」 카드였고 시안을 따라 「이번 주 한눈에」였는데, 사용자 결정으로
 * **제목 셋(한눈에 · 감정들 · 바람카드)을 모두 걷고, 이 문장만 카드에서도 꺼냈다.**
 *
 * 카드는 「그 안에서 무언가를 보는 판」이다 — 일곱 칸도 알약도 그 안에 산다. 그런데 이
 * 문장은 **화면이 사용자에게 건네는 말**이라 판이 필요 없다. 날짜 줄 아래 그냥 놓이면
 * 아래 카드 셋이 「보는 것」으로 한 묶음이 되고, 이 문장은 그 묶음을 여는 인사가 된다.
 * ⚠ 「이번 주」라는 기간 표시는 **머리의 날짜 줄**이 이미 말한다.
 *
 * ## 문장을 지어내지 않는다 (서버 멘트 그대로)
 *
 * ⚠ **서버 멘트는 지난 주에도 「이번 주에는 …」이라고 말한다**(BE `WeeklyMood` 의
 * 고정 문장 아홉 벌). 그 문장은 서버 것이라 여기서 고치지 않는다 — BE 가 「그 주에는」
 * 으로 바꾸거나 주차별로 갈라 주어야 닫힌다. 제목이 사라지면서 **화면이 기간을 말하는
 * 자리는 날짜 줄 하나**가 됐고, 어긋나는 것도 이 멘트 하나뿐이다.
 * 기록: `docs/PRODUCT.md` 「상류와 차이」.
 */
export function WeekMoodSummary({ report }: { report: WeeklyReport }) {
  const { lead, follow } = splitMoodMessage(report.moodMessage);
  if (lead.length === 0) return null;

  return (
    <View style={styles.copy}>
      {/* 본문(16)보다 **한 단 큰** 읽기용 단이다(2026-09-12 · 사용자 요청) — 카드 밖에
          홀로 서는 문장이라 본문 크기로는 아래 카드들에 묻혔다. 새 숫자를 만들지 않고
          일기 상세가 쓰던 18/30 을 그대로 쓴다(`typography.ts`) */}
      <Text variant="body1ReadingHandLg" color={labelColor.normal} style={styles.lead}>
        {lead}
      </Text>
      {follow.length > 0 ? (
        <Text variant="body2Reading" color={labelColor.alternative} style={styles.follow}>
          {follow}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  copy: { gap: space.xs },

  /**
   * 두 문장의 **왼쪽 자리가 다르다**(2026-09-12 · 사용자 확인).
   *
   * 관찰 문장은 **화면 맨 왼쪽**(섹션 라벨과 같은 4)에서 시작한다 — 카드 밖에 놓인 이
   * 줄이 그 주를 여는 말이라, 아래 어느 것에도 딸리지 않은 자리에 선다.
   *
   * 권유 문장은 **12**로 한 단만 들어온다 — 앞 문장에 딸린 말이라 들여쓰기가 그 관계를
   * 그대로 보여준다. 한때 카드 안쪽 글에 맞춰 22 까지 밀었는데 너무 깊었다(2026-09-12 ·
   * 사용자 확인) — 여기서 재는 것은 카드의 시작선이 아니라 **앞 문장과의 거리**다.
   */
  lead: { paddingHorizontal: space.xs },
  follow: { paddingLeft: space.md, paddingRight: space.xs },
});
