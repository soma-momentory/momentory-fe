import { Image, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { Icon, Text } from "@/components/ds";
import { REST_PHOTOS } from "@/components/rest/RestPolaroid";
import { MoodMark } from "@/components/rest/scene/MoodMark";
import { emotion as emotionColor, homeV2, reportBook, restMood } from "@/design/ds";
import { emotionName } from "@/features/emotion/model/emotion";
import { keepWords } from "@/features/letter/model/letter";
import type { BookDone, BookRest, WeeklyBook } from "@/features/report/data/weeklyBookApi";
import { closingLines, weekdayOf, type BookPage } from "@/features/report/model/weeklyBook";
import { REST_CONTENTS, type RestContentId } from "@/features/rest/model/contents";
import { REST_MOODS, type RestMood, type RestRecordContent } from "@/features/rest/model/restRecord";

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
const MOOD_COLOR: Record<RestMood, string> = {
  better: restMood.sun,
  same: restMood.face,
  unsure: restMood.cloud,
};

export function BookPageBody({ page, book }: { page: BookPage; book: WeeklyBook }) {
  if (page === "closing") return <Closing book={book} />;
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.page}
      showsVerticalScrollIndicator={false}
    >
      {page === "review" ? <Review book={book} /> : null}
      {page === "words" ? <Words book={book} /> : null}
      {page === "feelEvents" ? <FeelEvents book={book} /> : null}
      {page === "okMoments" ? <OkMoments book={book} /> : null}
      {page === "restMoods" ? <RestMoods rest={book.rest} /> : null}
      {page === "done" ? <Done done={book.done} /> : null}
    </ScrollView>
  );
}

function BabaCorner() {
  return (
    <View style={styles.babaCorner}>
      <BabaOnRug width={84} />
    </View>
  );
}

