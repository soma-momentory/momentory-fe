/**
 * `@react-native-seoul/kakao-login` 심 — 로그인 창 없이 **곧바로 성공**하고 가짜 토큰을 준다.
 * 앱은 그 토큰을 그대로 `POST /api/v1/auth/kakao` 로 보내고, 가짜 서버가 세션을 내준다.
 */
export const LAB_KAKAO_ACCESS_TOKEN = "lab-kakao-access-token";

const inAnHour = () => new Date(Date.now() + 60 * 60 * 1000);

export async function login() {
  return {
    accessToken: LAB_KAKAO_ACCESS_TOKEN,
    refreshToken: "lab-kakao-refresh-token",
    idToken: "lab-kakao-id-token",
    accessTokenExpiresAt: inAnHour(),
    refreshTokenExpiresAt: inAnHour(),
    scopes: ["profile_nickname"],
  };
}

export const loginWithKakaoAccount = login;

export async function logout(): Promise<string> {
  return "lab";
}

export async function unlink(): Promise<string> {
  return "lab";
}

export async function getAccessToken() {
  return { accessToken: LAB_KAKAO_ACCESS_TOKEN, expiresIn: "3600" };
}
