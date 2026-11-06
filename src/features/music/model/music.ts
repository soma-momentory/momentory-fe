import { create } from "zustand";

import { readMusicMemory, writeMusicMemory } from "../data/musicMemory";
import { MUSIC_TRACKS, musicTrack } from "./tracks";

/**
 * 배경음악 설정 (2026-11-05) — 고른 곡(`trackId`)과 지금 틀고 있는가(`playing`) 둘이다.
 * 일시정지해도 곡은 남는다 — 다시 재생하면 같은 곡이 멈춘 자리부터 이어진다(2026-11-06).
 *
 * 실제 소리는 `musicPlayer.ts` 가 이 값을 보고 낸다. 화면은 고르고 누르기만 한다.
 */
type MusicStore = {
  trackId: string | null;
  playing: boolean;
  /** 사용자가 이번 실행에 고른 것이 아니라 지난번 기억으로 틀었다 — 이때는 무음 스위치를 따른다 */
  fromMemory: boolean;
  /** 곡을 고르면 바로 난다 */
  select: (trackId: string) => void;
  /** 재생 ↔ 일시정지. 고른 곡이 없으면 목록 첫 곡을 튼다 */
  toggle: () => void;
  /** 목록 순서로 앞뒤 곡을 튼다 — 끝에서 넘기면 반대쪽 끝으로 돈다 */
  skip: (direction: "previous" | "next") => void;
  /** 못 틀었다 — 곡은 남기고 멈춘다 */
  stop: () => void;
  /** 앱이 켜질 때 지난번 상태를 되살린다 */
  restore: () => Promise<void>;
  /** 로그아웃 · 탈퇴 — 틀어 둔 곡은 그 사람의 것이다 */
  reset: () => void;
};

/** 기억을 읽는 사이에 사용자가 먼저 누르거나 로그아웃했으면 읽어 온 값을 버린다 */
let generation = 0;

export const useMusic = create<MusicStore>((set, get) => {
  /** 사용자가 바꾼 상태 — 기억에도 남긴다 */
  const commit = (trackId: string | null, playing: boolean) => {
    generation += 1;
    set({ trackId, playing, fromMemory: false });
    void writeMusicMemory({ trackId, playing });
  };

  return {
    trackId: null,
    playing: false,
    fromMemory: false,
    select: (trackId) => commit(trackId, true),
    toggle: () => {
      const { trackId, playing } = get();
      commit(trackId ?? MUSIC_TRACKS[0]!.id, !playing);
    },
    skip: (direction) => {
      const at = MUSIC_TRACKS.findIndex((track) => track.id === get().trackId);
      const step = direction === "next" ? 1 : -1;
      // 고른 곡이 없으면 다음은 첫 곡, 이전은 마지막 곡이다
      const from = at === -1 ? (direction === "next" ? -1 : 0) : at;
      const next = (from + step + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
      commit(MUSIC_TRACKS[next]!.id, true);
    },
    stop: () => commit(get().trackId, false),
    restore: async () => {
      const started = generation;
      const saved = await readMusicMemory();
      if (started !== generation) return;
      const track = musicTrack(saved.trackId);
      if (track != null) set({ trackId: track.id, playing: saved.playing, fromMemory: true });
    },
    reset: () => {
      generation += 1;
      set({ trackId: null, playing: false, fromMemory: false });
      void writeMusicMemory({ trackId: null, playing: false });
    },
  };
});
