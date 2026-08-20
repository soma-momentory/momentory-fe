import Svg, { Path } from "react-native-svg";

import { label, size } from "@/design/ds";

import { ICON_PATHS, type IconName } from "./paths";

export type { IconName };

/**
 * Wanted 아이콘 하나. **24 그리드 · 크기 3단**(16 / 20 / 24 — `design.md` §10).
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
  /** 기본 24. `design.md` 가 정한 3단만 쓴다 */
  size?: 16 | 20 | 24;
  /** `@/design/ds` 의 색 토큰. 기본은 본문색 */
  color?: string;
};

export function Icon({ name, size: px = size.icon.lg, color = label.normal }: Props) {
  return (
    <Svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {ICON_PATHS[name].map((p, i) => (
        <Path
          // 글리프 안의 조각들은 순서가 곧 정체다 — 재정렬되지 않으므로 index 로 충분하다
          key={i}
          d={p.d}
          fill={color}
          fillRule={"evenOdd" in p && p.evenOdd ? "evenodd" : "nonzero"}
          transform={p.transform}
        />
      ))}
    </Svg>
  );
}
