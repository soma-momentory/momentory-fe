import { useId, useState, type ReactNode } from "react";
import { Image, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";

import { EmotionPebble, Text } from "@/components/ds";
import { useEffectiveFontScale } from "@/components/ds/Text";
import { label, radius, space } from "@/design/ds";
import { diaryPaper as paper } from "@/design/ds/diaryPaper";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";
import type { Schedule } from "@/features/home/model/types";
import { formatDiaryDate } from "@/lib/day";

import { diaryPhotoOf } from "./diaryPhotos";

/** Android에서도 한 장만 늘어나지 않도록 배경 크기를 재서 실제 타일을 깐다. */
export function DiaryPaperBackground() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const cols = Math.ceil(size.width / paper.grainTile);
  const rows = Math.ceil(size.height / paper.grainTile);
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.background]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={({ nativeEvent: { layout } }) =>
        setSize((prev) =>
          prev.width === layout.width && prev.height === layout.height ? prev : layout,
        )
      }
    >
      {Array.from({ length: cols * rows }, (_, i) => (
        <Image
          key={i}
          source={require("../../../assets/diary/memo-paper-ivory.png")}
          style={{
            position: "absolute",
            left: (i % cols) * paper.grainTile,
            top: Math.floor(i / cols) * paper.grainTile,
            width: paper.grainTile,
            height: paper.grainTile,
            opacity: paper.grainOpacity,
          }}
        />
      ))}
    </View>
  );
}

/** 날짜·사진·감정은 읽기와 편집에서 같은 위치를 유지하고 본문만 바꾼다. */
export function DiaryPaperEntry({
  date,
  emotions,
  onEmotionPress,
  emotionChosen = false,
  children,
}: {
  date: string;
  emotions: readonly EmotionId[];
  onEmotionPress?: () => void;
  emotionChosen?: boolean;
  children: ReactNode;
}) {
  return (
    <View style={styles.entry} testID="diary-paper-entry">
      <Text variant="title1Hand" style={styles.date} accessibilityRole="header">
        {formatDiaryDate(date)}
      </Text>
      <DiaryPhoto
        key={`${date}:${emotions.join(",")}`}
        emotions={emotions}
        onEmotionPress={onEmotionPress}
        emotionChosen={emotionChosen}
      />
      {children}
    </View>
  );
}

