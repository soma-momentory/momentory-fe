/**
 * `@react-native-google-signin/google-signin` 심 — 웹 빌드는 로그인을 지원하지 않는다(유료 모듈 몫).
 * 시트 없이 **곧바로 성공**하고 가짜 ID token 을 준다. 앱은 그것을 `POST /api/v1/auth/google` 로
 * 보낸다. `configure` 에 넘길 웹 클라이언트 ID 는 `expo-lab/app.config.ts` 의 `extra` 가 채운다.
 */
export const LAB_GOOGLE_ID_TOKEN = "lab-google-id-token";

export const statusCodes = Object.freeze({
  SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  IN_PROGRESS: "IN_PROGRESS",
  PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
  SIGN_IN_REQUIRED: "SIGN_IN_REQUIRED",
  NULL_PRESENTER: "NULL_PRESENTER",
});

export const isErrorWithCode = (error: unknown): error is Error & { code: string } =>
  error instanceof Error && typeof (error as { code?: unknown }).code === "string";

const LAB_USER = {
  id: "lab-google-user",
  name: null,
  email: "lab@momentory.invalid",
  photo: null,
  familyName: null,
  givenName: null,
};

const success = () => ({
  type: "success" as const,
  data: { idToken: LAB_GOOGLE_ID_TOKEN, serverAuthCode: null, scopes: [], user: LAB_USER },
});

let signedIn = false;

export const GoogleSignin = {
  configure: (_options?: object) => {},
  hasPlayServices: async (_options?: object) => true,
  signIn: async () => {
    signedIn = true;
    return success();
  },
  signInSilently: async () =>
    signedIn ? success() : { type: "noSavedCredentialFound" as const, data: null },
  signOut: async () => {
    signedIn = false;
    return null;
  },
  revokeAccess: async () => {
    signedIn = false;
    return null;
  },
  hasPreviousSignIn: () => signedIn,
  getCurrentUser: () => (signedIn ? success().data : null),
  getTokens: async () => ({ idToken: LAB_GOOGLE_ID_TOKEN, accessToken: "lab-google-access" }),
  clearCachedAccessToken: async (_token: string) => null,
};

export const isSuccessResponse = (response: { type: string }) => response.type === "success";
export const isCancelledResponse = (response: { type: string }) => response.type === "cancelled";
export const isNoSavedCredentialFoundResponse = (response: { type: string }) =>
  response.type === "noSavedCredentialFound";

export const GoogleSigninButton = () => null;
