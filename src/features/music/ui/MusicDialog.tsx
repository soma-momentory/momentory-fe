import { Pressable, Modal as RNModal, ScrollView, StyleSheet, View } from "react-native";

import { IconButton } from "@/components/ds/IconButton";
import { Icon } from "@/components/ds/icons/Icon";
import { Text } from "@/components/ds/Text";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  elevation,
  fill,
  homeV2,
  label as labelColor,
  layout,
  musicPaper,
  overlay,
  radius,
  size,
  space,
  withAlpha,
} from "@/design/ds";

import { MUSIC_TRACKS, musicTrack, type MusicKind } from "../model/tracks";

const GROUPS: readonly { kind: MusicKind; title: string }[] = [
  { kind: "noise", title: "백색소음" },
  { kind: "music", title: "음악" },
];

/** 지금 곡 자리의 그림 — 밤바다 위 줄에 앉은 바바(2026-11-06 · 사용자가 준 그림). 곡마다 같다 */
const COVER = require("../../../../assets/music/cover.jpg");
/** 플레이어 그림 — 오른쪽에 ✕ 를 비켜 선 뒤에도 조작 버튼 셋(44 × 3)이 가장 좁은 폰(iPhone SE)에 들어갈 만큼 남긴다 */
const COVER_SIZE = 112;

/** 창의 바탕 종이 (2026-11-06 · 사용자가 준 그림) */
const PAPER = require("../../../../assets/backgrounds/kraft-paper.webp");

/** 묶음 이름 옆으로 끝까지 긋는 줄 — 홈 아이콘의 갈색을 옅게(2026-11-06 사용자가 준 그림) */
const GROUP_RULE = withAlpha(homeV2.color.ink, 0.45);

/** 조작 버튼 — 홈 상단 아이콘과 같은 크기 · 같은 갈색(2026-11-06 사용자 요청 · 종이 위 8.28:1) */
const CONTROL_ICON = 28;
const CONTROL_COLOR = homeV2.color.ink;
/**
 * 되감기 글리프의 왼쪽 끝이 버튼 칸 왼쪽에서 떨어진 거리 — 곡 제목을 여기에 맞춘다(2026-11-06 사용자 요청).
 * 44 칸 가운데의 28 아이콘 + 글리프 `rewind` 의 왼쪽 꼭짓점(24 그리드 x 3.5 · 선 반 두께 0.9 바깥).
 * ⚠ `rewind` 를 다시 그리면 3.5 도 함께 고친다
 */
const REWIND_GLYPH_LEFT = (layout.minTouch - CONTROL_ICON) / 2 + ((3.5 - 0.9) * CONTROL_ICON) / 24;

/** ✕ 의 보이는 원 — 바텀 시트의 ✕ 와 같다 */
const CLOSE_SIZE = 36;
/** ✕ 가 카드 구석에서 떨어진 거리 */
const CLOSE_INSET = space.md;
const CARD_PADDING = 22;
/**
 * 제목 · 조작 칸이 오른쪽에서 비켜 서는 만큼 — ✕ 가 카드 안쪽 여백보다 더 들어온 폭이다.
 * 제목이 ✕ 와 같은 높이에 있어도 겹치지 않는다(2026-11-06 사용자 요청)
 */
const CLOSE_CLEARANCE = CLOSE_INSET + CLOSE_SIZE - CARD_PADDING;

/**
 * 배경음악 고르기 (2026-11-05) — 맨 위는 플레이어(왼쪽 그림 · 오른쪽 위 제목 · 오른쪽 아래 이전 곡 ·
 * 재생/일시정지 · 다음 곡), 그 아래 곡 목록이다.
 * 곡을 누르면 바로 난다. 끄는 것은 일시정지다 — 곡은 남고 다시 재생하면 멈춘 자리부터 이어진다
 * (2026-11-06 · 사용자 요청 — 처음엔 목록 첫 줄이 「끄기」였다).
 *
 * **화면 가운데에 뜬다**(2026-11-06 · 사용자 요청 — 처음엔 바텀 시트였다). 확인 모달(`ds/Modal`)과
 * 같은 딤 · 반경을 쓰지만 확인이 아니라 고르기라서, 딤 · ✕ · 뒤로가기 어느 것으로도 닫힌다.
 *
 * 바탕은 확인 모달의 흰 면이 아니라 종이 질감이다(2026-11-06 · 사용자 요청 · `musicPaper`).
 *
 * 눌러도 닫히지 않는다 — 이것저것 들어 보고 고르는 자리다.
 */
