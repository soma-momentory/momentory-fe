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

⚠⚠ **2026-09-11 에 가르는 방법을 한 번 더 바꿨다 — 색만으로는 못 가른다.** 이날 받은 기본 장은
체커가 **자글자글한 노이즈 무늬**라 채도 6 을 넘는 회색 점이 섞여 있었다. 그 점들이 배경으로
안 잡혀 윤곽선에 **회색 테두리처럼 붙었고**, 부스러기가 가장자리까지 퍼져 상자가 캔버스 끝까지
커졌다(384×295). 채도·밝기 문턱으로는 못 막는다 — 이 그림자는 밝기 약 190 · 채도 8~11 로
노이즈(밝기 108~195 · 채도 7~18)와 **값이 겹친다.** 남은 차이는 **결**이다:

1. **몸통** — 무채 회색 중 **주변과 흔들림이 큰 것**(국소 표준편차 σ ≥ 12)은 노이즈라 배경이다.
   그림자를 신경 쓰지 않고 세게 거른 뒤 **가장 큰 덩어리 하나**만 남긴다.
2. **그림자** — 몸통과 **따로** 뽑는다. 매끈하고(σ < 6) 옅은 회색이면서 **큰 덩어리(5000px 이상)**
   이고 그림 아래쪽에 있는 것만 고른다. 체커의 매끈한 칸은 한 변 19~36px 이라 여기 못 든다.
   ⚠ 몸통 판정에 그림자를 맡기면 **발과 맞닿은 줄**이 윤곽선 때문에 거칠게 재져 배경으로 빠지고,
   그림자가 떨어진 조각이 되어 버려진다(두 장 모두 그림자가 사라졌던 시험).
3. 둘을 합치고 발–그림자 사이 몇 px 틈을 닫는다.

⚠⚠⚠ **그림자는 캐릭터와 떼어 한 장으로 따로 만든다**(2026-09-11 · 사용자 요청). 두 장의 그림자는
색(기본 `(194,191,184)` · 인사 `(216,216,204)`)도 높이(인사 장이 4px 아래)도 달라서, 누를 때마다
그림자가 **색이 튀고 내려앉았다.** 그래서 캐릭터 두 장에서는 그림자를 빼고, **인사 장 그림자 색**으로
`capybara-shadow.png` 한 장을 기본 장 발 밑에 맞춰 만든다 — 화면은 이걸 밑에 한 번만 깐다.
원본 그림자가 사실상 단색이라(σ 0.4) **단색으로 칠한다** — 원본 색을 늘리면 발 둘레에서 윤곽선 갈색이 번진다.

또 인사 장은 발이 **4px 더 내려가** 몸이 1.6% 길었다(머리는 같다). 누르면 몸이 아래로 늘어나 보여서,
**팔 아래(`PIVOT`)부터 발까지만 세로로 눌러** 발 아래끝을 기본 장에 맞춘다. 머리와 든 팔은 건드리지 않는다.

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
    # ⚠ 2026-09-11 에 두 장 다 갈아 끼웠다(사용자 반입) — 기본 장은 팔을 뺨 옆에 든 채 눈을 뜨고,
    # 인사 장은 눈을 감고 팔을 크게 든다. 인사 장은 기본 장에 **색을 맞춘 판**이다(파일명 그대로)
    "capybara-idle": "ChatGPT Image 2026년 9월 11일 오후 12_58_06.png",
    "capybara-wave": "capybara-color-matched(1).png",
}


# 몸통 판정 — 이 이상 흔들리는 무채 회색은 노이즈다(⚠ 위 머리말)
T_NOISE = 12.0
# 그림자 판정 — 이 미만으로 매끈해야 그림자 후보다
T_SMOOTH = 6.0
# 그림자 덩어리 최소 크기(원본 화소) — 체커 칸(한 변 19~36px)은 여기 못 든다
MIN_SHADOW = 5000


def local_std(lum, k=7):
    """k×k 창 안에서 밝기가 얼마나 흔들리는가 — 노이즈는 크고 그림자 속은 0 에 가깝다."""
    m = ndimage.uniform_filter(lum, k)
    m2 = ndimage.uniform_filter(lum * lum, k)
    return np.sqrt(np.maximum(m2 - m * m, 0))


def largest(mask):
    lab, _ = ndimage.label(mask, structure=np.ones((3, 3)))
    sizes = np.bincount(lab.ravel())
    sizes[0] = 0
    return lab == sizes.argmax() if sizes.max() > 0 else mask


