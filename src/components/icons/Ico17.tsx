import Svg, { Circle, Path } from "react-native-svg";

import theme from "@/design/theme";
import { fill } from "@/design/tokens.mvp";

/**
 * `.ico17` — 완료 카드의 17px 벡터 아이콘 한 벌. **이모지를 섞지 않는다** —
 * 기기마다 다르게 그려져 카드 안에서 크기가 튄다(`10.md` · `RULES.md` 「아이콘」).
 *
 * 진짜 벡터 원본은 상류 `momentory.css` 와 HTML 에 있다. 피그마 판은 도형
 * 근사(`(선)` 이름)이고, 여기가 실제 벡터를 그리는 자리다.
 */
const SIZE = 17;

/** 체크 — **primaryDeep 채운 원** + 흰 체크(`10.md`). primary 는 장식 전용이라 면이 아니다 */
export function CheckCircleIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 17 17">
      <Circle cx="8.5" cy="8.5" r="8.5" fill={fill.primaryDeep} />
      <Path
        d="M5 8.8l2.3 2.3 4.7-4.9"
        stroke={theme.colors.semantic.textOnDark}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

/** 달 — 같은 크기의 **선** 아이콘. 면을 채우지 않는다 */
export function MoonIcon() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox="0 0 17 17">
      <Path
        d="M11.4 2.1a6.9 6.9 0 1 0 3.7 11.7A5.7 5.7 0 0 1 11.4 2.1Z"
        stroke={fill.primaryDeep}
        strokeWidth={1.5}
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
