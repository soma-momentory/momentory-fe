import { useAuth } from "@/features/auth/model/auth";
import { onForeground, onLeaveForeground } from "@/lib/appState";
import { createSound, enterMusicSession, type Sound } from "@/lib/audio";
import { isAudioClaimed, onAudioClaimChange } from "@/lib/audioClaim";
import { showToast } from "@/lib/toast";

import { useMusic } from "./music";
import { musicTrack } from "./tracks";

/** 앱에 들어 있는 파일이라 금방 불러온다. 이 안에 못 불러오면 틀지 못한 것으로 친다 */
const LOAD_TIMEOUT_MS = 8_000;

/**
 * 배경음악을 실제로 내는 곳 (2026-11-05). `providers.tsx` 에 건다 — 탭을 옮겨도 음악이 이어져야 해서다.
 *
 * 소리가 나는 조건은 다섯이고, 어느 하나가 바뀔 때마다 `sync` 한 곳에서 다시 맞춘다:
 * 곡을 골랐다 · 재생 중이다 · 로그인했다 · 앱이 앞에 있다 · 명상 음성이나 마이크가 소리를 쓰고 있지 않다.
 * 멈췄다 돌아오면 멈춘 자리부터 이어진다.
 */
export function startBackgroundMusic(create: typeof createSound = createSound): () => void {
  let loaded: { id: string; sound: Sound } | null = null;
  let sounding = false;
  let away = false;
  /** 세션 · 불러오기를 기다리는 사이에 상황이 바뀌었으면 그 재생은 버린다 */
  let attempt = 0;
  let sessionFromMemory = false;

  const giveUp = () => {
    showToast("음악을 불러오지 못했어요.");
    useMusic.getState().stop();
  };

  const begin = async (sound: Sound, fromMemory: boolean, current: number) => {
    await enterMusicSession({ respectSilentSwitch: fromMemory });
    const ready = await sound.whenLoaded(LOAD_TIMEOUT_MS);
    if (current !== attempt) return;
    if (ready) sound.play();
    else giveUp();
  };

  const load = (id: string): Sound | null => {
    const track = musicTrack(id);
    if (track == null) return null;
    try {
      return create(track.source, { loop: true });
    } catch {
      return null; // 소리가 못 나는 것 때문에 앱이 죽으면 안 된다
    }
  };

  const sync = () => {
    const { trackId, playing, fromMemory } = useMusic.getState();
    const signedIn = useAuth.getState().status === "authenticated";
    // 일시정지한 곡은 놓지 않고 쥐고 있다 — 다시 재생하면 멈춘 자리부터 이어진다.
    // 아직 불러오지 않은 곡은 틀 때 불러온다
    const target =
      signedIn && trackId != null && (playing || loaded?.id === trackId) ? trackId : null;

    if ((loaded?.id ?? null) !== target) {
      attempt += 1;
      loaded?.sound.release();
      loaded = null;
      sounding = false;
      if (target != null) {
        const sound = load(target);
        if (sound == null) {
          giveUp();
          return;
        }
        loaded = { id: target, sound };
      }
    }

    const want = loaded != null && playing && !away && !isAudioClaimed();

    if (want === sounding) {
      // 기억으로 틀던 곡을 직접 다시 골랐다 — 곡은 그대로 두고 무음 스위치만 넘어선다
      if (want && fromMemory !== sessionFromMemory) {
        sessionFromMemory = fromMemory;
        void enterMusicSession({ respectSilentSwitch: fromMemory });
      }
      return;
    }

    sounding = want;
    attempt += 1;
    if (!want) {
      loaded?.sound.pause();
      return;
    }
    sessionFromMemory = fromMemory;
    void begin(loaded!.sound, fromMemory, attempt);
  };

  const offMusic = useMusic.subscribe(sync);
  const offAuth = useAuth.subscribe(sync);
  const offClaim = onAudioClaimChange(sync);
  const offLeave = onLeaveForeground(() => {
    away = true;
    sync();
  });
  const offBack = onForeground(() => {
    away = false;
    sync();
  });

  void useMusic.getState().restore();
  sync();

  return () => {
    offMusic();
    offAuth();
    offClaim();
    offLeave();
    offBack();
    attempt += 1;
    loaded?.sound.release();
    loaded = null;
    sounding = false;
  };
}
