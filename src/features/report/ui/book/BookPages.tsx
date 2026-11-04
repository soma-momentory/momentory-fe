import { useEffect, useState, type ReactNode } from "react";
import {
  Animated,
  Easing,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Text } from "@/components/ds";
import { REST_PHOTOS } from "@/components/rest/RestPolaroid";
import { MoodMark } from "@/components/rest/scene/MoodMark";
import { homeV2, reportBook, restMood } from "@/design/ds";
import { emotionName } from "@/features/emotion/model/emotion";
import { keepWords } from "@/features/letter/model/letter";
import type { BookDone, BookRest, WeeklyBook } from "@/features/report/data/weeklyBookApi";
import { closingLines, weekdayOf, type BookPage } from "@/features/report/model/weeklyBook";
import { REST_CONTENTS, type RestContentId } from "@/features/rest/model/contents";
import {
  REST_MOODS,
  restMoodLabel,
  type RestMood,
  type RestRecordContent,
} from "@/features/rest/model/restRecord";

import { BabaOnRug, Bubble, CutPaper, hand, PebbleSticker, Ruled } from "./parts";

const { color } = reportBook;
const ink = homeV2.color.ink;
const muted = homeV2.color.muted;

const CONTENT_IDS: Record<RestRecordContent, RestContentId> = {
  sense_pond: "sensePond",
  worry_box: "worryBox",
  treasure_box: "treasureBox",
  body_release: "bodyRelease",
  meditation: "meditation",
  wish: "wish",
};
const restName = (content: RestRecordContent) =>
  REST_CONTENTS.find((c) => c.id === CONTENT_IDS[content])?.title ?? "";

/** 많이 쓴 세 곳만 줄로 둔다 — 쉼터가 늘어도 한 장에 맞게. 제목과 막대는 전부 센다 */
const REST_ROWS = 3;
const REST_MARKS = 4;
/** 두 번 이하면 막대와 범례가 사실보다 크게 말한다 — 문장과 줄만 둔다 */
const REST_BAR_MIN = 3;
const WORD_JOINER = "⁠";
const MOOD_COLOR: Record<RestMood, string> = {
  better: restMood.sun,
  same: restMood.face,
  unsure: restMood.cloud,
};
const MOOD_ORDER = ["better", "same", "unsure"] as const;

/**
 * 쪽 높이에 맞춘 크기. 작은 폰에 맞춘 값 그대로면 큰 폰에서 쪽의 절반 이상이 빈다.
 * 글자는 손글씨 최소 14(`DESIGN.md`)를 지킨다.
 */
export type PageSize = "compact" | "normal" | "roomy";
export const pageSizeOf = (openHeight: number): PageSize =>
  openHeight >= 600 ? "roomy" : openHeight < 540 ? "compact" : "normal";

const SIZES = {
  compact: {
    review: [18, 28],
    quote: [20, 32],
    wordsGap: 22,
    donut: 112,
    donutStroke: 22,
    row: 3,
    bar: 76,
  },
  normal: {
    review: [18, 28],
    quote: [22, 36],
    wordsGap: 30,
    donut: 140,
    donutStroke: 26,
    row: 5,
    bar: 96,
  },
  roomy: {
    review: [20, 32],
    quote: [24, 40],
    wordsGap: 40,
    donut: 140,
    donutStroke: 26,
    row: 8,
    bar: 132,
  },
} as const;

type PageProps = { book: WeeklyBook; size: PageSize };

export function BookPageBody({
  page,
  book,
  size,
  active,
  reduceMotion,
}: PageProps & { page: BookPage; active: boolean; reduceMotion: boolean }) {
  if (page === "closing")
    return <Closing book={book} active={active} reduceMotion={reduceMotion} />;
  return (
    <PageScroll>
      {page === "review" ? <Review book={book} size={size} /> : null}
      {page === "words" ? <Words book={book} size={size} /> : null}
      {page === "feelEvents" ? <FeelEvents book={book} size={size} /> : null}
      {page === "okMoments" ? <OkMoments book={book} /> : null}
      {page === "restMoods" ? <RestMoods rest={book.rest} size={size} /> : null}
      {page === "done" ? <Done done={book.done} size={size} hard={book.tone === "HARD"} /> : null}
    </PageScroll>
  );
}

const BABA_ROOM = 112;
const FADE_HEIGHT = 28;

