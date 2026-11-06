import { AppState } from "react-native";

import { useAuth } from "@/features/auth/model/auth";
import { enterMusicSession, type Sound } from "@/lib/audio";
import { claimAudio } from "@/lib/audioClaim";
import { useToast } from "@/lib/toast";

import { useMusic } from "../model/music";
import { startBackgroundMusic } from "../model/musicPlayer";
import { MUSIC_TRACKS } from "../model/tracks";

const mockStore = new Map<string, string>();

jest.mock("@/features/rest/data/deviceStorage", () => ({
  storage: () => ({
    getItem: async (key: string) => mockStore.get(key) ?? null,
    setItem: async (key: string, value: string) => void mockStore.set(key, value),
    removeItem: async (key: string) => void mockStore.delete(key),
  }),
}));

jest.mock("@/lib/audio", () => ({
  createSound: jest.fn(),
  enterMusicSession: jest.fn(() => Promise.resolve()),
}));

const CAFE = "noise-cafe";
const SEA = "noise-night-sea";
const MEMORY_KEY = "momentory.music";
const remember = (trackId: string, playing = true) =>
  mockStore.set(MEMORY_KEY, JSON.stringify({ trackId, playing }));
const saved = () => JSON.parse(mockStore.get(MEMORY_KEY) ?? "null") as unknown;

type FakeSound = jest.Mocked<Sound>;

const fakeSound = (loaded = true): FakeSound => ({
  play: jest.fn(),
  pause: jest.fn(),
  seek: jest.fn(),
  setVolume: jest.fn(),
  whenLoaded: jest.fn((_timeoutMs: number) => Promise.resolve(loaded)),
  release: jest.fn(),
});

/** 소리가 틀어지기까지 비동기 몇 단계를 흘려보낸다 */
const settle = async () => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
};

