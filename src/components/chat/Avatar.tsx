import { Image, StyleSheet, View, type ViewProps } from "react-native";

import theme from "@/design/theme";
import { chat, chatColor } from "@/design/tokens.mvp";

/**
 * 바바 얼굴. `momentory.css` `.ba`(52) · `.bas`(34).
 *
 * ```css
 * .ba{width:52px;height:52px;border-radius:50%;
 *     background:#EFE5D4 url(...) 50% 20%/128% no-repeat;
 *     box-shadow:0 0 0 10px rgba(251,246,236,.5), 0 8px 26px rgba(160,132,96,.16)}
 * ```
 *
 * **바깥 링이 있다.** `box-shadow` 의 첫 값은 흐림 0 · 확산 10px 이라 그림자가 아니라
 * **테두리 고리**다. RN 은 spread 를 못 그리므로 바깥 View 의 padding + 배경으로 만든다.
 * 크림 배경 위에서 얼굴을 띄우는 장치라 빼면 배경에 잠긴다.
 *
 * 이미지는 `50% 20%/128%` — 128% 로 키워 가로는 가운데, 세로는 위에서 20% 지점에 맞춘다.
 * 얼굴이 원 안에서 아래로 쏠리지 않게 하는 값이다.
 */
type Props = Omit<ViewProps, "children"> & {
  /** `lg` 52 (대화) · `sm` 34 (목록·헤더) */
  size?: "lg" | "sm";
  /** 링을 끄면 배경과 붙는다. 카드 안처럼 이미 면이 나뉜 자리에서 쓴다 */
  ring?: boolean;
};

// 128% 로 키운 만큼 되돌린다 — 가로 (128-100)/2 = 14%, 세로 (128-100)×0.2 = 5.6%
const ZOOM = 1.28;
const OFFSET_X = -(ZOOM - 1) / 2;
const OFFSET_Y = -(ZOOM - 1) * 0.2;

export function Avatar({ size = "lg", ring = true, style, ...rest }: Props) {
  const px = size === "lg" ? chat.avatar.lg : chat.avatar.sm;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      {...rest}
      style={[
        ring ? { padding: chat.avatar.ring, backgroundColor: chatColor.avatarRing } : null,
        ring ? styles.ringShape : null,
        style,
      ]}
    >
      <View
        testID="avatar-face"
        style={[styles.face, { width: px, height: px, borderRadius: px / 2 }]}
      >
        <Image
          source={require("../../../assets/baba/face-default.png")}
          style={{
            width: px * ZOOM,
            height: px * ZOOM,
            marginLeft: px * OFFSET_X,
            marginTop: px * OFFSET_Y,
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 링까지 포함한 바깥 원. radius 는 (얼굴 + 링×2) / 2 인데 lg·sm 이 다르므로
  // pill 로 두면 어느 쪽이든 원이 된다.
  ringShape: { borderRadius: theme.radius.pill, alignSelf: "flex-start" },
  // css 의 두 번째 그림자(0 8px 26px)에 딱 맞는 토큰이 없다. md(y6 · 18 · .08)가
  // 가장 가깝다 — 시안과 나란히 놓고 어긋나 보이면 상류에 토큰을 올린다.
  face: { overflow: "hidden", backgroundColor: chatColor.avatarBase, ...theme.shadows.md },
});
