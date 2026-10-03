import { Image } from "react-native";

/**
 * 일기 저장 완료(`C7`) 화면 위쪽의 **온천 카피바라** — 동그란 그림 한 장(2026-10-03 · 사용자 요청).
 *
 * 저장을 알리던 초록 체크 원 자리에 앉는다. 그림은 사용자가 준 **온천에 몸을 담근 카피바라**
 * 장면을 원으로 잘랐다(`scripts/make-retro-onsen.py`). 얼굴만 자르면 「누구」만 남아서
 * **배경이 잘 보이게 넓게** 잡았다 — 수풀·하늘·바위·김·물결이 보여야 「쉬고 있는」 장면으로
 * 읽히고, 그 장면이 아래 「쉼터로 가기」와 이어진다(같은 날 원 → 네모 → 넓은 원으로 맞췄다).
 *
 * **움직이지도, 눌리지도 않는다** — 낭독기에도 없는 것으로 둔다. 저장됐다는 사실은
 * 바로 아래 「오늘의 일기를 저장했어요.」가 말하고, 그림은 곁에 있을 뿐이다(`RetroBaba` 와 같은 판단).
 * 축하 연출이 아니다 — 움직임이 없다.
 *
 * 원 밖은 그림이 이미 투명이다 — 코드는 자르지도 칠하지도 않는다. 그림이 든 색은 다시 정하지
 * 않는다(홈 카피바라와 같은 판단).
 */
type Props = {
  /** 원의 지름 */
  size?: number;
};

/** 기본 지름 — 배경이 읽힐 만큼 크게, 아래 문안·카드보다 앞서지 않을 만큼 */
export const RETRO_ONSEN_SIZE = 140;

const SOURCE = require("../../../../assets/retro/capybara-onsen.png");

export function RetroOnsen({ size = RETRO_ONSEN_SIZE }: Props) {
  return (
    <Image
      testID="retro-onsen"
      source={SOURCE}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    />
  );
}
