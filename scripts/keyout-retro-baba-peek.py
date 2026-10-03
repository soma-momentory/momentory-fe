"""「판 너머로 고개를 내민 카피바라」 한 장으로 회고 대화의 `baba-peek.png` 를 만든다.

입력창이 올라와(키보드) 앉은 바바가 가려지는 동안 **입력창 위로 고개를 내미는** 그림이다
(`RetroBabaPeek` · 2026-10-03 사용자 요청). 원본은 흰 배경 위에 카피바라가 서 있고, 그 아래를
흰 판(아래 둥근 사각형)이 가린다 — 앞발 둘은 판 **위에** 걸쳐 그려져 있다.

1. **가장자리에서 이어진 밝은 칸**(배경 + 판)을 걷어 낸다(flood fill). 판도 화면 가장자리에 닿으므로
   같이 빠진다 — 판 자리에는 앱의 입력창이 온다. 앞발은 판 위에 그려져 있어 남는다.
2. 윤곽선 바깥 **안티에일리어싱 띠**는 흰색과 윤곽선이 섞인 픽셀이다 — 섞인 비율을 알파로 되돌리고
   색은 윤곽선 색으로 둔다(`keyout-retro-baba.py` 와 같은 방식).
   단 **몸이 판에 잘린 가로줄**(`CUT_Y`)은 윤곽선이 아니라 몸 색과 판 색의 섞임이다 — 그 줄 위는
   몸 색 그대로 불투명하게, 아래는 투명하게 자른다. 윤곽선 색을 칠하면 입력창 위에 갈색 줄이 뜬다.
3. **앉은 바바(`baba-beanbag.png`)와 같은 색으로 옮긴다.** 원본은 몸이 조금 더 붉고 갈색이 밝다.
   네 자리(몸 · 볼 · 코·귀·발 갈색 · 윤곽선)의 대표색을 두 그림에서 재서, 픽셀마다 가까운 자리들의
   차이를 거리로 섞어 더한다 — 섞인 가장자리 픽셀도 끊김 없이 따라간다.
4. 그림 상자로 자르고 `WIDTH` 폭으로 줄인다. **판 윗변이 그림 안 어디인지**(`PANEL_TOP / 높이`)를
   함께 출력한다 — 화면이 앞발이 입력창에 걸치는 깊이를 이 비율로 잡는다(`RetroBabaPeek` 의 `PAW_RATIO`).

    python3 scripts/keyout-retro-baba-peek.py <원본.webp> assets/retro
"""

from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage
import cv2
import os
import sys

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else "assets/retro"
# (미리 보기용) 세 번째 인자로 `BODY_DROP` 을 바꿔 볼 수 있다
DROP_ARG = int(sys.argv[3]) if len(sys.argv) > 3 else None
# (미리 보기용) 네 번째 인자로 `PAW_GATHER` 를 바꿔 볼 수 있다
GATHER_ARG = int(sys.argv[4]) if len(sys.argv) > 4 else None

# 화면에서 130dp 안팎으로 뜬다 — 160dp @3x 까지 채우는 480 폭
WIDTH = 480

# 배경·판으로 볼 밝기 — 배경 254, 판 (252,250,246). 그림에서 가장 밝은 몸 면은 G 173 이다
BG_MIN = 236

# 윤곽선 갈색(원본) — 섞인 띠의 알파를 되돌릴 때 쓴다
OUTLINE = np.array([74.0, 27.0, 7.0])

EDGE_BAND = 2

# 판의 윗변 — 이 줄부터 몸이 판에 가려진다(원본 1312 × 1199 에서 잰 값)
CUT_Y = 807

# 눈 둘의 가운데(원본에서 잰 값 · 고개가 살짝 기울어 오른눈이 8 높다)와 반지름
EYES = [(550, 540), (791, 532)]
EYE_R = 23

# 감은 눈 — 아래로 둥근 짧은 선(‿). 가로 반지름 · 세로 반지름 · 굵기 · 선이 시작하는 각도(0 = 3시, 시계 방향)
LID_RX = 27
LID_RY = 12
LID_STROKE = 11
LID_FROM = 20
# 선의 가장 낮은 곳이 눈 가운데보다 이만큼 아래 — 눈꺼풀이 내려와 닫힌 자리
LID_DROP = 6

# 머리·몸을 **앞발은 두고** 이만큼 아래로 내린다(원본 px) — 내려간 만큼 몸 아래가 판(입력창)에 더 가려진다.
# 2026-10-03 · 「너무 튀어나와 있다 · 손 위치는 맘에 든다」 → 100 은 「너무 줄었다 · 몸통이 살짝 보였으면」 사용자 요청
BODY_DROP = 50

