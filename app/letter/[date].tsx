import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { Icon, Screen, Spinner, TabPaperBackground, Text, TopNavigation } from "@/components/ds";
import { Baba } from "@/components/onboarding/OnboardingParts";
import { label as labelColor, layout, space } from "@/design/ds";
import { track } from "@/features/analytics";
import { actionCardOnDate, useDiary } from "@/features/diary/model/diary";
import { useDay } from "@/features/home/model/day";
import { fetchLetter, type Letter } from "@/features/letter/data/letterApi";
import { pickLetterAction } from "@/features/letter/model/actionReminder";
import {
  daysAfterBucket,
  useLetters,
  whenChoices,
  type WhenChoice,
} from "@/features/letter/model/letter";
import { LetterPaper } from "@/features/letter/ui/LetterPaper";
import { useProfile } from "@/features/my/model/settings";
import { clock } from "@/lib/clock";

/**
 * 바바의 편지 전체 화면(PRD 4-2) — 홈 편지 아이콘 · 알림 · 일기 상세가 모두 여기로 온다.
 *
 * **옆으로 넘겨 지난 편지를 본다**(2026-10-27 사용자 요청). 목록(`GET /letters`)의 날짜를 오래된 것부터
 * 왼쪽에 깔고 연 날짜에서 시작한다 — 오른쪽으로 밀면 지난 편지다. 내용은 그 칸에 왔을 때 한 통씩
 * 불러온다(`GET /letters/{date}` · 못 만든 편지면 서버가 그 자리에서 만들어 최대 8초). 양옆 칸은 미리
 * 불러 두고, 받은 편지는 store 에 남겨 다시 열 때 바로 그린다.
 *
 * 연 편지는 그때 열람으로 남긴다. 실패는 한 줄로만 말한다 — 닫았다 다시 열면 다시 불러온다.
 */
type Page = { status: "loading" } | { status: "failed" } | { status: "ready"; letter: Letter };

const SOURCES = ["notification", "home_icon", "diary_detail"] as const;
type Source = (typeof SOURCES)[number];

