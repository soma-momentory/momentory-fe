"""걱정상자의 그림 다섯 장을 앱 자산으로 만든다 (2026-10-05).

`assets/worry-box/source/`(이력에 담지 않는다)의 다섯 장을 읽는다 — `sit.webp` 말고는
ChatGPT 로 생성했고, 배경을 뺀 셋은 순수 초록(#00FF00) 위에 그렸다. 걷어 내는 법은 몸에 힘 빼기와
같다(`keyout-body-release.py` 머리말 — 초록 세기로 알파를 내고, 섞인 가장자리는 배경색을
빼서 되살리고, 남은 초록은 누른다).

| 원본          | 무엇                                     | 만드는 것                                   |
| ------------- | ---------------------------------------- | ------------------------------------------- |
| `forest.webp` | 저녁 숲속 오솔길                         | `forest.webp`                               |
| `poses.webp`  | 2×2 — (받기) · 쪽지 들기 · 넣기 · 곁에서 쉬기 | `capybara-{hold,put,rest}.webp` — 받기는 쓰지 않는다 |
| `walk.webp`   | 상자를 인 뒷모습 두 걸음                 | `capybara-walk{1,2}.webp`                   |
| `box.webp`    | 열린 상자 뒤판 · 앞판 · 닫힌 상자        | `box-{back,front,closed}.webp`              |
| `sit.webp`    | 두 손을 배에 얹은 기본 앉은 자세(흰 바탕) | `capybara-sit.webp`                         |

⚠ **처음 자세는 따로 받은 그림이다** (2026-10-07 · 사용자 제공). 처음에는 몸에 힘 빼기의
기본 포즈를 빌려 오른발을 왼발을 뒤집어 덮어 썼는데, 두 발이 다 정면인 그림으로 바꿨다.
이 그림만 **흰 바탕**이라 초록 대신 흰색을 걷어 낸다(`keyout_white`). 같은 캐릭터라
이어지고, 머리 폭이 다른 포즈(390)의 두 배로 그려져 있어서 절반으로 줄인다(`SIT_SCALE`).

## 같은 상자에 맞춘다

- 앉은 포즈 넷은 **발밑을 바닥에, 두 발의 가운데를 가운데에** 맞춘다. 넣기 포즈는 몸을
  돌려 머리가 옆으로 가 있어서, 머리가 아니라 발로 맞춰야 갈아 끼울 때 몸이 미끄러지지 않는다
- 뒷모습 둘은 같은 폭의 더 높은 상자에 같은 방식으로 맞춘다(크기는 그대로 — 앉은 포즈와
  몸 폭이 같다)
- 상자 셋은 **바닥과 가로 가운데**를 맞춘다. 그래서 앞판이 뒤판의 아랫부분을 정확히 덮고,
  쪽지가 그 사이로 내려가면 상자 안에 들어간 것으로 보인다

다시 만들 때: `python3 scripts/keyout-worry-box.py` (Pillow · numpy 필요). 빌드에 끼지 않는다.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / "assets" / "worry-box"
SRC = ROOT / "source"

KEEP, DROP = 60, 200

# 상자 크기(가로 × 세로) — 가장 넓은 · 가장 높은 것을 여유 있게 담는다. 앉은 포즈와 뒷모습은
# 폭이 같아야 화면에서 같은 크기로 보인다(뒷모습은 발이 팔 가운데에 있지 않아 560 이 필요했다)
SIT_BOX = (560, 600)
WALK_BOX = (560, 830)
CHEST_BOX = (420, 410)
# 처음 자세 그림을 다른 포즈 크기로 맞추는 배율 — 머리 폭 390 ÷ 780
SIT_SCALE = 390 / 780
# 흰 바탕 걷어 내기 — 이보다 밝으면 바탕 후보, 외곽선(진한 갈색)에 닿는 띠의 폭(px)
WHITE_MIN, EDGE_BAND = 240, 7
# 발의 가운데를 잴 때 보는 아래쪽 줄 수
FEET_ROWS = 80


def keyout(name: str, src: Path = SRC) -> np.ndarray:
    rgb = np.asarray(Image.open(src / f"{name}.webp").convert("RGB")).astype(np.float32)
    bg = rgb[:8, :8].reshape(-1, 3).mean(axis=0)
    d = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
    a = np.clip((DROP - d) / (DROP - KEEP), 0, 1)
    safe = np.maximum(a, 0.05)[..., None]
    partial = ((a > 0) & (a < 1))[..., None]
    fg = np.where(partial, (rgb - (1 - a)[..., None] * bg) / safe, rgb)
    fg[..., 1] = np.minimum(fg[..., 1], np.maximum(fg[..., 0], fg[..., 2]))
    return np.dstack([np.clip(fg, 0, 255), a * 255]).astype(np.uint8)


def place(piece: np.ndarray, size: tuple[int, int], center_on_feet: bool) -> np.ndarray:
    """조각을 상자 바닥 · 가로 가운데에 앉힌다 — 가운데는 발(아래쪽 줄) 또는 전체로 잰다"""
    alpha = piece[..., 3] > 128
    ys = np.where(alpha.any(axis=1))[0]
    bottom = ys.max()
    rows = alpha[bottom - FEET_ROWS : bottom + 1] if center_on_feet else alpha
    xs = np.where(rows.any(axis=0))[0]
    cx = (xs.min() + xs.max()) / 2
    w, h = size
    box = np.zeros((h, w, 4), np.uint8)
    py, px = np.nonzero(piece[..., 3])
    ty, tx = py + (h - 1 - bottom), px + round(w / 2 - cx)
    ok = (ty >= 0) & (ty < h) & (tx >= 0) & (tx < w)
    box[ty[ok], tx[ok]] = piece[py[ok], px[ok]]
    lost = int((piece[py[~ok], px[~ok], 3] > 128).sum())
    assert lost == 0, f"상자 밖으로 {lost}px 이 잘렸다 — 상자를 키운다"
    return box


def keyout_white(name: str) -> np.ndarray:
    """흰 바탕을 걷어 낸다 — 가장자리에서 이어진 밝은 곳만 바탕이다(몸 안의 밝은 곳은 남는다).
    바탕에 닿는 띠는 외곽선과 흰색이 섞인 것이라, 흰색을 빼서 외곽선 색과 알파를 되살린다"""
    img = Image.open(SRC / f"{name}.webp").convert("RGB")
    rgb = np.asarray(img).astype(np.float32)
    light = Image.fromarray(np.where(rgb.min(axis=2) >= WHITE_MIN, 255, 0).astype(np.uint8)).copy()
    w, h = light.size
    for corner in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if light.getpixel(corner) == 255:
            ImageDraw.floodfill(light, corner, 128)
    bg = np.asarray(light) == 128
    band = np.asarray(Image.fromarray(bg.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(EDGE_BAND))) > 0
    band &= ~bg
    # 띠 안: 밝을수록 투명하다 — 외곽선의 밝기(그림에서 잰 평균 37)까지가 0 → 1
    a = np.where(bg, 0.0, 1.0)
    a[band] = np.clip((255 - rgb[band].mean(axis=1)) / (255 - 37), 0, 1)
    safe = np.maximum(a, 0.05)[..., None]
    fg = np.where(band[..., None], (rgb - (1 - a)[..., None] * 255) / safe, rgb)
    return np.dstack([np.clip(fg, 0, 255), a * 255]).astype(np.uint8)


def save(arr: np.ndarray, name: str) -> None:
    Image.fromarray(arr).save(ROOT / f"{name}.webp", quality=90)


def main() -> None:
    Image.open(SRC / "forest.webp").convert("RGB").save(ROOT / "forest.webp", quality=86)

    poses = keyout("poses")
    for name, (y0, y1, x0, x1) in {
        "hold": (0, 768, 512, 1024),
        "put": (768, 1536, 0, 512),
        "rest": (768, 1536, 512, 1024),
    }.items():
        save(place(poses[y0:y1, x0:x1], SIT_BOX, center_on_feet=True), f"capybara-{name}")

    sit = Image.fromarray(keyout_white("sit")).convert("RGBa")
    sit = sit.resize((round(sit.width * SIT_SCALE), round(sit.height * SIT_SCALE)), Image.LANCZOS)
    save(place(np.asarray(sit.convert("RGBA")), SIT_BOX, center_on_feet=True), "capybara-sit")

    walk = keyout("walk")
    save(place(walk[:, :768], WALK_BOX, center_on_feet=True), "capybara-walk1")
    save(place(walk[:, 768:], WALK_BOX, center_on_feet=True), "capybara-walk2")

    chest = keyout("box")
    for name, (x0, x1) in {"back": (0, 520), "front": (520, 1010), "closed": (1010, 1536)}.items():
        save(place(chest[:, x0:x1], CHEST_BOX, center_on_feet=False), f"box-{name}")


if __name__ == "__main__":
    main()
