import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { Icon, Text } from "@/components/ds";
import {
  background,
  elevation,
  label as labelColor,
  layout,
  line,
  onboardingArt,
  primary,
  radius,
  space,
  status,
} from "@/design/ds";
import { useScreenBottomInset } from "@/components/ds/Screen";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ReflectionButton } from "@/features/home/ui/v2/HeroCard";

/**
 * 온보딩 v2 화면의 공통 틀(2026-10-25 · `proto-v2.html`).
 *
 * 한 장에는 **그림 하나 · 굵은 문장 하나 · 버튼 하나**를 같은 자리, 같은 순서로 둔다 —
 * 위쪽 진행 막대와 「건너뛰기」, 가운데 그림과 제목 · 설명, 아래 주 버튼과 보조 링크.
 * 그림과 글은 한 묶음으로 붙고, 남는 높이는 위와 버튼 앞에 나눈다.
 */

/**
 * 홈과 같은 바바 — 홈 v2 의 레이어 9장(`assets/home/v2/baba/`)을 **미리 한 장으로 합친 그림**이다.
 * 레이어를 그대로 겹치면 9장이 따로 풀려서 화면이 바뀔 때마다 몸통부터 차례로 보였다(2026-10-25 실기기).
 * 한 장이라 한 번에 뜨고, `expo-image` 메모리 캐시에 남아 다음 화면부터는 바로 보인다.
 * 투명 여백도 잘라 냈다 — `size` 가 곧 바바의 키다.
 */
const BABA = require("../../../assets/home/v2/baba-composite.png");
const BABA_ASPECT = 436 / 600;

export function Baba({ size }: { size: number }) {
  return (
    <Image
      source={BABA}
      style={{ width: size * BABA_ASPECT, height: size }}
      contentFit="contain"
      cachePolicy="memory"
      transition={0}
      accessible={false}
    />
  );
}

/** 바바의 말 — 흰 말풍선 */
export function Bubble({
  children,
  style,
  large,
}: {
  children: string;
  style?: ViewStyle;
  large?: boolean;
}) {
  return (
    <View style={[styles.bubble, style]}>
      <Text variant={large ? "heading1" : "body2"} color={labelColor.strong}>
        {children}
      </Text>
    </View>
  );
}

/**
 * 진행 막대 — **칸**으로만 보여 준다. 숫자 진행률은 쓰지 않는다(`RULES.md` 4).
 * 지난 칸은 옅은 초록, 지금 칸은 길고 진한 초록이다.
 */
export function Segments({ count, index }: { count: number; index: number }) {
  return (
    <View
      style={styles.segments}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, i) => (
        <View
          key={i}
          style={[
            styles.segment,
            i < index && styles.segmentDone,
            i === index && styles.segmentCurrent,
          ]}
        />
      ))}
    </View>
  );
}

/** 이름 · 나이 성별 · 캘린더 · 알림 묶음의 막대 — 칸이 화면 폭을 나눠 갖는다 */
export function SetupBar({ index, count }: { index: number; count: number }) {
  return (
    <View
      style={styles.setupBar}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={[styles.setupCell, i <= index && styles.setupCellOn]} />
      ))}
    </View>
  );
}

/**
 * 「‹」 — 돌아갈 기록이 없으면 **앞 단계로** 간다. 화면이 기록 없이 열리면(개발 중 새로고침 · 앱이 그 주소로
 * 복원 · Lab 에서 바로 열기) `router.back()` 은 아무 일도 하지 않았다 — 눌리는데 아무 일도 없는 버튼이 된다.
 */
export const backOr = (previous: Href) => () => {
  if (router.canGoBack()) router.back();
  else router.replace(previous);
};

/** 밑줄 친 작은 글자 버튼 — 「건너뛰기」 · 「나중에」 */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={12} style={styles.link}>
      <Text variant="label1" color={labelColor.neutral} style={styles.linkText}>
        {label}
      </Text>
    </Pressable>
  );
}

type FrameProps = {
  /** 위 왼쪽 「‹」 — 질문 화면만 */
  onBack?: () => void;
  /** 위 가운데 — 진행 막대 */
  progress?: ReactNode;
  /** 위 오른쪽 「건너뛰기」 */
  onSkip?: () => void;
  /** 가운데 그림 */
  art?: ReactNode;
  title?: string;
  body?: string;
  emphasis?: string;
  cite?: string;
  /** 그림 · 글 대신 위에서부터 채우는 내용(질문 · 이름 입력) */
  children?: ReactNode;
  primary?: { label: string; onPress: () => void; disabled?: boolean };
  secondary?: { label: string; onPress: () => void };
  /** 버튼 아래 한 줄 — 저장 실패 같은 것. 모달을 띄우지 않는다(`RULES.md` 4) */
  error?: string | null;
  /** 아래쪽으로 번지는 바탕(「그래서, 바바가 도와줄게요」) */
  turn?: boolean;
};

