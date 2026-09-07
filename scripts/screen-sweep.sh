#!/usr/bin/env bash
# 화면 크기 훑기 — 안드로이드 기기 하나로 여러 크기·글꼴 배율을 재현해 화면을 전부 찍는다
#
# 왜 이렇게 하는가:
#   AVD 를 크기별로 만들면 부팅과 로그인을 그만큼 반복해야 한다. `wm size`·`wm density`·
#   `font_scale` 은 **켜져 있는 기기 하나**에 그대로 먹으므로, 로그인된 에뮬레이터 한 대로
#   저가폰·최소 폭·큰 글꼴·폴드·태블릿을 다 돈다. 화면 이동도 손으로 타고 들어가지 않고
#   딥링크(`momentory://<라우트>`)로 바로 연다.
#
#   scripts/screen-sweep.sh                     # 기본 설정 다섯 벌 전부
#   scripts/screen-sweep.sh -c C_360x640_font1.5  # 한 벌만
#   scripts/screen-sweep.sh -s emulator-5556    # 기기가 여럿일 때 고른다
#   scripts/screen-sweep.sh -o /tmp/sweep       # 결과를 다른 곳에
#
# ⚠ 이 스크립트는 **판정하지 않는다.** 아래 화면밖 검출(`clip_check`)은 `uiautomator` 좌표를
#   보는데, 창 밖으로 나간 노드는 좌표가 잘려 나오는 일이 많아 **놓치는 것이 많다**
#   (2026-09-06 점검에서 실제로 찾은 문제 하나도 검출되지 않았고 스크린샷을 보고 찾았다).
#   값어치는 「130 장을 10 분에 모아 주는 것」에 있고, 판정은 사람이 대조해서 한다.
#
# ⚠ CI 에 걸 물건이 아니다 — 아래 전제 셋이 붙는다:
#   1. 로컬 BE 가 떠 있다 (설치된 dev 빌드가 `localhost:8080` 을 본다 → `adb reverse`)
#   2. 그 기기에 **로그인이 한 번 돼 있다** (딥링크는 로그인 벽을 넘지 못한다)
#   3. 딥링크 라우팅이 가끔 어긋난다 — 라벨과 다른 화면이 찍힌 장이 섞일 수 있다

set -uo pipefail

PKG=kr.momentory.app
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$REPO/.screen-sweep/$(date +%Y%m%d-%H%M%S)"
SERIAL=""
ONLY=""
SETTLE=4 # 딥링크 뒤 화면이 자리 잡기까지 (느린 기기면 늘린다)

# 설정: 라벨|물리 폭|물리 높이|밀도|글꼴 배율|왜 이 값인가
#   논리 dp = 물리 픽셀 × 160 ÷ 밀도. 「왜」는 값을 지울 때 근거가 남게 적는다.
CONFIGS=(
  "A_360x640|720|1280|320|1.0|보급형에 흔한 짧은 세로"
  "B_320x711|720|1600|360|1.0|Play 가 요구하는 최소 폭"
  "C_360x640_font1.5|720|1280|320|1.5|글꼴 크게 + 표시 크게의 실사용 조합"
  "D_fold_724x870|1812|2176|400|1.0|Z Fold 내부 화면"
  "E_tablet_800x1280|1600|2560|320|1.0|Play 가 기본으로 배포하는 폼팩터"
)

# 딥링크로 여는 라우트. expo-router 의 그룹`(onboarding)`·`(tabs)` 는 주소에 안 들어간다 —
# 화면이 늘면 여기 한 줄씩 더한다. 인자가 필요한 라우트(`diary/[id]`)는 뺐다.
ROUTES=(
  welcome nickname age gender interests rest retro-time calendar done
  home home/schedule/new archive report rest/cards rest/sense-pond
  retro/talk retro/draft retro/confirm retro/done
  my my/profile my/nickname my/age my/gender my/interests my/rest
)

usage() {
  sed -n '2,23p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
  exit "${1:-0}"
}

while getopts "s:c:o:t:h" opt; do
  case "$opt" in
  s) SERIAL="$OPTARG" ;;
  c) ONLY="$OPTARG" ;;
  o) OUT="$OPTARG" ;;
  t) SETTLE="$OPTARG" ;;
  h) usage 0 ;;
  *) usage 1 ;;
  esac
done

command -v adb >/dev/null || {
  echo "adb 가 PATH 에 없다 — ~/Library/Android/sdk/platform-tools 를 넣는다" >&2
  exit 1
}
adb_() { if [ -n "$SERIAL" ]; then adb -s "$SERIAL" "$@"; else adb "$@"; fi; }

