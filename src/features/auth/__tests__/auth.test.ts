import { SESSION_KEY, getAccessToken, useAuth } from "../model/auth";
import { revokeRefreshToken } from "../data/logoutApi";
import { fetchMe } from "../data/meApi";
import { reissueAccessToken } from "../data/reissueApi";
import { deleteAccount } from "../data/withdrawApi";

import { useDiary } from "@/features/diary/model/diary";
import { useProfile, useSettings } from "@/features/my/model/settings";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";
import { useDraft } from "@/features/onboarding/model/draft";
import { useRetro } from "@/features/retro/model/retro";
import { seedDiaries } from "@/testing/fixtures";

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

/** 계약 자체는 `withdrawApi.test.ts` 가 본다 — 여기선 store 가 결과로 뭘 하는지만 */
jest.mock("../data/withdrawApi", () => ({
  deleteAccount: jest.fn(async () => ({ ok: true })),
}));
const withdrawApi = jest.mocked(deleteAccount);

/**
 * 기본값은 **서버에 못 물어본 상태**다 — 그래야 아래 옛 시험들이 `hydrate` 의
 * 로컬 판정만 재는 그대로 남는다. `/me` 계약 자체는 `meApi.test.ts` 가 본다.
 */
jest.mock("../data/meApi", () => ({
  fetchMe: jest.fn(async () => ({ ok: false, code: "network" })),
}));
const me = jest.mocked(fetchMe);

const meProfile = (overrides?: Partial<{ nickname: string; retroTime: string }>) => ({
  nickname: overrides?.nickname ?? "서버닉",
  age: "31",
  gender: "none" as const,
  interests: ["work"],
  interestOther: "",
  restMethods: ["WALKING"],
  restMethodOther: "",
  retroTime: overrides?.retroTime ?? "07:00",
  calendarLinked: true,
  notifyRetro: undefined,
});

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
  me.mockResolvedValue({ ok: false, code: "network" });
  withdrawApi.mockResolvedValue({ ok: true });
  useAuth.setState({ status: "hydrating", withdrawing: false, withdrawError: null });
  useDraft.getState().reset();
  useRetro.getState().reset();
  useDiary.getState().reset();
  useProfile.getState().reset();
  useSettings.getState().reset();
  useOnboardingCompletion.getState().reset();
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

