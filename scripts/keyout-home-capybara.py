"""Downloads 의 카피바라 두 장에서 **구워진 체커보드 배경**을 걷어 내고,
홈 카드가 쓰는 `idle` · `wave` 두 프레임을 만든다.

받은 파일은 투명 미리보기를 그대로 찍은 것이라 알파가 전부 불투명하고(`hasAlpha: no`)
배경 자리에 체커 무늬가 RGB 로 들어 있다 — 감정 스티커 열 장과 같은 사정이다
([`keyout-emotion-stickers.py`](keyout-emotion-stickers.py)).

**여기서는 무늬가 아니라 색으로 가른다.** 스티커는 「피곤함」의 머리가 체커의 회색과
같은 색이라 명도 폭으로 갈라야 했지만, 카피바라는 **전 픽셀이 따뜻한 갈색**이라
무채색인 자리는 전부 배경이다. 체커 칸이 커서(≈36px) 7×7 창이 흰 칸 한가운데에
통째로 들어가는 일이 생기는데, 그러면 무늬 판정은 그 자리를 배경으로 보지 못한다.

⚠ **두 장은 반드시 같은 자리에서 잘라야 한다.** 프레임이 바뀔 때 몸통이 튀면 손 흔들기가
아니라 그림이 갈리는 것으로 보인다. 두 장의 마스크를 **합집합**으로 묶어 한 상자를 만들고
그 상자로 둘을 똑같이 자른다 — 팔이 더 뻗은 `wave` 쪽이 상자의 왼쪽 끝을 정하고,
`idle` 은 그만큼 왼쪽이 비어 있는 채로 잘린다. 그 빈칸이 정렬을 지킨다.

    python3 scripts/keyout-home-capybara.py assets/home
"""

from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
import os
import sys

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/home"

# 홈 카드의 카피바라는 116dp 언저리다 — @3x 를 채우고도 남게 384 폭으로 둔다
# (감각연못의 움직이는 그림과 같은 폭이라 눈으로 견주기도 쉽다)
WIDTH = 384

# ⚠ **손 흔드는 장을 두 번 갈아 끼웠다.**
#
# 1. 처음 받은 두 장(2026-09-09)은 팔이 「휘두르는」 것이 아니라 「늘어나는」 차이라
#    손끝이 6.7dp 밖에 안 움직였고, 몸통 기울기를 얹어야 손짓으로 보였다.
# 2. **팔을 확실히 든 장**(2026-09-10 오전)으로 바꾸면서 기울기를 뺐다.
# 3. **눈을 감고 웃는 장**(`capybara-smooth-eyes.png` · 2026-09-10 오후)으로 다시 바꿨다 —
#    팔만 올라가는 것보다 **표정까지 바뀌는 편이 인사로 읽힌다.** 가만히 있는 장은
#    그대로다(눈 뜨고 팔 내림).
#
# ⚠ 세 벌의 원본이 캔버스 크기가 1px 씩 다르다(1472×1069 · 1473×1068). 같은 상자로
# 자르려면 크기가 같아야 해서 **공통 크기로 먼저 맞춘다**(`common`). 세 장 모두 그림이
# 캔버스 안 같은 자리에 앉아 있어(bbox 차 5px 이내) 왼쪽 위 기준으로 잘라도 어긋나지 않는다.
SRC = {
    "capybara-idle": "ChatGPT Image 2026년 9월 10일 오전 09_15_03.png",
    "capybara-wave": "capybara-smooth-eyes.png",
}


def foreground(path):
    """체커를 걷어 내고 **카피바라만 True 인 불리언 마스크**를 돌려준다."""
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.int16)
    lum = a.mean(axis=2)
    chroma = a.max(axis=2) - a.min(axis=2)

    # 1 — 배경 후보: **완전 무채색**이고(채도 ≤ 6) 밝다(≥ 140).
    #
    # ⚠ 문턱이 34 가 아니라 6 인 이유는 **발밑 그림자를 살리기 위해서다.** 받은 그림에는
    # 그림자가 그려져 있는데(불투명 `(219,219,206)`) 그것도 무채색에 가까워서, 넉넉한
    # 문턱으로는 체커와 함께 지워진다. 체커는 `(253,253,253)` · `(208,208,206)` 로
    # **채도가 4 를 넘지 않고** 그림자는 13 이라 이 좁은 문턱이 둘을 가른다.
    cand = (chroma <= 6) & (lum >= 140)

    # 2 — 테두리에서 번진 후보만 진짜 배경. 그림 **안쪽**의 밝은 자리(발바닥 무늬 ·
    # 흰 하이라이트)는 테두리와 이어지지 않아 살아남는다
    lab, _ = ndimage.label(cand)
    edge = (
        set(lab[0].tolist())
        | set(lab[-1].tolist())
        | set(lab[:, 0].tolist())
        | set(lab[:, -1].tolist())
    )
    edge.discard(0)
    outside = np.isin(lab, list(edge))

    # 3 — 남은 것 중 큰 덩어리만 그림이다. 스티커와 달리 카피바라는 한 덩어리라
    # 가장 큰 것의 1% 문턱이면 스톡 워터마크 부스러기가 전부 떨어진다
    lab2, _ = ndimage.label(~outside, structure=np.ones((3, 3)))
    sizes = np.bincount(lab2.ravel())
    sizes[0] = 0
    keep = np.flatnonzero(sizes >= max(200, sizes.max() * 0.01))
    body = ndimage.binary_fill_holes(np.isin(lab2, keep))

    # 4 — 톱니를 메우고 체커와 섞인 가장자리 한 겹을 깎는다
    body = ndimage.binary_closing(body, structure=np.ones((3, 3)), iterations=2)
    body = ndimage.binary_erosion(body, iterations=2)
    return im, body


os.makedirs(OUT, exist_ok=True)

frames = {}
for key, stem in SRC.items():
    frames[key] = foreground(os.path.expanduser(f"~/Downloads/{stem}"))

# 캔버스가 1px 씩 다르므로 **공통 크기로 먼저 맞춘다**(⚠ 위 머리말)
common = (
    min(m.shape[0] for _, m in frames.values()),
    min(m.shape[1] for _, m in frames.values()),
)
frames = {
    k: (im.crop((0, 0, common[1], common[0])), m[: common[0], : common[1]])
    for k, (im, m) in frames.items()
}

# 한 상자 — 두 마스크의 합집합에서 잰다(⚠ 위 머리말)
union = np.zeros(common, bool)
for _, body in frames.values():
    union |= body
ys, xs = np.where(union)
box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
height = round(WIDTH * (box[3] - box[1]) / (box[2] - box[0]))
print(f"공통 상자 {box} → {WIDTH}×{height}")

for key, (im, body) in frames.items():
    alpha = Image.fromarray((body * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert("RGBA")
    out.putalpha(alpha)
    out = out.crop(box).resize((WIDTH, height), Image.LANCZOS)
    out.save(os.path.join(OUT, f"{key}.png"))
    print(f"{key:14s} 그림 {int(body.sum()):,}px")

# 두 프레임을 나란히 — 몸통이 같은 자리에 앉았는지 눈으로 확인하는 판
sheet = Image.new("RGBA", (WIDTH * 2, height), (247, 244, 237, 255))
for i, key in enumerate(SRC):
    im = Image.open(os.path.join(OUT, f"{key}.png"))
    sheet.paste(im, (i * WIDTH, 0), im)
sheet.save(os.path.join(OUT, "_sheet.png"))