/**
 * 장의 내용. 스크롤 막대를 숨기고 옆으로 넘기는 화면이라 세로로 더 있는 줄 모른다 — 넘칠 때만 아래를 흐려 알린다.
 * 바바는 내용 밖에 앉는다: 자리가 남을 때만 그려서, 잘리거나 글을 밀어내지 않는다.
 */
function PageScroll({ children }: { children: ReactNode }) {
  const [viewHeight, setViewHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [offset, setOffset] = useState(0);
  const more = contentHeight > viewHeight + 4 && offset + viewHeight < contentHeight - 4;
  return (
    <View style={styles.scroll}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={64}
        onLayout={(e) => setViewHeight(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, height) => setContentHeight(height)}
        onScroll={(e) => setOffset(e.nativeEvent.contentOffset.y)}
      >
        {children}
      </ScrollView>
      {viewHeight > 0 && contentHeight + BABA_ROOM <= viewHeight ? (
        <View testID="book-corner-baba" style={styles.babaCorner} pointerEvents="none">
          <BabaOnRug width={84} />
        </View>
      ) : null}
      {more ? (
        <View testID="book-more" pointerEvents="none" style={styles.fade}>
          <Svg width="100%" height={FADE_HEIGHT + 1}>
            <Defs>
              <LinearGradient id="book-fade" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color.page} stopOpacity={0} />
                <Stop offset="1" stopColor={color.page} stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height={FADE_HEIGHT + 1} fill="url(#book-fade)" />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}

/**
 * 위기 상담 번호 — 다시 입력하지 않게 눌러서 바로 건다. 이 장의 주 행동이라 첫 번호는 초록 면으로 둔다.
 * 번호는 서버 문구의 끝에서 뽑는다(「자살예방 상담전화 109」).
 */
function HelpLines({ lines }: { lines: readonly string[] }) {
  return (
    <View style={styles.help}>
      {lines.map((line, i) => {
        const number = /[\d-]+$/.exec(line)?.[0];
        const name = number == null ? line : line.slice(0, -number.length).trim();
        const main = i === 0;
        const textColor = main ? homeV2.color.white : ink;
        return (
          <Pressable
            key={line}
            testID="book-help-line"
            accessibilityRole="link"
            accessibilityLabel={`${line} 전화 걸기`}
            disabled={number == null}
            onPress={() => {
              if (number != null) void Linking.openURL(`tel:${number}`);
            }}
            style={styles.helpLine}
          >
            <CutPaper
              fill={main ? color.green : color.card}
              stroke={main ? undefined : color.green}
            />
            <View style={styles.helpFace}>
              <View style={styles.shrink}>
                <Text style={hand(15, 20)} color={textColor}>
                  {keepWords(name)}
                </Text>
                {number != null ? (
                  <Text style={hand(20, 26)} color={textColor}>
                    {number}
                  </Text>
                ) : null}
              </View>
              {number != null ? (
                <Text style={hand(16, 22)} color={textColor}>
                  전화 걸기
                </Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function Review({ book, size }: PageProps) {
  const [fontSize, lineHeight] = SIZES[size].review;
  return (
    <>
      <Ruled size={fontSize} lineHeight={lineHeight} testID="book-review">
        {keepWords(book.review ?? "")}
      </Ruled>
      {book.goodWords != null ? (
        <View style={styles.goodWords}>
          <Ruled size={fontSize} lineHeight={lineHeight} textColor={color.green}>
            {keepWords(book.goodWords)}
          </Ruled>
        </View>
      ) : null}
      {book.helpResources.length > 0 ? <HelpLines lines={book.helpResources} /> : null}
    </>
  );
}

function DayTag({ date }: { date: string }) {
  return (
    <View style={styles.dayTag}>
      <Text style={hand(15, 24)} color={ink}>
        {weekdayOf(date)}
      </Text>
    </View>
  );
}

function Words({ book, size }: PageProps) {
  const { quote, wordsGap } = SIZES[size];
  return (
    <>
      <Text style={hand(15, 20)} color={muted}>
        {keepWords("밤 회고와 일기에 직접 쓴 문장이에요")}
      </Text>
      <View style={[styles.words, { gap: wordsGap }]}>
        {book.words.map((word) => (
          <View key={word.date} style={styles.word}>
            <View style={styles.wordHead}>
              <DayTag date={word.date} />
              {word.label != null ? (
                <Text style={[hand(15, 20), styles.shrink]} color={muted}>
                  {keepWords(word.label)}
                </Text>
              ) : null}
            </View>
            <Ruled size={quote[0]} lineHeight={quote[1]}>
              {/* 따옴표가 혼자 다음 줄로 떨어지지 않게 낱말에 붙인다. 크기를 키우면 줄 간격이 흔들린다 */}
              <Text style={hand(quote[0], quote[1])} color={color.honey}>
                “{WORD_JOINER}
              </Text>
              {keepWords(word.text)}
              <Text style={hand(quote[0], quote[1])} color={color.honey}>
                {WORD_JOINER}”
              </Text>
            </Ruled>
          </View>
        ))}
      </View>
    </>
  );
}

const DONUT_GAP = 1.2;

/** 감정 도넛 — 횟수로만 말한다(%를 쓰지 않는다 · `DESIGN.md` 「리포트」 2026-11-04) */
function Donut({ book, size }: PageProps) {
  const { donut, donutStroke } = SIZES[size];
  const total = book.emotions.reduce((sum, e) => sum + e.count, 0);
  const radius = (donut - donutStroke) / 2;
  const round = 2 * Math.PI * radius;
  const gap = book.emotions.length > 1 ? DONUT_GAP : 0;
  const segments = book.emotions.map((e, i) => ({
    ...e,
    length: (e.count / total) * round,
    offset: (book.emotions.slice(0, i).reduce((sum, p) => sum + p.count, 0) / total) * round,
  }));
  return (
    <View
      style={[styles.donut, { width: donut, height: donut }]}
      accessibilityRole="image"
      accessibilityLabel={book.emotions
        .map((e) => `${emotionName(e.emotion)} ${e.count}번`)
        .join(", ")}
    >
      <Svg width={donut} height={donut}>
        {segments.map((e) => (
          <Circle
            key={e.emotion}
            cx={donut / 2}
            cy={donut / 2}
            r={radius}
            fill="none"
            stroke={reportBook.pebble[e.emotion]}
            strokeWidth={donutStroke}
            strokeDasharray={`${Math.max(e.length - gap, 0.5)} ${round}`}
            strokeDashoffset={-e.offset}
            rotation={-90}
            origin={`${donut / 2}, ${donut / 2}`}
          />
        ))}
      </Svg>
      {book.tone === "HARD" ? null : (
        <View style={styles.donutCenter} pointerEvents="none">
          <Text style={hand(30, 36)} color={ink}>
            {total}
          </Text>
          <Text style={hand(16, 36)} color={ink}>
            번
          </Text>
        </View>
      )}
    </View>
  );
}

function FeelEvents({ book, size }: PageProps) {
  // 줄이 많은 주는 한 쪽에 들어가게 줄 여백을 줄인다
  const paddingVertical = book.emotions.length >= 6 ? 2 : SIZES[size].row;
  // 힘든 주에 힘든 감정을 세어 보이면 점수표처럼 읽힌다 — 이름과 그때 있었던 일만 둔다
  const hard = book.tone === "HARD";
  return (
    <>
      <Ruled size={20} lineHeight={28}>
        {"이 주에는\n이런 감정들을 느꼈어요"}
      </Ruled>
      <Donut book={book} size={size} />
      <View>
        {book.emotions.map((e, i) => (
          <View
            key={e.emotion}
            style={[styles.row, { paddingVertical }, i > 0 ? styles.rowLine : null]}
          >
            <PebbleSticker id={e.emotion} size={28} />
            <Text style={hand(17, 22)} color={ink}>
              {emotionName(e.emotion)}
            </Text>
            {hard ? null : (
              <Text style={hand(15, 22)} color={muted}>
                {e.count}번
              </Text>
            )}
            <Text style={[hand(16, 22), styles.rowEnd]} color={ink} numberOfLines={2}>
              {keepWords(e.events.join(", "))}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

const WEEK_INDEXES = [0, 1, 2, 3, 4, 5, 6] as const;

function OkMoments({ book }: { book: WeeklyBook }) {
  const goodDates = new Set(book.okMoments.map((m) => m.date));
  return (
    <>
      <View style={styles.strip}>
        {WEEK_INDEXES.map((i) => {
          const day = book.days[i];
          if (day == null) return null;
          const good = goodDates.has(day.date);
          return (
            <View key={day.date} style={styles.stripDay}>
              <View style={styles.stripMark}>
                {good ? (
                  <PebbleSticker id={day.emotion} size={32} />
                ) : day.written ? (
                  <View style={styles.faded}>
                    <PebbleSticker id={day.emotion} size={20} />
                  </View>
                ) : (
                  <View style={styles.noDiary} />
                )}
              </View>
              <Text style={hand(14, 18)} color={good ? ink : muted}>
                {weekdayOf(day.date)}
              </Text>
            </View>
          );
        })}
      </View>
      <Ruled size={20} lineHeight={28} testID="book-ok-line">
        {keepWords(book.okLine ?? "이런 날 괜찮았어요")}
      </Ruled>
      <View style={styles.okList}>
        {book.okMoments.map((m, i) => (
          <View
            key={m.date}
            style={[styles.okCard, { transform: [{ rotate: i % 2 === 0 ? "-0.5deg" : "0.4deg" }] }]}
          >
            <CutPaper fill={color.card} stroke={color.cardBorder} />
            <View style={styles.okHead}>
              <PebbleSticker id={m.emotion} size={34} />
              <View style={styles.shrink}>
                {m.event != null ? (
                  <Text style={hand(20, 25)} color={ink}>
                    {keepWords(m.event)}
                  </Text>
                ) : null}
                <Text style={hand(15, 19)} color={muted}>
                  {weekdayOf(m.date)}요일 · {emotionName(m.emotion)}
                </Text>
              </View>
            </View>
            {m.tasks.length > 0 ? (
              <View style={styles.okMore}>
                <Text style={[hand(16, 22), styles.shrink]} color={ink}>
                  <Text style={hand(15, 22)} color={muted}>
                    이날 한 일{"  "}
                  </Text>
                  {keepWords(m.tasks.join(", "))}
                </Text>
              </View>
            ) : null}
            {m.betterRest != null ? (
              <View style={styles.okMore}>
                <MoodMark mood="better" size={18} />
                <Text style={[hand(16, 22), styles.shrink]} color={ink}>
                  {keepWords(`${restName(m.betterRest)}, 나아졌다고 골랐어요`)}
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </>
  );
}

/** 어디가 맞았는지 말해 줄 때만 쓴다 — 쉼터 전체 합은 쓸 곳 없는 성적처럼 읽힌다 */
function restSoFarLine(rest: BookRest): string | null {
  const soFar = rest.soFar;
  if (soFar?.content == null) return null;
  return `지금까지 ${restName(soFar.content)} ${soFar.answered}번 중 ${soFar.better}번 나아졌다고 골랐어요`;
}

function RestMoods({ rest, size }: { rest: BookRest; size: PageSize }) {
  const shown = REST_MOODS.filter((m) => rest[m.id] > 0);
  const others = rest.places.slice(REST_ROWS);
  const soFar = restSoFarLine(rest);
  const paddingVertical = SIZES[size].row;
  // 한 목록 안에서는 읽는 법을 하나로 — 줄마다 표식과 숫자가 섞이면 해 두 개의 뜻을 새로 묻게 된다
  const counted = rest.places.some((p) => p.better + p.same + p.unsure > REST_MARKS);
  // 막대와 범례가 없으면 표식의 뜻을 알 길이 없다 — 표식 옆에 고른 말을 적는다
  const named = rest.total < REST_BAR_MIN;
  return (
    <>
      <Ruled size={20} lineHeight={28} testID="book-rest-head">
        {rest.better > 0
          ? `쉼터 ${rest.total}번 중 ${rest.better}번은\n나아졌다고 골랐어요`
          : `쉼터에 ${rest.total}번 다녀왔어요`}
      </Ruled>
      {shown.length > 0 && rest.total >= REST_BAR_MIN ? (
        <>
          <View
            testID="book-mood-bar"
            style={styles.moodBar}
            accessibilityRole="image"
            accessibilityLabel={shown.map((m) => `${m.label} ${rest[m.id]}번`).join(", ")}
          >
            {shown.map((m) => (
              <View key={m.id} style={{ flex: rest[m.id], backgroundColor: MOOD_COLOR[m.id] }} />
            ))}
          </View>
          <View style={size === "compact" ? styles.moodKey : styles.moodKeyStack}>
            {shown.map((m) => (
              <View key={m.id} style={styles.moodKeyItem}>
                <MoodMark mood={m.id} size={18} />
                <Text style={hand(15, 22)} color={ink}>
                  {m.label} {rest[m.id]}번
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <View>
        {rest.places.slice(0, REST_ROWS).map((place, i) => (
          <View
            key={place.content}
            style={[styles.row, { paddingVertical }, i > 0 ? styles.rowLine : null]}
          >
            <Image source={REST_PHOTOS[CONTENT_IDS[place.content]]} style={styles.restPhoto} />
            <Text style={[hand(17, 22), styles.shrink]} color={ink}>
              {keepWords(restName(place.content))}
            </Text>
            <View style={styles.rowMarks}>
              {counted
                ? MOOD_ORDER.filter((m) => place[m] > 0).map((m) => (
                    <View key={m} style={styles.markCount}>
                      <MoodMark mood={m} size={22} />
                      <Text style={hand(15, 22)} color={ink}>
                        {place[m]}
                      </Text>
                    </View>
                  ))
                : MOOD_ORDER.flatMap((m) =>
                    Array.from({ length: place[m] }, (_, n) => (
                      <View key={`${m}${n}`} style={styles.markCount}>
                        <MoodMark mood={m} size={24} />
                        {named ? (
                          <Text style={hand(15, 22)} color={ink}>
                            {restMoodLabel(m)}
                          </Text>
                        ) : null}
                      </View>
                    )),
                  )}
            </View>
          </View>
        ))}
      </View>
      {others.length > 0 ? (
        <Text style={hand(15, 22)} color={muted}>
          그 외 {others.length}곳 · {others.reduce((sum, p) => sum + p.total, 0)}번
        </Text>
      ) : null}
      {soFar != null ? (
        <View style={styles.soFar}>
          <MoodMark mood="better" size={20} />
          <View style={styles.grow}>
            <Ruled size={18} lineHeight={28} textColor={color.green} testID="book-rest-so-far">
              {keepWords(soFar)}
            </Ruled>
          </View>
        </View>
      ) : null}
    </>
  );
}

const DAY_NAMES = "일월화수목금토";

/** 막대 높이의 기준 — 하루 2개인 주가 하루 4개인 주와 같은 높이로 보이지 않게 낮은 주는 4를 기준으로 둔다 */
const BAR_SCALE_MIN = 4;

function Done({ done, size, hard }: { done: BookDone; size: PageSize; hard: boolean }) {
  const max = Math.max(BAR_SCALE_MIN, ...done.perDay);
  const barMax = SIZES[size].bar;
  const paddingVertical = SIZES[size].row;
  return (
    <>
      {/* 힘든 주에 요일별 막대는 못 한 날을 먼저 보여 준다 — 한 문장으로 말한다 */}
      {hard ? (
        <Ruled size={20} lineHeight={28} testID="book-done-line">
          {`일정 ${done.completedCount}개를 마쳤어요`}
        </Ruled>
      ) : (
        <>
          <View style={styles.doneHead}>
            <Text style={hand(50, 54)} color={color.honeyInk} testID="book-done-count">
              {/* 손글씨 글꼴의 1 은 옆 공간이 넓어 붙여 준다 */}
              {[...String(done.completedCount)].map((digit, i) => (
                <Text
                  key={i}
                  style={[
                    hand(50, 54),
                    digit === "1" ? styles.digitOne : styles.digit,
                    i === 0 && digit === "1" ? styles.digitFirstOne : null,
                  ]}
                  color={color.honeyInk}
                >
                  {digit}
                </Text>
              ))}
            </Text>
            <Text style={hand(19, 24)} color={ink}>
              개의 일정을 마쳤어요
            </Text>
          </View>
          <View
            style={styles.bars}
            accessibilityRole="image"
            accessibilityLabel={done.perDay.map((n, i) => `${DAY_NAMES[i]} ${n}개`).join(", ")}
          >
            {done.perDay.map((n, i) => (
              <View key={i} style={styles.barCol}>
                {n > 0 ? (
                  <>
                    <Text style={hand(14, 18)} color={muted}>
                      {n}
                    </Text>
                    <View style={[styles.bar, { height: (n / max) * barMax }]} />
                  </>
                ) : null}
                <Text style={[hand(14, 20), styles.barLabel]} color={n > 0 ? ink : muted}>
                  {DAY_NAMES[i]}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
      {done.linked.length > 0 ? (
        <View>
          <Text style={hand(15, 22)} color={muted}>
            이 중 일기에 쓴 일
          </Text>
          {done.linked.map((task) => (
            <View
              key={`${task.date}${task.title}`}
              style={[styles.row, { paddingVertical }, styles.rowLine]}
            >
              <DayTag date={task.date} />
              <Text style={[hand(17, 22), styles.grow]} color={ink}>
                {keepWords(task.title)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

function Closing({
  book,
  active,
  reduceMotion,
}: {
  book: WeeklyBook;
  active: boolean;
  reduceMotion: boolean;
}) {
  const [first, second] = closingLines(book);
  const [hop] = useState(() => new Animated.Value(0));
  // 마지막 장에 닿으면 바바가 한 번 폴짝 뛴다. 위기 주에는 뛰지 않는다
  const hops = active && !reduceMotion && book.tone !== "CRISIS";
  useEffect(() => {
    if (!hops) return;
    Animated.sequence([
      Animated.delay(250),
      Animated.timing(hop, {
        toValue: -16,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(hop, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(hop, {
        toValue: -6,
        duration: 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(hop, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [hops, hop]);
  return (
    <View style={styles.closing}>
      <Bubble
        size={book.tone === "CRISIS" ? 16 : 18}
        lineHeight={book.tone === "CRISIS" ? 24 : 27}
        testID="book-closing"
      >
        {keepWords(`${first}\n${second}`)}
      </Bubble>
      <Animated.View style={[styles.closingBaba, { transform: [{ translateY: hop }] }]}>
        <BabaOnRug width={130} />
      </Animated.View>
      {book.helpResources.length > 0 ? <HelpLines lines={book.helpResources} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  page: {
    paddingTop: 4,
    paddingBottom: 12,
    paddingLeft: 32,
    paddingRight: 14,
    gap: 9,
  },
  shrink: { flexShrink: 1 },
  grow: { flex: 1 },
  goodWords: { marginTop: 11 },
  babaCorner: { position: "absolute", right: 22, bottom: 2 },
  fade: { position: "absolute", left: 0, right: 0, bottom: -1, height: FADE_HEIGHT + 1 },
  help: { gap: 8, marginTop: 12 },
  helpLine: { minHeight: 60, paddingHorizontal: 16, justifyContent: "center" },
  helpFace: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6 },
  words: { marginTop: 9 },
  word: { gap: 8 },
  wordHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayTag: {
    minWidth: 24,
    minHeight: 24,
    borderRadius: 6,
    alignItems: "center",
    backgroundColor: color.tape,
  },
  donut: { alignSelf: "center", marginVertical: 4 },
  donutCenter: {
    ...StyleSheet.absoluteFill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 },
  rowLine: { borderTopWidth: 1, borderTopColor: color.rule },
  rowEnd: { flex: 1, textAlign: "right" },
  rowMarks: { flexDirection: "row", alignItems: "center", gap: 3, marginLeft: "auto" },
  markCount: { flexDirection: "row", alignItems: "center", gap: 2 },
  strip: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  stripDay: { alignItems: "center", gap: 2 },
  stripMark: { width: 34, height: 36, alignItems: "center", justifyContent: "center" },
  faded: { opacity: 0.3 },
  noDiary: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: color.empty },
  okList: { gap: 14, marginTop: 5 },
  okCard: { paddingTop: 12, paddingBottom: 10, paddingHorizontal: 14 },
  okHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  okMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  moodBar: {
    flexDirection: "row",
    height: 14,
    gap: 2,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: 4,
  },
  moodKey: { flexDirection: "row", flexWrap: "wrap", gap: 2, columnGap: 6 },
  moodKeyStack: { gap: 2 },
  moodKeyItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  restPhoto: {
    width: 46,
    height: 36,
    borderWidth: 2,
    borderColor: homeV2.color.white,
    borderRadius: 2,
    boxShadow: reportBook.shadow.photo,
    transform: [{ rotate: "-2deg" }],
  },
  soFar: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 7 },
  doneHead: { flexDirection: "row", alignItems: "baseline", gap: 6, marginTop: 8 },
  digit: { letterSpacing: -1 },
  digitOne: { letterSpacing: -8 },
  digitFirstOne: { marginLeft: -7 },
  bars: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  barCol: { alignItems: "center", flex: 1 },
  bar: { width: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: color.honey },
  barLabel: {
    alignSelf: "stretch",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  closing: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  closingBaba: { alignSelf: "center", marginTop: -18 },
});