describe("syncMe — 온보딩 완료 여부와 프로필은 서버가 정본이다", () => {
  it("온보딩을 마친 세션으로 콜드 스타트하면 홈으로 간다 — 온보딩을 되풀이하지 않는다", async () => {
    // 이게 이 절의 핵심이다. 완료 플래그가 메모리뿐일 때는 앱을 껐다 켤 때마다
    // 온보딩이 다시 떴다 — MMKV(M3) 를 기다리지 않고 서버 답으로 닫는다.
    seedSession(Date.now() + 60_000);
    me.mockResolvedValueOnce({
      ok: true,
      data: { userId: 1, onboardingRequired: false, profile: meProfile() },
    });

    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("authenticated");
    expect(useOnboardingCompletion.getState().completed).toBe(true);
  });

  it("아직 온보딩 전이면 기기에 남아 있던 완료 플래그를 덮는다", async () => {
    seedSession(Date.now() + 60_000);
    useOnboardingCompletion.getState().complete(); // 앞 사용자·앞 세션의 흔적
    me.mockResolvedValueOnce({
      ok: true,
      data: { userId: 1, onboardingRequired: true, profile: null },
    });

    await useAuth.getState().hydrate();

    expect(useOnboardingCompletion.getState().completed).toBe(false);
  });

  it("프로필을 두 store 로 옮긴다 — 마이·홈·회고가 같은 닉네임을 본다", async () => {
    seedSession(Date.now() + 60_000);
    me.mockResolvedValueOnce({
      ok: true,
      data: {
        userId: 1,
        onboardingRequired: false,
        profile: meProfile({ nickname: "서버닉", retroTime: "07:00" }),
      },
    });

    await useAuth.getState().hydrate();

    expect(useProfile.getState().nickname).toBe("서버닉");
    expect(useProfile.getState().calendarLinked).toBe(true);
    expect(useSettings.getState().notify.retro.time).toBe("07:00");
  });

  it("서버가 준 쉬는 방법은 덮는다 — 이제 서버가 든다", async () => {
    seedSession(Date.now() + 60_000);
    me.mockResolvedValueOnce({
      ok: true,
      data: { userId: 1, onboardingRequired: false, profile: meProfile() },
    });

    await useAuth.getState().hydrate();

    expect(useProfile.getState().restMethods).toEqual(["WALKING"]);
  });

  it("서버가 주지 않은 값(알림 켜짐)은 덮지 않는다 — 모르는 것과 끈 것은 다르다", async () => {
    // `notifyRetro` 가 `undefined` 면 지금 값을 그대로 둔다. 「끈 것」으로 접으면
    // 앱을 다시 열 때마다 사용자가 켠 알림이 꺼진다.
    seedSession(Date.now() + 60_000);
    const notifyBefore = useSettings.getState().notify.retro.enabled;
    me.mockResolvedValueOnce({
      ok: true,
      data: { userId: 1, onboardingRequired: false, profile: meProfile() },
    });

    await useAuth.getState().hydrate();

    expect(useSettings.getState().notify.retro.enabled).toBe(notifyBefore);
  });

  it("온보딩 전이라 프로필이 없으면 지금 값을 지우지 않는다", async () => {
    seedSession(Date.now() + 60_000);
    const before = useProfile.getState().nickname;
    me.mockResolvedValueOnce({
      ok: true,
      data: { userId: 1, onboardingRequired: true, profile: null },
    });

    await useAuth.getState().hydrate();

    expect(useProfile.getState().nickname).toBe(before);
  });

  it("401 이면 세션을 지우고 anonymous 로 닫는다 — 갱신까지 마친 토큰을 거부당했다", async () => {
    seedSession(Date.now() + 60_000);
    me.mockResolvedValueOnce({ ok: false, code: "unauthorized" });

    await useAuth.getState().hydrate();

    expect(useAuth.getState().status).toBe("anonymous");
    expect(secure.__store.has(SESSION_KEY)).toBe(false);
  });

  it.each([["no_session"], ["network"], ["server"], ["malformed"], ["unconfigured"]] as const)(
    "%s 로 실패하면 아무것도 덮지 않는다 — 못 물어본 것을 「온보딩을 안 했다」로 읽지 않는다",
    async (code) => {
      // `no_session` 에는 **갱신이 네트워크로 실패한 경우**가 섞여 있다.
      // 401 과 같이 취급하면 순간적인 연결 문제 한 번에 로그인이 날아간다.
      seedSession(Date.now() + 60_000);
      useOnboardingCompletion.getState().complete();
      me.mockResolvedValueOnce({ ok: false, code });

      await useAuth.getState().hydrate();

      expect(useAuth.getState().status).toBe("authenticated");
      expect(secure.__store.has(SESSION_KEY)).toBe(true);
      expect(useOnboardingCompletion.getState().completed).toBe(true);
    },
  );

  it("갱신에 성공한 뒤에도 서버에 묻는다 — 만료 세션으로 켠 앱도 홈으로 간다", async () => {
    seedSession(Date.now() - 1);
    reissue.mockResolvedValueOnce({
      ok: true,
      session: { accessToken: "new-t", refreshToken: "new-r", accessTokenExpiresIn: 1800 },
    });
    me.mockResolvedValueOnce({
      ok: true,
      data: { userId: 1, onboardingRequired: false, profile: meProfile() },
    });

    await useAuth.getState().hydrate();

    expect(useOnboardingCompletion.getState().completed).toBe(true);
  });

  it("세션이 없으면 묻지 않는다 — 보낼 토큰이 없다", async () => {
    await useAuth.getState().hydrate();

    expect(me).not.toHaveBeenCalled();
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
    seedDiaries(); // 앞사람이 보고 있던 보관함

    await useAuth.getState().signOut();

    // 서버가 그 사용자를 위해 생성한 대화 — 메모리에 남기지 않는다
    expect(useRetro.getState().turns).toEqual([]);
    expect(useProfile.getState().nickname).not.toBe("앞사람");
    expect(useSettings.getState().notify.retro.enabled).toBe(notifyBefore);
    // 앞사람의 일기가 한 장도 남지 않는다 — **비우는 함수가 채우지 않는다**
    // (예전에는 `reset()` 이 샘플 12편을 새로 깔았다 · 2026-08-21)
    expect(useDiary.getState().diaries).toEqual([]);
    expect(useDiary.getState().actionCards).toEqual([]);
  });

  it("지운 행동카드의 묘비는 **남긴다** — 같은 사람이 다시 로그인해도 지워진 채다", async () => {
    // 서버에 카드 삭제 계약이 없어 묘비가 유일한 삭제 기록이다. 로그아웃이 지우면
    // 다시 로그인했을 때 지운 카드가 `load()` 에 되살아난다.
    // 키가 이미 사용자별이라 다음 사람이 이것을 볼 일도 없다
    seedSession(Date.now() + 60_000);
    secure.__store.set("momentory.diary.deletedCards.1", JSON.stringify(["7"]));

    await useAuth.getState().signOut();

    expect(secure.__store.get("momentory.diary.deletedCards.1")).toBe(JSON.stringify(["7"]));
  });
});

