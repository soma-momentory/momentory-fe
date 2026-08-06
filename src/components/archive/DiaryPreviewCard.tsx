import { Pressable, StyleSheet, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { archive } from "@/design/tokens.mvp";
import type { Diary } from "@/features/diary/model/diary";
import { formatKoreanDate } from "@/lib/day";

/**
 * 일기 한 장의 미리보기 — `A1` 선택 날짜 카드 · `A2` 목록. `.dprev`.
 *
 * **미리보기는 두 줄 말줄임**이다(`A2.md`) — 길이가 들쭉날쭉하면 목록이 아니라
 * 벽이 된다.
 *
 * **색만으로 감정을 판단하게 하지 않는다** — 달력의 점이 못 하는 일을 여기서
 * 한다. 감정 알약이 이름을 글자로 보여준다(`A1.md`).
 *
 * 링크는 `전체 일기 보기` 가 아니라 **`일기 열어보기`** 다 — 여는 것은 그날의
 * 일기 **한 장**이다.
 */
type Props = {
  diary: Diary;
  onOpen: (id: string) => void;
  /** `A1` 선택 날짜 카드에만 붙는다 — 목록은 카드 자체가 링크다 */
  showOpenLink?: boolean;
};

export function DiaryPreviewCard({ diary, onOpen, showOpenLink = false }: Props) {
  return (
    <Pressable accessibilityRole="button" onPress={() => onOpen(diary.id)}>
      <Card style={styles.card}>
        <View style={styles.head}>
          <AppText tone="strong" weight="600" style={styles.date}>
            {formatKoreanDate(diary.date)}
          </AppText>
          {diary.emotions.map((e, i) => (
            <EmotionPill key={`${e}-${i}`} id={e} />
          ))}
        </View>

        <AppText tone="body" numberOfLines={archive.preview.lines} style={styles.body}>
          {diary.body}
        </AppText>

        {showOpenLink ? (
          <AppText tone="accent" weight="600" style={styles.link}>
            일기 열어보기 ›
          </AppText>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: 9, borderRadius: archive.preview.radius },
  head: { flexDirection: "row", alignItems: "center", gap: 7 },
  date: { flex: 1, fontSize: archive.preview.dateSize, lineHeight: 18 },
  body: { fontSize: archive.preview.fontSize, lineHeight: archive.preview.lineHeight },
  link: { fontSize: 12.5, lineHeight: 16 },
});
