import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";

import { Icon, Screen, Spinner, TabPaperBackground, Text, TopNavigation } from "@/components/ds";
import { Baba, Bubble } from "@/components/onboarding/OnboardingParts";
import { background, homeV2, label as labelColor, overlay, radius, space } from "@/design/ds";
import { track } from "@/features/analytics";
import { useDiary } from "@/features/diary/model/diary";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";
import type { LetterSummary } from "@/features/letter/data/letterApi";
import {
  keepWords,
  letterWait,
  receivedLabel,
  useLetters,
  type LetterWait,
} from "@/features/letter/model/letter";
import { letterPaperStyle } from "@/features/letter/ui/LetterPaper";
import { useSettings } from "@/features/my/model/settings";
import { clock } from "@/lib/clock";
import { formatKoreanTime } from "@/lib/time";

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
 * - **오늘 받을 편지가 없으면** 목록 위에서 바바가 왜 없는지와 언제 오는지 말한다(2026-11-15 · `letterWait`).
 *   편지가 한 통도 없으면 그 말만 가운데에 둔다.
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
  const wait = summaries == null ? null : letterWait(summaries, diaries, clock.today());
  const diaryLine = (date: string) => {
    const body = diaries.find((d) => d.date === date)?.body.trim();
    return body != null && body.length > 0 ? keepWords(firstSentence(body)) : null;
  };

  return (
    <Screen grid={false} backdrop={<TabPaperBackground tab="홈" />}>
      {/* 홈에서 여는 편지라 홈과 같은 종이 질감이다(2026-11-10 · 옛 모눈을 걷었다) */}
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
        <>
          <View style={styles.center}>{wait != null ? <Waiting wait={wait} /> : null}</View>
          {/* 「회고하러 가기」는 편지가 한 통도 없는 사람에게만 — 엄지가 닿는 맨 아래에 둔다.
            이미 편지를 받아 본 사람에게는 버튼 없이 말만 한다(2026-11-15 팀 피드백) */}
          {wait === "retro" ? (
            <ReflectionButton
              label="회고하러 가기"
              testID="letter-wait-retro"
              style={styles.retro}
              onPress={() => {
                track("retro_cta_clicked", { source: "letter_box" });
                router.push("/retro/confirm");
              }}
            />
          ) : null}
        </>
      ) : (
        <FlatList
          data={summaries}
          keyExtractor={(l) => l.id}
          ListHeaderComponent={wait != null ? <Waiting wait={wait} /> : null}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <Row letter={item} diaryLine={diaryLine(item.date)} />}
        />
      )}
    </Screen>
  );
}

/**
 * 오늘 받을 편지가 없다 — 바바가 왜 없는지와 언제 오는지 말한다. 문구는 사용자가 골랐다(2026-11-15).
 * 말풍선이 바바 머리 위에 있고 꼬리가 바바를 가리킨다 — 바바가 직접 말하는 장면이다.
 */
function Waiting({ wait }: { wait: Exclude<LetterWait, null> }) {
  const letterNotify = useSettings((s) => s.notify.letter);
  const when =
    letterNotify.enabled && letterNotify.time != null
      ? `내일 ${formatKoreanTime(letterNotify.time)}에`
      : "내일 아침에";
  // 문장마다 줄을 바꾼다 — 첫 문장 끝에 다음 문장 앞머리가 붙어 줄이 어색하게 나뉘었다(2026-11-15 Lab)
  const line = {
    retro:
      "편지는 회고를 마친 다음 날 아침에 와요.\n오늘 밤 이야기를 들려주면 내일 아침에 보낼게요.",
    tomorrow: `오늘 이야기로 편지를 쓰고 있어요.\n${when} 열어 봐요.`,
    written:
      "편지는 회고를 마친 다음 날 아침에 와요.\n오늘은 직접 쓴 일기라서 내일은 편지가 없어요.",
  }[wait];
  return (
    <View style={styles.waiting}>
      <Bubble style={styles.bubble}>{line}</Bubble>
      <View style={styles.tail} />
      <Baba size={104} />
    </View>
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
  waiting: { alignItems: "center", paddingVertical: space.lg },
  bubble: { alignSelf: "stretch" },
  // 말풍선 아래 가운데에서 바바 머리를 가리키는 꼬리 — 말풍선과 같은 면을 45° 돌려 아래 절반만 보인다
  tail: {
    width: space.lg,
    height: space.lg,
    marginTop: -space.lg / 2,
    marginBottom: space.sm,
    backgroundColor: background.elevated,
    transform: [{ rotate: "45deg" }],
  },
  retro: { marginBottom: space.md },
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
