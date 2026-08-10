import { fetchOnboardingOptions } from "@/features/onboarding/data/optionsApi";
import { useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * 선택지 store — **온보딩을 멈추지 않는 것**이 주제다.
 *
 * 서버 답을 못 받았다고 첫 화면에서 붙잡아 두면, 연결이 잠깐 흔들린 사람은
 * 앱을 시작할 수조차 없다. 그래서 이 파일은 성공보다 **실패했을 때 무엇이
 * 그려지는가**를 더 많이 건다.
 */
jest.mock("@/features/onboarding/data/optionsApi", () => ({
  fetchOnboardingOptions: jest.fn(),
}));
const fetchOptions = jest.mocked(fetchOnboardingOptions);

const SERVER = {
  nickname: { maxLength: 12, duplicateAllowed: false },
  genders: [{ id: "MALE", label: "남" }],
  interestAreas: [{ id: "MONEY", label: "돈·재정" }],
  restMethods: [{ id: "NAPPING", label: "낮잠" }],
  reflectionTimeFormat: "HH:mm",
  defaultTimeZone: "Asia/Seoul",
};

beforeEach(() => {
  jest.clearAllMocks();
  useOnboardingOptions.getState().reset();
});

describe("대역 — 서버를 부르기 전에도 화면이 그려진다", () => {
  it("관심사 8개와 성별 3개를 처음부터 들고 있다", () => {
    const s = useOnboardingOptions.getState();

    expect(s.interestAreas.map((o) => o.id)).toEqual([
      "STUDY",
      "CAREER",
      "WORK",
      "RELATIONSHIP",
      "FAMILY",
      "SELF",
      "HEALTH",
      "OTHER",
    ]);
    expect(s.genders.map((o) => o.id)).toEqual(["MALE", "FEMALE", "UNSPECIFIED"]);
    expect(s.nickname.maxLength).toBe(10);
    expect(s.fromServer).toBe(false);
  });

  it("대역 라벨은 스펙 문안이다 — 06.md · 05-b.md", () => {
    const s = useOnboardingOptions.getState();

    expect(s.interestAreas.find((o) => o.id === "RELATIONSHIP")?.label).toBe("인간관계");
    expect(s.genders.find((o) => o.id === "UNSPECIFIED")?.label).toBe("선택 안 함");
  });
});

describe("load", () => {
  it("서버 답이 오면 목록이 통째로 바뀐다", async () => {
    fetchOptions.mockResolvedValueOnce({ ok: true, data: SERVER });

    await useOnboardingOptions.getState().load();

    const s = useOnboardingOptions.getState();
    expect(s.interestAreas).toEqual([{ id: "MONEY", label: "돈·재정" }]);
    expect(s.nickname).toEqual({ maxLength: 12, duplicateAllowed: false });
    expect(s.fromServer).toBe(true);
  });

  it("받은 것만 덮는다 — 성별이 null 이면 대역 성별이 남는다", async () => {
    fetchOptions.mockResolvedValueOnce({ ok: true, data: { ...SERVER, genders: null } });

    await useOnboardingOptions.getState().load();

    const s = useOnboardingOptions.getState();
    expect(s.genders.map((o) => o.id)).toEqual(["MALE", "FEMALE", "UNSPECIFIED"]);
    expect(s.interestAreas).toEqual([{ id: "MONEY", label: "돈·재정" }]);
  });

  it.each([["network"], ["no_session"], ["unauthorized"], ["server"], ["malformed"]] as const)(
    "%s 로 실패해도 대역이 그대로 남는다 — 온보딩은 멈추지 않는다",
    async (code) => {
      fetchOptions.mockResolvedValueOnce({ ok: false, code });

      await useOnboardingOptions.getState().load();

      const s = useOnboardingOptions.getState();
      expect(s.interestAreas).toHaveLength(8);
      expect(s.fromServer).toBe(false);
    },
  );

  it("동시에 여러 화면이 불러도 요청은 한 번이다", async () => {
    // 온보딩 레이아웃과 `M2` 가 거의 같이 뜨는 경우가 있다
    let settle!: (v: Awaited<ReturnType<typeof fetchOnboardingOptions>>) => void;
    fetchOptions.mockReturnValueOnce(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );

    const first = useOnboardingOptions.getState().load();
    const second = useOnboardingOptions.getState().load();
    settle({ ok: true, data: SERVER });
    await Promise.all([first, second]);

    expect(fetchOptions).toHaveBeenCalledTimes(1);
  });

  it("한 번 받았으면 다시 묻지 않는다", async () => {
    fetchOptions.mockResolvedValueOnce({ ok: true, data: SERVER });
    await useOnboardingOptions.getState().load();

    await useOnboardingOptions.getState().load();

    expect(fetchOptions).toHaveBeenCalledTimes(1);
  });

  it("실패한 뒤에는 다시 시도한다 — 한 번 놓쳤다고 영영 대역으로 두지 않는다", async () => {
    fetchOptions.mockResolvedValueOnce({ ok: false, code: "network" });
    await useOnboardingOptions.getState().load();

    fetchOptions.mockResolvedValueOnce({ ok: true, data: SERVER });
    await useOnboardingOptions.getState().load();

    expect(fetchOptions).toHaveBeenCalledTimes(2);
    expect(useOnboardingOptions.getState().fromServer).toBe(true);
  });
});
