import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet, EmotionPebble, Icon, Spinner, Text } from "@/components/ds";
import { MaskingTape } from "@/components/ds/MaskingTape";
import { TabPaperBackground } from "@/components/ds/TabPaperBackground";
import { homeV2, layout, raisedShadow, reportBook } from "@/design/ds";
import type { Diary } from "@/features/diary/model/types";
import { emotionName } from "@/features/emotion/model/emotion";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";
import { keepWords } from "@/features/letter/model/letter";
import {
  BOOK_PAGE_TITLES,
  bookPages,
  diaryButtonLabel,
  weekdayOf,
  type BookPage,
  type WeeklyBook,
  type WeeklyBookStatus,
} from "@/features/report/model/weeklyBook";

import { BookPageBody } from "./BookPages";
import { KraftFace, Leaf, Notebook } from "./Notebook";
import { BabaOnRug, BabaSticker, Bubble, hand, PaperButton, PebbleSticker, TapeTitle } from "./parts";

/**
 * `W1` · 주간 리포트 공책 — 책상 위 스프링 공책 한 권(2026-11-04 시안 v10).
 *
 * 탭바까지 덮어야 해서 `TabScreen` 의 `overlay` 로 화면 전체에 깐다. 덮인 공책은 탭바 위에 작게 비스듬히 놓이고,
 * 펼치면 탭바를 가리며 똑바로 커진다. 위치를 재서 움직이므로 탭바를 없앨 때처럼 공책이 튀지 않는다.
 *
 * 일기가 3일 미만인 주는 표지 한 장이고, 큰 버튼은 그 주 일기로 간다. 일기가 전혀 없으면 빈 공책만 둔다.
 */
type Props = {
  book: WeeklyBook | null;
  status: WeeklyBookStatus;
  /** 그 주의 일기 — 일기가 적은 주의 버튼이 쓴다 */
  diaries: readonly Diary[];
  onOpenPast: () => void;
  onOpenDiary: (id: string) => void;
  onTurn: (page: BookPage | "cover") => void;
};

const OPEN_MS = 550;
const CTA_HEIGHT = 78;
const HINT_HEIGHT = 26;
const TOP_ROW = 44;
const FOOT_HEIGHT = 68;
/** 덮인 공책의 가로세로 비 · 양옆 여백 — 실제 공책처럼 보이는 비율로 묶는다 */
const CLOSED = { aspect: 1.73, sideGap: 80, tilt: "-1.2deg" } as const;
const OPENED = { left: 36, right: 30 } as const;

const rangeOf = (book: WeeklyBook) => {
  const [, sm = "", sd = ""] = book.startDate.split("-").map(Number).map(String);
  const [, em = "", ed = ""] = book.endDate.split("-").map(Number).map(String);
  return {
    label: sm === em ? `${sm}월 ${sd}일 ~ ${ed}일` : `${sm}월 ${sd}일 ~ ${em}월 ${ed}일`,
    field: sm === em ? `${sm}.${sd} ~ ${ed}` : `${sm}.${sd} ~ ${em}.${ed}`,
  };
};

