"""주간 리포트 공책의 **흰 테두리 스티커**를 그림으로 굽는다.

예전에는 같은 그림을 흰색으로 물들여 여덟 방향으로 겹쳐 그렸다. 스티커 하나가 그림 아홉 장이라
공책을 열 때 그림이 밀려서 하나씩 나타났다. 테두리를 그림에 넣어 두면 한 장으로 끝난다.

테두리 굵기는 예전 화면에서 보이던 값이다 — 조약돌은 폭 30에 1.3, 바바는 폭 112에 2.
그림 둘레로 여백을 넓혔으므로 화면은 그 여백만큼 크게 그린다(`parts.tsx` 의 `Sticker`).

    python3 scripts/make-report-stickers.py
"""

from PIL import Image
import numpy as np
from scipy import ndimage
import os

OUT = "assets/report/stickers"
PEBBLES = [
    "happy", "proud", "calm", "tired", "stuck",
    "lethargic", "anxious", "depressed", "angry", "frustrated", "no-emotion",
]


def outlined(path, edge, pad):
    art = Image.open(path).convert("RGBA")
    w, h = art.size
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (255, 255, 255, 0))
    canvas.alpha_composite(art, (pad, pad))
    alpha = np.asarray(canvas.getchannel("A"))
    # 그림에서 떨어진 거리로 테두리를 그려 각지지 않게 한다
    distance = ndimage.distance_transform_edt(alpha < 64)
    ring = np.clip(edge + 0.5 - distance, 0, 1)
    white = np.full((*alpha.shape, 4), 255, dtype=np.uint8)
    white[..., 3] = (ring * 255).astype(np.uint8)
    result = Image.fromarray(white)
    result.alpha_composite(canvas)
    return result


os.makedirs(OUT, exist_ok=True)
for name in PEBBLES:
    outlined(f"assets/emotion-pebble/{name}.png", 96 * 1.3 / 30, 6).save(
        f"{OUT}/{name}.png", optimize=True
    )
outlined("assets/home/v2/baba-composite.png", 436 * 2 / 112, 10).save(
    f"{OUT}/baba.png", optimize=True
)
