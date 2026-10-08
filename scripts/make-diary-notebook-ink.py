"""일기 상세(`A3`) 노트의 **카피바라 그림 · 밑줄 셋**을 투명 바탕 잉크 그림으로 굽는다 (2026-10-08).

처음에는 `notebook-reference.png`(흰 모눈종이 위 연필 그림) 위에 SVG `feColorMatrix` 를 걸어
밝은 종이는 투명하게, 어두운 선은 잉크색으로 화면에서 바꿨다. 그런데 **iOS 에서 그림이 깨졌다** —
흰 굵은 선에 검은 테두리만 남았다. react-native-svg 의 iOS 필터는 Core Image `CIColorMatrix`
라서 알파를 [0, 1] 로 자르지 않은 채(선 한가운데는 3.6) 색에 곱해 선이 하얗게 날아갔고,
작업 색공간도 선형이라 결과가 안드로이드(Skia · 알파를 자른다)와 달랐다.

그래서 **같은 계산을 여기서 미리 해** 투명 PNG 로 만든다. 화면은 그림을 깔기만 한다 —
두 플랫폼이 같은 그림을 보고, 1055×1491 원본을 네 번 디코딩하지도 않는다.

- 색: 잉크 (0.24, 0.22, 0.19) — 필터의 바이어스 그대로
- 알파: clamp(5.1 − 2(R + G + B)) — 필터의 알파 행 그대로(sRGB 0~1 · 안드로이드에서 보던 결과)
- 자르는 곳: 필터의 `viewBox` 그대로(그림 30 20 490 365 · 밑줄 셋)

    python3 scripts/make-diary-notebook-ink.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

ASSETS = Path(__file__).resolve().parent.parent / "assets" / "diary"
SOURCE = ASSETS / "notebook-reference.png"

INK = np.array([0.24, 0.22, 0.19])

# 이름 → (x, y, 폭, 높이) — `DiaryNotebook.tsx` 가 쓰던 viewBox
REGIONS = {
    "notebook-capybara": (30, 20, 490, 365),
    "notebook-line-date": (725, 114, 216, 16),
    "notebook-line-weather": (767, 204, 212, 17),
    "notebook-line-mood": (725, 291, 263, 23),
}


def ink(rgb: np.ndarray) -> Image.Image:
    alpha = np.clip(5.1 - 2 * rgb.sum(axis=2), 0, 1)
    out = np.empty((*rgb.shape[:2], 4))
    out[..., :3] = INK
    out[..., 3] = alpha
    return Image.fromarray((out * 255).round().astype(np.uint8))


def main() -> None:
    rgb = np.asarray(Image.open(SOURCE).convert("RGB"), dtype=np.float64) / 255
    for name, (x, y, w, h) in REGIONS.items():
        path = ASSETS / f"{name}.png"
        ink(rgb[y : y + h, x : x + w]).save(path, optimize=True)
        print(f"{path.relative_to(ASSETS.parent.parent)} {w}×{h} {path.stat().st_size // 1024}KB")


if __name__ == "__main__":
    main()
