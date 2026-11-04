import { createAudioPlayer } from "expo-audio";

import { createSound } from "../audio";

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
