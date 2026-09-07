"""Downloads 의 스티커 열 장에서 **구워진 체커보드 배경**을 걷어 낸다.

받은 파일은 투명 미리보기를 그대로 찍은 것이라 알파가 전부 불투명하고, 배경 자리에
체커 무늬(~8px 흰/회 격자)와 스톡 워터마크 획이 RGB 로 들어 있다.

**색으로만 지우면 회색 얼굴이 함께 지워진다** — 「피곤함」의 머리는 (222,220,220) 이라
체커의 회색(≈225)과 사실상 같은 색이다. 그래서 색이 아니라 **무늬**로 가른다:
체커는 어느 7×7 창을 잡아도 흰 칸과 회 칸이 함께 들어와 명도 폭이 크고, 얼굴은
넓은 평면이라 폭이 거의 0 이다.

1. 명도의 국소 폭(7×7 max−min)이 크고 · 무채색이고 · 밝은 화소 = 배경 후보
2. 테두리에서 배경 후보를 타고 번진 것만 진짜 배경(얼굴 안의 밝은 자리는 살아남는다)
3. 남은 덩어리 중 큰 것들이 얼굴(귀가 머리와 떨어진 그림이 있다) — 부스러기는 떨어져 나간다
4. 가장자리 한 겹은 체커와 섞인 화소라 깎고, 알파를 살짝 흐려 계단을 없앤다
"""
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
import os, sys

OUT = sys.argv[1]
SIZE = 132       # 앱 규격 (44pt @3x)
PAD = 0.03       # 정사각 캔버스에 남기는 여백 비율

NAMES = {
    "momentory-01-anxiety": "anxious",
    "momentory-02-depression": "depressed",
    "momentory-03-anger": "angry",
    "momentory-04-frustration": "frustrated",
    "momentory-05-overwhelmed": "stuck",
    "momentory-06-lethargy(2)": "lethargic",
    "momentory-07-tired(2)": "tired",
    "momentory-08-calm(2)": "calm",
    "momentory-09-proud(2)": "proud",
    "momentory-10-happy(2)": "happy",
}

def keyout(path):
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    lum = a.mean(axis=2)
    chroma = a.max(axis=2) - a.min(axis=2)

    g = Image.fromarray(lum.astype(np.uint8))
    spread = np.asarray(g.filter(ImageFilter.MaxFilter(7))).astype(np.int16) - np.asarray(
        g.filter(ImageFilter.MinFilter(7))
    ).astype(np.int16)

    # 1 — 체커 후보: 무늬가 있고(폭 ≥ 12) 무채색이며(채도 ≤ 14) 밝다(≥ 195)
    cand = (spread >= 12) & (chroma <= 14) & (lum >= 195)

    # 2 — 테두리에서 번진 것만 배경. 라벨을 붙이고 테두리에 닿은 라벨만 고른다
    lab, n = ndimage.label(cand)
    edge = set(lab[0].tolist()) | set(lab[-1].tolist()) | set(lab[:, 0].tolist()) | set(
        lab[:, -1].tolist()
    )
    edge.discard(0)
    outside = np.isin(lab, list(edge))

    # 3 — 나머지 중 **큰 덩어리들**이 얼굴. 가장 큰 것 하나만 남기면 안 된다 —
    # 「피곤함」의 두 귀는 머리와 떨어져 있어(3,900px 남짓) 통째로 사라진다.
    # 가장 큰 덩어리의 1% 를 문턱으로 두면 귀는 남고 워터마크 부스러기(≤20px)는 떨어진다
    lab2, n2 = ndimage.label(~outside, structure=np.ones((3, 3)))
    sizes = np.bincount(lab2.ravel())
    sizes[0] = 0
    keep = np.flatnonzero(sizes >= max(200, sizes.max() * 0.01))
    face = ndimage.binary_fill_holes(np.isin(lab2, keep))

    # 4 — 톱니를 메우고, 체커와 섞인 가장자리 한 겹을 깎고, 알파를 흐린다
    face = ndimage.binary_closing(face, structure=np.ones((3, 3)), iterations=2)
    face = ndimage.binary_erosion(face, iterations=1)
    alpha = Image.fromarray((face * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9))

    out = im.convert("RGBA")
    out.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 16 else 0).getbbox()
    out = out.crop(bbox)

    side = int(max(out.size) * (1 + PAD * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(out, ((side - out.width) // 2, (side - out.height) // 2), out)
    return canvas.resize((SIZE, SIZE), Image.LANCZOS), (im.size, out.size)

os.makedirs(OUT, exist_ok=True)
for stem, key in NAMES.items():
    img, info = keyout(os.path.expanduser(f"~/Downloads/{stem}.png"))
    img.save(os.path.join(OUT, f"{key}.png"))
    print(f"{key:11s} src={info[0]} 잘라낸얼굴={info[1]}")

sheet = Image.new("RGBA", (SIZE * 5, SIZE * 2), (247, 244, 237, 255))
for i, key in enumerate(NAMES.values()):
    im = Image.open(os.path.join(OUT, f"{key}.png"))
    sheet.paste(im, ((i % 5) * SIZE, (i // 5) * SIZE), im)
sheet.save(os.path.join(OUT, "_sheet.png"))
