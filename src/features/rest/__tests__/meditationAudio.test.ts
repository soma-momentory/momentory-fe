import { MEDITATION_CONCEPTS, meditationConcept, voiceAt } from "../model/meditation";
import {
  createMeditationAudio,
  MEDITATION_AMBIENT_VOLUME,
  MEDITATION_AUDIO_TIMING,
} from "../model/meditationAudio";

import { leaveListeningSession, type Sound } from "@/lib/audio";

jest.mock("@/lib/audio", () => ({
  createSound: jest.fn(),
  enterListeningSession: jest.fn(() => Promise.resolve()),
  leaveListeningSession: jest.fn(),
}));

type FakeSound = jest.Mocked<Sound> & { loop: boolean };

const setup = (loaded: (index: number) => boolean = () => true) => {
  const sounds: FakeSound[] = [];
  const create = ((_source: number, options?: { loop?: boolean }) => {
    const index = sounds.length;
    const sound: FakeSound = {
      loop: options?.loop ?? false,
      play: jest.fn(),
      pause: jest.fn(),
      seek: jest.fn(),
      setVolume: jest.fn(),
      whenLoaded: jest.fn((_timeoutMs: number) => Promise.resolve(loaded(index))),
      release: jest.fn(),
    };
    sounds.push(sound);
    return sound;
  }) as unknown as Parameters<typeof createMeditationAudio>[1];
  const audio = createMeditationAudio(meditationConcept("lantern"), create);
  const [ambient, ...voices] = sounds as [FakeSound, FakeSound, FakeSound, FakeSound];
  return { audio, ambient, voices };
};

const running = (elapsedMs: number) => ({ elapsedMs, running: true, voiceOn: true });
const lastVolume = (sound: FakeSound) => sound.setVolume.mock.calls.at(-1)?.[0];

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe("음성 일정", () => {
  it("풍경마다 세 토막이 1분마다 시작하고, 다음 토막과 겹치지 않는다", () => {
    for (const concept of MEDITATION_CONCEPTS) {
      expect(concept.voices).toHaveLength(3);
      concept.voices.forEach((voice, i) => {
        expect(Math.floor(voice.startMs / 60_000)).toBe(i);
        expect(voice.startMs + voice.durationMs).toBeLessThan((i + 1) * 60_000);
      });
    }
  });

  it("토막 안이면 그 자리를, 여백이면 없음을 준다", () => {
    const wave = meditationConcept("wave");
    expect(voiceAt(wave, 0)).toBeNull();
    expect(voiceAt(wave, 1_300)).toEqual({ index: 0, offsetMs: 1_000 });
    expect(voiceAt(wave, 30_000)).toBeNull();
    expect(voiceAt(wave, 60_300)).toEqual({ index: 1, offsetMs: 0 });
  });
});

describe("소리 다루기", () => {
  it("배경음만 돌고, 시작은 불러온 결과를 나눠 알려 줄 뿐 시계가 돌 때까지 소리를 내지 않는다", async () => {
    const { audio, ambient, voices } = setup((i) => i !== 2);

    expect(ambient.loop).toBe(true);
    expect(voices.every((v) => !v.loop)).toBe(true);

    await expect(audio.start()).resolves.toEqual({ ambient: true, voice: false });
    expect(ambient.play).not.toHaveBeenCalled();

    audio.sync(running(0));
    audio.sync(running(250));
    expect(ambient.play).toHaveBeenCalledTimes(1);
  });

  it("토막이 시작될 때 한 번만 틀고 배경음을 낮췄다가, 끝나면 돌려놓는다", () => {
    const { audio, ambient, voices } = setup();

    audio.sync(running(300));
    audio.sync(running(550));
    expect(voices[0]!.seek).toHaveBeenCalledWith(0);
    expect(voices[0]!.play).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(MEDITATION_AUDIO_TIMING.duckMs + 50);
    expect(lastVolume(ambient)).toBeCloseTo(MEDITATION_AMBIENT_VOLUME.ducked);

    audio.sync(running(20_000));
    jest.advanceTimersByTime(MEDITATION_AUDIO_TIMING.restoreMs + 50);
    expect(lastVolume(ambient)).toBeCloseTo(MEDITATION_AMBIENT_VOLUME.normal);
  });

  it("일시정지하면 음성과 배경음이 함께 멈추고, 이어하면 시계의 자리부터 함께 난다", () => {
    const { audio, ambient, voices } = setup();
    audio.sync(running(1_300));

    audio.sync({ elapsedMs: 3_300, running: false, voiceOn: true });
    expect(voices[0]!.pause).toHaveBeenCalled();
    expect(ambient.pause).toHaveBeenCalledTimes(1);

    audio.sync(running(3_300));
    expect(voices[0]!.seek).toHaveBeenLastCalledWith(3_000);
    expect(voices[0]!.play).toHaveBeenCalledTimes(2);
    expect(ambient.play).toHaveBeenCalledTimes(2);
  });

  it("음성을 끄면 그 자리에서 멈추고, 다시 켜면 앞으로 돌아가지 않고 지금 자리부터 난다", () => {
    const { audio, ambient, voices } = setup();
    audio.sync(running(1_300));

    audio.sync({ elapsedMs: 2_000, running: true, voiceOn: false });
    expect(voices[0]!.pause).toHaveBeenCalled();
    expect(ambient.pause).not.toHaveBeenCalled();

    audio.sync(running(4_300));
    expect(voices[0]!.seek).toHaveBeenLastCalledWith(4_000);
  });

  it("앱이 뒤로 가면 모두 멈추고, 돌아와도 이어하기 전에는 나지 않는다", () => {
    const { audio, ambient, voices } = setup();
    audio.sync(running(1_300));

    audio.setAway(true);
    expect(voices[0]!.pause).toHaveBeenCalled();
    expect(ambient.pause).toHaveBeenCalled();

    audio.setAway(false);
    audio.sync({ elapsedMs: 1_300, running: false, voiceOn: true });
    expect(ambient.play).toHaveBeenCalledTimes(1);

    audio.sync(running(1_300));
    expect(ambient.play).toHaveBeenCalledTimes(2);
    expect(voices[0]!.play).toHaveBeenCalledTimes(2);
  });

  it("끝나면 음성은 곧바로 멈추고 배경음은 상한 안에 사라지며, 그 뒤로 다시 나지 않는다", () => {
    const { audio, ambient, voices } = setup();
    audio.sync(running(1_300));

    audio.fadeOut();
    expect(voices[0]!.pause).toHaveBeenCalled();
    expect(ambient.release).not.toHaveBeenCalled();

    jest.advanceTimersByTime(
      MEDITATION_AUDIO_TIMING.fadeOutMs + MEDITATION_AUDIO_TIMING.rampStepMs,
    );
    expect(MEDITATION_AUDIO_TIMING.fadeOutMs).toBeLessThanOrEqual(500);
    expect(lastVolume(ambient)).toBe(0);
    expect(ambient.release).toHaveBeenCalledTimes(1);
    expect(leaveListeningSession).toHaveBeenCalledTimes(1);

    audio.sync(running(60_300));
    expect(voices[1]!.play).not.toHaveBeenCalled();
  });

  it("사라지는 중에 화면을 떠나도 곧바로 한 번만 놓아 준다", () => {
    const { audio, ambient } = setup();
    audio.fadeOut();

    audio.release();
    jest.advanceTimersByTime(2_000);
    audio.release();

    expect(ambient.release).toHaveBeenCalledTimes(1);
    expect(leaveListeningSession).toHaveBeenCalledTimes(1);
  });
});