export function WeeklyBookView({ book, status, diaries, onOpenPast, onOpenDiary, onTurn }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [at, setAt] = useState(-1);
  const [sheet, setSheet] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [open] = useState(() => new Animated.Value(0));

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
  }, []);

  const pages = useMemo(() => (book == null ? [] : bookPages(book)), [book]);
  const last = pages.length - 1;
  const go = (next: number) => {
    const target = Math.max(-1, Math.min(last, next));
    if (target === at) return;
    setAt(target);
    onTurn(target < 0 ? "cover" : (pages[target] ?? "cover"));
    if ((target < 0) !== (at < 0)) {
      const toValue = target < 0 ? 0 : 1;
      if (reduceMotion) open.setValue(toValue);
      else
        Animated.timing(open, {
          toValue,
          duration: OPEN_MS,
          easing: Easing.bezier(0.22, 0.8, 0.3, 1),
          useNativeDriver: false,
        }).start();
    }
  };
  // 스크롤을 빼앗지 않도록 응답자를 잡지 않고, 손가락을 뗄 때 움직인 거리만 본다
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const onSwipeEnd = (x: number, y: number) => {
    const start = touchStart.current;
    if (start == null || at < 0) return;
    const dx = x - start.x;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(y - start.y) * 1.5) {
      go(Math.max(0, at + (dx < 0 ? 1 : -1)));
    }
  };

  const navHeight = layout.tabBar + Math.max(insets.bottom, layout.minBottomInset);
  const hasHint = book != null && !book.detailed && book.diaryCount > 0;
  const hasCta = book != null && book.diaryCount > 0;
  const closedTop = insets.top + TOP_ROW + 10;
  const closedBottom = navHeight + (hasCta ? CTA_HEIGHT : 0) + (hasHint ? HINT_HEIGHT : 0) + 14;
  const roomHeight = height - closedTop - closedBottom;
  const closedWidth = Math.min(width - CLOSED.sideGap, roomHeight / CLOSED.aspect);
  const closedHeight = Math.min(roomHeight, closedWidth * CLOSED.aspect);
  const openTop = insets.top + TOP_ROW + 6;
  const openHeight = height - openTop - FOOT_HEIGHT - Math.max(insets.bottom, 8);
  const between = (from: number, to: number) => open.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const bookBox = {
    left: between((width - closedWidth) / 2 + 3, OPENED.left),
    top: between(closedTop + (roomHeight - closedHeight) / 2, openTop),
    width: between(closedWidth, width - OPENED.left - OPENED.right),
    height: between(closedHeight, openHeight),
    transform: [{ rotate: open.interpolate({ inputRange: [0, 1], outputRange: [CLOSED.tilt, "0deg"] }) }],
  };

  if (book == null) {
    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View pointerEvents="box-none" style={[styles.center, { paddingBottom: navHeight }]}>
          {status === "failed" ? (
            <Text testID="book-failed" style={hand(17, 24)} color={homeV2.color.muted}>
              리포트를 불러오지 못했어요 · 잠시 뒤에 다시 열어 주세요
            </Text>
          ) : (
            <>
              <BabaOnRug width={120} />
              <Spinner />
            </>
          )}
        </View>
      </View>
    );
  }

  const range = rangeOf(book);
  const isOpen = at >= 0;
  const pressCta = () => {
    if (book.detailed) {
      go(0);
      return;
    }
    if (diaries.length === 1 && diaries[0] != null) onOpenDiary(diaries[0].id);
    else setSheet(true);
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID="weekly-book">
      {/* 펼치면 탭바까지 가리는 바탕 */}
      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[StyleSheet.absoluteFill, { opacity: open.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }) }]}
      >
        <TabPaperBackground tab="리포트" />
      </Animated.View>

      {!isOpen ? (
        <Pressable
          testID="book-past"
          accessibilityRole="button"
          accessibilityLabel="예전 공책"
          onPress={onOpenPast}
          hitSlop={8}
          style={[styles.past, { top: insets.top + 2 }]}
        >
          <Text style={hand(15, 22)} color={homeV2.color.muted}>
            예전 공책
          </Text>
          <Icon name="chevron-right" size={16} color={homeV2.color.muted} />
        </Pressable>
      ) : (
        <Pressable
          testID="book-exit"
          accessibilityRole="button"
          accessibilityLabel="공책 덮기"
          onPress={() => go(-1)}
          hitSlop={8}
          style={[styles.exit, { top: insets.top + 2 }]}
        >
          <Icon name="close" size={24} color={homeV2.color.ink} />
        </Pressable>
      )}

      <Animated.View
        style={[styles.bookBox, bookBox]}
        onTouchStart={(e) => {
          touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
        }}
        onTouchEnd={(e) => onSwipeEnd(e.nativeEvent.pageX, e.nativeEvent.pageY)}
      >
        <Notebook tabCount={pages.length > 0 ? pages.length : 3} activeTab={at}>
          {pages.map((page, i) => (
            <Leaf key={page} turned={i < at} z={pages.length - i} reduceMotion={reduceMotion} testID={`book-leaf-${page}`}>
              <View style={styles.paper} accessibilityElementsHidden={i !== at}>
                {page !== "closing" ? (
                  <View style={styles.pageHead}>
                    <TapeTitle>{BOOK_PAGE_TITLES[page]}</TapeTitle>
                    <Text style={[hand(14, 18), styles.dateField]} color={homeV2.color.muted}>
                      {range.field}
                    </Text>
                  </View>
                ) : null}
                <BookPageBody page={page} book={book} />
                <Text style={[hand(14, 18), styles.pageNo]} color={homeV2.color.muted} accessibilityElementsHidden>
                  {i + 1}
                </Text>
                <View style={styles.corner} />
              </View>
            </Leaf>
          ))}
          <Leaf turned={isOpen} z={pages.length + 1} reduceMotion={reduceMotion} testID="book-cover">
            <KraftFace>
              <Cover book={book} label={range.label} />
            </KraftFace>
          </Leaf>
        </Notebook>
      </Animated.View>

      {!isOpen && hasCta ? (
        <View style={[styles.cta, { bottom: navHeight }]}>
          <ReflectionButton
            testID="book-cta"
            color={homeV2.color.green}
            label={book.detailed ? "펼쳐 보기" : diaryButtonLabel(book)}
            onPress={pressCta}
          />
          {hasHint ? (
            <Text style={[hand(15, 20), styles.hint]} color={homeV2.color.muted}>
              한 주에 3일 이상 일기를 쓰면, 리포트가 생겨요
            </Text>
          ) : null}
        </View>
      ) : null}

      {isOpen ? (
        <View style={[styles.foot, { bottom: Math.max(insets.bottom, 8) }]}>
          <PaperButton
            testID="book-prev"
            label="앞 장"
            disabled={at <= 0}
            onPress={() => go(at - 1)}
            leading={<Icon name="chevron-left" size={16} color={homeV2.color.ink} />}
          />
          {at < last ? (
            <PaperButton
              testID="book-next"
              label="다음 장"
              go
              onPress={() => go(at + 1)}
              trailing={<Icon name="chevron-right" size={16} color={homeV2.color.white} />}
            />
          ) : (
            <PaperButton testID="book-done" label="닫기" go onPress={() => go(-1)} />
          )}
        </View>
      ) : null}

      {sheet ? (
        <DiarySheet diaries={diaries} onDismiss={() => setSheet(false)} onOpen={onOpenDiary} />
      ) : null}
    </View>
  );
}

