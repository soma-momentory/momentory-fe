#!/usr/bin/env bash
# 쉼터 3분 명상의 음원을 앱에 넣을 모양으로 만든다 (2026-11-04).
#
#   scripts/make-meditation-audio.sh <원본 폴더>
#
# 원본은 저장소에 두지 않는다 — `소리_{파도,숲,햇살,비,모닥불}.mp3`, `음성_{같은 이름}_{1,2,3}.mp3`.
#
# - 배경음: 30초 원본의 끝 1.5초와 처음 1.5초를 겹쳐 이음새 없는 28.5초로 만들고, 다섯 개의 크기를
#   맞춘 뒤 튀는 소리만 눌러 AAC(.m4a)로 굽는다. MP3 는 앞뒤 무음이 이음새에서 끊길 수 있다.
#   크기는 재생 음량으로만 줄일 수 있어 파일을 조금 크게 굽는다 — 실제 음량은 `meditationAudio.ts` 의 `MEDITATION_AMBIENT_VOLUME` 이 정한다.
# - 음성: 고칠 것이 없어 다시 굽지 않고 그대로 복사한다. 길이가 바뀌면 `meditation.ts` 의 durationMs 도 바꾼다.
set -euo pipefail

SRC="${1:?원본 폴더를 넘겨 주세요}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/meditation/audio"
TARGET_LUFS=-32
PEAK_LIMIT=0.25 # -12 dBFS

mkdir -p "$OUT"

names=(파도 숲 햇살 비 모닥불)
ids=(wave forest sunlight rain lantern)

lufs() {
  ffmpeg -hide_banner -nostats -i "$1" -af ebur128 -f null - 2>&1 |
    awk '/^ +I:/ { value = $2 } END { print value }'
}

for i in "${!names[@]}"; do
  name="${names[$i]}"
  id="${ids[$i]}"
  src="$SRC/소리_$name.mp3"
  gain=$(awk -v t="$TARGET_LUFS" -v m="$(lufs "$src")" 'BEGIN { printf "%.2f", t - m }')
  ffmpeg -hide_banner -loglevel error -y -i "$src" -filter_complex "
    [0:a]atrim=1.5:28.5,asetpts=PTS-STARTPTS[body];
    [0:a]atrim=28.5:30,asetpts=PTS-STARTPTS[tail];
    [0:a]atrim=0:1.5,asetpts=PTS-STARTPTS[head];
    [tail][head]acrossfade=d=1.5:c1=qsin:c2=qsin[seam];
    [body][seam]concat=v=0:a=1,volume=${gain}dB,alimiter=limit=${PEAK_LIMIT}:attack=5:release=80:level=disabled[out]
  " -map "[out]" -c:a aac_at -b:a 96k -ac 2 -ar 48000 "$OUT/ambient-$id.m4a"

  for n in 1 2 3; do
    cp "$SRC/음성_${name}_$n.mp3" "$OUT/voice-$id-$n.mp3"
  done
done