# 두 앞발을 서로 **이만큼씩 안쪽으로** 모은다(원본 px · 한쪽당) — 2026-10-03 · 「손을 아주 조금만 서로
# 모이게」 사용자 요청. 앞발이 비운 자리 뒤의 몸은 원본에 없어 둘레 몸 색으로 메운다(`lower_body`)
PAW_GATHER = 15

# 앞발을 몸에서 떼어 낼 때 — 앞발 면(갈색)에서 이만큼 넓혀 윤곽선과 그 바깥 섞인 띠까지 데려간다(원본 px)
PAW_REACH = 14

# 앞발을 찾는 높이 — 이 줄 아래의 갈색 덩어리만 앞발이다(귀·코는 위에 있다)
PAW_TOP = 700

# 원본 → 앉은 바바. 네 자리의 대표색(각 자리 중앙값 · 두 그림에서 같은 자리를 재서 짝지었다)
PALETTE = [
    # 몸
    ((249, 173, 119), (242, 173, 119)),
    # 볼
    ((253, 151, 122), (242, 155, 113)),
    # 코·귀·발
    ((162, 104, 77), (145, 97, 73)),
    # 윤곽선·눈
    ((74, 27, 7), (80, 41, 24)),
    # 흰색은 그대로 — 섞인 가장자리가 엉뚱하게 물들지 않게
    ((255, 255, 255), (255, 255, 255)),
]


def recolor(rgb: np.ndarray) -> np.ndarray:
    src = np.array([s for s, _ in PALETTE], dtype=np.float64)
    delta = np.array([d for _, d in PALETTE], dtype=np.float64) - src
    dist = np.linalg.norm(rgb[..., None, :] - src, axis=-1)
    # 역거리 가중 — 대표색에 딱 맞으면 그 차이를 그대로, 사이면 섞어서
    weight = 1.0 / np.maximum(dist, 1e-3) ** 3
    weight /= weight.sum(axis=-1, keepdims=True)
    return rgb + (weight[..., None] * delta).sum(axis=-2)


rgb = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float64)
h, w, _ = rgb.shape

light = rgb.min(axis=2) >= BG_MIN
labels, _ = ndimage.label(light)
border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
background = np.isin(labels, border[border != 0])

alpha = np.where(background, 0.0, 1.0)
band = ndimage.binary_dilation(background, iterations=EDGE_BAND) & ~background

# 판에 잘린 몸 — 윤곽선이 아니라 몸 색과 판의 섞임이다. 갈색(앞발·윤곽선)보다 밝은 칸만 고른다
rows = np.arange(h)[:, None]
cut_zone = (rows >= CUT_Y - EDGE_BAND - 1) & (rows <= CUT_Y + EDGE_BAND)
body_cut = cut_zone & ~background & (rgb.min(axis=2) >= 100)
alpha[body_cut & (rows >= CUT_Y)] = 0.0
band &= ~body_cut

mixed = (255.0 - rgb[..., 2]) / (255.0 - OUTLINE[2])
alpha[band] = np.clip(mixed[band], 0.0, 1.0)
out = rgb.copy()
out[band] = OUTLINE
# 잘린 줄 바로 위의 섞인 칸은 몸 색으로 채워 둔다 — 판의 흰 기가 남지 않게
out[body_cut] = PALETTE[0][0]