def foreground(path):
    """체커를 걷어 내고 **(원본, 몸통 마스크, 그림자 마스크)** 를 따로 돌려준다."""
    im = Image.open(path).convert("RGB")
    a = np.asarray(im).astype(np.float64)
    h = a.shape[0]
    lum = a.mean(axis=2)
    chroma = a.max(axis=2) - a.min(axis=2)
    sd = local_std(lum)

    # 1 — 몸통: 깨끗한 체커 · 흔들리는 회색 노이즈 · 아주 밝은 흰 칸 노이즈를 배경 후보로
    cand = (
        ((chroma <= 6) & (lum >= 150))
        | ((chroma <= 18) & (lum < 232) & (sd >= T_NOISE))
        | ((chroma <= 18) & (lum >= 232))
    )
    lab, _ = ndimage.label(cand)
    edge = (
        set(lab[0].tolist())
        | set(lab[-1].tolist())
        | set(lab[:, 0].tolist())
        | set(lab[:, -1].tolist())
    )
    edge.discard(0)
    body = largest(~np.isin(lab, list(edge)))
    body = ndimage.binary_opening(body, structure=np.ones((3, 3)), iterations=2)
    body = ndimage.binary_fill_holes(largest(body))

    # 2 — 그림자: 몸통과 따로. 매끈하고 옅은 큰 덩어리, 그림 아래쪽
    sc = (chroma >= 5) & (chroma <= 20) & (lum >= 150) & (lum < 240) & (sd < T_SMOOTH) & ~body
    lab2, _ = ndimage.label(sc, structure=np.ones((3, 3)))
    shadow = np.zeros_like(body)
    for i, sl in enumerate(ndimage.find_objects(lab2), start=1):
        if sl is None:
            continue
        comp = lab2[sl] == i
        cy = (sl[0].start + sl[0].stop) / 2
        if comp.sum() >= MIN_SHADOW and cy >= h * 0.75:
            shadow[sl] |= comp
    shadow = ndimage.binary_fill_holes(
        ndimage.binary_closing(shadow, structure=np.ones((5, 5)), iterations=2)
    )

    # 3 — 몸통 가장자리: 톱니를 메우고 체커와 섞인 한 겹을 깎는다
    body = ndimage.binary_closing(body, structure=np.ones((3, 3)), iterations=2)
    body = ndimage.binary_erosion(ndimage.binary_fill_holes(body), iterations=1)
    return im, body, shadow


# 인사 장을 누르기 시작하는 높이 — 상자 높이 대비. 든 팔(위 42~57%)보다 아래라 팔은 안 눌린다
PIVOT = 0.62
def top_row(m):
    return int(np.where(m.any(axis=1))[0].min())


def bottom_row(m):
    return int(np.where(m.any(axis=1))[0].max())


def rgba(im, mask):
    """원본 색에 마스크를 알파로 — 가장자리를 살짝 흐려 계단을 없앤다."""
    al = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    out = im.convert("RGBA")
    out.putalpha(al)
    return out


def shrink_below(img, pivot, src_bottom, dst_bottom):
    """`pivot` 줄 아래를 세로로 눌러 `src_bottom` 이 `dst_bottom` 에 오게 한다(위쪽은 그대로).

    ⚠ **미리 곱한 알파(RGBa)로** 늘이고 줄인다 — 그냥 RGBA 로 줄이면 투명한 자리의 원본 색(체커)이
    가장자리로 번져 회색 테두리가 다시 생긴다.
    """
    w, h = img.size
    top = img.crop((0, 0, w, pivot))
    strip = img.crop((0, pivot, w, src_bottom + 1)).convert("RGBa")
    strip = strip.resize((w, dst_bottom - pivot + 1), Image.LANCZOS).convert("RGBA")
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(top, (0, 0))
    out.paste(strip, (0, pivot))
    return out


def save_layer(img, box, height, name):
    # 줄일 때도 미리 곱한 알파로 — 투명한 자리의 색이 번지지 않게
    img.crop(box).convert("RGBa").resize((WIDTH, height), Image.LANCZOS).convert("RGBA").save(
        os.path.join(OUT, f"{name}.png")
    )


os.makedirs(OUT, exist_ok=True)

frames = {key: foreground(os.path.expanduser(f"~/Downloads/{stem}")) for key, stem in SRC.items()}

# 캔버스가 1px 씩 다르므로 공통 크기로 먼저 맞춘다
common = (
    min(b.shape[0] for _, b, _ in frames.values()),
    min(b.shape[1] for _, b, _ in frames.values()),
)
frames = {
    k: (im.crop((0, 0, common[1], common[0])), b[: common[0], : common[1]], sh[: common[0], : common[1]])
    for k, (im, b, sh) in frames.items()
}
idle_im, idle_body, idle_shadow = frames["capybara-idle"]
wave_im, wave_body, wave_shadow = frames["capybara-wave"]

