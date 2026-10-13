/**
 * 앱 밖에서 들어온 주소를 **화면으로 옮기기 전에 거른다** — expo-router 의 `+native-intent`.
 *
 * 카카오 로그인이 끝나면 카카오톡이 `kakao<앱키>://oauth?code=…` 로 앱을 연다. 이 주소의 주인은
 * 카카오 SDK 다(`AppDelegate` 가 SDK 에 먼저 넘긴다). 그런데 Expo 의 scene 생명주기
 * (`SceneEventForwarder`)는 AppDelegate 가 React Native 에 알리지 않은 주소를 **한 번 더**
 * 흘려서, 라우터가 `/oauth` 라는 없는 화면으로 갔다 — 로그인과 홈 사이에 검은
 * 「Unmatched Route」 화면이 떴다(2026-10-13 · iOS 실기기).
 *
 * `null` 을 돌려주면 라우터는 그 주소를 버린다. 나머지(`momentory://` 알림 딥링크 등)는 그대로다.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  return /^kakao[^:]*:\/\/oauth/i.test(path) ? null : path;
}