# ── 시작 전 확인 ────────────────────────────────────────────────────────────
# 여기서 걸러 내지 않으면 「전부 로그인 화면」인 130 장을 10 분 걸려 찍게 된다.
state=$(adb_ get-state 2>&1) || {
  echo "기기를 못 찾았다 ($state) — adb devices 로 확인하고 -s 로 고른다" >&2
  exit 1
}
adb_ shell pm path "$PKG" >/dev/null 2>&1 || {
  echo "$PKG 가 그 기기에 없다 — 먼저 설치한다 (npm run android)" >&2
  exit 1
}
if ! curl -sf -o /dev/null --max-time 3 http://localhost:8080/actuator/health; then
  echo "⚠ localhost:8080 이 응답하지 않는다 — dev 빌드는 여길 보므로 화면이 비어 나온다." >&2
  echo "  BE 를 local 프로파일로 띄우고 다시 돌린다." >&2
fi

# 원복은 반드시 한다 — 중간에 끊겨도 기기가 이상한 크기로 남지 않게 trap 을 건다.
restore() {
  adb_ shell wm size reset >/dev/null 2>&1
  adb_ shell wm density reset >/dev/null 2>&1
  adb_ shell settings put system font_scale 1.0 >/dev/null 2>&1
}
trap restore EXIT INT TERM

dump() { adb_ shell "uiautomator dump /sdcard/sweep-ui.xml >/dev/null 2>&1; cat /sdcard/sweep-ui.xml"; }

# 화면 경계를 넘는 텍스트 노드 — 위 ⚠ 대로 **놓치는 것이 많다**. 참고용이다.
clip_check() { # $1 라우트 · $2 폭 · $3 높이 · stdin: uiautomator 덤프
  local route=$1 sw=$2 sh=$3
  tr '<' '\n<' | grep 'bounds=' | grep -E 'text="[^"]+"' | while IFS= read -r line; do
    local text bounds
    text=$(echo "$line" | grep -oE 'text="[^"]{1,30}' | head -1 | cut -c7-)
    bounds=$(echo "$line" | grep -oE 'bounds="\[-?[0-9]+,-?[0-9]+\]\[-?[0-9]+,-?[0-9]+\]"' | sed -E 's/[^0-9-]+/ /g')
    # shellcheck disable=SC2086
    set -- $bounds
    [ -z "${4:-}" ] && continue
    if [ "$4" -gt "$sh" ] || [ "$2" -lt 0 ] || [ "$3" -gt "$sw" ] || [ "$1" -lt 0 ]; then
      echo "  WARN $route: 화면밖 \"$text\" [$1,$2][$3,$4] (screen ${sw}x${sh})"
    fi
  done
}

run_cfg() { # $1 라벨 $2 폭 $3 높이 $4 밀도 $5 글꼴 $6 설명
  local label=$1 sw=$2 sh=$3 dens=$4 fs=$5 note=$6
  mkdir -p "$OUT/$label"

  adb_ shell wm size "${sw}x${sh}" >/dev/null
  adb_ shell wm density "$dens" >/dev/null
  adb_ shell settings put system font_scale "$fs" >/dev/null
  # 밀도·글꼴 배율은 MainActivity 의 configChanges 에 없다 → 액티비티가 재시작된다.
  # 어차피 죽으므로 먼저 정리하고 시작한다. reverse 는 기기에 남지만 확인차 다시 건다.
  adb_ shell am force-stop "$PKG"
  sleep 2
  adb_ reverse tcp:8080 tcp:8080 >/dev/null

  echo "===== $label · $((sw * 160 / dens))x$((sh * 160 / dens))dp · 글꼴 ${fs}배 — $note ====="

  local route name dumped
  for route in "${ROUTES[@]}"; do
    adb_ shell am start -a android.intent.action.VIEW -d "momentory://$route" "$PKG" >/dev/null 2>&1
    sleep "$SETTLE"
    dumped=$(dump)
    name=${route//\//_}
    adb_ exec-out screencap -p >"$OUT/$label/$name.png"

    if echo "$dumped" | grep -q "Unmatched Route"; then
      echo "  - $route: 라우트가 없다 (경로가 바뀌었는지 본다)"
      continue
    fi
    if echo "$dumped" | grep -q "카카오 로그인"; then
      echo "  - $route: 로그인 화면이다 — 이 기기에 로그인부터 하고 다시 돌린다"
      continue
    fi
    echo "$dumped" | clip_check "$route" "$sw" "$sh"
  done
}

echo "결과: $OUT"
for cfg in "${CONFIGS[@]}"; do
  IFS='|' read -r label sw sh dens fs note <<<"$cfg"
  [ -n "$ONLY" ] && [ "$ONLY" != "$label" ] && continue
  run_cfg "$label" "$sw" "$sh" "$dens" "$fs" "$note"
done

count=$(find "$OUT" -name '*.png' | wc -l | tr -d ' ')
echo "===== 끝 — $count 장 · $OUT ====="
echo "자동 검출은 참고만 한다. 눈으로 대조하는 것이 이 스크립트의 쓸모다."
