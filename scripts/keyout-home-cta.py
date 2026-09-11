"""Downloads 의 「지금 하루 돌아보기」 버튼 시안에서 체커 배경을 걷어 낸다.

카피바라와 같은 사정이다(투명 미리보기를 찍은 PNG · 체커가 RGB 로 구워져 있다).
다만 여기서는 **초록만 남기면 되므로** 훨씬 간단하다 — 체커는 무채색이고 모양은
`primary.heavy` 한 색이다(잰 평균 `(88,116,96)` · 토큰 `#56755F` 와 사실상 같다).

⚠ **색을 다시 칠하지 않는다.** 받은 초록이 이미 토큰 값이라 그대로 두면 팔레트와 맞는다.

    python3 scripts/keyout-home-cta.py assets/home
"""

from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
import os
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/home"
SRC = "ChatGPT Image 2026년 9월 10일 오후 04_48_46.png"

# 버튼은 늘여서 쓰므로 원본 비율(3.92:1)의 가로 폭만 넉넉하면 된다.
# 768 이면 최대 폭(대략 200dp)에서도 @3x 를 채운다
WIDTH = 768

im = Image.open(os.path.expanduser(f"~/Downloads/{SRC}")).convert("RGB")
a = np.asarray(im).astype(np.int16)

# 초록 = G 가 R·B 보다 뚜렷이 크다. 체커(무채색)와 한 번에 갈린다
green = (a[:, :, 1] > a[:, :, 0] + 8) & (a[:, :, 1] > a[:, :, 2] + 8) & (a[:, :, 1] < 190)
green = ndimage.binary_fill_holes(green)

# 가장 큰 덩어리 하나 — 워터마크 부스러기가 떨어져 나간다
lab, _ = ndimage.label(green, structure=np.ones((3, 3)))
sizes = np.bincount(lab.ravel())
sizes[0] = 0
green = lab == sizes.argmax()

# 체커와 섞인 가장자리 한 겹을 깎고 알파를 살짝 흐려 계단을 없앤다
green = ndimage.binary_erosion(green, iterations=1)
alpha = Image.fromarray((green * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))

out = im.convert("RGBA")
out.putalpha(alpha)
box = alpha.point(lambda v: 255 if v > 16 else 0).getbbox()
out = out.crop(box)
height = round(WIDTH * out.height / out.width)

os.makedirs(OUT, exist_ok=True)
out.resize((WIDTH, height), Image.LANCZOS).save(os.path.join(OUT, "cta-grass.png"))
print(f"잘라낸 모양 {out.size} → {WIDTH}×{height} (비 {out.width / out.height:.2f})")
