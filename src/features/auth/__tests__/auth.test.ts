import { SESSION_KEY, getAccessToken, useAuth } from "../model/auth";
import { reissueAccessToken } from "../data/reissueApi";

import { useDraft } from "@/features/onboarding/model/draft";

/**
 * `ARCHITECTURE §3` — "테스트로 고정할 경로: 만료 토큰 · 갱신 실패 · SecureStore
 * 오류 · 로그아웃 후 재진입 · 앱 킬 후 콜드 스타트." 인증 폴백은 **화면에 오류를
 * 띄우지 않는 설계**라 테스트가 없으면 잘못돼도 아무도 모른다(§7).
 */
jest.mock("../data/reissueApi", () => ({
  reissueAccessToken: jest.fn(),
}));
const reissue = jest.mocked(reissueAccessToken);

type SecureMock = {
  __store: Map<string, string>;
  getItemAsync: jest.Mock;
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
};
const secure = jest.requireMock("expo-secure-store") as SecureMock;

const seedSession = (expiresAt: number, overrides?: Partial<{ refreshToken: string }>) =>
  secure.__store.set(
    SESSION_KEY,
    JSON.stringify({
      accessToken: "t",
      refreshToken: overrides?.refreshToken ?? "r",
      expiresAt,
      userId: 1,
    }),
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

  it("만료 토큰은 갱신을 먼저 시도한다 — 갱신이 되면 authenticated 로 새 세션을 남긴다", async () => {
    // 만료된 토큰으로 보호 라우트에 들어가 첫 401 을 보고 튕겨 나오지 않는다 (§3-1)
    seedSession(Date.now() - 1);
    reissue.mockResolvedValueOnce({
      ok: true,
      session: { accessToken: "new-t", refreshToken: "new-r", accessTokenExpiresIn: 1800 },
    });

    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("authenticated");
    expect(reissue).toHaveBeenCalledWith("r");
    const stored = JSON.parse(secure.__store.get(SESSION_KEY)!) as { accessToken: string };
    expect(stored.accessToken).toBe("new-t");
  });

  it("만료 토큰이고 갱신도 실패하면 anonymous 이고 죽은 세션을 지운다", async () => {
    seedSession(Date.now() - 1);
    reissue.mockResolvedValueOnce({ ok: false, code: "refresh_expired" });

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

describe("getAccessToken — API 호출 경로의 갱신", () => {
  it("만료 전이면 갱신을 시도하지 않고 그대로 돌려준다", async () => {
    seedSession(Date.now() + 60_000);

    expect(await getAccessToken()).toBe("t");
    expect(reissue).not.toHaveBeenCalled();
  });

  it("만료됐으면 조용히 갱신하고 새 access token 을 돌려준다 — 호출부는 만료를 모른다", async () => {
    seedSession(Date.now() - 1);
    reissue.mockResolvedValueOnce({
      ok: true,
      session: { accessToken: "new-t", refreshToken: "new-r", accessTokenExpiresIn: 1800 },
    });

    expect(await getAccessToken()).toBe("new-t");
  });

  it("갱신이 실패하면 null 이고, 다음 hydrate 를 기다리지 않고 즉시 status 를 내린다", async () => {
    seedSession(Date.now() - 1);
    useAuth.setState({ status: "authenticated" });
    reissue.mockResolvedValueOnce({ ok: false, code: "refresh_revoked" });

    expect(await getAccessToken()).toBeNull();
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("동시에 여러 호출이 만료를 봐도 재발급 요청은 한 번만 나간다", async () => {
    // refresh token 은 회전한다 — 두 번 보내면 늦은 쪽이 REFRESH_TOKEN_REVOKED 로
    // 튕긴다. 진행 중인 갱신을 나눠 받아야 이 창이 닫힌다.
    seedSession(Date.now() - 1);
    let resolveReissue!: (value: Awaited<ReturnType<typeof reissueAccessToken>>) => void;
    reissue.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveReissue = resolve;
      }),
    );

    const first = getAccessToken();
    const second = getAccessToken();
    resolveReissue({
      ok: true,
      session: { accessToken: "new-t", refreshToken: "new-r", accessTokenExpiresIn: 1800 },
    });

    expect(await first).toBe("new-t");
    expect(await second).toBe("new-t");
    expect(reissue).toHaveBeenCalledTimes(1);
  });

  it("세션이 없으면 갱신을 시도하지 않고 null", async () => {
    expect(await getAccessToken()).toBeNull();
    expect(reissue).not.toHaveBeenCalled();
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
