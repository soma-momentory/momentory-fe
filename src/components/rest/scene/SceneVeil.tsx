import { useId } from "react";
import { View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { restScene, restSceneSize } from "@/design/ds";

/**
 * 장면 위의 **빛 한 겹** — 쉼 콘텐츠 공통 부품 (2026-09-06 감각연못에서 시작 · 2026-10-08 공통으로).
 *
 * ## 카드가 아니라 빛이다
 *
 * 그림 위쪽은 밝고 잎 · 하늘처럼 결이 잘아서 짙은 글자도 묻힌다. 카드를 깔면 읽히기는 하지만
 * 상자가 생기는 순간 장면이 그 뒤로 물러나 「앱 화면 속 그림」이 된다. 그래서 **면이 아니라
 * 그라디언트**다 — 짙은 쪽에서 반대쪽으로 완전히 사라져 **경계선이 없다**(`DESIGN.md`
 * 「쉼 콘텐츠 공통 규칙」 3).
 *
 * ## 둘로 쓴다
 *
 * - `SceneTopVeil` — 머리글 뒤. 장면 그림 **바로 위 층**에 깔면 끝이다. 기본 짙기 · 높이는
 *   공통 토큰(`restSceneSize.topVeil`)이고, 장면마다 다르면 `veil` 로 바꾼다(감각연못 `pondVeil`)
 * - `SceneVeil` — 그 밖의 자리(판 뒤 등). 그라디언트만 그리고 **자리는 부르는 쪽이 `style` 로**
 *   정한다(감각연못 아래 판 `pondPanelVeil`)
 *
 * 그라디언트 이름은 알아서 붙는다(`useId`) — 한 화면에 여럿 깔아도 겹치지 않는다. 폭 · 높이는
 * 재지 않고 비율로만 서서 첫 프레임에 빈 자리가 없다. 장식이라 낭독기에 읽히지 않고 손짓도
 * 받지 않는다 — 이 위를 눌러도 아래 장면의 몫이다.
 */
export type VeilStop = { offset: number; opacity: number };

type VeilProps = {
  /** 위(0) → 아래(1)로의 짙기. 가운데 한 점을 두면 한쪽만 또렷하고 길게 사라진다 */
  stops: readonly VeilStop[];
  /** 자리 · 크기(절대 배치) — 부르는 쪽이 정한다 */
  style?: StyleProp<ViewStyle>;
  /** 빛의 색 — 기본은 그림과 같은 결의 따뜻한 흰빛(`restScene.veil`) */
  color?: string;
  testID?: string;
};

export function SceneVeil({ stops, style, color = restScene.veil, testID }: VeilProps) {
  // SVG 그라디언트 이름 — `useId` 의 기호(:, « 등)는 url(#…) 안에서 깨지므로 걷어 낸다
  const id = `scene-veil-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={style}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {stops.map((s) => (
              <Stop key={s.offset} offset={s.offset} stopColor={color} stopOpacity={s.opacity} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** 머리글 뒤의 빛 한 겹 — 화면 위에서부터 `heightRatio` 만큼 덮는다 */
export function SceneTopVeil({
  veil = restSceneSize.topVeil,
  testID,
}: {
  veil?: { heightRatio: number; stops: readonly VeilStop[] };
  testID?: string;
}) {
  const height: DimensionValue = `${veil.heightRatio * 100}%`;
  return (
    <SceneVeil
      testID={testID}
      stops={veil.stops}
      style={{ position: "absolute", left: 0, right: 0, top: 0, height }}
    />
  );
}
