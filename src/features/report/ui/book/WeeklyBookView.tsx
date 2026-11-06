import { useEffect, useMemo, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

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

import { BookPageBody, pageSizeOf } from "./BookPages";
import { KraftFace, Leaf, Notebook } from "./Notebook";
import {
  BabaOnRug,
  babaOnRugGap,
  BabaSticker,
  babaStickerFit,
  babaStickerGap,
  Bubble,
  hand,
  PaperButton,
  PebbleSticker,
  TapeTitle,
} from "./parts";

/**
 * `W1` · 주간 리포트 공책 — 책상 위 스프링 공책 한 권(2026-11-04 시안 v10).
 *
 * 탭바까지 덮어야 해서 `TabScreen` 의 `overlay` 로 화면 전체에 깐다. 덮인 공책은 탭바 위에 작게 비스듬히 놓이고,
 * 펼치면 탭바를 가리며 똑바로 커진다. 위치를 재서 움직이므로 탭바를 없앨 때처럼 공책이 튀지 않는다.
 *
 * 속지는 펼친 크기로 고정해 둔다. 공책이 커지는 동안 글이 프레임마다 다시 줄을 바꾸면 저가형 폰에서 끊긴다.
 *
 * 일기가 3일 미만인 주는 표지 한 장이고, 큰 버튼은 그 주 일기로 간다. 일기가 전혀 없으면 빈 공책과 일기 쓰기 버튼을 둔다.
 */
type Props = {
  book: WeeklyBook | null;
  status: WeeklyBookStatus;
  /** 3일 안내를 보여 주는가 */
  showHint: boolean;
  /** 그 주의 일기 — 일기가 적은 주의 버튼이 쓴다 */
  diaries: readonly Diary[];
  onOpenPast: () => void;
  onOpenDiary: (id: string) => void;
  /** 빈 공책의 버튼 — 오늘 일기를 이미 썼으면 그 일기를 보여 준다 */
  writeLabel: string;
  onWriteDiary: () => void;
  onTurn: (page: BookPage | "cover") => void;
};

const OPEN_MS = 550;
const CTA_HEIGHT = 84;
const HINT_HEIGHT = 26;
const TOP_ROW = 44;
const FOOT_HEIGHT = 80;
const PAGE_FOOT_HEIGHT = 24;
/** 덮인 공책의 가로세로 비 · 양옆 여백 — 실제 공책처럼 보이는 비율로 묶는다 */
const CLOSED = { aspect: 1.73, sideGap: 80, tilt: "-1.2deg" } as const;
const OPENED = { left: 36, right: 30 } as const;
/** 표지 안쪽 여백(바느질 · 고무줄을 피한다) */
const COVER_PAD = { left: 40, right: 36 } as const;
/** 표지 바바를 줄여도 이보다 작게 하지 않는다 */
const COVER_BABA_MIN = 72;
/** 불러오는 중 바바의 폭 */
const LOADING_BABA = 120;

const rangeOf = (book: WeeklyBook) => {
  const [, sm = "", sd = ""] = book.startDate.split("-").map(Number).map(String);
  const [, em = "", ed = ""] = book.endDate.split("-").map(Number).map(String);
  return {
    label: sm === em ? `${sm}월 ${sd}일 ~ ${ed}일` : `${sm}월 ${sd}일 ~ ${em}월 ${ed}일`,
    field: sm === em ? `${sm}.${sd} ~ ${ed}` : `${sm}.${sd} ~ ${em}.${ed}`,
  };
};

export function WeeklyBookView({
  book,
  status,
  showHint,
  diaries,
  onOpenPast,
  onOpenDiary,
  writeLabel,
  onWriteDiary,
  onTurn,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [at, setAt] = useState(-1);
  // 그림이 많아 첫 화면이 밀린다 — 지금 장과 앞뒤 장만 그리고, 한 번 그린 장은 남겨 넘길 때 비지 않게 한다
  const [drawn, setDrawn] = useState<ReadonlySet<number>>(() => new Set([0]));
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
    setDrawn((prev) => new Set([...prev, target - 1, target, target + 1]));
    const page = target < 0 ? "cover" : (pages[target] ?? "cover");
    onTurn(page);
    if (page !== "cover" && page !== "closing") {
      AccessibilityInfo.announceForAccessibility(`${target + 1}쪽, ${BOOK_PAGE_TITLES[page]}`);
    }
    if (target < 0 !== at < 0) {
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

  // 탭바까지 가린 전체 화면처럼 보이므로, 안드로이드 뒤로 가기는 공책을 덮는다
  const goRef = useRef(go);
  useEffect(() => {
    goRef.current = go;
  });
  const isOpen = at >= 0;
  useEffect(() => {
    if (!isOpen) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      goRef.current(-1);
      return true;
    });
    return () => subscription.remove();
  }, [isOpen]);

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
  const hasHint = book != null && showHint;
  const closedTop = insets.top + TOP_ROW + 10;
  const closedBottom = navHeight + CTA_HEIGHT + (hasHint ? HINT_HEIGHT : 0) + 14;
  const roomHeight = height - closedTop - closedBottom;
  const closedWidth = Math.min(width - CLOSED.sideGap, roomHeight / CLOSED.aspect);
  const closedHeight = Math.min(roomHeight, closedWidth * CLOSED.aspect);
  const footBottom = Math.max(insets.bottom - 8, 8);
  const openTop = insets.top + TOP_ROW + 6;
  const openHeight = height - openTop - FOOT_HEIGHT - footBottom;
  const openWidth = width - OPENED.left - OPENED.right;
  const between = (from: number, to: number) =>
    open.interpolate({ inputRange: [0, 1], outputRange: [from, to] });
  const bookBox = {
    left: between((width - closedWidth) / 2 + 3, OPENED.left),
    top: between(closedTop + (roomHeight - closedHeight) / 2, openTop),
    width: between(closedWidth, openWidth),
    height: between(closedHeight, openHeight),
    transform: [
      { rotate: open.interpolate({ inputRange: [0, 1], outputRange: [CLOSED.tilt, "0deg"] }) },
    ],
  };

  if (book == null) {
    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        <View pointerEvents="box-none" style={[styles.center, { paddingBottom: navHeight }]}>
          {status === "failed" ? (
            <Text
              testID="book-failed"
              style={[hand(17, 24), styles.centerText]}
              color={homeV2.color.muted}
            >
              {keepWords("리포트를 불러오지 못했어요 · 잠시 뒤에 다시 열어 주세요")}
            </Text>
          ) : (
            <>
              <Bubble size={17} lineHeight={24} testID="book-loading">
                리포트를 정리하고 있어요
              </Bubble>
              <View style={{ marginTop: babaOnRugGap(LOADING_BABA) }}>
                <BabaOnRug width={LOADING_BABA} />
              </View>
              <Spinner />
            </>
          )}
        </View>
      </View>
    );
  }

  const range = rangeOf(book);
  const empty = book.diaryCount === 0;
  const pressCta = () => {
    if (empty) {
      onWriteDiary();
      return;
    }
    if (book.detailed) {
      go(0);
      return;
    }
    if (diaries.length === 1 && diaries[0] != null) onOpenDiary(diaries[0].id);
    else setSheet(true);
  };
  const ctaLabel = empty ? writeLabel : book.detailed ? "펼쳐 보기" : diaryButtonLabel(book);
  const closedOpacity = open.interpolate({
    inputRange: [0, 0.6],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const openOpacity = open.interpolate({
    inputRange: [0.4, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} testID="weekly-book">
      {/* 펼치면 탭바까지 가리는 바탕 */}
      <Animated.View
        pointerEvents={isOpen ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFill,
          { opacity: open.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] }) },
        ]}
      >
        <TabPaperBackground tab="리포트" />
      </Animated.View>

      {!isOpen ? (
        <Pressable
          testID="book-past"
          accessibilityRole="button"
          accessibilityLabel="지난 리포트"
          onPress={onOpenPast}
          hitSlop={8}
          style={[styles.past, { top: insets.top + 2 }]}
        >
          <Text style={hand(15, 22)} color={homeV2.color.muted}>
            지난 리포트
          </Text>
          <Icon name="chevron-right" size={16} color={homeV2.color.muted} />
        </Pressable>
      ) : (
        <Pressable
          testID="book-exit"
          accessibilityRole="button"
          accessibilityLabel="리포트 닫기"
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
        <Notebook
          tabCount={pages.length}
          activeTab={at}
          ringsHeight={isOpen ? openHeight : closedHeight}
          tabLabels={pages.map((page, i) =>
            page === "closing" ? "마지막 쪽" : `${i + 1}쪽, ${BOOK_PAGE_TITLES[page]}`,
          )}
          onPressTab={isOpen ? go : undefined}
        >
          {pages.map((page, i) => (
            <Leaf
              key={page}
              turned={i < at}
              z={pages.length - i}
              reduceMotion={reduceMotion}
              testID={`book-leaf-${page}`}
            >
              <View
                style={[styles.paper, { width: openWidth, height: openHeight }]}
                accessibilityElementsHidden={i !== at}
                importantForAccessibility={i === at ? "auto" : "no-hide-descendants"}
              >
                {drawn.has(i) ? (
                  <>
                    {page !== "closing" ? (
                      <View style={styles.pageHead}>
                        <TapeTitle>{BOOK_PAGE_TITLES[page]}</TapeTitle>
                        <Text style={[hand(14, 18), styles.dateField]} color={homeV2.color.muted}>
                          {range.field}
                        </Text>
                      </View>
                    ) : null}
                    <BookPageBody
                      page={page}
                      book={book}
                      size={pageSizeOf(openHeight)}
                      active={i === at}
                      reduceMotion={reduceMotion}
                    />
                    <View style={styles.pageFoot}>
                      <Text
                        style={hand(14, 18)}
                        color={homeV2.color.muted}
                        testID={`book-page-no-${i}`}
                      >
                        {i + 1} / {pages.length}
                      </Text>
                    </View>
                    <Svg
                      style={styles.corner}
                      width={CORNER}
                      height={CORNER}
                      viewBox={`0 0 ${CORNER} ${CORNER}`}
                      pointerEvents="none"
                    >
                      {/* 접혀 올라간 자리에는 아래 장이 보이고, 접힌 귀는 금 안쪽으로 눕는다 */}
                      <Path d={`M${CORNER} 0V${CORNER}H0Z`} fill={reportBook.color.pageLine} />
                      <Path d={`M0 0H${CORNER}L0 ${CORNER}Z`} fill={reportBook.color.curl} />
                      <Path
                        d={`M${CORNER} 0L0 ${CORNER}`}
                        stroke={reportBook.color.fold}
                        strokeWidth={1}
                      />
                    </Svg>
                  </>
                ) : null}
              </View>
            </Leaf>
          ))}
          <Leaf
            turned={isOpen}
            z={pages.length + 1}
            reduceMotion={reduceMotion}
            testID="book-cover"
          >
            <KraftFace>
              <Cover
                book={book}
                label={empty ? "이번 주 리포트" : range.label}
                width={closedWidth}
              />
            </KraftFace>
          </Leaf>
        </Notebook>
      </Animated.View>

      {!isOpen ? (
        <Animated.View style={[styles.cta, { bottom: navHeight, opacity: closedOpacity }]}>
          <ReflectionButton
            testID="book-cta"
            color={homeV2.color.green}
            label={ctaLabel}
            onPress={pressCta}
          />
          {hasHint ? (
            <Text testID="book-hint" style={[hand(15, 20), styles.hint]} color={homeV2.color.muted}>
              {keepWords("한 주에 3일 이상 일기를 쓰면, 리포트가 펼쳐져요")}
            </Text>
          ) : null}
        </Animated.View>
      ) : null}

      {isOpen ? (
        <Animated.View style={[styles.foot, { bottom: footBottom, opacity: openOpacity }]}>
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
        </Animated.View>
      ) : null}

      {sheet ? (
        <DiarySheet
          title={diaryButtonLabel(book).replace(" 보기", "")}
          diaries={diaries}
          onDismiss={() => setSheet(false)}
          onOpen={onOpenDiary}
        />
      ) : null}
    </View>
  );
}

const TILTS = ["-6deg", "4deg", "-3deg", "5deg", "-4deg", "3deg", "-5deg"] as const;
const DROPS = [0, 2, -1, 2, 0, -2, 1] as const;

function Cover({ book, label, width }: { book: WeeklyBook; label: string; width: number }) {
  const written = book.days.filter((d) => d.written);
  const short = !book.detailed;
  const empty = book.diaryCount === 0;
  const crisis = book.tone === "CRISIS";
  const inner = width - COVER_PAD.left - COVER_PAD.right;
  // 일곱 개가 고무줄 밑으로 들어가지 않게 안쪽 폭에서 잰다
  const stickerSize = Math.min(
    short ? 36 : 32,
    Math.floor((inner - 4 * Math.max(0, written.length - 1)) / Math.max(1, written.length)),
  );
  // 말풍선 아래 남는 높이에 맞춰 바바를 줄인다 — 말풍선이 바바나 위의 스티커를 덮지 않게
  const [talkBox, setTalkBox] = useState({ talk: 0, bubble: 0 });
  const fullBaba = Math.min(short ? 96 : 112, width * 0.34);
  const babaWidth =
    talkBox.talk > 0
      ? Math.max(COVER_BABA_MIN, Math.min(fullBaba, babaStickerFit(talkBox.talk - talkBox.bubble)))
      : fullBaba;
  const small = width < 260;
  return (
    <View style={styles.cover}>
      <View style={styles.label}>
        <View style={styles.labelLine} />
        {book.newest && !empty && !crisis ? (
          <View style={styles.newTag}>
            <MaskingTape color={reportBook.color.tagTape} edge="notched" />
            <Text style={hand(14, 18)} color={homeV2.color.ink}>
              새 리포트
            </Text>
          </View>
        ) : null}
        <Text
          testID="book-range"
          style={[hand(small ? 18 : 21, 28), styles.labelText]}
          color={raisedShadow.grass}
        >
          {label}
        </Text>
      </View>
      <View style={[styles.stickers, short ? styles.stickersShort : null]}>
        {written.map((day, i) => (
          <View
            key={day.date}
            accessible
            accessibilityLabel={`${weekdayOf(day.date)}요일 ${emotionName(day.emotion)}`}
            style={[
              styles.stickerDay,
              { transform: [{ translateY: DROPS[i] ?? 0 }, { rotate: TILTS[i] ?? "0deg" }] },
            ]}
          >
            <PebbleSticker id={day.emotion} size={stickerSize} />
            <Text style={hand(14, 17)} color={homeV2.color.ink}>
              {short ? `${weekdayOf(day.date)} ${emotionName(day.emotion)}` : weekdayOf(day.date)}
            </Text>
          </View>
        ))}
      </View>
      {book.restCount > 0 && !crisis && !empty ? (
        <Text style={[hand(15, 20), styles.coverRest]} color={homeV2.color.ink}>
          쉼터에 {book.restCount}번 다녀왔어요
        </Text>
      ) : null}
      <View
        style={styles.talk}
        onLayout={(e) => {
          const talk = e.nativeEvent.layout.height;
          setTalkBox((box) => (box.talk === talk ? box : { ...box, talk }));
        }}
      >
        <View
          style={styles.talkBubble}
          onLayout={(e) => {
            const bubble = e.nativeEvent.layout.height;
            setTalkBox((box) => (box.bubble === bubble ? box : { ...box, bubble }));
          }}
        >
          <Bubble
            size={small ? 15 : short ? 16 : 17}
            lineHeight={small ? 21 : short ? 22 : 24}
            testID="book-cover-line"
          >
            {keepWords(
              empty
                ? "일기를 쓰면 일요일에 리포트가 도착해요"
                : small
                  ? book.coverLine.replace(/\n/g, " ")
                  : book.coverLine,
            )}
          </Bubble>
        </View>
        <View style={[styles.coverBaba, { marginTop: babaStickerGap(babaWidth) }]}>
          <BabaSticker width={babaWidth} />
        </View>
      </View>
    </View>
  );
}

function DiarySheet({
  title,
  diaries,
  onDismiss,
  onOpen,
}: {
  title: string;
  diaries: readonly Diary[];
  onDismiss: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <BottomSheet onDismiss={onDismiss}>
      <View testID="book-diary-sheet" style={styles.sheet}>
        <Text style={hand(22, 30)} color={homeV2.color.ink} accessibilityRole="header">
          {title}
        </Text>
        {diaries.map((diary) => (
          <Pressable
            key={diary.id}
            accessibilityRole="button"
            accessibilityLabel={`${weekdayOf(diary.date)}요일 일기 보기`}
            onPress={() => {
              onDismiss();
              onOpen(diary.id);
            }}
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
        <View style={styles.sheetClose}>
          <PaperButton testID="book-sheet-close" label="닫기" onPress={onDismiss} />
        </View>
      </View>
    </BottomSheet>
  );
}

/** 장 오른쪽 아래 귀가 접힌 크기 */
const CORNER = 22;

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  centerText: { textAlign: "center" },
  past: {
    position: "absolute",
    right: 16,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    zIndex: 5,
  },
  exit: {
    position: "absolute",
    right: 12,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  bookBox: { position: "absolute" },
  paper: { backgroundColor: reportBook.color.page },
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
  dateField: {
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderStyle: "dashed",
    borderBottomColor: reportBook.color.fieldLine,
  },
  pageFoot: {
    height: PAGE_FOOT_HEIGHT,
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: 30,
  },
  corner: {
    position: "absolute",
    right: 0,
    bottom: 0,
  },
  cta: { position: "absolute", left: 16, right: 16, gap: 6, paddingBottom: 18 },
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
  cover: {
    flex: 1,
    paddingTop: 22,
    paddingBottom: 20,
    paddingLeft: COVER_PAD.left,
    paddingRight: COVER_PAD.right,
  },
  label: {
    minHeight: 50,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: reportBook.color.label,
    borderRadius: 4,
    transform: [{ rotate: "-0.6deg" }],
    boxShadow: reportBook.shadow.label,
  },
  labelText: { textAlign: "center" },
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
    zIndex: 2,
  },
  stickers: { flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 14 },
  stickersShort: { flexWrap: "wrap", gap: 2, columnGap: 12 },
  stickerDay: { alignItems: "center", gap: 1 },
  coverRest: { textAlign: "center", marginTop: 6 },
  talk: { flex: 1, minHeight: 0, justifyContent: "flex-end", marginLeft: -9, marginRight: -4 },
  talkBubble: { alignSelf: "stretch" },
  coverBaba: { alignSelf: "center" },
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
  sheetClose: { alignItems: "flex-end", marginTop: 8 },
});
