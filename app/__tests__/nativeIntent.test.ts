import { redirectSystemPath } from "../+native-intent";

/**
 * 카카오 로그인이 돌아오는 주소가 라우터로 새면 로그인과 홈 사이에 「Unmatched Route」 가 뜬다
 * (2026-10-13 · iOS). 그 주소만 버리고 나머지는 그대로 둔다.
 */
describe("+native-intent — 카카오 로그인 복귀 주소는 화면으로 옮기지 않는다", () => {
  it("카카오 로그인 복귀 주소는 버린다", () => {
    expect(
      redirectSystemPath({ path: "kakao0123abcd://oauth?code=xyz", initial: false }),
    ).toBeNull();
    expect(
      redirectSystemPath({ path: "kakao0123abcd://oauth?code=xyz", initial: true }),
    ).toBeNull();
  });

  it("앱 딥링크는 그대로 둔다", () => {
    expect(redirectSystemPath({ path: "momentory://retro", initial: false })).toBe(
      "momentory://retro",
    );
  });
});
