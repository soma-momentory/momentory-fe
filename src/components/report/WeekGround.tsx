import { Image, StyleSheet } from "react-native";

/**
 * 「이번 주 감정들」의 **땅** — 조약돌 일곱 더미가 놓인 **모래 언덕 두 겹**
 * (2026-09-12 · 사용자가 준 그림 그대로).
 *
 * ## 선이 아니라 땅이다
 *
 * 처음에는 hairline 한 줄이 그 자리에 있었다(시안 주석 「땅느낌」). 면으로 바꾸면 조약돌이
 * 「줄에 걸려 있다」가 아니라 「놓여 있다」로 읽힌다.
 *
 * ⚠ **짙은 갈색 언덕 한 겹을 거쳐 왔다**(2026-09-12 · 「별로다」) — 그 띠가 조약돌보다 먼저
 * 눈에 들어왔다. 지금 것은 **배경과 같은 온도의 모래색 두 겹**이라 뒤로 물러난다.
 *
 * ## 벡터로 흉내 내지 않고 **받은 그림을 쓴다**
 *
 * 잠깐 경로 두 줄로 비슷하게 그려 봤지만, 그림이 있는데 손으로 베낀 곡선을 두면 나중에
 * 원본이 바뀔 때 둘이 갈린다. `assets/report/ground.png` 는 받은 파일에서 흰 배경만 걷어낸
 * 것이고(`scripts/keyout-report-ground.py`), 새 그림을 받으면 그 스크립트를 다시 돌린다.
 *
 * ⚠ **상자를 꽉 채운다**(2026-09-12 · 사용자 요청 「카드 밑에 끝까지 꽉 채우게」). 높이를
 * 비율로 잡던 때는 언덕이 요일 글자 위에서 끝났는데, 지금은 **조약돌 아래부터 카드 바닥까지**가
 * 이 그림의 자리다 — 그 상자를 부르는 쪽(`WeekEmotionStack`)이 잡고, 여기서는 가로·세로 모두
 * 채운다(`stretch`). 받은 그림이 전보다 세로로 넉넉해(가로세로비 5.19) 늘어나도 결이 뭉개지지 않는다.
 *
 * 낭독기에는 없다 — 「땅」은 어디에 놓였는지를 말할 뿐이고, 무엇이 있었는지는 조약돌 칸의
 * 이름이 이미 읽는다.
 */

/**
 * 그림을 **옅게 깔아** 카드 면에 스며들게 한다(2026-09-12 · 사용자 요청 「조금 더 투명하게」).
 *
 * 받은 그림 그대로는 모래색 두 겹이 또렷해서, 조약돌이 그 위에 **얹힌 스티커**처럼 보였다.
 * 조금 물리면 땅이 배경 쪽으로 한 겹 물러나고 조약돌만 또렷하게 남는다 — 이 자리에서
 * 땅이 할 일은 **어디에 놓였는지**를 말하는 것뿐이다.
 */
const GROUND_OPACITY = 0.7;

const GROUND = require("../../../assets/report/ground.png");

export function WeekGround() {
  return (
    <Image
      source={GROUND}
      style={styles.ground}
      resizeMode="stretch"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  // 부르는 쪽이 잡아 준 상자를 가로·세로 모두 채운다 — 옅게 깔린다(위 `GROUND_OPACITY`)
  ground: { width: "100%", height: "100%", opacity: GROUND_OPACITY },
});
