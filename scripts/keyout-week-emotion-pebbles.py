"""Downloads 의 **감정 조약돌 열 장**에서 구워진 체커보드 배경을 걷어 낸다.

홈과 리포트의 「이번 주 감정」이 쓰는 그림이다. 감정 스티커(얼굴)와 같은 사정이라
같은 방식으로 가른다 — **무채색이고 밝은 화소가 배경**이고, 테두리에서 번진 것만
진짜 배경이다([`keyout-emotion-stickers.py`](keyout-emotion-stickers.py) 머리말).

⚠ **조약돌의 가장자리는 수채처럼 부드럽다.** 하드 마스크로 자르면 그 결이 각지므로
가장자리를 깎지 않고 **알파만 흐린다**(스티커는 체커와 섞인 한 겹을 깎았다 —
거기는 테두리가 또렷한 그림이라 깎아야 깔끔했다).

⚠⚠ 가장 옅은 조약돌(「피곤함」의 베이지)조차 **중심부 채도가 11 이상**이라(체커는 3 이하)
채도 문턱 하나로 갈린다 — 스티커에서 확인한 것과 같은 성질이다.

    python3 scripts/keyout-week-emotion-pebbles.py assets/emotion-pebble
"""

from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
import os
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/emotion-pebble"

# 화면에서 26dp 로 서는 자리다 — @3x 78 을 넘기고 여유를 둔 값
SIZE = 96

# 조약돌이 정사각 캔버스에서 숨 쉴 만큼 — 비율은 그대로 두고 여백만 준다
PAD = 0.02

NAMES = {
    "anxiety_3": "anxious",
    "depression_3": "depressed",
    "anger_3": "angry",
    "frustration_3": "frustrated",
    "overwhelmed_3": "stuck",
    "lethargy_3": "lethargic",
    "tired_3": "tired",
    "calm_3": "calm",
    "proud_3": "proud",
    "happy_3": "happy",
}


def keyout(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    lum = a.mean(axis=2)
    chroma = a.max(axis=2) - a.min(axis=2)

    # 1 — 배경 후보: 무채색이고(채도 ≤ 6) 밝다(≥ 150)
    cand = (chroma <= 6) & (lum >= 150)

    # 2 — 테두리에서 번진 것만 진짜 배경
    lab, _ = ndimage.label(cand)
    edge = (
        set(lab[0].tolist())
        | set(lab[-1].tolist())
        | set(lab[:, 0].tolist())
        | set(lab[:, -1].tolist())
    )
    edge.discard(0)
    outside = np.isin(lab, list(edge))

    # 3 — 남은 것 중 가장 큰 덩어리가 조약돌이다(한 덩어리 그림이라 하나면 충분하다)
    lab2, _ = ndimage.label(~outside, structure=np.ones((3, 3)))
    sizes = np.bincount(lab2.ravel())
    sizes[0] = 0
    blob = lab2 == sizes.argmax()

    # ⚠ **가장자리에 붙은 워터마크 부스러기를 뗀다.** 스톡 워터마크의 획이 조약돌에 닿아
    # 있으면 같은 덩어리로 묶여 살아남고, 테두리에 점처럼 남는다. 열었다(erode→dilate)
    # 다시 가장 큰 덩어리만 취하면 가느다랗게 붙은 것들이 떨어져 나간다
    blob = ndimage.binary_opening(blob, structure=np.ones((3, 3)), iterations=2)
    lab3, _ = ndimage.label(blob, structure=np.ones((3, 3)))
    sizes3 = np.bincount(lab3.ravel())
    sizes3[0] = 0
    blob = ndimage.binary_fill_holes(lab3 == sizes3.argmax())

    # 4 — ⚠ 가장자리를 깎지 않는다. 수채 결을 살리려고 알파만 흐린다
    alpha = Image.fromarray((blob * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1))

    out = im.convert("RGBA")
    out.putalpha(alpha)
    out = out.crop(alpha.point(lambda v: 255 if v > 16 else 0).getbbox())

    side = int(max(out.size) * (1 + PAD * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(out, ((side - out.width) // 2, (side - out.height) // 2), out)
    return canvas.resize((SIZE, SIZE), Image.LANCZOS), out.size


os.makedirs(OUT, exist_ok=True)
for stem, key in NAMES.items():
    img, cut = keyout(os.path.expanduser(f"~/Downloads/{stem}.png"))
    img.save(os.path.join(OUT, f"{key}.png"))
    print(f"{key:11s} 잘라낸조약돌={cut}")

sheet = Image.new("RGBA", (SIZE * 5, SIZE * 2), (247, 244, 237, 255))
for i, key in enumerate(NAMES.values()):
    im = Image.open(os.path.join(OUT, f"{key}.png"))
    sheet.paste(im, ((i % 5) * SIZE, (i // 5) * SIZE), im)
sheet.save(os.path.join(OUT, "_sheet.png"))