def close_eyes(rgb: np.ndarray) -> np.ndarray:
    """눈 둘을 몸 색으로 덮고 그 자리에 감은 눈(아래로 둥근 짧은 선)을 긋는다 — 깜빡임의 감은 장."""
    out = rgb.copy()
    yy, xx = np.mgrid[0 : rgb.shape[0], 0 : rgb.shape[1]]
    for cx, cy in EYES:
        dist = np.hypot(xx - cx, yy - cy)
        # 덮을 색은 눈 둘레의 몸 색 — 몸 면에 옅은 결이 있어 한 색으로 박으면 동그랗게 티가 난다
        ring = (dist >= EYE_R + 12) & (dist <= EYE_R + 18)
        # 눈 둘레에 옅게 밝은 띠가 있어 눈만 덮으면 동그란 자국이 남는다 — 넉넉히 덮고 가장자리를 흐린다
        cover = np.clip((EYE_R + 11 - dist) / 5, 0, 1)[..., None]
        out = out * (1 - cover) + np.median(rgb[ring], axis=0) * cover

    # 감은 눈은 4배로 그려 줄인다 — 선 가장자리를 부드럽게(안티에일리어싱)
    scale = 4
    ink = Image.new("L", (rgb.shape[1] * scale, rgb.shape[0] * scale), 0)
    draw = ImageDraw.Draw(ink)
    for cx, cy in EYES:
        top = cy - LID_RY * 2 + LID_DROP
        box = [(cx - LID_RX) * scale, top * scale, (cx + LID_RX) * scale, (top + LID_RY * 2) * scale]
        draw.arc(box, LID_FROM, 180 - LID_FROM, fill=255, width=LID_STROKE * scale)
        # 선 끝을 둥글게 — 원본 윤곽선이 둥근 끝이다
        for deg in (LID_FROM, 180 - LID_FROM):
            ex = cx + LID_RX * np.cos(np.radians(deg)) - LID_STROKE / 2 * np.cos(np.radians(deg))
            ey = top + LID_RY + LID_RY * np.sin(np.radians(deg)) - LID_STROKE / 2 * np.sin(np.radians(deg))
            rr = LID_STROKE / 2
            draw.ellipse([(ex - rr) * scale, (ey - rr) * scale, (ex + rr) * scale, (ey + rr) * scale], fill=255)
    a = np.asarray(ink.resize((rgb.shape[1], rgb.shape[0]), Image.BOX)).astype(np.float64)[..., None] / 255.0
    return out * (1 - a) + OUTLINE * a


def lower_body(
    rgb: np.ndarray, a: np.ndarray, drop: int, gather: int
) -> tuple[np.ndarray, np.ndarray]:
    """앞발은 제자리에 두고 머리·몸만 `drop` 만큼 내린다 — 내려간 몸은 판 윗변(`CUT_Y`)에서 다시 잘린다.
    앞발은 `gather` 만큼씩 서로 안쪽으로 모은다.

    앞발 뒤에 가려 있던 몸은 원본에 없다(앞발 픽셀이다). 그 자리를 둘레 몸 색으로 **메운 뒤** 몸을 내린다 —
    앞발을 모으면 바깥쪽에 비는 자리가 생기고, 메우지 않으면 원래 앞발이 몸에 그대로 남아 비친다.
    """
    if drop <= 0 and gather <= 0:
        return rgb, a
    rows = np.arange(rgb.shape[0])[:, None]
    brown = np.linalg.norm(rgb - np.array(PALETTE[2][0]), axis=-1) < 40
    labels, n = ndimage.label(brown & (rows >= PAW_TOP) & (a > 0))
    sizes = ndimage.sum(np.ones_like(labels), labels, range(1, n + 1))
    fill = np.isin(labels, [i + 1 for i, size in enumerate(sizes) if size > 2000])
    zone = ndimage.binary_dilation(fill, iterations=PAW_REACH) & (a > 0)
    # 앞발 덩어리 = 갈색 면 + 그걸 두른 윤곽선(어두운 칸) + 그 안의 발가락 줄. 구멍을 메워 통째로 잡는다
    dark = rgb.max(axis=2) < 120
    solid = ndimage.binary_fill_holes((fill | dark) & zone) & zone
    # 덩어리 바깥의 섞인 띠는 윤곽선과 **몸 색**이 섞인 칸이다 — 몸 색 몫을 걷어 내고 윤곽선 몫만 알파로 남긴다.
    # 넓힌 자리를 통째로 데려가면 원래 몸 색이 딸려 와, 몸이 내려가 좁아진 윤곽 바깥에 살색 조각이 뜬다
    body_c = np.array(PALETTE[0][0], dtype=np.float64)
    toward = OUTLINE - body_c
    edge = np.clip(((rgb - body_c) @ toward) / (toward @ toward), 0.0, 1.0)
    # 섞인 띠는 덩어리 바로 바깥 몇 칸뿐이다 — 더 멀리까지 보면 몸 가장자리의 옅은 그늘이 윤곽선으로 읽혀 회색 얼룩이 뜬다
    rim = ndimage.binary_dilation(solid, iterations=EDGE_BAND + 1) & ~solid
    paw_a = np.where(solid, a, np.where(rim, edge * a, 0.0))
    paw_rgb = np.where(rim[..., None], OUTLINE, rgb)

    # 두 앞발을 안쪽으로 — 그림 가운데보다 왼쪽 덩어리는 오른쪽으로, 오른쪽 덩어리는 왼쪽으로
    if gather > 0:
        parts, count = ndimage.label(solid | rim)
        moved_rgb = np.zeros_like(paw_rgb)
        moved_a = np.zeros_like(paw_a)
        center = np.median(np.where(a > 0)[1])
        for i in range(1, count + 1):
            part = parts == i
            shift = gather if np.median(np.where(part)[1]) < center else -gather
            part_a = np.roll(np.where(part, paw_a, 0.0), shift, axis=1)
            moved_rgb = np.where((part_a > 0)[..., None], np.roll(paw_rgb, shift, axis=1), moved_rgb)
            moved_a = np.maximum(moved_a, part_a)
        paw_rgb, paw_a = moved_rgb, moved_a

    # 앞발 뒤의 몸을 메운다 — 원본 앞발 자리(+ 섞인 띠)를 둘레에서 번져 채운다(cv2 의 Telea).
    # 투명한 칸(판 자리)은 몸 색으로 깔아 두고 메운다 — 판의 흰색이 번져 들지 않게
    hole = ndimage.binary_dilation(solid | rim, iterations=2)
    base = np.where((a > 0)[..., None], rgb, body_c).clip(0, 255).astype(np.uint8)
    filled = cv2.inpaint(base, hole.astype(np.uint8), 15, cv2.INPAINT_TELEA).astype(np.float64)

    body = np.zeros_like(rgb)
    body_a = np.zeros_like(a)
    body[drop:] = filled[: rgb.shape[0] - drop]
    body_a[drop:] = a[: rgb.shape[0] - drop]
    body_a[rows[:, 0] >= CUT_Y] = 0.0

    # 앞발을 몸 위에 얹는다(곱하지 않은 알파의 「위에 얹기」)
    out_a = paw_a + body_a * (1 - paw_a)
    mixed = (paw_rgb * paw_a[..., None] + body * (body_a * (1 - paw_a))[..., None]) / np.maximum(
        out_a, 1e-6
    )[..., None]
    return mixed, out_a


