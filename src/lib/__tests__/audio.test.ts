import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";

import {
  createSound,
  enterListeningSession,
  enterMusicSession,
  leaveListeningSession,
} from "../audio";
import { isAudioClaimed } from "../audioClaim";

jest.mock("expo-audio", () => ({
  createAudioPlayer: jest.fn(),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  setIsAudioActiveAsync: jest.fn(() => Promise.resolve()),
}));

const fakePlayer = () => ({
  isLoaded: true,
  play: jest.fn(),
  pause: jest.fn(),
  remove: jest.fn(),
  release: jest.fn(),
  seekTo: jest.fn(),
  addListener: jest.fn(),
});

describe("소리 하나", () => {
  it("놓아 줄 때 멈추고 네이티브 플레이어까지 해제한다 — `remove` 만으로는 안드로이드에서 계속 난다", () => {
    const player = fakePlayer();
    (createAudioPlayer as jest.Mock).mockReturnValue(player);

    const sound = createSound(1);
    sound.release();

    expect(player.pause).toHaveBeenCalledTimes(1);
    expect(player.remove).toHaveBeenCalledTimes(1);
    expect(player.release).toHaveBeenCalledTimes(1);
    expect(player.pause.mock.invocationCallOrder[0]!).toBeLessThan(
      player.release.mock.invocationCallOrder[0]!,
    );
  });

  it("놓아 준 뒤의 호출은 네이티브로 가지 않는다", () => {
    const player = fakePlayer();
    (createAudioPlayer as jest.Mock).mockReturnValue(player);

    const sound = createSound(1);
    sound.release();
    sound.play();
    sound.release();

    expect(player.play).not.toHaveBeenCalled();
    expect(player.release).toHaveBeenCalledTimes(1);
  });
});

describe("오디오 세션", () => {
  it("안내 음성을 듣는 동안 배경음악을 세워 두고, 세션이 닫힌 뒤에야 돌려준다", async () => {
    await enterListeningSession();
    expect(isAudioClaimed()).toBe(true);

    let closeSession: () => void = () => undefined;
    (setIsAudioActiveAsync as jest.Mock).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        closeSession = resolve;
      }),
    );
    leaveListeningSession();
    // 음악이 먼저 돌아오면 늦게 닫히는 세션이 음악까지 멈춘다
    expect(isAudioClaimed()).toBe(true);

    closeSession();
    await new Promise(process.nextTick);
    expect(isAudioClaimed()).toBe(false);
  });

  it("세션을 닫다 실패해도 배경음악을 돌려준다", async () => {
    await enterListeningSession();
    (setIsAudioActiveAsync as jest.Mock).mockReturnValueOnce(Promise.reject(new Error("native")));
    leaveListeningSession();
    await new Promise(process.nextTick);
    expect(isAudioClaimed()).toBe(false);
  });

  it("배경음악은 다른 앱의 소리를 멈추지 않고, 뒤로 가면 멈춘다", async () => {
    await enterMusicSession({ respectSilentSwitch: true });
    expect(setAudioModeAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        playsInSilentMode: false,
        interruptionMode: "mixWithOthers",
        shouldPlayInBackground: false,
      }),
    );

    await enterMusicSession({ respectSilentSwitch: false });
    expect(setAudioModeAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ playsInSilentMode: true }),
    );
  });
});
