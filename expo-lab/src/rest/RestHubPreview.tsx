import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { BottomNavigation } from "../../../src/components/ds/BottomNavigation";
import { Screen } from "../../../src/components/ds/Screen";
import { TabPaperBackground } from "../../../src/components/ds/TabPaperBackground";
import { PreviewFontScaleContext } from "../../../src/components/ds/Text";
import { RestRecommendSheet } from "../../../src/components/rest/RestRecommendSheet";
import { background, layout } from "../../../src/design/ds";
import { REST_CONTENTS } from "../../../src/features/rest/model/contents";
import { RestHubView } from "../../../src/features/rest/ui/RestHubView";

export const restHubScenarios = [
  { id: "default", label: "오늘·과거 카드 있음" },
  { id: "no-today", label: "오늘 카드 없음" },
  { id: "no-recent", label: "과거 카드 없음·오늘 카드 있음" },
  { id: "empty", label: "오늘·과거 카드 없음" },
  { id: "long-summary", label: "긴 요약 문구" },
  { id: "hint", label: "오늘 추천 표시" },
  { id: "sheet", label: "추천 시트 열기·닫기" },
] as const;

export type RestHubScenarioId = (typeof restHubScenarios)[number]["id"];

const SUMMARIES: Record<RestHubScenarioId, string> = {
  default: "오늘의 바람카드가 있어요",
  "no-today": "가장 최근 카드는 10월 12일이에요",
  // 오늘 카드가 있다면 최신 카드도 오늘 것이므로 운영 요약은 기본 상태와 같다.
  "no-recent": "오늘의 바람카드가 있어요",
  empty: "회고를 마치면 그날의 바람카드가 여기 남아요",
  "long-summary":
    "가장 최근 카드는 10월 12일이에요. 글씨가 크거나 화면이 좁을 때에도 이 안내 문구가 카드 안에서 자연스럽게 줄바꿈되는지 확인해요.",
  hint: "오늘의 바람카드가 있어요",
  sheet: "오늘의 바람카드가 있어요",
};

const TABS = [
  { name: "홈", label: "홈", icon: "home" },
  { name: "쉼터", label: "쉼터", icon: "heart" },
  { name: "보관함", label: "보관함", icon: "folder-job" },
  { name: "리포트", label: "리포트", icon: "document" },
  { name: "마이", label: "마이", icon: "nav-my-page" },
] as const;

export function RestHubPreview({
  design,
  scenarioId,
  fontScale = 1,
  onMessage,
}: {
  design?: import("../../../src/design/studioDesign").StudioDesign;
  scenarioId: string;
  fontScale?: 1 | 1.3 | 1.5;
  onMessage: (message: string) => void;
}) {
  const scenario = restHubScenarios.find((item) => item.id === scenarioId)?.id ?? "default";
  const [sheetOpen, setSheetOpen] = useState(scenario === "sheet");
  const recommended = REST_CONTENTS[0]!;
  const contents =
    scenario === "hint"
      ? REST_CONTENTS.map((item) =>
          item.id === recommended.id ? { ...item, note: "오늘 추천" } : item,
        )
      : REST_CONTENTS;

  return (
    <PreviewFontScaleContext.Provider value={fontScale}>
      <View style={styles.root}>
        <Screen
          proportional
          padded={false}
          edges={[]}
          grid={false}
          backdrop={<TabPaperBackground />}
        >
          <View style={styles.body}>
            <RestHubView
              design={design}
              summary={SUMMARIES[scenario]}
              contents={contents}
              onOpenCards={() => onMessage("바람카드 이동은 Lab Mock입니다.")}
              onOpenContent={(item) => onMessage(`${item.title} 이동은 Lab Mock입니다.`)}
            />
          </View>
          <BottomNavigation
            items={TABS}
            active="쉼터"
            onPress={(tab) => onMessage(`${tab} 탭 이동은 Lab Mock입니다.`)}
          />
          <View style={styles.underTab} />
        </Screen>
        {sheetOpen ? (
          <RestRecommendSheet
            content={recommended}
            reason="바바가 하나 골라 봤어요"
            onAccept={() => {
              setSheetOpen(false);
              onMessage(`${recommended.title} 이동은 Lab Mock입니다.`);
            }}
            onDismiss={() => setSheetOpen(false)}
          />
        ) : null}
      </View>
    </PreviewFontScaleContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0 },
  body: { flex: 1, minHeight: 0, paddingHorizontal: layout.screenPadding },
  underTab: { height: layout.minBottomInset, backgroundColor: background.elevated },
});