drop = BODY_DROP if DROP_ARG is None else DROP_ARG
gather = PAW_GATHER if GATHER_ARG is None else GATHER_ARG
box = None
for name, base in (("baba-peek.png", out), ("baba-peek-blink.png", close_eyes(out))):
    # 눈 감기기가 먼저다 — 눈 자리(`EYES`)는 원본 좌표다
    lowered, lowered_a = lower_body(base, alpha, drop, gather)
    rgba = np.dstack([recolor(lowered), lowered_a * 255.0]).round().clip(0, 255).astype(np.uint8)
    if box is None:
        # 두 장이 **같은 상자**로 잘려야 겹쳐 놓았을 때 픽셀이 맞는다 — 눈만 다르고 윤곽은 같다.
        # 가로는 **내리기 전** 그림으로 잡는다 — 몸이 내려가면 잘린 줄의 몸 폭이 좁아져 상자가 줄고,
        # 같은 폭(`WIDTH`)으로 펴면 앞발이 커진다. 앞발의 크기·자리를 그대로 두려는 것이다
        xs = np.where(alpha > 0)[1]
        ys = np.where(rgba[..., 3] > 0)[0]
        box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    figure = Image.fromarray(rgba, "RGBA").crop(box)

    height = round(figure.height * WIDTH / figure.width)
    # Pillow 는 RGBA 를 줄일 때 **알파를 곱한 채로** 줄인다 — 투명한 칸의 색이 가장자리로 번지지 않는다.
    # 손으로 한 번 더 곱하면 두 번 곱해져 잘린 가장자리에 흰 줄이 뜬다(2026-10-03 · 한 번 밟았다)
    # 면적 평균(BOX)으로 줄인다 — LANCZOS 는 몸이 잘린 곧은 가장자리에서 넘쳐(ringing) 밝은 줄을 남긴다
    final = figure.resize((WIDTH, height), Image.BOX)

    os.makedirs(OUT, exist_ok=True)
    final.save(os.path.join(OUT, name), optimize=True)
    print(f"{name} {final.width} x {final.height}")

print(f"panel top ratio (PAW_RATIO) = {(box[3] - CUT_Y) / figure.height:.4f}")
# 코 한가운데 — 앉은 바바와 가로 자리를 맞출 때 쓴다(`RetroBabaPeek` 의 `NOSE_X`).
# 코는 얼굴 가운데의 가장 큰 갈색 덩어리다
nose_rows = np.arange(h)[:, None]
nose_labels, _ = ndimage.label(
    (np.linalg.norm(rgb - np.array(PALETTE[2][0]), axis=-1) < 40) & (nose_rows < PAW_TOP - 60)
)
nose = nose_labels == np.bincount(nose_labels[nose_labels > 0]).argmax()
print(f"nose x ratio (NOSE_X) = {(np.median(np.where(nose)[1]) - box[0]) / figure.width:.4f}")