function Review({ book }: { book: WeeklyBook }) {
  return (
    <>
      <Ruled size={18} lineHeight={28} testID="book-review">
        {keepWords(book.review ?? "")}
      </Ruled>
      {book.goodWords != null ? (
        <View style={styles.goodWords}>
          <Ruled size={18} lineHeight={28} textColor={color.green}>
            {keepWords(book.goodWords)}
          </Ruled>
        </View>
      ) : null}
      {book.helpResources.map((line) => (
        <Text key={line} style={hand(16, 24)} color={ink}>
          {keepWords(line)}
        </Text>
      ))}
      <BabaCorner />
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

function Words({ book }: { book: WeeklyBook }) {
  return (
    <>
      <Ruled size={20} lineHeight={28}>
        내가 직접 적은 말이에요
      </Ruled>
      <View style={styles.words}>
        {book.words.map((word) => (
          <View key={word.date} style={styles.word}>
            <View style={styles.wordHead}>
              <DayTag date={word.date} />
              {word.label != null ? (
                <Text style={[hand(15, 20), styles.shrink]} color={muted}>
                  {word.label}
                </Text>
              ) : null}
            </View>
            <Ruled size={22} lineHeight={36}>
              <Text style={hand(30, 36)} color={color.honey}>
                “{" "}
              </Text>
              {keepWords(word.text)}
              <Text style={hand(30, 36)} color={color.honey}>
                {" "}
                ”
              </Text>
            </Ruled>
          </View>
        ))}
      </View>
      <BabaCorner />
    </>
  );
}

const DONUT = { size: 140, stroke: 26, gap: 1.2 } as const;

/** 감정 도넛 — 횟수로만 말한다(%를 쓰지 않는다 · `DESIGN.md` 「리포트」 2026-11-04) */
function Donut({ book }: { book: WeeklyBook }) {
  const total = book.emotions.reduce((sum, e) => sum + e.count, 0);
  const radius = (DONUT.size - DONUT.stroke) / 2;
  const round = 2 * Math.PI * radius;
  const segments = book.emotions.map((e, i) => ({
    ...e,
    length: (e.count / total) * round,
    offset: (book.emotions.slice(0, i).reduce((sum, p) => sum + p.count, 0) / total) * round,
  }));
  return (
    <View
      style={styles.donut}
      accessibilityRole="image"
      accessibilityLabel={book.emotions.map((e) => `${emotionName(e.emotion)} ${e.count}번`).join(", ")}
    >
      <Svg width={DONUT.size} height={DONUT.size}>
        {segments.map((e) => (
          <Circle
            key={e.emotion}
            cx={DONUT.size / 2}
            cy={DONUT.size / 2}
            r={radius}
            fill="none"
            stroke={emotionColor[e.emotion]}
            strokeWidth={DONUT.stroke}
            strokeDasharray={`${Math.max(e.length - DONUT.gap, 0.5)} ${round}`}
            strokeDashoffset={-e.offset}
            rotation={-90}
            origin={`${DONUT.size / 2}, ${DONUT.size / 2}`}
          />
        ))}
      </Svg>
      <View style={styles.donutCenter} pointerEvents="none">
        <Text style={hand(30, 36)} color={ink}>
          {total}
        </Text>
        <Text style={hand(16, 36)} color={ink}>
          번
        </Text>
      </View>
    </View>
  );
}

function FeelEvents({ book }: { book: WeeklyBook }) {
  return (
    <>
      <Ruled size={20} lineHeight={28}>
        {"이 주에는\n이런 감정들을 느꼈어요"}
      </Ruled>
      <Donut book={book} />
      <View>
        {book.emotions.map((e, i) => (
          <View key={e.emotion} style={[styles.row, i > 0 ? styles.rowLine : null]}>
            <PebbleSticker id={e.emotion} size={28} />
            <Text style={hand(17, 22)} color={ink}>
              {emotionName(e.emotion)}
            </Text>
            <Text style={hand(15, 22)} color={muted}>
              {e.count}번
            </Text>
            <Text style={[hand(16, 22), styles.rowEnd]} color={ink} numberOfLines={2}>
              {e.events.join(", ")}
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
                    {m.event}
                  </Text>
                ) : null}
                <Text style={hand(15, 19)} color={muted}>
                  {weekdayOf(m.date)}요일 · {emotionName(m.emotion)}
                </Text>
              </View>
            </View>
            {m.tasks.length > 0 ? (
              <View style={styles.okMore}>
                <Icon name="check" size={16} color={ink} />
                <Text style={[hand(16, 22), styles.shrink]} color={ink}>
                  {m.tasks.join(", ")}
                </Text>
              </View>
            ) : null}
            {m.betterRest != null ? (
              <View style={styles.okMore}>
                <MoodMark mood="better" size={18} />
                <Text style={[hand(16, 22), styles.shrink]} color={ink}>
                  {restName(m.betterRest)}, 나아졌다고 골랐어요
                </Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </>
  );
}

function restSoFarLine(rest: BookRest): string | null {
  const soFar = rest.soFar;
  if (soFar == null) return null;
  const who = soFar.content == null ? "쉼터" : `${restName(soFar.content)}를 하고`;
  return `지금까지 ${who} ${soFar.answered}번 중 ${soFar.better}번 나아졌다고 골랐어요`;
}

function RestMoods({ rest }: { rest: BookRest }) {
  const shown = REST_MOODS.filter((m) => rest[m.id] > 0);
  const others = rest.places.slice(REST_ROWS);
  const soFar = restSoFarLine(rest);
  return (
    <>
      <Ruled size={20} lineHeight={28} testID="book-rest-head">
        {rest.better > 0
          ? `쉼터 ${rest.total}번 중 ${rest.better}번은\n나아졌다고 골랐어요`
          : `쉼터에 ${rest.total}번 다녀왔어요`}
      </Ruled>
      {shown.length > 0 ? (
        <>
          <View
            style={styles.moodBar}
            accessibilityRole="image"
            accessibilityLabel={shown.map((m) => `${m.label} ${rest[m.id]}번`).join(", ")}
          >
            {shown.map((m) => (
              <View key={m.id} style={{ flex: rest[m.id], backgroundColor: MOOD_COLOR[m.id] }} />
            ))}
          </View>
          <View style={styles.moodKey}>
            {shown.map((m) => (
              <View key={m.id} style={styles.moodKeyItem}>
                <MoodMark mood={m.id} size={20} />
                <Text style={hand(15, 22)} color={ink}>
                  {m.label} {rest[m.id]}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
      <View>
        {rest.places.slice(0, REST_ROWS).map((place, i) => (
          <View key={place.content} style={[styles.row, i > 0 ? styles.rowLine : null]}>
            <Image source={REST_PHOTOS[CONTENT_IDS[place.content]]} style={styles.restPhoto} />
            <Text style={[hand(17, 22), styles.shrink]} color={ink}>
              {restName(place.content)}
            </Text>
            <View style={styles.rowMarks}>
              {place.better + place.same + place.unsure <= REST_MARKS
                ? (["better", "same", "unsure"] as const).flatMap((m) =>
                    Array.from({ length: place[m] }, (_, n) => <MoodMark key={`${m}${n}`} mood={m} size={24} />),
                  )
                : (["better", "same", "unsure"] as const)
                    .filter((m) => place[m] > 0)
                    .map((m) => (
                      <View key={m} style={styles.markCount}>
                        <MoodMark mood={m} size={22} />
                        <Text style={hand(15, 22)} color={ink}>
                          {place[m]}
                        </Text>
                      </View>
                    ))}
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
        <Ruled size={16} lineHeight={24}>
          {keepWords(soFar)}
        </Ruled>
      ) : null}
    </>
  );
}

const BAR_MAX_HEIGHT = 96;

function Done({ done }: { done: BookDone }) {
  const max = Math.max(1, ...done.perDay);
  return (
    <>
      <View style={styles.doneHead}>
        <Text style={hand(50, 54)} color={color.honeyInk}>
          {/* 손글씨 글꼴의 1 은 옆 공간이 넓어 붙여 준다 */}
          {[...String(done.completedCount)].map((digit, i) => (
            <Text key={i} style={digit === "1" ? styles.digitOne : styles.digit}>
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
        accessibilityLabel={done.perDay.map((n, i) => `${"일월화수목금토"[i]} ${n}개`).join(", ")}
      >
        {done.perDay.map((n, i) => (
          <View key={i} style={styles.barCol}>
            <View style={[styles.bar, { height: n === 0 ? 2 : (n / max) * BAR_MAX_HEIGHT }]} />
            <Text style={[hand(14, 20), styles.barLabel]} color={ink}>
              {"일월화수목금토"[i]}
            </Text>
          </View>
        ))}
      </View>
      {done.linked.length > 0 ? (
        <View>
          <Text style={hand(15, 22)} color={muted}>
            일기에도 남긴 일
          </Text>
          {done.linked.map((task) => (
            <View key={`${task.date}${task.title}`} style={[styles.row, styles.rowLine]}>
              <DayTag date={task.date} />
              <Text style={[hand(17, 22), styles.shrink]} color={ink}>
                {task.title}
              </Text>
              <Icon name="check" size={16} color={color.green} />
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

function Closing({ book }: { book: WeeklyBook }) {
  const [first, second] = closingLines(book);
  return (
    <View style={styles.closing}>
      <Bubble size={18} lineHeight={27} testID="book-closing">
        {keepWords(`${first}\n${second}`)}
      </Bubble>
      <View style={styles.closingBaba}>
        <BabaOnRug width={130} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  page: { flexGrow: 1, paddingTop: 4, paddingBottom: 26, paddingLeft: 32, paddingRight: 14, gap: 9 },
  shrink: { flexShrink: 1 },
  goodWords: { marginTop: 11 },
  babaCorner: { marginTop: "auto", alignSelf: "flex-end", paddingRight: 8, paddingTop: 2 },
  words: { gap: 30, marginTop: 9 },
  word: { gap: 8 },
  wordHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  dayTag: { width: 24, height: 24, borderRadius: 6, alignItems: "center", backgroundColor: color.tape },
  donut: { alignSelf: "center", width: DONUT.size, height: DONUT.size, marginVertical: 4 },
  donutCenter: { ...StyleSheet.absoluteFill, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36, paddingVertical: 5 },
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
    gap: 5,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: color.rule,
  },
  moodBar: { flexDirection: "row", height: 14, gap: 2, borderRadius: 4, overflow: "hidden", marginTop: 4 },
  moodKey: { flexDirection: "row", flexWrap: "wrap", gap: 2, columnGap: 10 },
  moodKeyItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  restPhoto: {
    width: 46,
    height: 36,
    borderWidth: 2,
    borderColor: homeV2.color.white,
    borderRadius: 2,
    transform: [{ rotate: "-2deg" }],
  },
  doneHead: { flexDirection: "row", alignItems: "baseline", gap: 14, marginTop: 8 },
  digit: { letterSpacing: -1 },
  digitOne: { letterSpacing: -8 },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 6 },
  barCol: { alignItems: "center", flex: 1 },
  bar: { width: 24, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: color.honey },
  barLabel: { alignSelf: "stretch", textAlign: "center", borderTopWidth: 1, borderTopColor: color.rule },
  closing: { flex: 1, justifyContent: "center", paddingHorizontal: 24, paddingBottom: 26 },
  closingBaba: { alignSelf: "center", marginTop: -18 },
});
