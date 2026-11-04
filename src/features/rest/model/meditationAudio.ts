import { voiceAt, type MeditationConcept, type MeditationConceptId } from "./meditation";

import { createSound, enterListeningSession, leaveListeningSession, type Sound } from "@/lib/audio";

/**
 * 쉼터 · 3분 명상의 소리 (2026-11-04) — 배경음 하나와 안내 음성 세 토막.
 *
 * 음성은 재생 위치를 따로 두지 않고 **세션 시계를 따른다**. 시계가 정한 토막의 자리에서 틀 뿐이라
 * 일시정지 · 다시 켜기 뒤에도 자막과 어긋나지 않고, 끈 동안에는 같은 시계가 자막만 끌고 간다.
 * 배경음은 끝없이 돈다. 소리는 시계와 함께 간다 — 시계가 멈추면(일시정지 · 멈춤 확인 · 설명 카드 · 정보 시트 ·
 * 앱이 뒤로 감 · 다른 화면) 음성과 배경음이 함께 멈추고, 이어하면 함께 돌아온다.
 *
 * 음원은 `scripts/make-meditation-audio.sh` 가 만든다.
 */
const SOURCES: Record<MeditationConceptId, { ambient: number; voices: readonly number[] }> = {
  wave: {
    ambient: require("../../../../assets/meditation/audio/ambient-wave.m4a"),
    voices: [
      require("../../../../assets/meditation/audio/voice-wave-1.mp3"),
      require("../../../../assets/meditation/audio/voice-wave-2.mp3"),
      require("../../../../assets/meditation/audio/voice-wave-3.mp3"),
    ],
  },
  forest: {
    ambient: require("../../../../assets/meditation/audio/ambient-forest.m4a"),
    voices: [
      require("../../../../assets/meditation/audio/voice-forest-1.mp3"),
      require("../../../../assets/meditation/audio/voice-forest-2.mp3"),
      require("../../../../assets/meditation/audio/voice-forest-3.mp3"),
    ],
  },
  sunlight: {
    ambient: require("../../../../assets/meditation/audio/ambient-sunlight.m4a"),
    voices: [
      require("../../../../assets/meditation/audio/voice-sunlight-1.mp3"),
      require("../../../../assets/meditation/audio/voice-sunlight-2.mp3"),
      require("../../../../assets/meditation/audio/voice-sunlight-3.mp3"),
    ],
  },
  rain: {
    ambient: require("../../../../assets/meditation/audio/ambient-rain.m4a"),
    voices: [
      require("../../../../assets/meditation/audio/voice-rain-1.mp3"),
      require("../../../../assets/meditation/audio/voice-rain-2.mp3"),
      require("../../../../assets/meditation/audio/voice-rain-3.mp3"),
    ],
  },
  lantern: {
    ambient: require("../../../../assets/meditation/audio/ambient-lantern.m4a"),
    voices: [
      require("../../../../assets/meditation/audio/voice-lantern-1.mp3"),
      require("../../../../assets/meditation/audio/voice-lantern-2.mp3"),
      require("../../../../assets/meditation/audio/voice-lantern-3.mp3"),
    ],
  },
};

/**
 * 배경음의 재생 음량 — 파일은 -32 LUFS, 음성은 -22 LUFS 안팎이다. 실제 소리는 -36 LUFS, 음성이 나는
 * 동안 -40 LUFS 라 말보다 18 LU 쯤 작다. ⚠ 숫자로 정한 초깃값이라 청취 검수에서 여기만 고치면 된다.
 */
export const MEDITATION_AMBIENT_VOLUME = { normal: 0.63, ducked: 0.38 } as const;

export const MEDITATION_AUDIO_TIMING = {
  /** 이 안에 불러오지 못하면 로딩 실패로 친다 */
  loadTimeoutMs: 8_000,
  /** 음성이 시작할 때 배경음이 낮아지는 시간 · 끝나고 돌아오는 시간 */
  duckMs: 600,
  restoreMs: 1_200,
  /** 「여기서 멈추기」 뒤 배경음이 사라지는 시간 — 기획의 상한은 0.5초다 */
  fadeOutMs: 450,
  rampStepMs: 50,
} as const;

