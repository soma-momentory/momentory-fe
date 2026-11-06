/**
 * 홈 배경음악의 곡 목록 — 이름 · 순서의 정본이다. 「동네 작은 카페」는 백색소음 맨 끝이다(2026-11-06 사용자 요청).
 *
 * 음원은 `scripts/make-music-audio.sh` 가 만든다(이음새 없이 돌고 크기가 같다).
 */
export type MusicKind = "noise" | "music";

export type MusicTrack = {
  id: string;
  name: string;
  kind: MusicKind;
  source: number;
};

export const MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    id: "noise-night-sea",
    name: "밤바다",
    kind: "noise",
    source: require("../../../../assets/music/noise-night-sea.m4a"),
  },
  {
    id: "noise-fireplace",
    name: "벽난로 옆",
    kind: "noise",
    source: require("../../../../assets/music/noise-fireplace.m4a"),
  },
  {
    id: "noise-summer-night",
    name: "여름 밤 창가",
    kind: "noise",
    source: require("../../../../assets/music/noise-summer-night.m4a"),
  },
  {
    id: "noise-workroom",
    name: "조용한 작업실",
    kind: "noise",
    source: require("../../../../assets/music/noise-workroom.m4a"),
  },
  {
    id: "noise-cafe",
    name: "동네 작은 카페",
    kind: "noise",
    source: require("../../../../assets/music/noise-cafe.m4a"),
  },
  {
    id: "music-lazy-afternoon",
    name: "느긋한 오후",
    kind: "music",
    source: require("../../../../assets/music/music-lazy-afternoon.m4a"),
  },
  {
    id: "music-quiet-mind",
    name: "마음의 여백",
    kind: "music",
    source: require("../../../../assets/music/music-quiet-mind.m4a"),
  },
  {
    id: "music-memory-box",
    name: "작은 추억 상자",
    kind: "music",
    source: require("../../../../assets/music/music-memory-box.m4a"),
  },
];

export const musicTrack = (id: string | null): MusicTrack | null =>
  MUSIC_TRACKS.find((track) => track.id === id) ?? null;
