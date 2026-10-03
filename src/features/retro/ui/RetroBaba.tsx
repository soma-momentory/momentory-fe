import { Image } from "react-native";

/**
 * 회고 대화 화면 **왼쪽 아래에 앉은 바바** — 빈백에 기대 앉은 카피바라 한 장(2026-09-11 · 사용자 시안).
 *
 * `ChatScaffold` 의 `companion` 으로 들어가 **화면에 고정된다.** 바바의 말은 머리 위에 뜨고
 * (대화가 그림의 머리 높이에서 끝난다), 입력창 **바로 위에** 앉는다. 선택지가 뜨면 독이 자라 그림을
 * 아래부터 덮고, 키보드가 올라와도 그림은 자리를 옮기지 않는다.
 *
 * **움직이지도, 눌리지도 않는다** — 낭독기에도 없는 것으로 둔다. 누가 말하는지는 이미 말풍선의
 * 정렬과 낭독 이름(「질문:」)이 말하고, 그림은 곁에 있을 뿐이다.
 *
 * 그림이 든 색은 코드가 다시 정하지 않는다 — tint 하지 않고 받은 색 그대로 그린다(홈 카피바라와 같은 판단).
 */
type Props = {
  /** 그림의 폭 — 높이는 그림의 비율이 정한다 */
  width?: number;
};

/**
 * 기본 폭 — **260dp**(2026-09-11 · 사용자 요청으로 150 → 300 → 260). 입력창 위에 통째로 앉고,
 * 선택지가 늘수록 아래부터 덮인다.
 *
 * ⚠ 대화는 그림의 머리 높이만큼 비키므로, 크게 둔 만큼 **작은 기기에서 대화 칸이 줄어든다**
 * (375 × 667 기기에서 입력창 위 대화 칸이 약 330dp). 줄이고 싶으면 이 값 하나만 고친다.
 */
export const RETRO_BABA_WIDTH = 260;

/**
 * 그림의 왼쪽 끝 — Screen 의 좌우 패딩(20) 안쪽 기준. **-12 라 화면 끝에서 8** 에 앉는다(2026-09-11 ·
 * 「조금만 더 왼쪽으로」 사용자 요청 · 처음 0).
 */
export const RETRO_BABA_LEFT = -12;

/**
 * 코 한가운데가 그림 폭의 어디인가(900 폭에서 473) — 고개 내민 바바(`RetroBabaPeek`)가 키보드가
 * 올라왔을 때 **같은 가로 자리**에 서도록 이 값으로 맞춘다.
 */
export const RETRO_BABA_NOSE_X = 473 / 900;

/** 가로 ÷ 세로 — 잘라 낸 그림에서 잰 값(900 × 818 · `scripts/keyout-retro-baba.py`) */
const ASPECT = 900 / 818;

const SOURCE = require("../../../../assets/retro/baba-beanbag.png");

export function RetroBaba({ width = RETRO_BABA_WIDTH }: Props) {
  return (
    <Image
      testID="retro-baba"
      source={SOURCE}
      style={{ width, height: width / ASPECT }}
      resizeMode="contain"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
    />
  );
}