export default function LetterScreen() {
  const params = useLocalSearchParams<{ date: string; source?: string }>();
  const date = params.date;
  const source: Source = SOURCES.find((s) => s === params.source) ?? "home_icon";
  const { width } = useWindowDimensions();
  const nickname = useProfile((s) => s.nickname);
  const schedules = useDay((s) => s.schedules);
  const summaries = useLetters((s) => s.summaries);

  /** 목록을 한 번 물어본 뒤에 칸을 깐다 — 깔고 나서 칸이 늘면 연 자리가 밀린다 */
  const [listAsked, setListAsked] = useState(summaries != null);
  useEffect(() => {
    if (listAsked) return;
    void useLetters
      .getState()
      .refresh()
      .finally(() => setListAsked(true));
  }, [listAsked]);

  const dates = useMemo(() => {
    const known = (summaries ?? []).map((s) => s.date);
    return [...new Set([...known, date])].sort();
    // 칸은 처음 깐 그대로 둔다 — 열람으로 목록이 바뀌어도 넘기던 자리가 흔들리지 않게
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listAsked, date]);
  /** 지금 보는 칸의 날짜 — 번호로 들면 칸을 깐 뒤 첫 렌더에서 엉뚱한 날짜를 부른다 */
  const [current, setCurrent] = useState(date);

  const kept = useLetters((s) => s.letters);
  /** 못 불러온 날짜 — 남겨 둔 편지도 없을 때만 한 줄을 띄운다 */
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const openedAt = useRef(clock.now().getTime());
  /** 이번에 연 화면에서 부른 날짜 — 날짜마다 한 번만 부른다 */
  const requested = useRef(new Set<string>());
  /** 열람으로 남긴 날짜 */
  const marked = useRef(new Set<string>());

  // 지금 칸과 **양옆 칸**을 부른다 — 넘기는 동작이 멈춘 뒤에 부르면 그사이 빈 칸이 보인다.
  // 남겨 둔 편지가 있으면 그것을 먼저 그리고, 새로 받은 것으로 바꿔 끼운다
  useEffect(() => {
    if (!listAsked) return;
    const at = dates.indexOf(current);
    for (const day of [current, dates[at - 1], dates[at + 1]]) {
      if (day == null || requested.current.has(day)) continue;
      requested.current.add(day);
      void fetchLetter(day).then((result) => {
        if (result.ok) useLetters.getState().keep(result.data);
        else setFailed((f) => new Set(f).add(day));
      });
    }
  }, [listAsked, dates, current]);

  // 열람은 **보고 있는 칸**만 — 미리 불러온 옆 칸은 연 것이 아니다
  const shown = kept[current];
  useEffect(() => {
    if (shown == null || marked.current.has(shown.date)) return;
    marked.current.add(shown.date);
    useLetters.getState().markOpened(shown);
    if (shown.date !== date) return;
    track("letter_opened", {
      source,
      status: shown.status.toLowerCase() as "ready" | "fallback" | "quiet",
      wait_ms: clock.now().getTime() - openedAt.current,
      days_after: daysAfterBucket(shown.date, clock.today()),
    });
  }, [shown, date, source]);

  const pageOf = (day: string): Page => {
    const letter = kept[day];
    if (letter != null) return { status: "ready", letter };
    return failed.has(day) ? { status: "failed" } : { status: "loading" };
  };

  const pager = useRef<FlatList<string>>(null);
  const at = dates.indexOf(current);
  const older = at > 0 ? dates[at - 1] : undefined;
  const newer = at >= 0 && at < dates.length - 1 ? dates[at + 1] : undefined;
  // 버튼으로 넘길 때는 넘기기가 끝나는 신호가 오지 않을 수 있어 지금 칸을 바로 바꾼다
  const turnTo = (day: string) => {
    pager.current?.scrollToIndex({ index: dates.indexOf(day), animated: true });
    setCurrent(day);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  return (
    <Screen grid={false} backdrop={<TabPaperBackground tab="홈" />}>
      {/* 홈에서 여는 편지라 홈과 같은 종이 질감이다(2026-11-10 · 옛 모눈을 걷었다) */}
      <TopNavigation leading="close" onLeadingPress={close} />
      {!listAsked ? (
        <Writing />
      ) : (
        <>
          <FlatList
            ref={pager}
            style={styles.pager}
            data={dates}
            keyExtractor={(d) => d}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.max(0, dates.indexOf(date))}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(e) => {
              const next = dates[Math.round(e.nativeEvent.contentOffset.x / width)];
              if (next != null) setCurrent(next);
            }}
            windowSize={3}
            renderItem={({ item }) => (
              <View style={{ width }}>
                <LetterPage
                  page={pageOf(item)}
                  nickname={nickname}
                  choices={whenChoices(clock.now(), clock.today(), schedules)}
                  onChanged={useLetters.getState().keep}
                />
              </View>
            )}
          />
          {/* 옆으로 넘길 수 있다는 걸 보이는 손잡이 — 눌러도 넘어간다(2026-10-27 사용자 요청).
            끝에서는 그쪽 버튼을 비워 둔다 */}
          {dates.length > 1 ? (
            <View style={styles.turner}>
              {older != null ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="지난 편지"
                  onPress={() => turnTo(older)}
                  hitSlop={8}
                  style={styles.turn}
                >
                  <Icon name="chevron-left" size={20} color={labelColor.neutral} />
                  <Text variant="label1" color={labelColor.neutral}>
                    지난 편지
                  </Text>
                </Pressable>
              ) : (
                <View />
              )}
              {newer != null ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="다음 편지"
                  onPress={() => turnTo(newer)}
                  hitSlop={8}
                  style={styles.turn}
                >
                  <Text variant="label1" color={labelColor.neutral}>
                    다음 편지
                  </Text>
                  <Icon name="chevron-right" size={20} color={labelColor.neutral} />
                </Pressable>
              ) : (
                <View />
              )}
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function LetterPage({
  page,
  nickname,
  choices,
  onChanged,
}: {
  page: Page;
  nickname: string;
  choices: readonly WhenChoice[];
  onChanged: (letter: Letter) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** 기기에 든 카드는 옛것일 수 있다(다른 기기에서 체크) — 서버가 409 로 막으면 그때부터 잠근다 */
  const [refused, setRefused] = useState(false);
  const letterDate = page.status === "ready" ? page.letter.date : null;
  // 바람카드가 「했어요」면 고른 일이 고정된다(편지 PRD 14) — 서버도 같은 기준으로 막는다
  const cardDone = useDiary(
    (s) =>
      letterDate != null && actionCardOnDate(s.diaries, s.actionCards, letterDate)?.done === true,
  );

  if (page.status === "loading") return <Writing />;
  if (page.status === "failed") {
    return (
      <View style={styles.center}>
        <Text variant="body2" color={labelColor.alternative}>
          편지를 불러오지 못했어요
        </Text>
      </View>
    );
  }
  const { letter } = page;
  const chosen = letter.actions.find((a) => a.chosen) ?? null;

  const save = async (position: number | null, when: WhenChoice | null) => {
    setSaving(true);
    setError(null);
    const next = await pickLetterAction(letter, position, when);
    setSaving(false);
    if (next === "locked") {
      setRefused(true);
      return;
    }
    if (next == null) {
      setError("저장하지 못했어요. 잠시 뒤 다시 골라 주세요.");
      return;
    }
    onChanged(next);
    const action = next.actions.find((a) => a.chosen);
    if (action != null && when != null) {
      track("letter_action_chosen", {
        position: action.position,
        source: action.source.toLowerCase() as "catalog" | "fallback",
        when: when.kind,
        changed: chosen?.whenLabel != null,
      });
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LetterPaper
        letter={letter}
        nickname={nickname}
        choices={choices}
        saving={saving}
        locked={cardDone || refused}
        error={error}
        // 골랐던 것을 다시 누르면 풀린다. 다른 것을 누르면 「언제」를 새로 고른다
        onPickAction={(position) =>
          void save(chosen?.position === position ? null : position, null)
        }
        onPickWhen={(when) => chosen != null && void save(chosen.position, when)}
      />
    </ScrollView>
  );
}

/** 불러오는 중 — 아직 못 만든 편지는 서버가 그 자리에서 쓰는 동안이다(최대 8초) */
function Writing() {
  return (
    <View style={styles.center}>
      <Baba size={88} />
      <Text variant="body2" color={labelColor.neutral}>
        바바가 편지를 마무리하고 있어요
      </Text>
      <Spinner />
    </View>
  );
}

const styles = StyleSheet.create({
  pager: { marginHorizontal: -layout.screenPadding },
  turner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: layout.minTouch,
    paddingVertical: space.xs,
  },
  turn: { flexDirection: "row", alignItems: "center", gap: space.xs2, minHeight: layout.minTouch },
  content: {
    paddingHorizontal: layout.screenPadding,
    // 반쯤 걸친 날짜 테이프가 잘리지 않게
    paddingTop: space.xl2,
    paddingBottom: space.xl3,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.md },
});