export type MeditationAudio = ReturnType<typeof createMeditationAudio>;

export function createMeditationAudio(
  concept: MeditationConcept,
  create: typeof createSound = createSound,
) {
  const source = SOURCES[concept.id];
  const ambient: Sound = create(source.ambient, {
    loop: true,
    volume: MEDITATION_AMBIENT_VOLUME.normal,
  });
  const voices: Sound[] = source.voices.map((voice) => create(voice));

  let closed = false;
  let released = false;
  let ambientOn = false;
  let away = false;
  let speaking: number | null = null;
  let volume: number = MEDITATION_AMBIENT_VOLUME.normal;
  let ramp: ReturnType<typeof setInterval> | null = null;

  const stopRamp = () => {
    if (ramp != null) clearInterval(ramp);
    ramp = null;
  };

  const rampTo = (target: number, durationMs: number, then?: () => void) => {
    stopRamp();
    const from = volume;
    const startedAt = Date.now();
    ramp = setInterval(() => {
      const progress = Math.min((Date.now() - startedAt) / durationMs, 1);
      volume = from + (target - from) * progress;
      ambient.setVolume(volume);
      if (progress < 1) return;
      stopRamp();
      then?.();
    }, MEDITATION_AUDIO_TIMING.rampStepMs);
  };

  const hush = () => {
    if (speaking != null) voices[speaking]?.pause();
    speaking = null;
  };

  const setAmbient = (on: boolean) => {
    if (on === ambientOn) return;
    ambientOn = on;
    if (on) ambient.play();
    else ambient.pause();
  };

  const release = () => {
    if (released) return;
    released = true;
    closed = true;
    stopRamp();
    ambient.release();
    voices.forEach((voice) => voice.release());
    leaveListeningSession();
  };

  return {
    /** 세션을 열고 불러오기를 기다린다. 소리는 시계가 돌기 시작할 때 난다. 음성은 세 토막이 다 있어야 있는 것이다 */
    async start() {
      await enterListeningSession();
      const { loadTimeoutMs } = MEDITATION_AUDIO_TIMING;
      const [ambientLoaded, ...voicesLoaded] = await Promise.all([
        ambient.whenLoaded(loadTimeoutMs),
        ...voices.map((voice) => voice.whenLoaded(loadTimeoutMs)),
      ]);
      return { ambient: ambientLoaded === true, voice: voicesLoaded.every(Boolean) };
    },

    /** 시계가 움직일 때마다 부른다 — 지금 나야 할 토막과 다를 때만 건드린다 */
    sync({
      elapsedMs,
      running,
      voiceOn,
    }: {
      elapsedMs: number;
      running: boolean;
      voiceOn: boolean;
    }) {
      if (closed) return;
      setAmbient(running && !away);
      const want = running && voiceOn && !away ? voiceAt(concept, elapsedMs) : null;
      const next = want?.index ?? null;
      if (next === speaking) return;
      hush();
      if (want != null) {
        voices[want.index]?.seek(want.offsetMs);
        voices[want.index]?.play();
        speaking = want.index;
      }
      if (next == null) rampTo(MEDITATION_AMBIENT_VOLUME.normal, MEDITATION_AUDIO_TIMING.restoreMs);
      else rampTo(MEDITATION_AMBIENT_VOLUME.ducked, MEDITATION_AUDIO_TIMING.duckMs);
    },

    /** 앱이 앞에서 물러나면 렌더를 기다리지 않고 곧바로 멈춘다. 돌아와도 이어하기를 누를 때까지 조용하다 */
    setAway(next: boolean) {
      away = next;
      if (closed || !next) return;
      hush();
      setAmbient(false);
    },

    /** 세션의 끝 — 음성은 곧바로 멈추고 배경음은 잠깐 사이에 사라진다. 그 뒤로 어떤 소리도 나지 않는다 */
    fadeOut() {
      if (closed) return;
      closed = true;
      hush();
      rampTo(0, MEDITATION_AUDIO_TIMING.fadeOutMs, release);
    },

    /** 화면을 떠날 때 — 소리를 남기지 않는다 */
    release,
  };
}