const TILTS = ["-6deg", "4deg", "-3deg", "5deg", "-4deg", "3deg", "-5deg"] as const;
const DROPS = [0, 2, -1, 2, 0, -2, 1] as const;

function Cover({ book, label }: { book: WeeklyBook; label: string }) {
  const written = book.days.filter((d) => d.written);
  const short = !book.detailed;
  const empty = book.diaryCount === 0;
  const stickerSize = short ? 36 : written.length > 6 ? 25 : 28;
  return (
    <View style={styles.cover}>
      <View style={styles.label}>
        <View style={styles.labelLine} />
        {book.newest && !empty ? (
          <View style={styles.newTag}>
            <MaskingTape color={reportBook.color.tagTape} edge="notched" />
            <Text style={hand(14, 18)} color={homeV2.color.ink}>
              새 공책
            </Text>
          </View>
        ) : null}
        <Text testID="book-range" style={hand(21, 28)} color={raisedShadow.grass}>
          {label}
        </Text>
      </View>
      <View style={[styles.stickers, short ? styles.stickersShort : null]}>
        {written.map((day, i) => (
          <View
            key={day.date}
            style={[styles.stickerDay, { transform: [{ translateY: DROPS[i] ?? 0 }, { rotate: TILTS[i] ?? "0deg" }] }]}
          >
            <PebbleSticker id={day.emotion} size={stickerSize} />
            <Text style={hand(14, 17)} color={homeV2.color.ink}>
              {short ? `${weekdayOf(day.date)} ${emotionName(day.emotion)}` : weekdayOf(day.date)}
            </Text>
          </View>
        ))}
      </View>
      {book.restCount > 0 ? (
        <Text style={[hand(15, 20), styles.coverRest]} color={homeV2.color.ink}>
          쉼터에도 {book.restCount}번 다녀왔어요
        </Text>
      ) : null}
      <View style={styles.talk}>
        <Bubble size={short ? 16 : 17} lineHeight={short ? 22 : 24} testID="book-cover-line">
          {keepWords(empty ? "일기를 쓰면 일요일에 공책이 도착해요" : book.coverLine)}
        </Bubble>
        <View style={styles.coverBaba}>
          <BabaSticker width={short ? 96 : 112} />
        </View>
      </View>
    </View>
  );
}