function DiaryPhoto({
  emotions,
  onEmotionPress,
  emotionChosen,
}: {
  emotions: readonly EmotionId[];
  onEmotionPress?: () => void;
  emotionChosen: boolean;
}) {
  const uniqueEmotions = [...new Set(emotions)];
  const photo = diaryPhotoOf(uniqueEmotions);
  const [selected, setSelected] = useState<EmotionId | null>(null);
  const [width, setWidth] = useState(0);
  const fontScale = useEffectiveFontScale();
  const captionHeight = paper.caption.lineHeight * fontScale;
  const id = useId();
  const left = width * paper.stickerLeftRatio + paper.stickerLeftInset;
  const columns = Math.max(1, Math.floor((width - left) / paper.stickerStep));
  const rows = Math.max(1, Math.ceil(uniqueEmotions.length / columns));
  // 글씨 확대나 감정 10개에서도 이름·스티커가 서로 겹치지 않게 행을 나눈다.
  const many = uniqueEmotions.length > 3;
  const extra = (rows - 1) * paper.stickerTouchHeight;
  const onLayout = ({ nativeEvent: { layout } }: LayoutChangeEvent) => setWidth(layout.width);
  const image =
    photo != null ? (
      <Image
        source={photo.source}
        style={styles.photoImage}
        resizeMode="contain"
        accessibilityLabel={
          photo.emotion == null
            ? "무감정의 카피바라 사진"
            : `${emotionName(photo.emotion)}의 카피바라 사진`
        }
        testID="diary-emotion-photo"
      />
    ) : null;

  return (
    <View
      style={[
        styles.photoArea,
        { paddingTop: extra, marginTop: many ? captionHeight + space.sm : 0 },
        photo == null
          ? { minHeight: paper.stickerTouchHeight + extra + (many ? captionHeight : 0) }
          : null,
      ]}
      onLayout={onLayout}
      testID="diary-photo-area"
    >
      {onEmotionPress != null && uniqueEmotions.length === 0 && !emotionChosen ? (
        <Pressable
          style={[styles.photo, styles.photoPlaceholder]}
          onPress={onEmotionPress}
          accessibilityRole="button"
          accessibilityLabel="감정 선택"
          accessibilityHint="감정을 고르면 이 자리에 사진이 나타나요"
        >
          <Text variant="title3Hand" color={label.alternative} accessible={false}>
            ＋
          </Text>
          <Text variant="label1Hand" color={label.neutral} style={styles.placeholderText}>
            오늘의 감정을 골라주세요
          </Text>
        </Pressable>
      ) : photo != null ? (
        onEmotionPress != null ? (
          <Pressable
            style={styles.photo}
            onPress={onEmotionPress}
            accessibilityRole="button"
            accessibilityLabel={`감정 바꾸기, ${photo.emotion == null ? "무감정" : emotionName(photo.emotion)}`}
          >
            {image}
          </Pressable>
        ) : (
          <View style={styles.photo}>{image}</View>
        )
      ) : null}
      {uniqueEmotions.length > 0 ? (
        <>
          <View
            style={[
              styles.stickers,
              {
                left,
                top: photo == null ? space.sm + (many ? captionHeight : 0) : paper.stickerTop,
                right: 0,
              },
            ]}
          >
            {uniqueEmotions.map((emotion) => (
              <Pressable
                key={emotion}
                style={styles.sticker}
                accessibilityRole="button"
                accessibilityLabel={`${emotionName(emotion)} 감정 스티커`}
                accessibilityHint="누르면 사진 위에 감정 이름이 표시돼요"
                accessibilityState={{ selected: selected === emotion }}
                onPress={() => setSelected((prev) => (prev === emotion ? null : emotion))}
              >
                <EmotionPebble id={emotion} size={paper.stickerSize} />
              </Pressable>
            ))}
          </View>
          <View
            style={[
              styles.caption,
              { bottom: photo == null ? undefined : "100%", top: photo == null ? 0 : undefined },
              many && photo != null ? { marginBottom: paper.stickerTouchHeight - space.sm } : null,
            ]}
            pointerEvents="none"
          >
            <Text
              nativeID={id}
              variant="label1Hand"
              color={label.neutral}
              style={styles.captionText}
              accessibilityLiveRegion="polite"
              testID="diary-emotion-caption"
            >
              {selected == null ? "" : emotionName(selected)}
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

/** 매끈한 메모지 일러스트. 일기 바탕의 종이 결을 이 메모에 반복하지 않는다. */
export function DiaryScheduleMemo({
  schedules,
  title = "오늘 일정",
  emptyText = "오늘은 따로 적어둔 일정이 없어요",
}: {
  schedules: readonly Schedule[];
  title?: string;
  emptyText?: string;
}) {
  return (
    <View style={styles.memo} testID="diary-schedule-memo">
      <Text variant="headline1" style={styles.memoTitle} accessibilityRole="header">
        {title}
      </Text>
      {schedules.length === 0 ? (
        <Text variant="body1ReadingHand" color={label.neutral} style={styles.memoItem}>
          {emptyText}
        </Text>
      ) : (
        schedules.map((schedule) => (
          <Text
            key={schedule.id}
            variant="body1ReadingHand"
            color={schedule.done ? label.neutral : label.normal}
            style={[styles.memoItem, schedule.done ? styles.done : null]}
            accessibilityLabel={`${schedule.title}${schedule.done ? ", 완료" : ""}`}
          >
            {schedule.title}
          </Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  background: { backgroundColor: paper.paper, overflow: "hidden" },
  entry: { paddingHorizontal: paper.inset },
  date: { ...paper.date, marginBottom: paper.dateGap },
  photoArea: { width: paper.photoWidth, alignSelf: "flex-end", marginBottom: paper.photoGap },
  photo: { width: "100%", aspectRatio: paper.photoAspect },
  photoPlaceholder: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: label.alternative,
    borderRadius: radius.medium,
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    padding: space.sm,
  },
  placeholderText: { textAlign: "center" },
  photoImage: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  stickers: { position: "absolute", flexDirection: "row", flexWrap: "wrap", zIndex: 1 },
  // 가로 32 간격은 승인 시안. 세로 터치 영역은 44, 조약돌 그림은 28이다.
  sticker: {
    width: paper.stickerStep,
    height: paper.stickerTouchHeight,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: {
    position: "absolute",
    right: paper.captionRight,
    marginBottom: paper.captionGap,
  },
  captionText: paper.caption,
  memo: {
    alignSelf: "flex-start",
    width: paper.memo.width,
    minWidth: paper.memo.minWidth,
    marginTop: paper.memo.gap,
    marginHorizontal: paper.inset,
    paddingTop: paper.memo.paddingTop,
    paddingHorizontal: paper.memo.paddingHorizontal,
    paddingBottom: paper.memo.paddingBottom,
    transform: [{ rotate: paper.memo.tilt }],
    backgroundColor: paper.memo.paper,
    boxShadow: `1px 2px 3px ${paper.memo.shadow}`,
  },
  memoTitle: { ...paper.memo.title, marginBottom: 9 },
  memoItem: paper.memo.item,
  done: { textDecorationLine: "line-through" },
});
