import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, Text } from "@/components/ds";
import { VintagePressable } from "@/components/rest/scene/VintagePressable";
import { meditation, meditationSize, radius, restScene, restSceneSize, space } from "@/design/ds";
import {
  MEDITATION_CONCEPTS,
  MEDITATION_INFO,
  type MeditationConcept,
} from "@/features/rest/model/meditation";
import { openExternalLink } from "@/lib/links";

const BACK = restSceneSize.back;

function Row({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <Text variant="label1" color={meditation.term}>
        {term}
      </Text>
      {children}
    </View>
  );
}

/**
 * 콘텐츠 정보 — 설명 카드의 「참고한 실습 보기」가 연다. 무엇을 참고했고 어떻게 재구성했는지 밝히고, 효과를
 * 약속하지 않는다. 지금 풍경에서 시작해 위 알약으로 다른 풍경의 정보도 본다. 고른 풍경이 바뀌지는 않는다.
 * 재생 중에 열면 닫을 때까지 시간이 멈춘다.
 */
export function MeditationInfoSheet({
  concept,
  onClose,
}: {
  concept: MeditationConcept;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [shownId, setShownId] = useState(concept.id);
  const shown = MEDITATION_CONCEPTS.find((c) => c.id === shownId) ?? concept;
  const { info } = shown;
  return (
    <View accessibilityViewIsModal style={[StyleSheet.absoluteFill, styles.dim]}>
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text variant="title3Hand" color={restScene.ink} accessibilityRole="header">
            {MEDITATION_INFO.title}
          </Text>
          <VintagePressable
            accessibilityLabel="닫기"
            onPress={onClose}
            radius={BACK / 2}
            style={styles.close}
            faceStyle={styles.closeFace}
          >
            <Icon name="close" size={20} color={restScene.ink} />
          </VintagePressable>
        </View>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + space.xl3 }]}
        >
          <View style={styles.tabs}>
            {MEDITATION_CONCEPTS.map((c) => {
              const on = c.id === shownId;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="tab"
                  accessibilityLabel={`${c.name} 정보 보기`}
                  accessibilityState={{ selected: on }}
                  hitSlop={space.xs}
                  onPress={() => setShownId(c.id)}
                  style={[styles.tab, on ? styles.tabOn : null]}
                >
                  <Text variant="label1" color={restScene.ink}>
                    {c.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Row term={MEDITATION_INFO.concept}>
            <Text variant="body1" color={restScene.ink}>
              {`${shown.name}: ${shown.sub}`}
            </Text>
          </Row>
          <Row term={MEDITATION_INFO.desc}>
            <Text variant="body1" color={restScene.ink}>
              {info.desc}
            </Text>
          </Row>
          <Row term={MEDITATION_INFO.practice}>
            <Text variant="body1" color={restScene.ink}>
              {info.practice}
            </Text>
          </Row>
          <Row term={MEDITATION_INFO.author}>
            <Text variant="body1" color={restScene.ink}>
              {info.author}
            </Text>
          </Row>
          <Row term={MEDITATION_INFO.source}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={`출처 ${info.linkLabel} 열기`}
              hitSlop={space.sm}
              onPress={() => void openExternalLink(info.link)}
            >
              <Text variant="body1" color={meditation.link} style={styles.link}>
                {info.linkLabel}
              </Text>
            </Pressable>
          </Row>
          <View style={styles.note}>
            <View style={styles.badge}>
              <Text variant="label1" color={restScene.ink}>
                {MEDITATION_INFO.badge}
              </Text>
            </View>
            <Text variant="body1" color={restScene.ink}>
              {info.note}
            </Text>
          </View>
          <Text variant="body2" color={meditation.caption}>
            {MEDITATION_INFO.disclaimer}
          </Text>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { backgroundColor: meditation.dimInfo },
  sheet: {
    flex: 1,
    marginTop: meditationSize.infoTop,
    paddingTop: space.xl2,
    borderTopLeftRadius: radius.xlarge,
    borderTopRightRadius: radius.xlarge,
    backgroundColor: restScene.surface,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl2,
    paddingBottom: space.lg,
  },
  close: { width: BACK },
  closeFace: { height: BACK, alignItems: "center", justifyContent: "center" },
  body: { paddingHorizontal: space.xl2, gap: space.lg },
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  tab: {
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: restSceneSize.vintage.stroke,
    borderColor: restScene.ink,
    backgroundColor: restScene.surface,
  },
  tabOn: { backgroundColor: restScene.accent },
  row: { gap: space.xs },
  link: { textDecorationLine: "underline" },
  note: {
    padding: space.lg,
    gap: space.sm,
    borderRadius: radius.large,
    backgroundColor: meditation.noteFace,
  },
  badge: {
    alignSelf: "flex-start",
    paddingVertical: space.xs,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: restSceneSize.vintage.stroke,
    borderColor: restScene.ink,
    backgroundColor: restScene.accent,
  },
});
