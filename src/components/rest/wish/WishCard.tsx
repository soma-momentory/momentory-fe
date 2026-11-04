import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet, Icon, Text } from "@/components/ds";
import { HoldPill } from "@/components/rest/pond/HoldPill";
import { artPoint, artScale } from "@/components/rest/pond/layout";
import {
  SCENE_BACK_SIZE,
  SceneBackButton,
  SceneCornerButton,
  ScenePillButton,
} from "@/components/rest/scene/SceneChrome";
import { VintagePressable } from "@/components/rest/scene/VintagePressable";
import {
  pondScene,
  radius,
  restScene,
  restSceneSize,
  space,
  wishScene,
  wishSceneMotion,
} from "@/design/ds";
import type { PondWish } from "@/features/rest/data/wishApi";
import {
  WISH_PILL,
  WISH_REPORT,
  isLongWish,
  wishDaysLeft,
  wishSign,
} from "@/features/rest/model/wish";

import { WISH_FLOWER, WishFlower } from "./WishFlower";
import { WishAuthorRow } from "./WishAuthorRow";
import { WishNote } from "./WishNote";

const M = wishScene.memo;

/**
 * 소원 한 장 — 위 막대의 작은 꽃이 10장 중 어디인지 알려 주고(숫자는 없다), 꾸욱 눌러 같이 빈다.
 *
 * 넘기는 길은 셋이다: 화살표 원 · 빈 곳 오른쪽과 왼쪽 누르기 · 좌우로 밀기. 글에 집중하면 아래 화살표가
 * 안 보인다는 팀원 피드백(2026-11-03)이 있었다. 바바의 소원은 사람 글이 아니라 신고 메뉴가 없다.
 */
export function WishCard({
  wish,
  position,
  total,
  onTurn,
  onBack,
  onJoin,
  onJoinCancelled,
  onReport,
}: {
  wish: PondWish;
  position: number;
  total: number;
  onTurn: (delta: 1 | -1) => void;
  onBack: () => void;
  onJoin: () => void;
  onJoinCancelled: () => void;
  onReport: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [menu, setMenu] = useState(false);
  const [pillLabel, setPillLabel] = useState<string>(WISH_PILL.hold);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current != null) clearTimeout(timer.current);
    },
    [],
  );

  const pan = PanResponder.create({
    // 버튼들이 먼저 손짓을 받는다. 여기로 오는 것은 빈 곳에서 시작한 손짓뿐이다
    onStartShouldSetPanResponder: () => true,
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > wishSceneMotion.swipe && Math.abs(g.dx) > Math.abs(g.dy)) {
        onTurn(g.dx < 0 ? 1 : -1);
      } else if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) {
        onTurn(g.x0 > width / 2 ? 1 : -1);
      }
    },
  });

  const k = artScale(width, height);
  const top = insets.top + space.sm;
  const barTop = top + SCENE_BACK_SIZE + space.sm;
  const flower = artPoint(wishScene.held.x, wishScene.held.y, width, height);
  const unit = (width - space.xl * 2) / total;
  const long = isLongWish(wish.content);

  return (
    <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
      <SceneBackButton top={top} onPress={onBack} />
      {wish.author === "user" ? (
        <SceneCornerButton
          top={top}
          icon="more-vertical"
          label="더 보기"
          onPress={() => setMenu(true)}
        />
      ) : null}

      <View style={[styles.bar, { top: barTop }]}>
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={styles.tick} />
        ))}
      </View>
      <Image
        source={WISH_FLOWER}
        contentFit="contain"
        transition={0}
        style={[
          styles.barFlower,
          {
            top: barTop + space.xs,
            left: space.xl + unit * (position + 0.5) - wishScene.bar.flower / 2,
          },
        ]}
      />

      <WishNote key={wish.id} tilt={-0.7} style={[styles.note, { top: barTop + space.xl2 }]}>
        <WishAuthorRow name={wishSign(wish.author)} />
        <Text
          variant="title1Hand"
          color={restScene.ink}
          style={long ? styles.longText : styles.text}
        >
          {wish.content}
        </Text>
        <View style={styles.left}>
          <Text variant="caption1" color={M.leftInk}>
            {wishDaysLeft(wish.daysLeft)}
          </Text>
        </View>
      </WishNote>

      <WishFlower
        x={flower.x}
        y={flower.y}
        width={(wish.joined ? wishScene.held.joinedWidth : wishScene.held.width) * k}
        glow={wish.joined ? "bright" : "soft"}
      />

      <View
        style={[styles.nav, { bottom: Math.max(insets.bottom, space.md) + wishScene.nav.bottom }]}
      >
        {position > 0 ? (
          <NavButton icon="chevron-left" label="이전 소원" onPress={() => onTurn(-1)} />
        ) : (
          <View />
        )}
        <NavButton icon="chevron-right" label="다음 소원" onPress={() => onTurn(1)} />
      </View>

      <View
        style={[styles.pill, { bottom: Math.max(insets.bottom, space.md) + pondScene.pillBottom }]}
      >
        {wish.joined ? (
          <ScenePillButton label={WISH_PILL.joined} onPress={() => undefined} disabled />
        ) : (
          <HoldPill
            label={pillLabel}
            locked={false}
            onHoldStart={() => setPillLabel(WISH_PILL.hold)}
            onHoldCancel={() => {
              onJoinCancelled();
              setPillLabel(WISH_PILL.holdShort);
              if (timer.current != null) clearTimeout(timer.current);
              timer.current = setTimeout(
                () => setPillLabel(WISH_PILL.hold),
                wishSceneMotion.shortPress,
              );
            }}
            onDone={onJoin}
          />
        )}
      </View>

      {menu ? (
        <BottomSheet closable onDismiss={() => setMenu(false)}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setMenu(false);
              onReport();
            }}
            style={styles.menuRow}
          >
            <Text variant="body1">{WISH_REPORT.action}</Text>
          </Pressable>
        </BottomSheet>
      ) : null}
    </View>
  );
}

