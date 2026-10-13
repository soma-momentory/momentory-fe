import * as AppleAuthentication from "expo-apple-authentication";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { radius, size, social } from "@/design/ds";

import { GoogleMark } from "./icons/GoogleMark";
import { Icon } from "./icons/Icon";

/**
 * 소셜 로그인 버튼 — **같은 크기의 둥근 네모 안에 로고만 둔다** (2026-10-13 · `DESIGN.md` 「로그인」).
 *
 * ## 왜 로고만인가
 *
 * 그전에는 세 줄이 각 사 규격을 글자 그대로 따라 **서체 · 글자 크기가 셋 다 달랐다**
 * (카카오 시스템 서체 16 · 구글 Roboto 14 + 한글은 시스템 서체 · 애플 그림 속 20.6).
 * 세 회사의 글자 규칙이 서로 부딪혀서(애플 「높이의 43%」 · 카카오 「1/3 이하」 · 구글
 * 「14」) 글자를 두는 한 맞출 수 없었고, 애플 그림은 폭 320pt 를 버튼 폭에 맞춰 늘려
 * 글자가 옆으로 퍼져 보였다. 글자를 빼면 맞출 것이 사라진다.
 *
 * 모양은 같은 날 원에서 **둥근 네모**로 바꿨다(사용자 결정) — 앱의 다른 버튼과 같은
 * 반경 12 이고, 카카오 가이드의 「컨테이너 모서리 반경 12」와도 맞는다.
 *
 * ## 각 사 규격과의 관계
 *
 * - **애플** — HIG 가 로고만 있는 버튼을 허용하고 모양도 정해 둔다(「logo-only buttons can
 *   be circular or rectangular」 · 「a circular or rounded rectangular shape」). 로고를 직접
 *   그리지 않고 **시스템 버튼**(`ASAuthorizationAppleIDButton`)을 쓴다 — 폭이 좁으면 시스템이
 *   로고만 그린다. 「다른 로그인 버튼보다 작으면 안 된다」라서 셋의 크기가 같다.
 *   ⚠ 시스템 버튼을 칸보다 크게 그려 잘라 내면 로고가 커지지만 HIG 「Never crop the
 *   Apple-provided artwork to decrease its built-in padding」에 걸린다 — 한때 그렇게 했다가
 *   되돌렸다. 로고를 키우려면 칸 자체를 키운다(`SOCIAL_BUTTON_SIZE`)
 * - **구글** — 「Use the Google "G" by itself for action button if needed」. G 는 흰 바탕 위
 *   원래 색이어야 해서 흰 칸이다. 테두리는 두지 않는다 — 셋 중 하나만 테두리가 있으면
 *   어색했고(2026-10-13 사용자 판단), 흰 칸이 크림 바탕에서 떨어져 보여 그것이 버튼 경계다
 *   (구글 Neutral 테마도 테두리가 없다)
 * - **카카오** — 가이드에 심볼만 있는 버튼 이야기가 없다(심볼 · 색 · 반경 12 를 정한다).
 *   노란 칸 + 말풍선으로 두고, 심볼 모양 · 색은 바꾸지 않는다
 *
 * **글자가 없으니 `label` 은 낭독기가 읽는 이름이다** — 화면에는 그리지 않는다.
 *
 * ## 상호작용 중에도 브랜드 색을 바꾸지 않는다
 *
 * 눌림 · 진행 중에 스크림이나 opacity 를 얹으면 로고 색까지 바뀐다. 그래서 모양은 그대로
 * 두고 `disabled` 로 중복 입력만 막는다.
 */
export type SocialProvider = "kakao" | "google" | "apple";

type Props = {
  provider: SocialProvider;
  /** 낭독기가 읽는 이름 — 화면에는 쓰지 않는다(`app/(auth)/login.tsx`) */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * 칸의 한 변 — 셋이 같다. 56 에서 64 로 키웠다(2026-10-13): 애플 시스템 버튼은 로고를 버튼
 * 크기에 비례해 그려서, 56 에서는 로고(≈17)가 카카오 심볼보다 작아 보였다. 잘라 내지 않고
 * 칸을 키우면 로고가 ≈19 로 커져 무게가 맞는다(HIG 여백 규칙을 건드리지 않는 길).
 * 카카오 심볼 · 구글 G 는 크기를 그대로 둔다
 */
export const SOCIAL_BUTTON_SIZE = 64;

/** 반경 12 — 앱 버튼과 같고, 카카오 가이드의 컨테이너 반경과도 같다 */
const CORNER = radius.medium;

export function SocialButton({ provider, label, onPress, disabled = false, style }: Props) {
  const a11y = {
    accessibilityRole: "button" as const,
    accessibilityLabel: label,
    accessibilityState: { disabled },
  };

  if (provider === "apple") {
    // 시스템 버튼에는 `disabled` 가 없다 — 바깥에서 터치를 막는다
    return (
      <View style={[styles.tile, style]} pointerEvents={disabled ? "none" : "auto"}>
        <AppleAuthentication.AppleAuthenticationButton
          {...a11y}
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={CORNER}
          style={StyleSheet.absoluteFill}
          onPress={onPress}
        />
      </View>
    );
  }

  return (
    <Pressable
      {...a11y}
      disabled={disabled}
      onPress={onPress}
      style={[styles.tile, provider === "kakao" ? styles.kakao : styles.google, style]}
    >
      {provider === "kakao" ? (
        <Icon name="logo-kakao" size={size.icon.lg} color={social.kakao.symbol} />
      ) : (
        // 구글 규격의 기본 크기(20) 그대로 — 「G 의 크기를 바꾸지 않는다」. 셋을 나란히 놓으면
        // 애플 시스템 로고(≈19) · 카카오 심볼(≈19)과 비슷한 무게로 선다
        <GoogleMark />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: SOCIAL_BUTTON_SIZE,
    height: SOCIAL_BUTTON_SIZE,
    borderRadius: CORNER,
    // 애플 시스템 버튼은 iOS 의 매끄러운 모서리(continuous)로 그린다 — 나머지 둘도 같은 곡선으로
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
  },
  kakao: { backgroundColor: social.kakao.background },
  google: { backgroundColor: social.google.background },
});