export function OnboardingFrame({
  onBack,
  progress,
  onSkip,
  art,
  title,
  body,
  emphasis,
  cite,
  children,
  primary: main,
  secondary,
  error,
  turn,
}: FrameProps) {
  const insets = useSafeAreaInsets();
  const bottom = useScreenBottomInset();
  const hasTop = onBack != null || progress != null || onSkip != null;

  return (
    <View style={[styles.root, turn && styles.turn, { paddingBottom: bottom }]}>
      <View style={[styles.top, { paddingTop: insets.top + space.md }]}>
        <View style={styles.topSide}>
          {onBack != null ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="뒤로"
              onPress={onBack}
              hitSlop={12}
            >
              <Icon name="arrow-left" size={24} color={labelColor.normal} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.topMiddle}>{progress}</View>
        <View style={[styles.topSide, styles.topRight]}>
          {onSkip != null ? (
            <Pressable accessibilityRole="button" onPress={onSkip} hitSlop={12}>
              <Text variant="caption1" color={labelColor.alternative}>
                건너뛰기
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* 입력이 있는 화면(이름 · 기타)에서 버튼이 키보드 뒤로 숨지 않게 바로 위로 올린다 — `BasicInfoEditor` 와 같다 */}
      <KeyboardAvoidingView
        style={styles.scroll}
        behavior="padding"
        keyboardVerticalOffset={layout.keyboardGap}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, !hasTop && styles.contentNoTop]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {children ?? (
            <View style={styles.center}>
              {art}
              {title != null ? (
                <Text variant="title3Hand" color={labelColor.strong} style={styles.title}>
                  {title}
                </Text>
              ) : null}
              {body != null ? (
                <Text variant="body2Reading" color={labelColor.neutral} style={styles.body}>
                  {body}
                  {emphasis != null ? (
                    <Text variant="body2Reading" color={labelColor.strong}>
                      {`\n${emphasis}`}
                    </Text>
                  ) : null}
                </Text>
              ) : null}
              {cite != null ? (
                <Text variant="caption2" color={labelColor.alternative} style={styles.cite}>
                  {cite}
                </Text>
              ) : null}
            </View>
          )}
        </ScrollView>

        <View style={styles.actions}>
          {main != null ? (
            // 홈 「일기 작성하기」와 같은 천 라벨 — 앱의 주 버튼은 하나의 결이다(2026-11-10)
            <ReflectionButton
              testID="onboarding-primary"
              label={main.label}
              disabled={main.disabled}
              onPress={main.onPress}
              style={styles.primary}
            />
          ) : null}
          {secondary != null ? (
            <TextLink label={secondary.label} onPress={secondary.onPress} />
          ) : null}
          {error != null ? (
            <Text
              variant="caption1"
              color={status.negative}
              style={styles.error}
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
            >
              {error}
            </Text>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: background.normal },
  turn: { backgroundColor: onboardingArt.turn },
  top: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space.xl,
    minHeight: 44,
  },
  topSide: { width: 64 },
  topRight: { alignItems: "flex-end" },
  topMiddle: { flex: 1, alignItems: "center" },
  scroll: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: space.xl, paddingTop: space.md },
  contentNoTop: { paddingTop: space.xl3 },
  // 그림과 글을 한 묶음으로 붙이고 남는 높이는 위아래로 나눈다
  center: { flex: 1, justifyContent: "center", alignItems: "stretch" },
  title: { marginTop: space.xl3, textAlign: "center" },
  body: { marginTop: space.sm, textAlign: "center" },
  cite: { marginTop: space.xs, textAlign: "center" },
  actions: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
    gap: space.md,
    alignItems: "stretch",
  },
  primary: { marginTop: 0, marginHorizontal: 0 },
  link: { alignSelf: "center", paddingVertical: space.xs },
  linkText: { textDecorationLine: "underline" },
  error: { textAlign: "center" },
  bubble: {
    backgroundColor: background.elevated,
    borderRadius: radius.xlarge,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    ...elevation.floating,
  },
  segments: { flexDirection: "row", alignItems: "center", gap: 6, height: 5 },
  segment: { width: 14, height: 5, borderRadius: 3, backgroundColor: line.neutral },
  segmentDone: { backgroundColor: onboardingArt.segmentDone },
  segmentCurrent: { width: 32, backgroundColor: primary.heavy },
  setupBar: { flexDirection: "row", gap: 6, alignSelf: "stretch" },
  setupCell: { flex: 1, height: 5, borderRadius: 4, backgroundColor: line.neutral },
  setupCellOn: { backgroundColor: primary.heavy },
});
