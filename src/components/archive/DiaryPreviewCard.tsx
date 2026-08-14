import { Image, Pressable, StyleSheet, View } from "react-native";

import { EmotionPill } from "@/components/common/EmotionPill";
import { MOOD_ICONS, MOOD_ICON_SIZE } from "@/components/icons/moodIcons";
import { AppText } from "@/components/primitives/AppText";
import { Card } from "@/components/primitives/Card";
import { paperColors, paperRadius, paperTypography } from "@/design/paper";
import type { Diary } from "@/features/diary/model/diary";
import { formatKoreanDate } from "@/lib/day";

/**
 * 일기 한 장의 미리보기 — `A1` 선택 날짜 카드 · `A2` 목록.
 *
 * 새 디자인(`보관함.dc.html`)의 항목은 **감정 얼굴 아바타 + 날짜 + 발췌 +
 * 감정 칩**이다. 반투명 흰 면(`Card variant="paperSoft"`) 위에 앉는다.
 *
 * **미리보기는 두 줄 말줄임**이다(`A2.md`) — 길이가 들쭉날쭉하면 목록이 아니라
 * 벽이 된다.
 *
 * **색만으로 감정을 판단하게 하지 않는다** — 달력의 얼굴이 못 하는 일을 여기서
 * 한다. 감정 칩이 이름을 글자로 보여준다(`A1.md`).
 *
 * 링크는 `전체 일기 보기` 가 아니라 **`일기 열어보기`** 다 — 여는 것은 그날의
 * 일기 **한 장**이다(`A1.md` — 문안 그대로).
 */
type Props = {
  diary: Diary;
  onOpen: (id: string) => void;
  /** `A1` 선택 날짜 카드에만 붙는다 — 목록은 카드 자체가 링크다 */
  showOpenLink?: boolean;
};

export function DiaryPreviewCard({ diary, onOpen, showOpenLink = false }: Props) {
  const face = diary.emotions[0];

  return (
    <Pressable accessibilityRole="button" onPress={() => onOpen(diary.id)}>
      <Card variant="paperSoft" style={styles.card}>
        {/* 아바타 원은 감정이 없어도 자리를 지킨다 — 줄마다 글의 시작이 어긋나지 않게 */}
        <View style={styles.avatar}>
          {face != null ? (
            <Image
              source={MOOD_ICONS[face]}
              style={styles.face}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>

        <View style={styles.main}>
          <View style={styles.head}>
            <AppText weight="700" numberOfLines={1} style={styles.date}>
              {formatKoreanDate(diary.date)}
            </AppText>
            {diary.emotions.map((e, i) => (
              <EmotionPill key={`${e}-${i}`} id={e} variant="paper" />
            ))}
          </View>

          <AppText numberOfLines={2} style={styles.body}>
            {diary.body}
          </AppText>

          {showOpenLink ? (
            <AppText weight="700" style={styles.link}>
              일기 열어보기 ›
            </AppText>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

const { styles: type } = paperTypography;
const AVATAR = 44;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 12,
    borderRadius: paperRadius.card,
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: paperColors.bg.fieldAlt,
  },
  face: { width: MOOD_ICON_SIZE.listAvatar, height: MOOD_ICON_SIZE.listAvatar },

  main: { flex: 1, minWidth: 0, gap: 6 },
  head: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  date: {
    fontSize: type.body.fontSize,
    lineHeight: type.body.lineHeight,
    color: paperColors.text.primary,
  },
  body: {
    fontSize: type.bodySm.fontSize,
    lineHeight: type.bodySm.lineHeight,
    // 시안의 발췌 `#8F9A83` 은 카드 위 2.9 미달 — 글자용 보정 토큰으로 (PLAN §4)
    color: paperColors.text.mutedWarmText,
  },
  link: {
    fontSize: type.caption.fontSize,
    lineHeight: type.caption.lineHeight,
    color: paperColors.text.green,
  },
});
