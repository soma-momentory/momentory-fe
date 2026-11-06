#!/usr/bin/env bash
# 홈 배경음악의 음원을 앱에 넣을 모양으로 만든다 (2026-11-05).
#
#   scripts/make-music-audio.sh <원본 폴더>
#
# 원본은 저장소에 두지 않는다 — `백색소음_*.mp3` 다섯, `음악_*.mp3` 셋.
#
# - 이음새: 끝 1.5초와 처음 1.5초를 겹쳐 끝없이 도는 한 벌로 만든다. 원본은 앞머리 0.1초쯤이 무음이고 끝이
#   소리 도중에 끊겨서, 그대로 돌리면 한 바퀴마다 뚝 끊긴다. MP3 는 앞뒤 무음까지 있어 AAC(.m4a)로 굽는다.
# - 크기: 원본이 -38.5 ~ -12.1 LUFS 로 26 LU 넘게 벌어져 있어 곡을 바꾸면 소리가 튄다. 전부 -26 LUFS 로
#   맞추고, 키우다 넘치는 소리(장작 · 타자 소리)만 -3 dBFS 에서 누른다. 재생 음량은 1 그대로다.
# - 곡 이름 · 순서는 `src/features/music/model/tracks.ts` 가 정본이다. 곡을 늘리면 거기도 적는다.
set -euo pipefail

SRC="${1:?원본 폴더를 넘겨 주세요}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/music"
TARGET_LUFS=-26
PEAK_LIMIT=0.708 # -3 dBFS
FADE=1.5

mkdir -p "$OUT"

# 원본 이름|앱 자산 이름 — ⚠ 「벽나로 옆」은 받은 파일 이름 그대로다. 앱에는 「벽난로 옆」으로 적는다
tracks=(
  "백색소음_동네 작은 카페|noise-cafe"
  "백색소음_밤바다|noise-night-sea"
  "백색소음_벽나로 옆|noise-fireplace"
  "백색소음_여름 밤 창가|noise-summer-night"
  "백색소음_조용한 작업실|noise-workroom"
  "음악_느긋한 오후|music-lazy-afternoon"
  "음악_마음의 여백|music-quiet-mind"
  "음악_작은 추억 상자|music-memory-box"
)

lufs() {
  ffmpeg -hide_banner -nostats -i "$1" -af ebur128 -f null - 2>&1 |
    awk '/^ +I:/ { value = $2 } END { print value }'
}

for track in "${tracks[@]}"; do
  src="$SRC/${track%%|*}.mp3"
  id="${track##*|}"
  duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$src")
  end=$(awk -v d="$duration" -v f="$FADE" 'BEGIN { printf "%.3f", d - f }')
  gain=$(awk -v t="$TARGET_LUFS" -v m="$(lufs "$src")" 'BEGIN { printf "%.2f", t - m }')
  ffmpeg -hide_banner -loglevel error -y -i "$src" -filter_complex "
    [0:a]atrim=${FADE}:${end},asetpts=PTS-STARTPTS[body];
    [0:a]atrim=${end},asetpts=PTS-STARTPTS[tail];
    [0:a]atrim=0:${FADE},asetpts=PTS-STARTPTS[head];
    [tail][head]acrossfade=d=${FADE}:c1=qsin:c2=qsin[seam];
    [body][seam]concat=v=0:a=1,volume=${gain}dB,alimiter=limit=${PEAK_LIMIT}:attack=5:release=80:level=disabled[out]
  " -map "[out]" -c:a aac_at -b:a 128k -ac 2 -ar 48000 "$OUT/$id.m4a"
done
