"""쉼 추천 시트(`components/rest/RestRecommendSheet`)의 장면 그림 넷을 만든다 (2026-10-12).

원본은 **각 쉼터 첫 화면의 스크린숏**이다(iPhone 17 Pro 시뮬레이터 · 1206 × 2622 · 들어온 직후).
그 화면 가운데 — 위 안내 글과 아래 크림 카드 사이, 카피바라와 소품이 앉은 띠 — 만 잘라 쓴다.
쉼터에서 보게 될 장면을 시트가 미리 보여 주는 셈이라 그림을 따로 그리지 않는다.

- 띠는 `BANDS` 의 (위, 아래) — 원본 세로 좌표다. 폭은 화면 전체이고, 시트의 그림 칸 비율
  (`ASPECT`)에 맞게 위아래를 정했다. 원본이나 쉼터 장면이 바뀌면 다시 찍고 다시 잡는다.
- 원본은 각 쉼터의 `source/` 에 둔다(이력 밖 · `.gitignore`).

    python3 scripts/make-rest-recommend-art.py <쉼터> <스크린숏>
    # 쉼터: sensory-pond · worry-box · treasure-box · body-release
    # → assets/<쉼터>/recommend.webp
"""

import sys

from PIL import Image

# 시트의 그림 칸 가로:세로 — `RestRecommendSheet` 의 `aspectRatio` 와 같다
ASPECT = 1.8
# 시트 폭(343dp 안팎) @3x 를 덮는 폭
WIDTH = 1029

BANDS = {
    # 연못 · 왼쪽 아래 카피바라 · 연꽃 — 위 안내 글 아래부터
    "sensory-pond": (1405, 2075),
    # 숲길 · 카피바라와 열린 상자
    "worry-box": (985, 1655),
    # 노을 언덕 · 카피바라와 보물상자
    "treasure-box": (1100, 1770),
    # 노을 하늘 · 빛 고리 안의 카피바라 · 언덕
    "body-release": (960, 1630),
}

name, src = sys.argv[1], sys.argv[2]
top, bottom = BANDS[name]
im = Image.open(src).convert("RGB")
assert abs(im.width / (bottom - top) - ASPECT) < 0.01, "띠 높이가 그림 칸 비율과 다르다"

band = im.crop((0, top, im.width, bottom))
band.resize((WIDTH, round(WIDTH / ASPECT)), Image.LANCZOS).save(
    f"assets/{name}/recommend.webp", quality=80, method=6
)
