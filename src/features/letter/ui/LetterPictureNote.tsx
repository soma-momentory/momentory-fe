import { Image, Pressable, StyleSheet, View } from "react-native";

import { MaskingTape } from "@/components/ds/MaskingTape";
import { Text } from "@/components/ds";
import { background, label as labelColor, line, radius } from "@/design/ds";
import { letterPaper } from "@/design/ds/letterPaper";
import { LETTER_PICTURE_ASPECT } from "@/features/letter/model/letter";
import { letterPaperStyle } from "@/features/letter/ui/LetterPaper";
import { letterNoteStyle } from "@/features/letter/ui/LetterPreviewCard";

/**
 * 일기 상세의 「바바의 4컷」 쪽지(2026-11-18 사용자 제안) — 편지 쪽지와 같은 종이 · 테이프로 따로 붙이고, 기울기만 반대로
 * 준다. 누르면 그림을 화면 가득 크게 본다(`app/letter/picture.tsx`). 이름에 「오늘」을 쓰지 않는다 — 지난 일기에서도 보인다.
 */
export function LetterPictureNote({ picture, onPress }: { picture: string; onPress: () => void }) {
  const { note } = letterPaper;
  return (
    <View style={letterNoteStyle.slot}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="바바의 4컷 크게 보기"
        onPress={onPress}
        style={[
          letterPaperStyle.paper,
          letterNoteStyle.note,
          styles.note,
          { transform: [{ rotate: note.pictureTilt }] },
        ]}
      >
        {({ pressed }) => (
          <>
            <View style={letterNoteStyle.tapeSlot} pointerEvents="none">
              <View style={letterNoteStyle.tape}>
                <MaskingTape color={background.splash} />
                <Text variant="tapeHand" color={labelColor.normal}>
                  바바의 4컷
                </Text>
              </View>
            </View>
            <View style={styles.frame}>
              <Image source={{ uri: picture }} style={styles.picture} />
            </View>
            {pressed ? (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, letterNoteStyle.pressed]}
              />
            ) : null}
          </>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { alignItems: "center" },
  frame: {
    width: letterPaper.note.pictureWidth,
    aspectRatio: LETTER_PICTURE_ASPECT,
    borderRadius: radius.medium,
    borderWidth: 1,
    borderColor: line.neutral,
    overflow: "hidden",
  },
  picture: { width: "100%", height: "100%" },
});
