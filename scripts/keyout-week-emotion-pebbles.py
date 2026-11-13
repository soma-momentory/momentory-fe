"""받은 **감정 조약돌 열두 장**에서 구워진 체커보드(또는 흰) 배경을 걷어 낸다.

홈과 리포트의 「이번 주 감정」이 쓰는 그림이다. 감정 스티커(얼굴)와 같은 사정이라
같은 방식으로 가른다 — **무채색이고 밝은 화소가 배경**이고, 테두리에서 번진 것만
진짜 배경이다([`keyout-emotion-stickers.py`](keyout-emotion-stickers.py) 머리말).

⚠ **조약돌의 가장자리는 수채처럼 부드럽다.** 하드 마스크로 자르면 그 결이 각지므로
가장자리를 깎지 않고 **알파만 흐린다**(스티커는 체커와 섞인 한 겹을 깎았다 —
거기는 테두리가 또렷한 그림이라 깎아야 깔끔했다).

⚠⚠ 가장 옅은 조약돌(「피곤함」의 베이지)조차 **중심부 채도가 11 이상**이라(체커는 3 이하)
채도 문턱 하나로 갈린다 — 스티커에서 확인한 것과 같은 성질이다.

2026-11-14 대표 감정 12종으로 바꾸면서 열두 장을 다시 받았다. 원본은 **서버 감정 키 이름**
(`joy.png` … `exhausted.png` · `.webp` 도 받는다)으로 한 폴더에 둔다. 열 장은 체커가 구워진
미리보기이고 부끄러움 · 미안함 두 장은 흰 배경이다 — 둘 다 「무채색이고 밝다」로 같이 갈린다.

    python3 scripts/keyout-week-emotion-pebbles.py assets/emotion-pebble ~/Downloads/emotion-pebbles
"""

from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
import os
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/emotion-pebble"
SRC = os.path.expanduser(sys.argv[2] if len(sys.argv) > 2 else "~/Downloads/emotion-pebbles")

# 화면에서 26dp 로 서는 자리다 — @3x 78 을 넘기고 여유를 둔 값
SIZE = 96

# 조약돌이 정사각 캔버스에서 숨 쉴 만큼 — 비율은 그대로 두고 여백만 준다
PAD = 0.02

# 서버 감정 키(`features/retro/model/retro.ts` 의 `EMOTION_KEYS`) — 원본도 결과도 이 이름이다
KEYS = [
    "joy",
    "calm",
    "proud",
    "affection",
    "sad",
    "anxious",
    "angry",
    "disappointed",
    "ashamed",
    "confused",
    "sorry",
    "exhausted",
]


def source(key):
    for ext in ("png", "webp"):
        path = os.path.join(SRC, f"{key}.{ext}")
        if os.path.exists(path):
            return path
    raise FileNotFoundError(f"{key} 원본이 {SRC} 에 없다")


def square(out):
    """잘라낸 조약돌을 여백을 둔 정사각 캔버스에 앉히고 앱 규격으로 줄인다"""
    side = int(max(out.size) * (1 + PAD * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(out, ((side - out.width) // 2, (side - out.height) // 2), out)
    return canvas.resize((SIZE, SIZE), Image.LANCZOS)


def keyout(path):
    src = Image.open(path)
    # **진짜 투명 그림**(부끄러움 · 미안함의 WebP)은 걷어 낼 배경이 없다 — 알파를 그대로 쓴다
    if src.mode == "RGBA" and src.getchannel("A").getextrema()[0] == 0:
        out = src.crop(src.getchannel("A").point(lambda v: 255 if v > 16 else 0).getbbox())
        return square(out), out.size

    im = src.convert("RGB")
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

    return square(out), out.size


os.makedirs(OUT, exist_ok=True)
for key in KEYS:
    img, cut = keyout(source(key))
    img.save(os.path.join(OUT, f"{key}.png"))
    print(f"{key:13s} 잘라낸조약돌={cut}")

sheet = Image.new("RGBA", (SIZE * 6, SIZE * 2), (247, 244, 237, 255))
for i, key in enumerate(KEYS):
    im = Image.open(os.path.join(OUT, f"{key}.png"))
    sheet.paste(im, ((i % 6) * SIZE, (i // 6) * SIZE), im)
sheet.save(os.path.join(OUT, "_sheet.png"))
