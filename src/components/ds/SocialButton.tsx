import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { fontFamily, overlay, radius, size, social, space, text } from "@/design/ds";

import { Icon } from "./icons/Icon";
import { GoogleMark } from "./icons/GoogleMark";
import { Text } from "./Text";

/**
 * 소셜 로그인 버튼 — `design.md` 「로그인」 · `Login.dc.html`.
 *
 * > 소셜 3종(카카오·Google·Apple) **공식 색·마크 유지**, 높이 48 · 간격 10.
 * > 공통은 **높이·Radius·간격만** — 색·로고는 손대지 않는다.
 *
 * 그래서 `Button` 의 변형이 아니라 **따로 있는 컴포넌트**다. `Button` 의 variant 로
 * 넣으면 팔레트 밖 색이 DS 버튼 안으로 들어와 다음 사람이 그걸 일반 버튼에 쓴다.
 * 공유하는 것은 치수(`size.button.large` 48 · `radius.medium` 12)와 누름 표현뿐이다.
 *
 * ## 누름은 스크림이다
 *
 * 시안은 `filter: brightness(0.94)`(카카오)·배경 교체(Google·Apple)로 눌림을 그리는데
 * RN 에는 `filter` 가 없다. `Button` 과 같은 **스크림 오버레이**로 통일한다 —
 * 어두워진다는 결과가 같고, 브랜드 면 색 자체는 그대로 남는다(§6 의 방식).
 *
 * ## 비활성
 *
 * DS 버튼의 비활성 면(`interaction.disabled`)을 쓰지 않는다 — 그러면 브랜드 색이
 * 사라져 어느 줄이 무엇이었는지 읽히지 않는다. **면은 그대로 두고 흐리게만** 한다
 * (`momentory.css` `.off{opacity:.36}` 와 같은 방식). 경고 아이콘·문구는 붙이지 않는다.
 */
export type SocialProvider = "kakao" | "google" | "apple";

type Props = Omit<PressableProps, "style" | "children"> & {
  provider: SocialProvider;
  label: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function SocialButton({
  provider,
  label,
  disabled = false,
  accessibilityRole = "button",
  accessibilityState,
  style,
  ...rest
}: Props) {
  const v = PROVIDERS[provider];

  return (
    <Pressable
      {...rest}
      accessibilityRole={accessibilityRole}
      // 호출자 상태는 살리되 잠금은 우리가 쥔다
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      style={[styles.base, v.container, disabled ? styles.disabled : null, style]}
    >
      {({ pressed }) => (
        <>
          {provider === "google" ? <GoogleMark size={MARK} /> : null}
          {provider === "kakao" ? (
            <Icon name="logo-kakao" size={MARK} color={v.labelColor} />
          ) : null}
          {provider === "apple" ? (
            <Icon name="logo-apple" size={MARK} color={v.labelColor} />
          ) : null}

          <Text style={[styles.label, { color: v.labelColor }]}>{label}</Text>

          {pressed && !disabled ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

/**
 * 마크 20. 시안(`Login.dc.html`)은 18 이지만 `design.md` §10 이 아이콘을
 * **16 / 20 / 24 3단**으로 못박는다 — 값이 어긋나면 `design.md` 가 이긴다.
 * 세 마크를 같은 단으로 맞춰야 줄마다 크기가 갈리지도 않는다.
 */
const MARK = size.icon.md;

const PROVIDERS: Record<SocialProvider, { container: ViewStyle; labelColor: string }> = {
  kakao: {
    container: { backgroundColor: social.kakao.background },
    labelColor: social.kakao.label,
  },
  google: {
    container: {
      backgroundColor: social.google.background,
      borderWidth: 1,
      borderColor: social.google.border,
    },
    labelColor: social.google.label,
  },
  apple: {
    container: { backgroundColor: social.apple.background },
    labelColor: social.apple.label,
  },
};

/**
 * 라벨 15 / 600. `design.md` §2 의 12단에는 **15 + SemiBold 조합이 없다**
 * (`body2` 는 15/22 Medium). 시안이 소셜 버튼에만 쓰는 한 칸이라 타입 스케일에
 * 13번째를 만들지 않고, 크기·행간은 `body2` 토큰에서 가져오고 굵기만 올린다.
 */
const LABEL: TextStyle = {
  fontFamily: fontFamily.semibold,
  fontSize: text.body2.fontSize,
  lineHeight: text.body2.lineHeight,
};

const styles = StyleSheet.create({
  base: {
    height: size.button.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    borderRadius: radius.medium,
    overflow: "hidden",
  },
  label: LABEL,
  // 면은 브랜드 색 그대로 두고 흐리게만 — 어느 줄이 무엇인지는 남는다
  disabled: { opacity: 0.4 },
  scrim: { backgroundColor: overlay.pressNormal, borderRadius: radius.medium },
});
