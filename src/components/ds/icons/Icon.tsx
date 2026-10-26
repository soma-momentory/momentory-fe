import { decorativeAccessibilityProps } from "@/components/ds/decorativeAccessibility";
import Svg, { Path } from "react-native-svg";

import { label, size } from "@/design/ds";

import { ICON_PATHS, type IconName } from "./paths";

export type { IconName };

/**
 * Wanted 아이콘 하나. **24 그리드 · 크기 3단**(16 / 20 / 24 — `DESIGN.md` §10).
 *
 * **이모지를 쓰지 않는다**(`RULES.md`). 없는 글리프를 만들어 내지도 않는다 —
 * 필요한 것이 세트에 없으면 **만들지 않는다** — 반입 자산은 지웠고(A-18) 세트가
 * `paths.ts` 에 추가한다.
 *
 * 아이콘 자체는 **장식이다** — 낭독기에 읽히지 않는다(`accessibilityElementsHidden`).
 * 뜻이 있으면 감싸는 `Pressable`·`Text` 가 이름을 갖는다. 아이콘만 있는 버튼은
 * `IconButton` 이 `accessibilityLabel` 을 요구한다.
 */
type Props = {
  name: IconName;
  /** 기본 24. `DESIGN.md` 가 정한 3단만 쓴다 */
  size?: 16 | 20 | 24;
  /** `@/design/ds` 의 색 토큰. 기본은 본문색 */
  color?: string;
};

export function Icon({ name, size: px = size.icon.lg, color = label.normal }: Props) {
  return (
    <Svg width={px} height={px} viewBox="0 0 24 24" {...decorativeAccessibilityProps}>
      {ICON_PATHS[name].map((p, i) =>
        "stroke" in p && p.stroke ? (
          // 직접 그린 선 글리프 — 채우지 않고 둥근 끝·이음으로 세트의 얇은 선을 맞춘다.
          // 선 두께는 24 그리드 기준 1.8 (반입 글리프들의 시각 두께와 같은 결).
          // 선 글리프는 24 그리드에 바로 그려 transform 을 두지 않는다(반입분만 평행이동을 쓴다).
          <Path
            key={i}
            d={p.d}
            fill="none"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <Path
            // 글리프 안의 조각들은 순서가 곧 정체다 — 재정렬되지 않으므로 index 로 충분하다
            key={i}
            d={p.d}
            fill={color}
            fillRule={"evenOdd" in p && p.evenOdd ? "evenodd" : "nonzero"}
            transform={"transform" in p ? p.transform : undefined}
          />
        ),
      )}
    </Svg>
  );
}
