import { Image, StyleSheet, View } from "react-native";

/** 사용자 제공 갈색 모눈·별 배경. 원본 비율을 유지해 화면을 채우며 넘치는 가장자리만 자른다. */
export function RetroDiaryBackground() {
  return (
    <View
      testID="retro-diary-background"
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    >
      <Image
        source={require("../../../../assets/retro/diary-star-background.png")}
        resizeMode="cover"
        style={styles.image}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  image: { width: "100%", height: "100%" },
});
