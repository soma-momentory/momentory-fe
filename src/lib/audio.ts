import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";

/**
 * 앱에 들어 있는 소리 하나 — `expo-audio` 를 보는 곳은 여기 하나다(`appState.ts` 와 같은 자리).
 *
 * 놓아 준 뒤에 부르면 네이티브가 던진다. 소리가 못 나는 것 때문에 화면이 죽으면 안 되므로 여기서
 * 삼킨다 — 자막과 시계는 소리 없이도 계속 간다.
 */
export type Sound = {
  play(): void;
  pause(): void;
  seek(ms: number): void;
  setVolume(volume: number): void;
  /** 재생할 수 있게 됐는지 — 못 불러오거나 시간 안에 못 오면 `false` */
  whenLoaded(timeoutMs: number): Promise<boolean>;
  release(): void;
};

export function createSound(
  source: number,
  { loop = false, volume = 1 }: { loop?: boolean; volume?: number } = {},
): Sound {
  const player = createAudioPlayer(source);
  player.loop = loop;
  player.volume = volume;
  let released = false;

  const safely = (call: () => void) => {
    if (released) return;
    try {
      call();
    } catch {
      // 위 설명대로 소리만 포기한다
    }
  };

  return {
    play: () => safely(() => player.play()),
    pause: () => safely(() => player.pause()),
    seek: (ms) => safely(() => void player.seekTo(ms / 1000)),
    setVolume: (next) =>
      safely(() => {
        player.volume = next;
      }),
    whenLoaded: (timeoutMs) =>
      new Promise((resolve) => {
        if (player.isLoaded) {
          resolve(true);
          return;
        }
        const done = (loaded: boolean) => {
          clearTimeout(timer);
          subscription.remove();
          resolve(loaded);
        };
        const timer = setTimeout(() => done(false), timeoutMs);
        const subscription = player.addListener("playbackStatusUpdate", (status) => {
          if (status.isLoaded) done(true);
          else if (status.error != null) done(false);
        });
      }),
    // `remove` 는 목록에서만 뺀다 — 안드로이드는 `release` 전까지 계속 재생되고, 목록에서 빠져 세션을 닫아도
    // 멈추지 않는다(실기기에서 나간 세션의 배경음이 남았다). 그래서 멈춘 뒤 셋 다 부른다
    release: () => {
      safely(() => player.pause());
      safely(() => player.remove());
      safely(() => player.release());
      released = true;
    },
  };
}

/**
 * 안내 음성을 듣는 동안의 오디오 세션 — 무음 스위치가 켜져 있어도 들리고, 다른 앱의 음악은 멈춘다.
 * 백그라운드 재생은 켜지 않는다(앱이 뒤로 가면 멈추는 것이 규칙이다).
 *
 * ⚠ 끝나기를 기다린 뒤에 재생한다 — 세션을 닫아 둔 상태의 `play` 는 안드로이드에서 그냥 버려진다.
 */
export async function enterListeningSession() {
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "doNotMix",
      allowsRecording: false,
      shouldPlayInBackground: false,
    });
  } catch {
    // 세션을 못 바꿔도 기본 세션으로 재생을 시도한다
  }
}

/** 세션을 닫아 멈춰 뒀던 다른 앱의 음악이 돌아오게 한다 */
export function leaveListeningSession() {
  void setIsAudioActiveAsync(false).catch(() => undefined);
}