# 한 상자 — 조정 **전** 두 장의 몸통·그림자 합집합에서 잰다(비율이 흔들리지 않게)
union = idle_body | idle_shadow | wave_body | wave_shadow
ys, xs = np.where(union)
box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
height = round(WIDTH * (box[3] - box[1]) / (box[2] - box[0]))
print(f"공통 상자 {box} → {WIDTH}×{height}")

# B1 — 인사 장의 팔 아래만 눌러 발 아래끝을 기본 장에 맞춘다
pivot = box[1] + round((box[3] - box[1]) * PIVOT)
iy, wy = bottom_row(idle_body), bottom_row(wave_body)
print(f"발 아래끝: 기본 {iy} · 인사 {wy} → 인사 장 {wy - pivot}줄을 {iy - pivot}줄로 누른다")
idle_layer = rgba(idle_im, idle_body)
wave_layer = shrink_below(rgba(wave_im, wave_body), pivot, wy, iy)

# A — 그림자 한 장: 인사 장 그림자를 기본 장 그림자 높이로 올리고, 인사 장 그림자 색 단색으로
shift = top_row(idle_shadow) - top_row(wave_shadow)
shadow = np.zeros_like(wave_shadow)
if shift <= 0:
    shadow[: shadow.shape[0] + shift] = wave_shadow[-shift:]
else:
    shadow[shift:] = wave_shadow[: shadow.shape[0] - shift]
# ⚠ **따 온 모양을 쓰지 않고 매끈한 타원을 새로 그린다**(2026-09-11 · 사용자 요청). 원본 그림자의
# 경계를 그대로 따면 아래 가장자리가 울퉁불퉁하게 남는다. 그래서 **아랫부분 가장자리 점들에 타원을
# 맞춘다** — 윗부분은 발에 가려 잘려 있어 맞추는 데 쓰지 않는다. 울퉁불퉁함은 평균으로 흡수되고,
# 크기와 자리는 원래 그림자 그대로다.
# 좌우 끝은 깨끗하다 — 가로 중심·반지름은 그대로 잰다
ys_s, xs_s = np.where(shadow)
x0, x1 = int(xs_s.min()), int(xs_s.max())
cx, rx = (x0 + x1) / 2, (x1 - x0) / 2
# 세로는 **아래끝 줄**에 맞춘다: 열마다 가장 아래 줄 b(x) = cy + ry·√(1 − u²), u = (x − cx)/rx
# 가로를 먼저 정했으니 미지수 둘(cy, ry)짜리 최소제곱이라 무너지지 않는다. 끝 쪽 10%는 기울기가 커 뺀다
cols = np.arange(int(cx - rx * 0.8), int(cx + rx * 0.8) + 1)
cols = cols[shadow[:, cols].any(axis=0)]
bottoms = np.array([np.where(shadow[:, c])[0].max() for c in cols], dtype=np.float64)
root = np.sqrt(np.clip(1 - ((cols - cx) / rx) ** 2, 0, 1))
cy, ry = np.linalg.lstsq(np.column_stack([np.ones_like(root), root]), bottoms, rcond=None)[0]
if not (np.isfinite(cy) and np.isfinite(ry) and 0 < ry < (ys_s.max() - ys_s.min())):
    # 안전장치 — 맞추기가 어긋나면 그림자 상자에 꼭 맞는 타원으로
    cy, ry = (ys_s.min() + ys_s.max()) / 2, (ys_s.max() - ys_s.min()) / 2
    print("⚠ 타원 맞추기가 어긋나 상자 타원으로 대신 그렸다")
yy, xx = np.mgrid[0 : shadow.shape[0], 0 : shadow.shape[1]]
shadow = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0
print(f"그림자 타원: 중심 ({cx:.0f},{cy:.0f}) · 가로 반지름 {rx:.0f} · 세로 반지름 {ry:.0f}")
color = tuple(int(c) for c in np.asarray(wave_im)[wave_shadow].mean(axis=0).round())
print(f"그림자: 인사 장 그림자를 {shift:+d}줄 옮김 · 색 {color}")
shadow_layer = Image.new("RGBA", idle_im.size, color + (0,))
shadow_layer.putalpha(
    Image.fromarray((shadow * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
)

save_layer(idle_layer, box, height, "capybara-idle")
save_layer(wave_layer, box, height, "capybara-wave")
save_layer(shadow_layer, box, height, "capybara-shadow")

# 눈으로 확인하는 판 — 그림자 위에 두 장을 각각 얹어 나란히
sheet = Image.new("RGBA", (WIDTH * 2, height), (255, 253, 248, 255))
sh_img = Image.open(os.path.join(OUT, "capybara-shadow.png"))
for i, key in enumerate(SRC):
    sheet.alpha_composite(sh_img, (i * WIDTH, 0))
    sheet.alpha_composite(Image.open(os.path.join(OUT, f"{key}.png")), (i * WIDTH, 0))
sheet.save(os.path.join(OUT, "_sheet.png"))
