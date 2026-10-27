import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { Icon, Screen, Spinner, Text, TopNavigation } from "@/components/ds";
import { homeV2, label as labelColor, overlay, radius, space } from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import type { LetterSummary } from "@/features/letter/data/letterApi";
import { keepWords, receivedLabel, useLetters } from "@/features/letter/model/letter";
import { letterPaperStyle } from "@/features/letter/ui/LetterPaper";

/**
 * 편지함 — 홈의 편지 아이콘이 여는 목록(2026-10-27 사용자 결정).
 *
 * 처음엔 아이콘을 누르면 최신 편지 한 통이 바로 열렸는데, 옆으로 넘겨 지난 편지를 볼 수 있다는 걸
 * 알 길이 없었다. 그래서 보관함의 일기 목록처럼 **편지를 날짜 내림차순으로 한 줄씩** 먼저 보여 준다.
 *
 * - 줄마다 「10월 27일 아침에 온 편지」와 **그날 일기의 첫 문장**. 편지 내용을 미리 보이려면 한 통씩
 *   불러와야 하고, 아직 못 만든 편지는 그 자리에서 만들어져 몇 초씩 걸린다 — 일기는 이미 앱에 있다.
 * - 한 번도 안 연 편지는 왼쪽 위에 **빨간 점**(홈 아이콘과 같은 점 · 숫자는 쓰지 않는다).
 * - 줄을 누르면 편지 화면이 열리고, 거기서 옆으로 넘기기는 그대로다. 닫으면 이 목록으로 돌아온다.
 * - 홈 아이콘을 눌렀을 때 **안 연 새 편지가 있으면** 이 목록 위에 그 편지를 바로 펼친다(`?open=날짜`).
 *   편지를 닫으면 이 목록이 보인다 — 새 편지는 바로 읽고, 지난 편지가 있다는 것도 알게 한다.
 * - 알림과 일기 상세는 이 목록을 거치지 않고 그 편지로 바로 간다.
 */
const firstSentence = (text: string) => text.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? text;

export default function LetterBox() {
  const summaries = useLetters((s) => s.summaries);
  const diaries = useDiary((s) => s.diaries);
  const [asked, setAsked] = useState(summaries != null);
  const { open } = useLocalSearchParams<{ open?: string }>();
  const opened = useRef(false);

  // 홈 아이콘이 새 편지와 함께 열었다 — 그 편지를 목록 위에 바로 펼친다. 닫으면 이 목록으로 돌아온다
  useEffect(() => {
    if (open == null || open === "" || opened.current) return;
    opened.current = true;
    router.setParams({ open: "" });
    router.push(`/letter/${open}?source=home_icon`);
  }, [open]);

  // 올 때마다 목록을 다시 묻는다 — 편지는 아침마다 하나씩 늘어난다
  useFocusEffect(
    useCallback(() => {
      void useLetters
        .getState()
        .refresh()
        .finally(() => setAsked(true));
    }, []),
  );

  const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));
  const diaryLine = (date: string) => {
    const body = diaries.find((d) => d.date === date)?.body.trim();
    return body != null && body.length > 0 ? keepWords(firstSentence(body)) : null;
  };

  return (
    <Screen>
      <TopNavigation leading="close" onLeadingPress={close} title="바바의 편지" titleHand />
      {summaries == null ? (
        asked ? (
          <View style={styles.center}>
            <Text variant="body2" color={labelColor.alternative}>
              편지함을 불러오지 못했어요
            </Text>
          </View>
        ) : (
          <View style={styles.center}>
            <Spinner />
          </View>
        )
      ) : summaries.length === 0 ? (
        <View style={styles.center}>
          <Text variant="body2" color={labelColor.alternative}>
            일기를 쓰면 다음 날 아침 바바가 편지를 보내요
          </Text>
        </View>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(l) => l.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <Row letter={item} diaryLine={diaryLine(item.date)} />}
        />
      )}
    </Screen>
  );
}

function Row({ letter, diaryLine }: { letter: LetterSummary; diaryLine: string | null }) {
  const unread = letter.openedAt == null;
  const title = `${receivedLabel(letter.date)}에 온 편지`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={unread ? `${title}, 안 읽음` : title}
      onPress={() => router.push(`/letter/${letter.date}?source=home_icon`)}
      style={[letterPaperStyle.paper, styles.row]}
    >
      {({ pressed }) => (
        <>
          {unread ? <View testID={`letter-unread-${letter.date}`} style={styles.dot} /> : null}
          <View style={styles.text}>
            <Text variant="body1" color={labelColor.strong} numberOfLines={1}>
              {title}
            </Text>
            {diaryLine != null ? (
              <Text variant="body2" color={labelColor.neutral} numberOfLines={1}>
                {diaryLine}
              </Text>
            ) : null}
          </View>
          <Icon name="chevron-right" size={16} color={labelColor.alternative} />
          {pressed ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.pressed]} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { gap: space.md, paddingTop: space.sm, paddingBottom: space.xl3 },
  row: { flexDirection: "row", alignItems: "center", gap: space.md },
  text: { flex: 1, gap: space.xs },
  // 안 읽은 편지 — 홈 편지 아이콘과 같은 점을 왼쪽 위 모서리에
  dot: {
    position: "absolute",
    top: space.sm,
    left: space.sm,
    width: homeV2.size.bell.dot,
    height: homeV2.size.bell.dot,
    borderRadius: homeV2.size.bell.dot / 2,
    backgroundColor: homeV2.color.alert,
  },
  pressed: { backgroundColor: overlay.pressLight, borderRadius: radius.large },
});