function NavButton({
  icon,
  label,
  onPress,
}: {
  icon: "chevron-left" | "chevron-right";
  label: string;
  onPress: () => void;
}) {
  return (
    <VintagePressable
      accessibilityLabel={label}
      onPress={onPress}
      radius={wishScene.nav.size / 2}
      faceStyle={styles.navFace}
      style={styles.navButton}
    >
      <Icon name={icon} size={20} color={restScene.ink} />
    </VintagePressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: space.xl,
    right: space.xl,
    flexDirection: "row",
    gap: wishScene.bar.gap,
  },
  tick: {
    flex: 1,
    height: wishScene.bar.height,
    borderRadius: radius.full,
    backgroundColor: wishScene.bar.color,
  },
  barFlower: {
    position: "absolute",
    width: wishScene.bar.flower,
    height: wishScene.bar.flower * wishScene.flowerAspect,
  },
  note: {
    minHeight: M.one.minHeight,
    paddingTop: space.xl2,
    paddingHorizontal: space.xl,
    paddingBottom: space.xl4,
    gap: space.lg,
  },
  text: { textAlign: "center", fontSize: M.one.fontSize, lineHeight: M.one.lineHeight },
  longText: { fontSize: M.long.fontSize, lineHeight: M.long.lineHeight },
  left: {
    position: "absolute",
    right: space.md,
    bottom: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.medium,
    backgroundColor: M.leftFace,
  },
  nav: {
    position: "absolute",
    left: space.xl,
    right: space.xl,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  navButton: { width: wishScene.nav.size },
  navFace: {
    height: wishScene.nav.size,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: restSceneSize.vintage.stroke,
  },
  pill: { position: "absolute", left: space.xl, right: space.xl },
  menuRow: { minHeight: 54, justifyContent: "center" },
});
