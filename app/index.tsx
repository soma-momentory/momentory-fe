import { Redirect } from "expo-router";

/**
 * 진입 판정 자리. `entry` 상태 기계의 `route` 에 해당한다.
 *
 * 최종 형태(M2)는 `S0` 스플래시를 그리면서 `max(0.8s, 준비완료)` 동안 인증을
 * 비동기로 복원하고, 그 결과로 로그인 · 온보딩 · 홈 중 하나로 보낸다
 * (`docs/ARCHITECTURE.md §3`).
 *
 * 지금은 **로그인 화면만 있으므로** 그리로 바로 보낸다.
 */
export default function Index() {
  return <Redirect href="/login" />;
}