describe("withdraw — 회원탈퇴", () => {
  it("성공하면 세션·사용자 store 를 비우고 anonymous 로 닫는다", async () => {
    seedSession(Date.now() + 60_000);
    await useAuth.getState().hydrate();
    useProfile.getState().set({ nickname: "앞사람" });
    useRetro.getState().addMyTurn("오늘은 좀 지쳤어");
    seedDiaries();

    const ok = await useAuth.getState().withdraw();

    expect(ok).toBe(true);
    expect(useAuth.getState().status).toBe("anonymous");
    expect(secure.__store.has(SESSION_KEY)).toBe(false);
    expect(useProfile.getState().nickname).not.toBe("앞사람");
    expect(useRetro.getState().turns).toEqual([]);
    expect(useDiary.getState().diaries).toEqual([]);
  });

  it("로그아웃과 달리 **묘비까지 지운다** — 계정이 사라지니 유지할 대상이 없다", async () => {
    seedSession(Date.now() + 60_000);
    secure.__store.set("momentory.diary.deletedCards.1", JSON.stringify(["7"]));

    await useAuth.getState().withdraw();

    expect(secure.__store.has("momentory.diary.deletedCards.1")).toBe(false);
  });

  it("카카오 연결 해제가 실패하면 아무것도 지우지 않는다 — 계정이 아직 살아 있다", async () => {
    withdrawApi.mockResolvedValueOnce({ ok: false, code: "kakao" });
    seedSession(Date.now() + 60_000);
    await useAuth.getState().hydrate();
    useProfile.getState().set({ nickname: "앞사람" });

    const ok = await useAuth.getState().withdraw();

    expect(ok).toBe(false);
    // 세션도 프로필도 그대로다 — 지웠으면 탈퇴 안 됐는데 로그아웃된 꼴이 된다
    expect(secure.__store.has(SESSION_KEY)).toBe(true);
    expect(useAuth.getState().status).toBe("authenticated");
    expect(useProfile.getState().nickname).toBe("앞사람");
    // 실패는 한 줄로 흡수한다 — 사유가 문구로 바뀌어 있다
    expect(useAuth.getState().withdrawError).toContain("카카오");
  });

  it("실패 뒤 다시 시도하면 지난 실패 한 줄을 지우고 시작한다", async () => {
    withdrawApi.mockResolvedValueOnce({ ok: false, code: "server" });
    seedSession(Date.now() + 60_000);
    await useAuth.getState().withdraw();
    expect(useAuth.getState().withdrawError).not.toBeNull();

    await useAuth.getState().withdraw(); // 이번엔 성공(기본 목)

    expect(useAuth.getState().status).toBe("anonymous");
    expect(useAuth.getState().withdrawError).toBeNull();
  });

  it("진행 중이면 두 번째 호출은 무시한다 — 확인 버튼 중복 클릭", async () => {
    seedSession(Date.now() + 60_000);
    useAuth.setState({ withdrawing: true });

    const ok = await useAuth.getState().withdraw();

    expect(ok).toBe(false);
    expect(withdrawApi).not.toHaveBeenCalled();
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
