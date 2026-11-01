/**
 * `expo-apple-authentication` 심. 웹에는 네이티브 버튼(`ASAuthorizationAppleIDButton`)도 로그인
 * 시트도 없다 — 진짜 모듈은 버튼을 그리지 않고(`null`) `isAvailableAsync` 가 `false` 다.
 *
 * - **iOS 를 흉내 내는 프레임에서만** 쓸 수 있다(`isAvailableAsync`) — 실제 기기와 같다.
 * - `signInAsync` 는 시트 없이 **곧바로 성공**하고 가짜 credential 을 준다. 앱은 그
 *   identity token 과 nonce 원문을 `POST /api/v1/auth/apple` 로 보낸다.
 * - 버튼은 시스템 버튼 모양(검은 판 · 흰 로고 · 모서리 반경)을 흉내 낸 것이다.
 *
 * 열거형은 진짜 모듈의 타입 파일에서 그대로 가져온다(네이티브를 부르지 않는 파일이다).
 */
import {
  AppleAuthenticationButtonStyle,
  type AppleAuthenticationButtonProps,
  type AppleAuthenticationCredential,
  AppleAuthenticationCredentialState,
  type AppleAuthenticationSignInOptions,
  AppleAuthenticationUserDetectionStatus,
} from "expo-apple-authentication/build/AppleAuthentication.types";
import { Pressable, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

import { getEmulatedPlatform } from "../runtime";

export * from "expo-apple-authentication/build/AppleAuthentication.types";

export const LAB_APPLE_IDENTITY_TOKEN = "lab-apple-identity-token";

export async function isAvailableAsync(): Promise<boolean> {
  return getEmulatedPlatform() === "ios";
}

export async function signInAsync(
  options?: AppleAuthenticationSignInOptions,
): Promise<AppleAuthenticationCredential> {
  if (getEmulatedPlatform() !== "ios") {
    throw Object.assign(new Error("Lab: Apple 로그인은 iOS 프레임에서만 된다"), {
      code: "ERR_UNAVAILABLE",
    });
  }
  return {
    user: "lab-apple-user",
    state: options?.state ?? null,
    fullName: {
      namePrefix: null,
      givenName: null,
      middleName: null,
      familyName: null,
      nameSuffix: null,
      nickname: null,
    },
    email: null,
    realUserStatus: AppleAuthenticationUserDetectionStatus.LIKELY_REAL,
    identityToken: LAB_APPLE_IDENTITY_TOKEN,
    authorizationCode: "lab-apple-authorization-code",
  };
}

export async function refreshAsync(): Promise<AppleAuthenticationCredential> {
  return signInAsync();
}

export async function signOutAsync(): Promise<AppleAuthenticationCredential> {
  return signInAsync();
}

export async function getCredentialStateAsync(): Promise<AppleAuthenticationCredentialState> {
  return AppleAuthenticationCredentialState.AUTHORIZED;
}

export function formatFullName(): string {
  return "";
}

export function addRevokeListener() {
  return { remove: () => {} };
}

/** simple-icons 「Apple」 글리프(24×24) — Lab 의 대역일 뿐 출시 자산이 아니다 */
const APPLE_GLYPH =
  "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701";

/** 시스템 버튼이 정한 색 — DS 토큰이 아니다(`social` 도 애플 색을 두지 않는다) */
const BUTTON_COLORS: Record<AppleAuthenticationButtonStyle, { fill: string; glyph: string }> = {
  [AppleAuthenticationButtonStyle.BLACK]: { fill: "black", glyph: "white" },
  [AppleAuthenticationButtonStyle.WHITE]: { fill: "white", glyph: "black" },
  [AppleAuthenticationButtonStyle.WHITE_OUTLINE]: { fill: "white", glyph: "black" },
};

export function AppleAuthenticationButton({
  onPress,
  buttonStyle,
  cornerRadius = 6,
  style,
  ...rest
}: AppleAuthenticationButtonProps) {
  const colors = BUTTON_COLORS[buttonStyle] ?? BUTTON_COLORS[AppleAuthenticationButtonStyle.BLACK];
  return (
    <Pressable
      {...rest}
      onPress={onPress}
      style={[
        styles.button,
        { backgroundColor: colors.fill, borderRadius: cornerRadius },
        buttonStyle === AppleAuthenticationButtonStyle.WHITE_OUTLINE ? styles.outline : null,
        style,
      ]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Path d={APPLE_GLYPH} fill={colors.glyph} />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  outline: { borderWidth: StyleSheet.hairlineWidth, borderColor: "black" },
});
