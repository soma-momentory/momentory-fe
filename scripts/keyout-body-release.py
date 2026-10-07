"""몸에 힘 빼기의 생성 그림 네 장을 앱 자산으로 만든다 (2026-10-05).

`assets/body-release/source/`(이력에 담지 않는다)의 네 장을 읽는다 — 전부 ChatGPT 로
생성한 1024×1536 이고, 하늘을 뺀 셋은 **순수 초록(#00FF00) 위**에 그려 달라고 했다.

| 원본           | 무엇                                  | 만드는 것                          |
| -------------- | ------------------------------------- | ---------------------------------- |
| `sky.webp`     | 노을 하늘                             | `sky.webp` (알파 없음)             |
| `hill.webp`    | 초록 위의 언덕                        | `hill.webp` (언덕 부분만 잘라서)   |
| `poses-a.webp` | 2×2 — 기본 · 주먹 · 어깨 · 얼굴       | `capybara-*.webp` 넷               |
| `poses-b.webp` | 2×2 중 셋 — 다리 · 풀림 · 완료        | `capybara-*.webp` 셋               |

전부 손실 WebP 다 — 알파 있는 PNG 로 두면 언덕 한 장이 1MB 였다.

## 초록을 걷어 내는 법

화소마다 「초록이 빨강·파랑보다 얼마나 센가」(`g - max(r, b)`)를 잰다. 배경은 240 남짓,
카피바라(주황·갈색)와 노을빛 풀은 0 아래다. 60 이하는 그대로 두고 200 이상은 지우고,
그 사이는 부분 알파다. 부분 알파 화소는 **배경색을 빼서 원래 색을 되살린다**
(`(c - (1 - a) · 배경) / a`) — 그냥 두면 가장자리에 초록 테가 남는다. 그래도 남는
초록(어두운 외곽선 가장자리 · 언덕 꼭대기 풀잎)은 마지막에 **초록 빼기**로 누른다.

## 포즈를 한 상자에 맞춘다

일곱 장의 머리 폭이 1% 안쪽으로 같아서(같은 대화창 · 포즈 시트) 크기는 건드리지 않는다.
**발밑을 상자 바닥에, 머리 가운데를 상자 가운데에** 맞춘다 — 포즈를 갈아 끼울 때 몸이
옆으로 튀거나 떠오르지 않는다. 다리를 뻗은 포즈가 가장 넓어서 상자 폭은 그걸 담는다.

## 오른발을 고쳐 쓴다 (2026-10-05 · 사용자 피드백)

포즈 시트 A 의 넷(기본 · 주먹 · 어깨 · 얼굴)은 왼발만 동그란 발바닥이 보이는 정면이고
오른발은 옆모습 발끝처럼 삐죽 튀어나와 있었다(시트 B 셋은 두 발 다 동그랗다). 몸의 가운데
선(발 위 몸통의 좌우 끝 한가운데)을 축으로 왼발을 뒤집어 오른발 자리에 **발 모양(타원)대로만**
덮고, 그래도 남는 옛 발끝은 그 아래만 덮는다(`mirror_right_foot`). (걱정상자의 처음 자세도
이 그림을 빌려 같은 방식으로 고쳤는데, 2026-10-07 에 두 발이 다 정면인 그림으로 바꿨다.)

다시 만들 때: `python3 scripts/keyout-body-release.py` (Pillow · numpy 필요).
빌드에 끼지 않는다.
"""

from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent / "assets" / "body-release"
SRC = ROOT / "source"

# 이 값 이하는 그림, 이 값 이상은 배경 — `g - max(r, b)`
KEEP, DROP = 60, 200

QUADRANT = {
    "TL": (0, 768, 0, 512),
    "TR": (0, 768, 512, 1024),
    "BL": (768, 1536, 0, 512),
    "BR": (768, 1536, 512, 1024),
}

POSES = {
    "neutral": ("poses-a", "TL"),
    "hands": ("poses-a", "TR"),
    "shoulders": ("poses-a", "BL"),
    "face": ("poses-a", "BR"),
    "legs": ("poses-b", "TL"),
    "release": ("poses-b", "TR"),
    "calm": ("poses-b", "BL"),
}

# 포즈 상자 — 가장 넓은 포즈(다리 446)와 가장 높은 포즈(586)를 여유 있게 담는다
BOX_W, BOX_H = 480, 600
# 머리 가운데를 재는 줄 — 머리 꼭대기에서 이만큼 아래(귀 아래 · 팔 위)
HEAD_ROW = 200


