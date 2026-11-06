"""걱정상자의 그림을 앱 자산으로 만든다 (2026-10-05 · 2026-11-06 카피바라 · 숲 교체).

`assets/worry-box/source/`(이력에 담지 않는다)의 그림을 읽는다. 카피바라 두 장은 홈의 바바
(`assets/home/v2/baba-composite.png`)를 참고 그림으로 붙여 ChatGPT 로 그렸고, 순수 초록(#00FF00)
위에 있다. 걷어 내는 법은 몸에 힘 빼기와 같다(`keyout-body-release.py` 머리말 — 초록 세기로 알파를
내고, 섞인 가장자리는 배경색을 빼서 되살리고, 남은 초록은 누른다).

| 원본          | 무엇                                           | 만드는 것                              |
| ------------- | ---------------------------------------------- | -------------------------------------- |
| `forest.webp` | 숲속 오솔길(납작한 그림체 · 사용자 제공)        | `forest.webp`                          |
| `poses.webp`  | 2×2 — 앉기 · 쪽지 들기 · 넣기 · 곁에서 쉬기     | `capybara-{sit,hold,put,rest}.webp`    |
| `walk.webp`   | 상자를 인 뒷모습 두 걸음                       | `capybara-walk{1,2}.webp`              |
| `box.webp`    | 열린 상자 뒤판 · 앞판 · 닫힌 상자               | `box-{back,front,closed}.webp`         |

⚠ **2026-11-06 — 카피바라를 홈의 바바로 바꿨다.** 그 전에는 주황빛 카피바라였고 처음 자세만 따로 받은
흰 바탕 그림이라 색을 옮겨 맞췄다(`recolor`). 이제 네 자세가 한 장에서 나와 그럴 일이 없다.
상자 원본(`box.webp`)은 지금 기기에 없다 — 없으면 상자 세 장은 그대로 두고 뒤판의 뚜껑만 지운다.
열린 상자에는 **뚜껑이 없다**(2026-11-06) — 뒤판 위에 세워 두었던 뚜껑을 지우고 윗변을 둥글게 다시 그었다(`drop_lid`).

## 같은 상자에 맞춘다

- 새 그림은 옛 그림보다 작게 그려져 있어 `SCALE` 로 키운다 — 앉은 자세의 키가 옛 그림(577px)과 같다.
  그래서 화면의 카피바라 크기(`worryBoxSize.capybara`)는 그대로다
- 앉은 포즈 넷은 **발밑을 바닥에, 두 발의 가운데를 가운데에** 맞춘다. 넣기 포즈는 몸을
  돌려 머리가 옆으로 가 있어서, 머리가 아니라 발로 맞춰야 갈아 끼울 때 몸이 미끄러지지 않는다
- 뒷모습 둘은 같은 폭의 더 높은 상자에 **몸 전체의 가운데**로 맞춘다(같은 배율 — 앉은 포즈와
  몸 폭이 같다). 새 그림은 앞으로 내딛은 발이 걸음마다 왼쪽 · 오른쪽으로 바뀌어서, 발로 맞추면
  걸음마다 몸이 옆으로 튄다
- 상자 셋은 **바닥과 가로 가운데**를 맞춘다. 그래서 앞판이 뒤판의 아랫부분을 정확히 덮고,
  쪽지가 그 사이로 내려가면 상자 안에 들어간 것으로 보인다

다시 만들 때: `uv run --no-project --with numpy --with pillow python scripts/keyout-worry-box.py`.
빌드에 끼지 않는다.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent / "assets" / "worry-box"
SRC = ROOT / "source"

KEEP, DROP = 60, 200

# 상자 크기(가로 × 세로) — 가장 넓은 · 가장 높은 것을 여유 있게 담는다. 앉은 포즈와 뒷모습은
# 폭이 같아야 화면에서 같은 크기로 보인다. ⚠ 바꾸면 `ds/worryBox.ts` 의 `capybaraAspect` 도 바꾼다
SIT_BOX = (560, 600)
WALK_BOX = (560, 880)
CHEST_BOX = (420, 410)
# 새 카피바라 그림을 옛 그림 크기로 맞추는 배율 — 앉은 자세의 키 577 ÷ 525(2026-11-06)
SCALE = 577 / 525
# 열린 상자 뒤판에서 세워 둔 뚜껑을 지우는 줄 — 이보다 위가 뚜껑이고, 이 줄부터가 뚜껑과
# 뒷벽이 함께 쓰는 외곽선이다(2026-11-06 · 사용자 요청 「처음 상자의 뚜껑을 없애」)
LID_CUT = 176
# 뚜껑을 지운 윗변의 마감 — 외곽선 굵기 · 모서리 둥글기(블러 시그마) · 슈퍼샘플 · 새로 그리는 줄의 끝.
# 그냥 자르면 뚜껑 외곽선의 양 끝이 날개처럼 튀어나오고 모서리가 각졌다(2026-11-06 · 사용자 피드백)
RIM, RIM_ROUND, RIM_SS, RIM_TO = 10, 7, 4, 230
RIM_INK = (78, 27, 8)
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


def scaled(piece: np.ndarray) -> np.ndarray:
    """알파를 곱한 채로 키운다 — 가장자리에 초록 · 검은 테가 생기지 않게"""
    img = Image.fromarray(piece).convert("RGBa")
    img = img.resize((round(img.width * SCALE), round(img.height * SCALE)), Image.LANCZOS)
    return np.asarray(img.convert("RGBA"))


def _rim_shape(h: int, w: int, lf, rf, inset: int) -> np.ndarray:
    """옆벽의 바깥 선 둘 · 윗변으로 둘러싼 모양을 inset 만큼 안으로 들이고 위 모서리를 둥글린다"""
    img = Image.new("L", (w * RIM_SS, h * RIM_SS), 0)
    top, bottom = LID_CUT + inset, h + 50
    k = float(np.sqrt(1 + lf[0] ** 2))  # 기울어진 변을 안으로 inset 만큼 옮기는 가로 거리
    pts = [
        (np.polyval(lf, bottom) + inset * k, bottom),
        (np.polyval(lf, top) + inset * k, top),
        (np.polyval(rf, top) - inset * k, top),
        (np.polyval(rf, bottom) - inset * k, bottom),
    ]
    ImageDraw.Draw(img).polygon([(x * RIM_SS, y * RIM_SS) for x, y in pts], fill=255)
    # 흐리게 한 뒤 반으로 자르면 볼록한 모서리만 둥글어지고 곧은 변은 제자리다
    sigma = max(RIM_ROUND - inset * 0.3, 2) * RIM_SS
    img = img.filter(ImageFilter.GaussianBlur(sigma)).point(lambda v: 255 if v >= 128 else 0)
    return np.asarray(img.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255


def drop_lid(back: np.ndarray) -> np.ndarray:
    """열린 상자 뒤판에서 뚜껑을 지우고 윗변을 둥글게 마감한다 — 남는 것은 뒷벽 · 옆벽 · 바닥이다.
    옆벽의 바깥 선을 그림에서 재서 위로 잇고, 위 모서리를 둥글린 외곽선을 새로 긋는다.
    이미 마감한 그림에 다시 해도 같다"""
    a = back.astype(np.float32)
    h, w = a.shape[:2]
    ys = np.arange(LID_CUT + 30, LID_CUT + 90)
    lf = np.polyfit(ys, [np.where(a[y, :, 3] > 128)[0].min() for y in ys], 1)
    rf = np.polyfit(ys, [np.where(a[y, :, 3] > 128)[0].max() + 1 for y in ys], 1)
    outer = _rim_shape(h, w, lf, rf, 0)[:RIM_TO, :, None]
    inner = _rim_shape(h, w, lf, rf, RIM)[:RIM_TO, :, None]
    out = a.copy()
    out[:RIM_TO, :, :3] = a[:RIM_TO, :, :3] * inner + np.array(RIM_INK, np.float32) * (1 - inner)
    out[:RIM_TO, :, 3] = outer[..., 0] * 255
    return np.clip(out, 0, 255).astype(np.uint8)


def save(arr: np.ndarray, name: str) -> None:
    Image.fromarray(arr).save(ROOT / f"{name}.webp", quality=90)


def main() -> None:
    Image.open(SRC / "forest.webp").convert("RGB").save(ROOT / "forest.webp", quality=86)

    poses = keyout("poses")
    half = poses.shape[0] // 2
    for name, (y0, y1, x0, x1) in {
        "sit": (0, half, 0, half),
        "hold": (0, half, half, None),
        "put": (half, None, 0, half),
        "rest": (half, None, half, None),
    }.items():
        save(place(scaled(poses[y0:y1, x0:x1]), SIT_BOX, center_on_feet=True), f"capybara-{name}")

    walk = keyout("walk")
    mid = walk.shape[1] // 2
    save(place(scaled(walk[:, :mid]), WALK_BOX, center_on_feet=False), "capybara-walk1")
    save(place(scaled(walk[:, mid:]), WALK_BOX, center_on_feet=False), "capybara-walk2")

    if (SRC / "box.webp").exists():
        chest = keyout("box")
        for name, (x0, x1) in {"back": (0, 520), "front": (520, 1010), "closed": (1010, 1536)}.items():
            piece = place(chest[:, x0:x1], CHEST_BOX, center_on_feet=False)
            save(drop_lid(piece) if name == "back" else piece, f"box-{name}")
    else:
        # 상자 원본이 없을 때도 뚜껑은 지운다 — 이미 지운 그림에 다시 해도 같다
        back = np.asarray(Image.open(ROOT / "box-back.webp").convert("RGBA"))
        save(drop_lid(back), "box-back")


if __name__ == "__main__":
    main()
