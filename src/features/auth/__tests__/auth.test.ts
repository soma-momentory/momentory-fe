import { SESSION_KEY, useAuth } from "../model/auth";

import { useDraft } from "@/features/onboarding/model/draft";

/**
 * `ARCHITECTURE §3` — "테스트로 고정할 경로: 만료 토큰 · 갱신 실패 · SecureStore
 * 오류 · 로그아웃 후 재진입 · 앱 킬 후 콜드 스타트." 인증 폴백은 **화면에 오류를
 * 띄우지 않는 설계**라 테스트가 없으면 잘못돼도 아무도 모른다(§7).
 */
type SecureMock = {
  __store: Map<string, string>;
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};
const secure = jest.requireMock("expo-secure-store") as SecureMock;

const seedSession = (expiresAt: number) =>
  secure.__store.set(
    SESSION_KEY,
    JSON.stringify({ accessToken: "t", refreshToken: "r", expiresAt, userId: 1 }),
  );

beforeEach(() => {
  secure.__store.clear();
  jest.clearAllMocks();
  useAuth.setState({ status: "hydrating" });
  useDraft.getState().reset();
});

describe("hydrate — 콜드 스타트 판정", () => {
  it("유효한 세션이면 authenticated", async () => {
    seedSession(Date.now() + 60_000);

    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("authenticated");
  });

  it("세션이 없으면 anonymous", async () => {
    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("만료 토큰은 anonymous 이고 죽은 세션을 지운다 — 갱신 경로가 없으므로 fail-closed", async () => {
    // 만료된 토큰으로 보호 라우트에 들어가 첫 401 을 보고 튕겨 나오지 않는다 (§3-1)
    seedSession(Date.now() - 1);

    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("anonymous");
    expect(secure.__store.has(SESSION_KEY)).toBe(false);
  });

  it("모양이 모자란 세션은 anonymous 다 — 옛 형태로 저장된 세션도 여기서 걸린다", async () => {
    // 카카오 로그인(M2-1)이 refreshToken·userId 를 더했다. 그 전 빌드가 남긴
    // 세션은 갱신도 식별도 못 하므로 반쯤 살려두지 않고 닫는다.
    secure.__store.set(
      SESSION_KEY,
      JSON.stringify({ accessToken: "t", expiresAt: Date.now() + 60_000 }),
    );

    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("anonymous");
    expect(secure.__store.has(SESSION_KEY)).toBe(false);
  });

  it("손상된 값(JSON 아님)도 anonymous 다", async () => {
    secure.__store.set(SESSION_KEY, "not-json");

    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("SecureStore 읽기 오류는 anonymous 다 — 판단이 안 서면 로그인 화면이다", async () => {
    secure.getItemAsync.mockRejectedValueOnce(new Error("keystore unavailable"));

    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("anonymous");
  });
});

describe("signOut — 로그아웃 후 재진입", () => {
  it("세션과 온보딩 초안을 함께 비운다 — 다음 사용자에게 앞 답이 남지 않게", async () => {
    seedSession(Date.now() + 60_000);
    await useAuth.getState().hydrate();
    useDraft.getState().set("nickname", "지현");

    await useAuth.getState().signOut();

    expect(useAuth.getState().status).toBe("anonymous");
    expect(secure.__store.has(SESSION_KEY)).toBe(false);
    expect(useDraft.getState().nickname).toBe("");
  });

  it("로그아웃 뒤 다시 hydrate 해도 anonymous 다 — 미러 플래그가 남지 않는다", async () => {
    seedSession(Date.now() + 60_000);
    await useAuth.getState().hydrate();
    await useAuth.getState().signOut();

    useAuth.setState({ status: "hydrating" }); // 앱 재시작
    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("삭제가 실패해도 상태는 anonymous 로 닫힌다", async () => {
    seedSession(Date.now() + 60_000);
    secure.deleteItemAsync.mockRejectedValueOnce(new Error("io"));

    await useAuth.getState().signOut();

    expect(useAuth.getState().status).toBe("anonymous");
  });
});

describe("signInDev — 개발 통로", () => {
  it("가짜 세션을 저장하고 authenticated 가 된다 (__DEV__)", async () => {
    await useAuth.getState().signInDev();

    expect(useAuth.getState().status).toBe("authenticated");
    expect(secure.__store.has(SESSION_KEY)).toBe(true);
  });

  it("만든 세션은 재시작(hydrate) 후에도 유효하다 — 콜드 스타트 왕복", async () => {
    await useAuth.getState().signInDev();

    useAuth.setState({ status: "hydrating" }); // 앱 재시작
    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("authenticated");
  });
});
