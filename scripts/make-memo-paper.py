"""일기 확인(`C6`) 메모지의 **수채화지 결** 타일을 만든다 (2026-10-07 · 사용자 시안).

시안(HTML 미리보기)은 SVG `feTurbulence` + `feDiffuseLighting` 엠보싱을 종이색 위에
곱하기(22%)로 얹었다. React Native 는 그 필터도 곱하기 블렌드도 없어서, **같은 계산을
여기서 미리 구워** 종이색이 들어간 타일로 만든다. 화면은 이 타일을 반복해 깔기만 한다.

- 이음매가 없다 — 흰 잡음을 주파수에서 걸러 만든다(FFT 는 본래 주기적이다)
- 빛은 시안과 같이 **왼쪽 위**(방위 235° · 고도 58°)에서 든다
- 아주 옅은 잔결(grain)을 한 겹 더 얹는다 — 시안의 `.paper::after` 와 같은 자리다
- 160dp 한 장을 1x·`@2x`·`@3x` 로 굽는다. **같은 스펙트럼을 늘린 것이라 배율이 달라도 무늬가 같다**

    python3.13 scripts/make-memo-paper.py
"""

from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "assets" / "diary"

TILE_DP = 160
# 시안의 baseFrequency 0.17 — 결이 6dp 남짓마다 오르내린다. 이 둘레의 주파수만 남긴다
PEAK_FREQ = 0.17
# 결의 깊이 — 시안(surfaceScale 1.5 · 22% 곱하기)과 나란히 보고 맞춘 값
DEPTH = 0.3
# 시안의 곱하기 불투명도
EMBOSS_OPACITY = 0.22
GRAIN_OPACITY = 0.5 * 0.22
GRAIN_INK = np.array([0.42, 0.36, 0.28])
LIGHT_AZIMUTH = np.radians(235)
LIGHT_ELEVATION = np.radians(58)

PAPERS = {
    # `src/design/ds/diaryMemo.ts` 의 `paper` 와 같은 값이어야 한다
    "memo-paper-ivory": (0xFA, 0xF5, 0xEC),
    "memo-paper-lemon": (0xF5, 0xE8, 0xB8),
}


def spectrum() -> np.ndarray:
    """160dp 격자(1dp 한 칸)의 흰 잡음을 결 주파수 둘레만 남기도록 거른 스펙트럼.

    격자 잡음(value noise)은 가로세로로 줄 선 무늬가 났다 — 주파수에서 거르면 방향이 없고,
    FFT 가 본래 주기적이라 **타일 끝이 처음과 저절로 이어진다**.
    """
    white = np.random.default_rng(7).standard_normal((TILE_DP, TILE_DP))
    f = np.hypot(*np.meshgrid(np.fft.fftfreq(TILE_DP), np.fft.fftfreq(TILE_DP)))
    with np.errstate(divide="ignore"):
        band = np.where(f > 0, f**-1.0, 0)
    band *= np.exp(-((f / (PEAK_FREQ * 2.4)) ** 2)) * (1 - np.exp(-((f / (PEAK_FREQ * 0.35)) ** 2)))
    return np.fft.fft2(white) * band


SPECTRUM = spectrum()


def height_map(size: int) -> np.ndarray:
    """같은 스펙트럼을 0 으로 채워 늘린다 — `@2x`·`@3x` 의 무늬가 같은 그림의 확대다."""
    big = np.zeros((size, size), dtype=complex)
    half = TILE_DP // 2
    small = np.fft.fftshift(SPECTRUM)
    c = size // 2
    big[c - half : c + half, c - half : c + half] = small
    h = np.real(np.fft.ifft2(np.fft.ifftshift(big)))
    return (h - h.mean()) / h.std()


def shade(size: int, scale: int) -> np.ndarray:
    """확산광 세기(0~1). 기울기는 dp 기준으로 재서 배율이 달라도 같은 깊이로 보인다."""
    h = height_map(size)
    dx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) / 2 * scale
    dy = (np.roll(h, -1, axis=0) - np.roll(h, 1, axis=0)) / 2 * scale
    # 화면 좌표(아래가 +y) — SVG feDistantLight 와 같은 방향
    nx, ny, nz = -DEPTH * dx, -DEPTH * dy, np.ones_like(h)
    norm = np.sqrt(nx**2 + ny**2 + nz**2)
    lx = np.cos(LIGHT_AZIMUTH) * np.cos(LIGHT_ELEVATION)
    ly = np.sin(LIGHT_AZIMUTH) * np.cos(LIGHT_ELEVATION)
    lz = np.sin(LIGHT_ELEVATION)
    return np.clip((nx * lx + ny * ly + nz * lz) / norm, 0, 1)


def bake(paper: tuple[int, int, int], light: np.ndarray, grain: np.ndarray) -> Image.Image:
    base = np.array(paper, dtype=float) / 255
    emboss = 1 - EMBOSS_OPACITY + EMBOSS_OPACITY * light
    rgb = base[None, None, :] * emboss[..., None]
    a = (GRAIN_OPACITY * grain)[..., None]
    rgb = rgb * (1 - a) + rgb * GRAIN_INK[None, None, :] * a
    return Image.fromarray(np.clip(rgb * 255 + 0.5, 0, 255).astype(np.uint8), "RGB")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for scale in (1, 2, 3):
        size = TILE_DP * scale
        light = shade(size, scale)
        grain = np.random.default_rng(11 + scale).random((size, size))
        for name, paper in PAPERS.items():
            path = OUT / (f"{name}.png" if scale == 1 else f"{name}@{scale}x.png")
            bake(paper, light, grain).save(path, optimize=True)
            print(path.relative_to(OUT.parent.parent), f"{size}×{size}")


if __name__ == "__main__":
    main()
