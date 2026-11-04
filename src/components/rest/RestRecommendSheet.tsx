import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { BottomSheet, Button, EmotionPebble } from "@/components/ds";
import { NotchedTapeLabel } from "@/components/ds/NotchedTapeLabel";
import { homeV2, layout, restRecommendSize, space } from "@/design/ds";
import { emotionName, type EmotionId } from "@/features/emotion/model/emotion";
import type { RestContent } from "@/features/rest/model/contents";

import { RestCardPressable } from "./RestCardPressable";
import { RestPolaroid } from "./RestPolaroid";

/**
 * 일기를 쓴 날 쉼터(`R1`)에 올라오는 **쉼 추천 시트** (2026-11-02 · 사용자가 고른 시안).
 *
 * 3초 안에 세 가지만 읽히게 한다. 왜 떴는지는 제목과 오늘의 조약돌이, 무엇을 하는지는 쉼터 칸이,
 * 어디를 누르는지는 버튼이 말한다. 지난 판(2026-10-12)은 이유 줄 · 장면 그림 · 질문 · 효용 · 알약
 * 셋을 쌓아 무엇을 전하려는지 모르겠다는 평을 받았다.
 *
 * - 쉼터 칸은 폴라로이드(`RestPolaroid`)다 — 탭은 테마 카드로 바뀌었고 시트는 아직 이 부품이다. 시트만의
 *   문구와 그림이 없다. 탭에서처럼 칸을 눌러도 그 쉼으로 간다
 * - 감정이 없는 날은 조약돌과 화살표를 빼고 칸만 세운다. 빈 조약돌은 비어 있다는 느낌만 준다
 * - 주 버튼 「지금 해 볼게요」 아래 「다른 쉼터 둘러보기」는 닫고 쉼터에 남는다. ✕ · 쓸어내리기 ·
 *   바깥 누르기와 같은 닫기다(공용 시트가 맡는다)
 *
 * **모달이 아니라 시트다** — 화면을 막는 모달은 되돌릴 수 없는 행동의 확인에만 쓴다(`DESIGN.md`).
 */
type Props = {
  content: RestContent;
  /** 오늘 일기의 첫 감정 — 없으면 칸만 선다 */
  emotion: EmotionId | null;
  title: string;
  onAccept: () => void;
  onDismiss: () => void;
};

export function RestRecommendSheet({ content, emotion, title, onAccept, onDismiss }: Props) {
  return (
    <BottomSheet title={title} closable onDismiss={onDismiss}>
      <View style={[styles.row, emotion == null && styles.rowSolo]}>
        {emotion != null ? (
          <>
            <View style={styles.stone}>
              <EmotionPebble id={emotion} size={S.pebble} />
              <NotchedTapeLabel color={homeV2.color.date} style={styles.tape}>
                {emotionName(emotion)}
              </NotchedTapeLabel>
            </View>
            <Svg
              width={S.arrow.width}
              height={S.arrow.height}
              viewBox="0 0 46 24"
              fill="none"
              stroke={homeV2.color.muted}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              accessible={false}
            >
              <Path d="M2 14 C12 8 24 18 40 11" strokeDasharray="1 6" />
              <Path d="M33 5 L42 10 L35 18" />
            </Svg>
          </>
        ) : null}
        <RestCardPressable
          accessibilityLabel={`${content.title} 열기`}
          onPress={onAccept}
          style={emotion == null ? styles.cardSolo : styles.card}
        >
          <RestPolaroid item={content} size="sheet" />
        </RestCardPressable>
      </View>

      <View style={styles.actions}>
        <Button label="지금 해 볼게요" fill raised onPress={onAccept} />
        <View style={styles.secondary}>
          <Button label="다른 쉼터 둘러보기" variant="text" size="small" onPress={onDismiss} />
        </View>
      </View>
    </BottomSheet>
  );
}

const S = restRecommendSize;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: space.xs },
  rowSolo: { justifyContent: "center" },
  stone: { width: S.stone, alignItems: "center", gap: space.xs },
  tape: { alignSelf: "center" },
  card: { flex: 1 },
  cardSolo: { width: S.soloCard },
  // 주 버튼과 보조 버튼 사이 — 같은 짝을 쓰는 화면이 전부 같은 값이다(`layout.dockActionGap`)
  actions: { gap: layout.dockActionGap },
  secondary: { alignItems: "center" },
});
