import { Pressable, StyleSheet, View } from "react-native";

import { Card, EmotionPebble, Icon, Text } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import type { Diary } from "@/features/diary/model/diary";
import { emotionName } from "@/features/emotion/model/emotion";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * 일기 한 장의 미리보기 — `A1` 선택 날짜 카드 · `A2` 목록.
 *
 * 새 디자인(`Archive.dc.html`)의 항목은 **감정 조약돌 + 감정 이름 + 날짜 + 발췌**다.
 * 작은 조약돌을 왼쪽에 세우고 그 옆에 이름을 붙인 것이 이 카드의 핵심이다 —
 * **달력이 못 하는 일을 여기서 한다**: 색으로 표시한 감정의 뜻을 글자로 말한다
 * (`A1.md` 「색만으로 감정을 판단하게 하지 않는다」).
 *
 * - 날짜 문안은 시안을 따라 **「○월 ○일의 일기」**다(2026-08-24 · 요일에서 바꿈).
 *   `docs/spec` 은 「7월 22일 수요일」이지만 **`DESIGN.md`(시안)가 문안까지
 *   이긴다**(`CLAUDE.md` N6). ⚠ 스펙과 어긋나므로 굳으면 `PRODUCT.md` 에 남긴다
 * - 감정은 **머리 오른쪽**에 둔다(조약돌+이름) — 날짜와 같은 줄에서 오른쪽으로 나뉜다.
 *   조약돌 옆에 이름을 붙이는 규칙은 그대로다(`A1.md` 「색만으로 판단하게 하지 않는다」)
 * - **미리보기는 두 줄 말줄임**이다(`A2.md`) — 시안은 A1 3줄 / A2 1줄로 갈랐지만
 *   길이가 자리마다 다르면 같은 카드로 읽히지 않는다. 스펙 값 하나로 맞춘다
 * - 링크는 `전체 일기 보기` 가 아니라 **`일기 열어보기`** 다 — 여는 것은 그날의
 *   일기 **한 장**이다(`A1.md` — 문안 그대로)
 */
type Props = {
  diary: Diary;
  onOpen: (id: string) => void;
  /** `A1` 선택 날짜 카드에만 붙는다 — 목록은 카드 자체가 링크라 `›` 로 말한다 */
  showOpenLink?: boolean;
};

export function DiaryPreviewCard({ diary, onOpen, showOpenLink = false }: Props) {
  return (
    <Pressable accessibilityRole="button" onPress={() => onOpen(diary.id)}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <Text variant="body1" color={labelColor.strong} numberOfLines={1} style={styles.date}>
            {`${formatKoreanDateShort(diary.date)}의 일기`}
          </Text>

          {/* 감정은 머리 오른쪽으로 — 조약돌 옆에는 늘 이름이 붙는다(감정색은
              대비가 낮아 색만으로 읽히지 않는다) */}
          {diary.emotions.length > 0 ? (
            <View style={styles.tags}>
              {diary.emotions.map((e, i) => (
                <View key={`${e}-${i}`} style={styles.tag}>
                  <EmotionPebble id={e} size={12} />
                  <Text variant="caption1" color={labelColor.neutral}>
                    {emotionName(e)}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* 여는 길을 가리키는 표식은 카드마다 하나다 — 목록은 `›`, 선택 카드는 아래 링크 */}
          {showOpenLink ? null : (
            <Icon name="chevron-right" size={16} color={labelColor.assistive} />
          )}
        </View>

        <Text variant="body2Reading" color={labelColor.neutral} numberOfLines={2}>
          {diary.body}
        </Text>

        {showOpenLink ? (
          <Text variant="label2" color={labelColor.alternative}>
            일기 열어보기 ›
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  head: { flexDirection: "row", alignItems: "center", gap: space.sm },
  date: { flex: 1, minWidth: 0 },
  // 오른쪽 정렬 + 줄바꿈 — 감정이 둘 이상이면 오른쪽에서 접힌다(날짜가 밀리지 않게)
  tags: {
    flexShrink: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: space.sm,
  },
  tag: { flexDirection: "row", alignItems: "center", gap: space.xs },
});