describe("배경음악", () => {
  let appStateListener: (next: string) => void;
  let stop: (() => void) | null = null;
  let sounds: FakeSound[];
  let create: jest.Mock;

  const start = async () => {
    stop = startBackgroundMusic(create);
    await settle();
  };

  beforeEach(() => {
    mockStore.clear();
    sounds = [];
    create = jest.fn(() => {
      const sound = fakeSound();
      sounds.push(sound);
      return sound;
    });
    (enterMusicSession as jest.Mock).mockClear();
    useToast.setState({ current: null });
    useMusic.setState({ trackId: null, playing: false, fromMemory: false });
    useAuth.setState({ status: "authenticated" });
    const listeners: ((next: string) => void)[] = [];
    jest.spyOn(AppState, "addEventListener").mockImplementation(((_: string, listener: never) => {
      listeners.push(listener);
      return { remove: jest.fn() };
    }) as never);
    appStateListener = (next) => listeners.forEach((listener) => listener(next));
  });

  afterEach(() => {
    stop?.();
    stop = null;
    jest.restoreAllMocks();
  });

  it("꺼져 있으면 음원을 불러오지도 않는다", async () => {
    await start();
    expect(create).not.toHaveBeenCalled();
  });

  it("곡을 고르면 끝없이 돌며 나고, 무음 스위치를 넘어서며, 고른 곡을 기억한다", async () => {
    await start();
    useMusic.getState().select(CAFE);
    await settle();

    const cafe = MUSIC_TRACKS.find((track) => track.id === CAFE)!;
    expect(create).toHaveBeenCalledWith(cafe.source, { loop: true });
    expect(sounds[0]!.play).toHaveBeenCalledTimes(1);
    expect(enterMusicSession).toHaveBeenCalledWith({ respectSilentSwitch: false });
    expect(saved()).toEqual({ trackId: CAFE, playing: true });
  });

  it("다른 곡을 고르면 앞 곡을 놓아 주고 새 곡만 난다", async () => {
    await start();
    useMusic.getState().select(CAFE);
    await settle();
    useMusic.getState().select(SEA);
    await settle();

    expect(sounds[0]!.release).toHaveBeenCalledTimes(1);
    expect(sounds[1]!.play).toHaveBeenCalledTimes(1);
  });

  it("일시정지하면 곡을 쥔 채 멈추고, 다시 재생하면 멈춘 자리부터 이어진다", async () => {
    await start();
    useMusic.getState().select(CAFE);
    await settle();

    useMusic.getState().toggle();
    await settle();
    expect(sounds[0]!.pause).toHaveBeenCalledTimes(1);
    expect(sounds[0]!.release).not.toHaveBeenCalled();
    expect(saved()).toEqual({ trackId: CAFE, playing: false });

    useMusic.getState().toggle();
    await settle();
    expect(sounds[0]!.play).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("고른 곡 없이 재생을 누르면 목록 첫 곡이 난다", async () => {
    await start();
    useMusic.getState().toggle();
    await settle();

    expect(useMusic.getState().trackId).toBe(MUSIC_TRACKS[0]!.id);
    expect(sounds[0]!.play).toHaveBeenCalledTimes(1);
  });

  it("앞뒤 곡은 목록 순서로 넘어가고 끝에서는 반대쪽으로 돈다 — 일시정지 중이어도 넘기면 난다", async () => {
    const first = MUSIC_TRACKS[0]!.id;
    const last = MUSIC_TRACKS.at(-1)!.id;
    await start();

    useMusic.getState().skip("previous");
    expect(useMusic.getState().trackId).toBe(last);
    useMusic.getState().skip("next");
    expect(useMusic.getState().trackId).toBe(first);
    useMusic.getState().skip("next");
    expect(useMusic.getState().trackId).toBe(MUSIC_TRACKS[1]!.id);

    useMusic.getState().toggle();
    useMusic.getState().skip("previous");
    await settle();
    expect(useMusic.getState()).toMatchObject({ trackId: first, playing: true });
  });

  it("일시정지해 둔 곡은 다시 켜도 소리 없이 곡만 남는다", async () => {
    remember(CAFE, false);
    await start();

    expect(useMusic.getState()).toMatchObject({ trackId: CAFE, playing: false });
    expect(create).not.toHaveBeenCalled();
  });

  it("지난번 곡을 되살려 틀되 무음 스위치를 따르고, 직접 다시 고르면 그때 넘어선다", async () => {
    remember(CAFE);
    await start();

    expect(sounds[0]!.play).toHaveBeenCalledTimes(1);
    expect(enterMusicSession).toHaveBeenLastCalledWith({ respectSilentSwitch: true });

    useMusic.getState().select(CAFE);
    await settle();

    // 곡을 다시 불러오지 않고 세션만 바꾼다
    expect(create).toHaveBeenCalledTimes(1);
    expect(enterMusicSession).toHaveBeenLastCalledWith({ respectSilentSwitch: false });
  });

  it("없어진 곡이 기억돼 있으면 꺼진 채로 둔다", async () => {
    remember("noise-gone");
    await start();

    expect(useMusic.getState().trackId).toBeNull();
    expect(create).not.toHaveBeenCalled();
  });

  it("기억을 읽는 사이에 사용자가 고른 곡을 기억이 덮지 않는다", async () => {
    remember(CAFE);
    stop = startBackgroundMusic(create);
    useMusic.getState().select(SEA);
    await settle();

    expect(useMusic.getState().trackId).toBe(SEA);
  });

  it("앱이 뒤로 가면 멈추고 돌아오면 다시 난다", async () => {
    await start();
    useMusic.getState().select(CAFE);
    await settle();

    appStateListener("background");
    await settle();
    expect(sounds[0]!.pause).toHaveBeenCalledTimes(1);

    appStateListener("active");
    await settle();
    expect(sounds[0]!.play).toHaveBeenCalledTimes(2);
    // 멈췄다 돌아온 것이다 — 처음부터 다시 틀지 않는다
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("명상 음성이나 마이크가 소리를 쓰는 동안 비켜 섰다가 끝나면 돌아온다", async () => {
    await start();
    useMusic.getState().select(CAFE);
    await settle();

    const release = claimAudio();
    await settle();
    expect(sounds[0]!.pause).toHaveBeenCalledTimes(1);

    release();
    await settle();
    expect(sounds[0]!.play).toHaveBeenCalledTimes(2);
  });

  it("비켜 서 있는 동안 고른 곡은 끝난 뒤에 난다", async () => {
    await start();
    const release = claimAudio();
    useMusic.getState().select(CAFE);
    await settle();
    expect(sounds[0]!.play).not.toHaveBeenCalled();

    release();
    await settle();
    expect(sounds[0]!.play).toHaveBeenCalledTimes(1);
  });

  it("불러오는 사이에 일시정지했으면 늦게 불러와져도 나지 않는다", async () => {
    let finishLoading: (loaded: boolean) => void = () => undefined;
    const slow = fakeSound();
    slow.whenLoaded.mockReturnValue(
      new Promise((resolve) => {
        finishLoading = resolve;
      }),
    );
    create.mockReturnValue(slow);

    await start();
    useMusic.getState().select(CAFE);
    await settle();
    useMusic.getState().toggle();
    finishLoading(true);
    await settle();

    expect(slow.play).not.toHaveBeenCalled();
  });

  it("로그아웃하면 소리가 멈추고 다음 사람에게 곡이 이어지지 않는다", async () => {
    await start();
    useMusic.getState().select(CAFE);
    await settle();

    useMusic.getState().reset();
    useAuth.setState({ status: "anonymous" });
    await settle();

    expect(sounds[0]!.release).toHaveBeenCalledTimes(1);
    expect(mockStore.has(MEMORY_KEY)).toBe(false);
  });

  it("로그인 전에는 기억된 곡을 틀지 않고, 로그인하면 튼다", async () => {
    remember(CAFE);
    useAuth.setState({ status: "anonymous" });
    await start();
    expect(create).not.toHaveBeenCalled();

    useAuth.setState({ status: "authenticated" });
    await settle();
    expect(sounds[0]!.play).toHaveBeenCalledTimes(1);
  });

  it("못 불러오면 한 줄로 알리고 일시정지로 돌아간다", async () => {
    create.mockImplementation(() => fakeSound(false));
    await start();
    useMusic.getState().select(CAFE);
    await settle();

    expect(useToast.getState().current?.message).toBe("음악을 불러오지 못했어요.");
    expect(useMusic.getState().playing).toBe(false);
  });

  it("플레이어를 만들다 던져도 앱은 죽지 않는다", async () => {
    create.mockImplementation(() => {
      throw new Error("native");
    });
    await start();
    expect(() => useMusic.getState().select(CAFE)).not.toThrow();
    expect(useMusic.getState().playing).toBe(false);
  });
});

describe("곡 목록", () => {
  it("백색소음 다섯 · 음악 셋이고 id 가 겹치지 않는다", () => {
    expect(MUSIC_TRACKS.filter((track) => track.kind === "noise")).toHaveLength(5);
    expect(MUSIC_TRACKS.filter((track) => track.kind === "music")).toHaveLength(3);
    expect(new Set(MUSIC_TRACKS.map((track) => track.id)).size).toBe(MUSIC_TRACKS.length);
  });
});