function DiarySheet({
  diaries,
  onDismiss,
  onOpen,
}: {
  diaries: readonly Diary[];
  onDismiss: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <BottomSheet onDismiss={onDismiss}>
      <View testID="book-diary-sheet" style={styles.sheet}>
        {diaries.map((diary) => (
          <Pressable
            key={diary.id}
            accessibilityRole="button"
            accessibilityLabel={`${weekdayOf(diary.date)}요일 일기 보기`}
            onPress={() => onOpen(diary.id)}
            style={styles.sheetRow}
          >
            <EmotionPebble id={diary.emotions[0] ?? null} size={32} />
            <View style={styles.sheetText}>
              <Text style={hand(14, 18)} color={homeV2.color.muted}>
                {weekdayOf(diary.date)}요일
              </Text>
              <Text style={hand(19, 26)} color={homeV2.color.ink} numberOfLines={1}>
                {diary.body}
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={homeV2.color.muted} />
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 24 },
  past: { position: "absolute", right: 16, minHeight: 44, flexDirection: "row", alignItems: "center", gap: 2, zIndex: 5 },
  exit: { position: "absolute", right: 12, width: 44, height: 44, alignItems: "center", justifyContent: "center", zIndex: 5 },
  bookBox: { position: "absolute" },
  paper: { flex: 1, backgroundColor: reportBook.color.page },
  pageHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 12,
    marginRight: 14,
    marginBottom: 8,
    marginLeft: 24,
  },
  dateField: { paddingHorizontal: 2, borderBottomWidth: 1, borderStyle: "dashed", borderBottomColor: reportBook.color.fieldLine },
  pageNo: { position: "absolute", right: 30, bottom: 7 },
  corner: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 0,
    height: 0,
    borderTopWidth: 22,
    borderLeftWidth: 22,
    borderTopColor: "transparent",
    borderLeftColor: reportBook.color.curl,
  },
  cta: { position: "absolute", left: 16, right: 16, gap: 6, paddingBottom: 12 },
  hint: { textAlign: "center" },
  foot: {
    position: "absolute",
    left: 16,
    right: 16,
    height: FOOT_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cover: { flex: 1, paddingTop: 22, paddingBottom: 20, paddingLeft: 40, paddingRight: 36 },
  label: {
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: reportBook.color.label,
    borderRadius: 4,
    transform: [{ rotate: "-0.6deg" }],
    boxShadow: reportBook.shadow.label,
  },
  labelLine: {
    position: "absolute",
    top: 3,
    bottom: 3,
    left: 3,
    right: 3,
    borderWidth: 1,
    borderColor: homeV2.color.green,
    borderRadius: 2,
  },
  newTag: {
    position: "absolute",
    left: -12,
    top: -13,
    height: 22,
    paddingHorizontal: 8,
    justifyContent: "center",
    transform: [{ rotate: "-4deg" }],
  },
  stickers: { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 14 },
  stickersShort: { flexWrap: "wrap", gap: 2, columnGap: 12 },
  stickerDay: { alignItems: "center", gap: 1 },
  coverRest: { textAlign: "center", marginTop: 6 },
  talk: { flex: 1, minHeight: 0, justifyContent: "flex-end", marginHorizontal: -9 },
  coverBaba: { alignSelf: "center", marginTop: -16 },
  sheet: { gap: 6 },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 64,
    borderBottomWidth: 1,
    borderBottomColor: reportBook.color.rule,
  },
  sheetText: { flex: 1, minWidth: 0 },
});
