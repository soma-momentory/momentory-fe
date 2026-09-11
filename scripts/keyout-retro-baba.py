"""Downloads 의 「빈백에 앉은 카피바라」 한 장으로 회고 대화 화면 왼쪽 아래에 앉는 `baba-beanbag.png` 를 만든다.

원본은 두 가지를 받는다.

- **이미 투명한 PNG**(지금 정본 · 2026-09-11 사용자 반입 · Photoroom 으로 배경을 걷은 `…-Photoroom.png`) —
  배경은 건드리지 않고 **그림 바깥에 흩어진 아주 옅은 잔여 알파**(`ALPHA_FLOOR` 미만)만 0 으로 지운다.
  그대로 두면 눈에는 안 보여도 그림 상자가 캔버스 끝까지 커진다.
- **알파 없는 흰 배경 PNG**(처음 받은 원본) — 흰 배경을 걷어 낸다:
  1. **가장자리에서 이어진 흰 칸만** 배경이다(flood fill). 밝기 문턱 하나로 뽑으면 볼터치 같은 밝은
     자리가 배경으로 잘못 빠질 수 있다 — 이어짐으로 가른다.
  2. 윤곽선 바깥 **안티에일리어싱 띠**(배경과 맞닿은 2px)는 흰색과 윤곽선 갈색이 섞인 픽셀이다.
     섞인 비율을 알파로 되돌리고 색은 윤곽선 색으로 둔다 — 그대로 두면 격자 배경 위에서 흰 테두리가 뜬다.

그다음 둘 다 그림 상자로 자르고 `WIDTH` 폭으로 줄인다(알파를 곱한 채로 줄여 가장자리에 검은 테가 끼지 않게).

    python3 scripts/keyout-retro-baba.py <원본.png> assets/retro
"""

from PIL import Image
import numpy as np
from scipy import ndimage
import os
import sys

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else "assets/retro"

# 화면에서 260dp 로 앉는다(2026-09-11 · 150 → 300 → 260 사용자 요청) — 300dp @3x 까지 채우는 900 폭.
# 원본 그림 상자가 971 폭이라 키우지 않고 줄이기만 한다
WIDTH = 900

# 투명 원본에서 **남길 가장 옅은 알파** — Photoroom 원본은 그림 바깥에 1~7 짜리 잔여가 흩어져 있다
ALPHA_FLOOR = 8

# (흰 배경 원본) 배경으로 볼 밝기 — 원본 배경은 253~255 이고 그림에서 가장 밝은 빈백 면도 220 아래다
BG_MIN = 244

# (흰 배경 원본) 윤곽선 갈색 — 가장 어두운 픽셀들의 중앙값 `(83,43,26)`
OUTLINE = np.array([83.0, 43.0, 26.0])

# (흰 배경 원본) 배경과 맞닿아 섞였다고 볼 띠의 두께(px)
EDGE_BAND = 2


def from_transparent(rgba: np.ndarray) -> np.ndarray:
    out = rgba.copy()
    out[out[..., 3] < ALPHA_FLOOR] = 0
    return out


def from_white(rgb: np.ndarray) -> np.ndarray:
    rgb = rgb.astype(np.float64)
    light = rgb.min(axis=2) >= BG_MIN
    labels, _ = ndimage.label(light)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    background = np.isin(labels, border[border != 0])

    alpha = np.where(background, 0.0, 1.0)

    # 배경 바로 옆 띠만 섞인 픽셀로 본다 — 안쪽의 밝은 면(빈백·배)은 건드리지 않는다
    band = ndimage.binary_dilation(background, iterations=EDGE_BAND) & ~background
    # 흰색과 윤곽선이 a : (1-a) 로 섞였다고 보고 a 를 되돌린다 — 차이가 가장 큰 파랑 채널로 잰다
    mixed = (255.0 - rgb[..., 2]) / (255.0 - OUTLINE[2])
    alpha[band] = np.clip(mixed[band], 0.0, 1.0)

    out = rgb.copy()
    out[band] = OUTLINE
    return np.dstack([out, alpha * 255.0]).round().clip(0, 255).astype(np.uint8)


source = Image.open(SRC)
has_alpha = source.mode in ("RGBA", "LA") or "transparency" in source.info
if has_alpha and np.asarray(source.convert("RGBA"))[..., 3].min() < 255:
    rgba = from_transparent(np.asarray(source.convert("RGBA")))
else:
    rgba = from_white(np.asarray(source.convert("RGB")))

ys, xs = np.where(rgba[..., 3] > 0)
box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
figure = Image.fromarray(rgba, "RGBA").crop(box)
height = round(figure.height * WIDTH / figure.width)
# 알파를 곱한 채(RGBa)로 줄인다 — 곧장 줄이면 투명한 칸의 검은 RGB 가 가장자리로 번진다
figure = figure.convert("RGBa").resize((WIDTH, height), Image.LANCZOS).convert("RGBA")

os.makedirs(OUT, exist_ok=True)
path = os.path.join(OUT, "baba-beanbag.png")
figure.save(path, optimize=True)
print(f"{path} {figure.width}x{figure.height} (crop {box})")
