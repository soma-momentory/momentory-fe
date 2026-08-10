import { SESSION_KEY, getAccessToken, useAuth } from "../model/auth";
import { revokeRefreshToken } from "../data/logoutApi";
import { reissueAccessToken } from "../data/reissueApi";

import { useDiary } from "@/features/diary/model/diary";
import { useProfile, useSettings } from "@/features/my/model/settings";
import { useDraft } from "@/features/onboarding/model/draft";
import { useRetro } from "@/features/retro/model/retro";

/**
 * `ARCHITECTURE §3` — "테스트로 고정할 경로: 만료 토큰 · 갱신 실패 · SecureStore
 * 오류 · 로그아웃 후 재진입 · 앱 킬 후 콜드 스타트." 인증 폴백은 **화면에 오류를
 * 띄우지 않는 설계**라 테스트가 없으면 잘못돼도 아무도 모른다(§7).
 */
jest.mock("../data/reissueApi", () => ({
  reissueAccessToken: jest.fn(),
}));
const reissue = jest.mocked(reissueAccessToken);

jest.mock("../data/logoutApi", () => ({
  revokeRefreshToken: jest.fn(async () => ({ ok: true })),
}));
const revoke = jest.mocked(revokeRefreshToken);

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
  useRetro.getState().reset();
  useDiary.getState().reset();
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

  it.each([["refresh_expired"], ["refresh_revoked"], ["refresh_invalid"]] as const)(
    "갱신이 %s 로 거부되면 anonymous 이고 죽은 세션을 지운다",
    async (code) => {
      seedSession(Date.now() - 1);
      reissue.mockResolvedValueOnce({ ok: false, code });

      await useAuth.getState().hydrate();

      expect(useAuth.getState().status).toBe("anonymous");
      expect(secure.__store.has(SESSION_KEY)).toBe(false);
    },
  );

  it.each([["network"], ["server"], ["malformed"], ["unconfigured"]] as const)(
    "갱신이 %s 로 실패하면 — refresh token 이 죽었다는 뜻이 아니므로 authenticated 로 두고 세션을 지우지 않는다",
    async (code) => {
      // 회귀 시험 — 에뮬레이터·서버 간 순간적인 지연 한 번에 멀쩡한 로그인이
      // 영구히 로그아웃되던 버그(실사용 중 재현)를 고정한다.
      seedSession(Date.now() - 1);
      reissue.mockResolvedValueOnce({ ok: false, code });

      await useAuth.getState().hydrate();

      expect(useAuth.getState().status).toBe("authenticated");
      expect(secure.__store.has(SESSION_KEY)).toBe(true);
    },
  );

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

  it("refresh token 이 거부되면 null 이고, 다음 hydrate 를 기다리지 않고 즉시 status 를 내린다", async () => {
    seedSession(Date.now() - 1);
    useAuth.setState({ status: "authenticated" });
    reissue.mockResolvedValueOnce({ ok: false, code: "refresh_revoked" });

    expect(await getAccessToken()).toBeNull();
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("일시적 실패(네트워크 등)는 null 을 돌려주되 세션도 status 도 건드리지 않는다", async () => {
    // 이번 API 호출만 실패한 것뿐이지 로그인이 죽은 게 아니다 — 다음 호출이
    // 같은 refresh token 으로 다시 시도할 수 있어야 한다.
    seedSession(Date.now() - 1);
    useAuth.setState({ status: "authenticated" });
    reissue.mockResolvedValueOnce({ ok: false, code: "network" });

    expect(await getAccessToken()).toBeNull();
    expect(useAuth.getState().status).toBe("authenticated");
    expect(secure.__store.has(SESSION_KEY)).toBe(true);
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

  it("사용자에게 묶인 store 를 함께 비운다 — 다음 사용자에게 남의 기록을 보이지 않는다", async () => {
    seedSession(Date.now() + 60_000);
    const notifyBefore = useSettings.getState().notify.retro.enabled;
    useRetro.getState().addMyTurn("오늘은 좀 지쳤어");
    useProfile.getState().set({ nickname: "앞사람" });
    useSettings.getState().toggle("retro");
    const firstDiaryId = useDiary.getState().diaries[0]!.id;
    useDiary.getState().remove(firstDiaryId);

    await useAuth.getState().signOut();

    // 서버가 그 사용자를 위해 생성한 대화 — 메모리에 남기지 않는다
    expect(useRetro.getState().turns).toEqual([]);
    expect(useProfile.getState().nickname).not.toBe("앞사람");
    expect(useSettings.getState().notify.retro.enabled).toBe(notifyBefore);
    // 지운 일기가 되살아난다 = 일기 store 가 초기 상태로 돌아갔다
    expect(useDiary.getState().diaries.some((d) => d.id === firstDiaryId)).toBe(true);
  });
});

describe("signOut — 서버의 refresh token 폐기", () => {
  it("저장돼 있던 refresh token 을 그대로 보낸다", async () => {
    seedSession(Date.now() + 60_000, { refreshToken: "device-refresh" });

    await useAuth.getState().signOut();

    expect(revoke).toHaveBeenCalledWith("device-refresh");
  });

  it("만료된 세션이어도 폐기한다 — access token 이 죽었어도 refresh token 은 살아 있다", async () => {
    seedSession(Date.now() - 1, { refreshToken: "device-refresh" });

    await useAuth.getState().signOut();

    expect(revoke).toHaveBeenCalledWith("device-refresh");
    // 폐기 전에 갱신을 부르지 않는다 — 부르면 회전해서 손에 든 토큰이 그 자리에서 죽는다
    expect(reissue).not.toHaveBeenCalled();
  });

  it("세션이 없으면 요청하지 않는다 — 보낼 토큰이 없다", async () => {
    await useAuth.getState().signOut();

    expect(revoke).not.toHaveBeenCalled();
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("서버를 기다리지 않는다 — 응답이 오기 전에 이미 로그아웃이다", async () => {
    seedSession(Date.now() + 60_000);
    let settle: () => void = () => {};
    revoke.mockReturnValueOnce(
      new Promise((resolve) => {
        settle = () => resolve({ ok: true });
      }),
    );

    await useAuth.getState().signOut();

    expect(useAuth.getState().status).toBe("anonymous");
    expect(secure.__store.has(SESSION_KEY)).toBe(false);
    settle();
  });

  it("폐기가 실패해도 로그아웃은 끝난다 — 화면에 아무것도 띄우지 않는다", async () => {
    seedSession(Date.now() + 60_000);
    revoke.mockResolvedValueOnce({ ok: false, code: "network" });

    await useAuth.getState().signOut();

    expect(useAuth.getState().status).toBe("anonymous");
    expect(secure.__store.has(SESSION_KEY)).toBe(false);
    expect(useAuth.getState().signInError).toBeNull();
  });

  it("실패는 개발 빌드에 사유 코드만 남는다 — 토큰은 남기지 않는다", async () => {
    seedSession(Date.now() + 60_000, { refreshToken: "device-refresh" });
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    revoke.mockResolvedValueOnce({ ok: false, code: "network" });

    await useAuth.getState().signOut();
    // 배웅이라 로그는 signOut 이 끝난 뒤에 붙는다
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith("[auth] 로그아웃 폐기 실패:", "network");
    expect(JSON.stringify(warn.mock.calls)).not.toContain("device-refresh");
    warn.mockRestore();
  });
});

describe("갱신이 도는 사이 세션이 갈릴 때 — 늦게 끝난 갱신은 아무것도 쓰지 않는다", () => {
  /** 갱신을 **응답 전에 멈춰 세운다** — 그 창 안에서 로그아웃·재로그인을 끼워 넣는다 */
  const hangingReissue = () => {
    let resolve!: (value: Awaited<ReturnType<typeof reissueAccessToken>>) => void;
    reissue.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    return resolve;
  };

  const REISSUED = {
    ok: true as const,
    session: { accessToken: "new-t", refreshToken: "new-r", accessTokenExpiresIn: 1800 },
  };

  it("로그아웃 뒤에 갱신이 성공해도 세션이 되살아나지 않는다", async () => {
    // 이게 이 파일의 핵심이다 — 되살아나면 다음 부트에 **조용히 로그인된 상태**가 된다
    seedSession(Date.now() - 1);
    const finishReissue = hangingReissue();

    const pending = getAccessToken();
    await useAuth.getState().signOut();
    finishReissue(REISSUED);

    expect(await pending).toBeNull();
    expect(secure.__store.has(SESSION_KEY)).toBe(false);
    expect(useAuth.getState().status).toBe("anonymous");
  });

  it("그때 새로 받은 refresh token 도 서버에서 폐기한다 — 서버에 살려두지 않는다", async () => {
    seedSession(Date.now() - 1, { refreshToken: "old-r" });
    const finishReissue = hangingReissue();

    const pending = getAccessToken();
    await useAuth.getState().signOut();
    finishReissue(REISSUED);
    await pending;

    // 로그아웃이 보낸 폐기는 이미 회전으로 죽은 옛 토큰을 가리킨다 —
    // 새 토큰은 이 경로가 지우지 않으면 아무도 안 지운다
    expect(revoke).toHaveBeenCalledWith("old-r");
    expect(revoke).toHaveBeenCalledWith("new-r");
  });

  it("재로그인 뒤에 갱신이 성공해도 새 세션을 덮지 않는다", async () => {
    seedSession(Date.now() - 1);
    const finishReissue = hangingReissue();

    const pending = getAccessToken();
    await useAuth.getState().signOut();
    await useAuth.getState().signInDev();
    finishReissue(REISSUED);
    await pending;

    const stored = JSON.parse(secure.__store.get(SESSION_KEY)!) as { accessToken: string };
    expect(stored.accessToken).toBe("dev");
  });

  it("재로그인 뒤에 갱신이 거부돼도 새 세션을 지우지 않는다", async () => {
    // 갓 로그인한 사용자가 앞 세션의 실패 때문에 튕겨 나가면 안 된다
    seedSession(Date.now() - 1);
    const finishReissue = hangingReissue();

    const pending = getAccessToken();
    await useAuth.getState().signOut();
    await useAuth.getState().signInDev();
    finishReissue({ ok: false, code: "refresh_expired" });
    await pending;

    expect(secure.__store.has(SESSION_KEY)).toBe(true);
    expect(useAuth.getState().status).toBe("authenticated");
  });

  it("부팅 중 로그아웃하면 hydrate 가 다시 authenticated 로 되돌리지 않는다", async () => {
    seedSession(Date.now() - 1);
    const finishReissue = hangingReissue();

    const booting = useAuth.getState().hydrate();
    await useAuth.getState().signOut();
    finishReissue(REISSUED);
    await booting;

    expect(useAuth.getState().status).toBe("anonymous");
    expect(secure.__store.has(SESSION_KEY)).toBe(false);
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
