import { StyleSheet, View } from "react-native";

import { Card, Icon, Text } from "@/components/ds";
import { RestCardPressable } from "@/components/rest/RestCardPressable";
import { RestContentGrid } from "@/components/rest/RestContentGrid";
import { label as labelColor, primary, space } from "@/design/ds";
import { REST_CONTENTS_PROMPT, type RestContent } from "@/features/rest/model/contents";

type Props = {
  summary: string;
  contents: readonly RestContent[];
  onOpenCards: () => void;
  onOpenContent: (content: RestContent) => void;
};

/** 쉼터 탭의 표시 영역. 데이터 조회, 추천 결정, 저장 및 화면 이동은 호출자가 맡는다. */
export function RestHubView({ summary, contents, onOpenCards, onOpenContent }: Props) {
  return (
    <>
      <View style={styles.header}>
        <Text variant="title3Hand" color={labelColor.strong}>
          쉼터
        </Text>
      </View>

      <RestCardPressable accessibilityLabel="바람카드 보기" onPress={onOpenCards}>
        <Card padding="loose" style={styles.entry}>
          <View style={styles.head}>
            <Text variant="heading1" color={labelColor.strong}>
              바람카드
            </Text>
            <Icon name="heart" size={20} color={primary.strong} />
          </View>

          <Text variant="body2" color={labelColor.neutral}>
            {summary}
          </Text>
        </Card>
      </RestCardPressable>

      <View style={styles.contents}>
        <Text variant="body2" color={labelColor.neutral}>
          {REST_CONTENTS_PROMPT}
        </Text>
        <RestContentGrid items={contents} onOpen={onOpenContent} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.sm, paddingBottom: space.xl },
  entry: { gap: space.md },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.md,
  },
  contents: { paddingTop: space.xl2, gap: space.md },
});