def keyout(name: str) -> np.ndarray:
    rgb = np.asarray(Image.open(SRC / f"{name}.webp").convert("RGB")).astype(np.float32)
    # 배경색은 구석에서 잰다 — 압축으로 순수 초록에서 조금 벗어나 있다
    bg = rgb[:8, :8].reshape(-1, 3).mean(axis=0)
    d = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
    a = np.clip((DROP - d) / (DROP - KEEP), 0, 1)
    safe = np.maximum(a, 0.05)[..., None]
    fg = np.where(
        (a > 0)[..., None] & (a < 1)[..., None],
        (rgb - (1 - a)[..., None] * bg) / safe,
        rgb,
    )
    # 초록 빼기(despill) — 어떤 화소도 초록이 빨강·파랑 중 센 쪽을 넘지 않게 누른다.
    # 어두운 외곽선과 섞인 가장자리는 알파가 실제보다 높게 잡혀 초록 테가 남고, 언덕
    # 꼭대기 풀잎은 배경 초록이 번져 형광으로 남는다. 카피바라에는 원래 초록이 없고
    # 노을빛 풀은 빨강이 더 세서 그림 자체는 거의 바뀌지 않는다.
    fg[..., 1] = np.minimum(fg[..., 1], np.maximum(fg[..., 0], fg[..., 2]))
    out = np.dstack([np.clip(fg, 0, 255), a * 255]).astype(np.uint8)
    return out


# 오른발이 삐죽한 포즈 — 시트 A 의 넷
POINTY_FOOT = {"neutral", "hands", "shoulders", "face"}


def mirror_right_foot(box: np.ndarray) -> np.ndarray:
    """왼발을 몸의 가운데 선으로 뒤집어 오른발 자리에 덮는다"""
    h, w = box.shape[:2]
    img = box.astype(np.float32)
    alpha = box[..., 3] > 128
    bottom = np.where(alpha.any(axis=1))[0].max()
    # 발 위 몸통의 좌우 끝 한가운데 — 발끝이 삐죽해도 흔들리지 않는다
    row = np.where(alpha[bottom - 110])[0]
    axis = (row.min() + row.max()) / 2
    src = np.clip(np.round(2 * axis - np.arange(w)).astype(int), 0, w - 1)
    mirrored = img[:, src]
    yy, xx = np.mgrid[0:h, 0:w]
    # 왼발(가운데 선에서 왼쪽 141 · 바닥에서 61 · 반지름 63 × 67)을 뒤집은 자리
    cx, cy, rx, ry = axis + 141, bottom - 61, 63, 67
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    foot = np.clip((1.0 - d) / 0.05 + 1, 0, 1)
    tip = np.clip((xx - (cx + 34)) / 4, 0, 1) * np.clip((yy - (cy - 27)) / 4, 0, 1)
    weight = np.maximum(foot, tip)[..., None]
    return np.clip(img * (1 - weight) + mirrored * weight, 0, 255).astype(np.uint8)


def bbox(alpha: np.ndarray):
    ys = np.where((alpha > 128).any(axis=1))[0]
    xs = np.where((alpha > 128).any(axis=0))[0]
    return ys.min(), ys.max(), xs.min(), xs.max()


def main() -> None:
    Image.open(SRC / "sky.webp").convert("RGB").save(ROOT / "sky.webp", quality=86)

    hill = keyout("hill")
    top, _, _, _ = bbox(hill[..., 3])
    # 꼭대기 위로 풀잎 끝이 삐져나온 만큼 조금 더 남긴다
    Image.fromarray(hill[max(0, top - 24) :]).save(ROOT / "hill.webp", quality=86)

    sheets = {name: keyout(name) for name in ("poses-a", "poses-b")}
    for pose, (sheet, cell) in POSES.items():
        y0, y1, x0, x1 = QUADRANT[cell]
        q = sheets[sheet][y0:y1, x0:x1]
        top, bottom, _, _ = bbox(q[..., 3])
        head = np.where(q[top + HEAD_ROW, :, 3] > 128)[0]
        cx = (head.min() + head.max()) / 2
        box = np.zeros((BOX_H, BOX_W, 4), np.uint8)
        # 발밑 → 상자 바닥, 머리 가운데 → 상자 가운데
        dy = BOX_H - 1 - bottom
        dx = round(BOX_W / 2 - cx)
        ys, xs = np.nonzero(q[..., 3])
        ty, tx = ys + dy, xs + dx
        ok = (ty >= 0) & (ty < BOX_H) & (tx >= 0) & (tx < BOX_W)
        box[ty[ok], tx[ok]] = q[ys[ok], xs[ok]]
        if pose in POINTY_FOOT:
            box = mirror_right_foot(box)
        Image.fromarray(box).save(ROOT / f"capybara-{pose}.webp", quality=90)
        print(pose, "bottom", bottom, "head-center", cx, "clipped", int((~ok).sum()))


if __name__ == "__main__":
    main()
