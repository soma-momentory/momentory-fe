"""걱정상자의 생성 그림 네 장을 앱 자산으로 만든다 (2026-10-05).

`assets/worry-box/source/`(이력에 담지 않는다)의 네 장을 읽는다 — 전부 ChatGPT 로
생성했고, 배경을 뺀 셋은 순수 초록(#00FF00) 위에 그렸다. 걷어 내는 법은 몸에 힘 빼기와
같다(`keyout-body-release.py` 머리말 — 초록 세기로 알파를 내고, 섞인 가장자리는 배경색을
빼서 되살리고, 남은 초록은 누른다).

| 원본          | 무엇                                     | 만드는 것                                   |
| ------------- | ---------------------------------------- | ------------------------------------------- |
| `forest.webp` | 저녁 숲속 오솔길                         | `forest.webp`                               |
| `poses.webp`  | 2×2 — (받기) · 쪽지 들기 · 넣기 · 곁에서 쉬기 | `capybara-{hold,put,rest}.webp` — 받기는 쓰지 않는다 |
| `walk.webp`   | 상자를 인 뒷모습 두 걸음                 | `capybara-walk{1,2}.webp`                   |
| `box.webp`    | 열린 상자 뒤판 · 앞판 · 닫힌 상자        | `box-{back,front,closed}.webp`              |
| (몸에 힘 빼기) `poses-a.webp` 왼쪽 위 | 두 손을 배에 얹은 기본 앉은 자세 | `capybara-sit.webp`             |

⚠ **처음 자세는 몸에 힘 빼기의 기본 포즈를 빌린다** (2026-10-05 · 실기기 피드백). 생성한
「받기」(두 손을 내민) 포즈가 어색했다. 같은 캐릭터라 이어지지만 머리 폭이 4.5% 작게
그려져 있어서(374 : 391) 그만큼 키워 맞춘다(`SIT_SCALE`). 원본은
`assets/body-release/source/` 에 있다.

⚠ **그 자세의 오른발은 고쳐 쓴다** (2026-10-05 · 사용자 피드백). 원본은 왼발만 동그란
발바닥이 보이는 정면이고 오른발은 옆모습 발끝처럼 삐죽 튀어나와 있었다. 왼발을 좌우로
뒤집어 오른발 자리에 **발 모양(타원)대로만** 덮고, 그래도 남는 옛 발끝은 그 아래만 덮는다
(`mirror_right_foot`). 사각형으로 섞으면 발 윗선이 잘리거나 팔 선이 겹쳐 흐려졌다.

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
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "assets" / "worry-box"
SRC = ROOT / "source"

KEEP, DROP = 60, 200

# 상자 크기(가로 × 세로) — 가장 넓은 · 가장 높은 것을 여유 있게 담는다. 앉은 포즈와 뒷모습은
# 폭이 같아야 화면에서 같은 크기로 보인다(뒷모습은 발이 팔 가운데에 있지 않아 560 이 필요했다)
SIT_BOX = (560, 600)
WALK_BOX = (560, 830)
CHEST_BOX = (420, 410)
# 몸에 힘 빼기 기본 포즈를 걱정상자 포즈 크기로 맞추는 배율 — 머리 폭 391 ÷ 374
SIT_SCALE = 391 / 374
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


def mirror_right_foot(box: np.ndarray) -> np.ndarray:
    """왼발을 뒤집어 오른발 자리에 덮는다 — 상자는 두 발의 가운데가 가운데라 그대로 뒤집으면 된다"""
    h, w = box.shape[:2]
    img = box.astype(np.float32)
    mirrored = img[:, ::-1]
    yy, xx = np.mgrid[0:h, 0:w]
    # 왼발(그림에서 잰 가운데 132, 535)을 뒤집은 자리 — 외곽선까지 덮도록 조금 넉넉하다
    cx, cy, rx, ry = (w - 1) - 132, 535, 66, 70
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    foot = np.clip((1.0 - d) / 0.05 + 1, 0, 1)
    # 타원 밖으로 남는 옛 발끝 — 오른쪽 아래만
    tip = np.clip((xx - 470) / 4, 0, 1) * np.clip((yy - 508) / 4, 0, 1)
    weight = np.maximum(foot, tip)[..., None]
    return np.clip(img * (1 - weight) + mirrored * weight, 0, 255).astype(np.uint8)


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

    sit = keyout("poses-a", ROOT.parent / "body-release" / "source")[0:768, 0:512]
    h, w = sit.shape[:2]
    sit = np.asarray(
        Image.fromarray(sit).resize((round(w * SIT_SCALE), round(h * SIT_SCALE)), Image.LANCZOS)
    )
    save(mirror_right_foot(place(sit, SIT_BOX, center_on_feet=True)), "capybara-sit")

    walk = keyout("walk")
    save(place(walk[:, :768], WALK_BOX, center_on_feet=True), "capybara-walk1")
    save(place(walk[:, 768:], WALK_BOX, center_on_feet=True), "capybara-walk2")

    chest = keyout("box")
    for name, (x0, x1) in {"back": (0, 520), "front": (520, 1010), "closed": (1010, 1536)}.items():
        save(place(chest[:, x0:x1], CHEST_BOX, center_on_feet=False), f"box-{name}")


if __name__ == "__main__":
    main()
