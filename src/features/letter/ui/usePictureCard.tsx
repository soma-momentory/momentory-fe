import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { letterPaper } from "@/design/ds/letterPaper";
import { PictureShareCard } from "@/features/letter/ui/PictureShareCard";
import { useWardrobe } from "@/features/wardrobe/model/wardrobe";
import { savePictureCard, sharePictureCard } from "@/lib/pictureCard";
import { showToast } from "@/lib/toast";

const EXPORT_SIZE = {
  width: letterPaper.card.exportWidth,
  height: letterPaper.card.exportHeight,
};

/**
 * 그림일기 저장 · 공유 — 편지 화면과 크게 보기가 함께 쓴다. `cardElement` 를 화면 어딘가에 두면 지금 꾸민 바바를 단 카드가
 * 화면 밖에 그려지고, `save` · `share` 가 그 카드를 이미지로 찍어 보낸다. 카드 그림이 읽히는 동안과 찍는 동안 `busy` 가 참이다.
 */
export function usePictureCard(picture: string | null, date: string | undefined) {
  const card = useRef<View>(null);
  const outfit = useWardrobe((s) => s.outfit);
  const [sending, setSending] = useState(false);
  const [ready, setReady] = useState(false);
  const busy = sending || !ready;

  const send = async (kind: "save" | "share") => {
    if (busy) return;
    setSending(true);
    const result =
      kind === "save"
        ? await savePictureCard(card, EXPORT_SIZE)
        : await sharePictureCard(card, EXPORT_SIZE);
    setSending(false);
    // 공유는 시트가 결과를 보여 준다 — 저장만 한 줄로 알린다. 실패 · 거절은 둘 다 한 줄로 흡수한다
    if (kind === "save" && result === "ok") showToast("바바가 사진첩에 넣어 뒀어요", "positive");
    else if (result === "denied") showToast("사진 저장 권한이 꺼져 있어요", "negative");
    else if (result === "failed") {
      showToast(kind === "save" ? "사진첩에 넣지 못했어요" : "공유하지 못했어요", "negative");
    }
  };

  const cardElement =
    picture != null && date != null ? (
      // 화면 밖 — 보이지 않지만 그려져 있어야 찍힌다
      <View style={styles.offscreen} pointerEvents="none" accessibilityElementsHidden>
        <PictureShareCard
          ref={card}
          picture={picture}
          date={date}
          outfit={outfit}
          onReady={setReady}
        />
      </View>
    ) : null;

  return {
    cardElement,
    busy,
    save: () => void send("save"),
    share: () => void send("share"),
  };
}

const styles = StyleSheet.create({
  offscreen: { position: "absolute", top: 0, left: -letterPaper.card.width * 4 },
});
