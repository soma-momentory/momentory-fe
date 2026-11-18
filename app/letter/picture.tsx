import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";

import {
  Button,
  Icon,
  Screen,
  Spinner,
  TabPaperBackground,
  Text,
  TopNavigation,
} from "@/components/ds";
import { label as labelColor, radius, line, space } from "@/design/ds";
import { fetchLetter } from "@/features/letter/data/letterApi";
import {
  LETTER_PICTURE_ASPECT,
  useLetterPicture,
  useLetters,
} from "@/features/letter/model/letter";
import { usePictureCard } from "@/features/letter/ui/usePictureCard";

/**
 * 바바의 4컷 크게 보기(2026-11-18) — 일기 상세의 쪽지 · 편지 속 그림을 누르면 온다. 그림을 화면 너비로 보여 주고
 * 아래에서 바로 저장 · 공유한다. 저장 · 공유는 그림만이 아니라 꾸민 바바를 단 카드를 보낸다(`usePictureCard`).
 *
 * 토스트가 보이도록 모달이 아니라 편지 스택의 한 화면으로 둔다.
 */
export default function LetterPictureScreen() {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const letter = useLetters((s) => (date == null ? undefined : s.letters[date]));
  /** 앱을 이 주소로 바로 연 경우 — 남겨 둔 편지가 없으면 받아 온다 */
  const [missing, setMissing] = useState(date == null);
  useEffect(() => {
    if (date == null || useLetters.getState().letters[date] != null) return;
    void fetchLetter(date).then((result) => {
      if (result.ok) useLetters.getState().keep(result.data);
      else setMissing(true);
    });
  }, [date]);

  const { picture, failed } = useLetterPicture(letter?.hasPicture === true ? letter.id : null);
  const { cardElement, busy, save, share } = usePictureCard(picture, date);
  const unavailable = missing || failed || letter?.hasPicture === false;

  const close = () => (router.canGoBack() ? router.back() : router.replace("/home"));

  return (
    <Screen grid={false} backdrop={<TabPaperBackground tab="홈" />}>
      <TopNavigation leading="close" onLeadingPress={close} />
      {cardElement}
      <View style={styles.body}>
        {picture != null ? (
          <View style={styles.frame}>
            <Image
              source={{ uri: picture }}
              style={styles.picture}
              accessibilityLabel="바바가 그린 그날 하루"
            />
          </View>
        ) : unavailable ? (
          <Text variant="body2" color={labelColor.alternative}>
            그림을 불러오지 못했어요
          </Text>
        ) : (
          <Spinner />
        )}
      </View>
      {picture != null ? (
        <View style={styles.actions}>
          {/* 저장과 공유는 무게가 같다 — 둘 다 테두리 버튼으로 나란히 둔다(2026-11-18 사용자) */}
          <View style={styles.action}>
            <Button
              variant="outlined"
              label="저장하기"
              leading={<Icon name="download" size={20} />}
              fill
              disabled={busy}
              onPress={save}
            />
          </View>
          <View style={styles.action}>
            <Button
              variant="outlined"
              label="공유하기"
              leading={<Icon name="share" size={20} />}
              fill
              disabled={busy}
              onPress={share}
            />
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: {
    width: "100%",
    aspectRatio: LETTER_PICTURE_ASPECT,
    borderRadius: radius.large,
    borderWidth: 1,
    borderColor: line.neutral,
    overflow: "hidden",
  },
  picture: { width: "100%", height: "100%" },
  actions: { flexDirection: "row", gap: space.sm, paddingVertical: space.md },
  action: { flex: 1 },
});