export function MusicDialog({
  current,
  playing,
  onSelect,
  onToggle,
  onSkip,
  onDismiss,
}: {
  current: string | null;
  playing: boolean;
  onSelect: (trackId: string) => void;
  onToggle: () => void;
  onSkip: (direction: "previous" | "next") => void;
  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <RNModal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View
        testID="music-dialog-overlay"
        style={[
          styles.root,
          // 상태바 · 내비게이션 바 밑으로 들어가지 않는다(창이 상태바까지 덮는다)
          { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md },
        ]}
      >
        {/* 딤을 누르면 닫힌다 — 카드 밖 형제로 두어 카드 안의 터치가 여기로 새지 않게 한다 */}
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="닫기"
          onPress={onDismiss}
        />
        <View accessibilityViewIsModal accessibilityLabel="배경음악" style={styles.card}>
          {/* 종이 질감 — 장식이라 낭독기에 읽히지 않는다 */}
          <Image
            source={PAPER}
            contentFit="cover"
            style={StyleSheet.absoluteFill}
            accessible={false}
          />
          {/* 플레이어 — 왼쪽 큰 그림, 오른쪽 위 제목 · 아래 조작(2026-11-06 사용자가 준 그림의 구도).
              일시정지해도 고른 곡이 남는다 */}
          <View testID="music-dialog-now" style={styles.player}>
            <Image source={COVER} contentFit="cover" style={styles.cover} accessible={false} />
            <View style={styles.playerSide}>
              <Text
                variant="headline1"
                color={labelColor.strong}
                numberOfLines={2}
                style={styles.playerTitle}
              >
                {musicTrack(current)?.name ?? "아직 고른 곡이 없어요"}
              </Text>
              <View testID="music-dialog-controls" style={styles.controls}>
                <IconButton
                  name="rewind"
                  size={CONTROL_ICON}
                  color={CONTROL_COLOR}
                  accessibilityLabel="이전 곡"
                  onPress={() => onSkip("previous")}
                />
                {/* 이름이 지금 상태가 아니라 누르면 할 일을 말한다 — 낭독기도 같다 */}
                <IconButton
                  name={playing ? "pause" : "play"}
                  size={CONTROL_ICON}
                  color={CONTROL_COLOR}
                  accessibilityLabel={playing ? "일시정지" : "재생"}
                  onPress={onToggle}
                />
                <IconButton
                  name="fast-forward"
                  size={CONTROL_ICON}
                  color={CONTROL_COLOR}
                  accessibilityLabel="다음 곡"
                  onPress={() => onSkip("next")}
                />
              </View>
            </View>
          </View>
          <ScrollView
            testID="music-dialog-list"
            style={styles.list}
            showsVerticalScrollIndicator={false}
            accessibilityRole="radiogroup"
          >
            {GROUPS.map(({ kind, title }) => (
              <View key={kind} style={styles.group}>
                {/* 묶음 이름 뒤로 줄이 창 끝까지 이어진다 — 곡 줄은 그 아래다 */}
                <View testID={`music-dialog-group-${kind}`} style={styles.groupTitle}>
                  <Text variant="label2" color={labelColor.normal}>
                    {title}
                  </Text>
                  <View style={styles.groupRule} />
                </View>
                {MUSIC_TRACKS.filter((track) => track.kind === kind).map((track) => (
                  <Row
                    key={track.id}
                    label={track.name}
                    selected={current === track.id}
                    onPress={() => onSelect(track.id)}
                  />
                ))}
              </View>
            ))}
          </ScrollView>
          {/* 제목 글자는 두지 않는다(2026-11-06 사용자 요청) — ✕ 는 줄을 차지하지 않고 오른쪽 위 구석에 뜬다.
              창은 내용 높이에 딱 맞는다. 이름은 낭독기만 읽는다(카드의 accessibilityLabel) */}
          <IconButton
            name="close"
            size={20}
            accessibilityLabel="닫기"
            onPress={onDismiss}
            hitSlop={(layout.minTouch - CLOSE_SIZE) / 2}
            style={styles.close}
          />
        </View>
      </View>
    </RNModal>
  );
}

function Row({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text variant="body1" color={selected ? labelColor.strong : labelColor.normal}>
        {label}
      </Text>
      {/* 고른 줄은 색만이 아니라 체크로도 드러난다 */}
      {selected ? <Icon name="check" size={size.icon.md} color={labelColor.strong} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // 확인 모달과 같은 덮개(`ds/Modal`) — 딤 위 가운데
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: layout.screenPadding,
    backgroundColor: overlay.dimmer,
  },
  card: {
    alignSelf: "stretch",
    maxHeight: "100%",
    // 그림이 뜨기 전에도 같은 종이색이다. 그림은 둥근 모서리 안으로 자른다
    backgroundColor: musicPaper.surface,
    overflow: "hidden",
    borderRadius: radius.xlarge,
    padding: CARD_PADDING,
    paddingBottom: space.md,
    gap: space.sm,
    ...elevation.overlay,
  },
  close: {
    position: "absolute",
    top: CLOSE_INSET,
    right: CLOSE_INSET,
    width: CLOSE_SIZE,
    height: CLOSE_SIZE,
    backgroundColor: fill.normal,
  },
  // 창이 화면보다 길어지면(작은 화면 · 큰 글씨) 곡 목록만 줄어들며 그 안에서 스크롤한다
  list: { flexShrink: 1 },
  player: { flexDirection: "row", gap: space.lg, marginBottom: space.xs },
  // 모서리를 둥글리지 않은 정사각이다(2026-11-06 사용자 요청)
  cover: { width: COVER_SIZE, height: COVER_SIZE },
  // 제목은 그림 위쪽에, 조작은 그림 아래쪽에 맞춘다. 큰 글씨로 제목이 길어지면 그림보다 길어질 수 있다
  playerSide: {
    flex: 1,
    minHeight: COVER_SIZE,
    justifyContent: "space-between",
    gap: space.sm,
    marginRight: CLOSE_CLEARANCE,
  },
  // 그림 윗변에서 내려 조작 버튼 위 빈자리 가운데쯤에 선다(2026-11-06 사용자 요청)
  playerTitle: { marginTop: space.xl2, marginLeft: REWIND_GLYPH_LEFT },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  group: { marginTop: space.sm },
  groupTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.xs,
  },
  groupRule: { flex: 1, height: 1, backgroundColor: GROUP_RULE },
  row: {
    minHeight: layout.minTouch,
    paddingVertical: space.xs,
    borderRadius: radius.small,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  pressed: { backgroundColor: overlay.pressLight },
});
