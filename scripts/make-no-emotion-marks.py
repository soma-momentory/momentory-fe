"""「감정 없이 끝난 일기」의 자리 그림 두 장을 앱 규격으로 만든다.

일기는 썼는데 감정이 추출되지 않은 날에 선다(2026-09-11 · 사용자 반입).

- `assets/emotion/no-emotion.png` — 보관함 달력의 **빈 얼굴**(선으로만 그린 카피바라).
  얼굴 스티커 열 장과 같은 132×132 · 여백 3%.
- `assets/emotion-pebble/no-emotion.png` — 홈·리포트 「이번 주 감정」의 **빈 조약돌**
  (테두리만 있는 조약돌). 조약돌 열 장과 같은 96×96 이되 **여백은 5%** 다 — 조약돌 칸은
  원으로 잘리는데(`EmotionPebble` 의 `borderRadius`), 테두리만 있는 그림은 2% 여백이면
  오른쪽 아래 선이 원 밖으로 나가 끊긴다(칠한 조약돌은 번진 가장자리라 티가 안 났다).

받은 파일은 **진짜 투명 PNG** 라 체커를 걷어 낼 일이 없다(`keyout-*` 스크립트와 다른 점).
다만 두 가지를 손본다:

- ⚠ **알파 16 이하의 옅은 부스러기를 버린다.** 선에서 멀리 떨어진 곳에 거의 안 보이는 화소가
  흩어져 있어, 그대로 자르면 여백이 넓게 잡혀 그림이 작아진다.
- ⚠ **선을 굵힌다.** 원본 선은 캔버스 폭의 1~1.6% 라 화면 크기(달력 22~37dp · 주간 줄 26dp)로
  줄이면 0.3~0.6dp 가 되어 거의 사라진다. 원본 해상도에서 알파를 **팽창**시켜 선 가운데를 지킨 채
  두께만 늘리고, 색은 원본 선 색 하나로 다시 칠한다(선화라 색이 하나다).

    python3 scripts/make-no-emotion-marks.py [원본 얼굴] [원본 조약돌]
"""

from PIL import Image, ImageFilter
import numpy as np
import sys

DOWNLOADS = "/Users/geun/Downloads"
FACE_SRC = sys.argv[1] if len(sys.argv) > 1 else f"{DOWNLOADS}/ChatGPT Image 2026년 9월 11일 오후 11_47_21.png"
PEBBLE_SRC = sys.argv[2] if len(sys.argv) > 2 else f"{DOWNLOADS}/ChatGPT Image 2026년 9월 11일 오후 11_51_48.png"

# (원본, 출력, 한 변, 여백, 원본 해상도에서 선을 바깥·안쪽으로 늘릴 반경 px)
JOBS = [
    (FACE_SRC, "assets/emotion/no-emotion.png", 132, 0.03, 5),
    (PEBBLE_SRC, "assets/emotion-pebble/no-emotion.png", 96, 0.05, 13),
]


def make(src, size, pad, grow):
    im = Image.open(src).convert("RGBA")
    rgba = np.array(im)
    alpha = rgba[..., 3].copy()
    alpha[alpha <= 16] = 0

    # 선 색 — 완전히 불투명한 화소들의 중앙값(선화라 한 색이다)
    color = np.median(rgba[alpha == 255][:, :3], axis=0).astype(np.uint8)

    mask = Image.fromarray(alpha)
    if grow > 0:
        mask = mask.filter(ImageFilter.MaxFilter(grow * 2 + 1))

    out = np.zeros_like(rgba)
    out[..., :3] = color
    out[..., 3] = np.array(mask)
    art = Image.fromarray(out)
    art = art.crop(mask.point(lambda v: 255 if v > 16 else 0).getbbox())

    side = int(max(art.size) * (1 + pad * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(art, ((side - art.width) // 2, (side - art.height) // 2), art)
    return canvas.resize((size, size), Image.LANCZOS), tuple(color)


for src, dst, size, pad, grow in JOBS:
    image, color = make(src, size, pad, grow)
    image.save(dst)
    print(f"{dst}: {size}x{size} · 선 색 {color} · 굵힘 {grow}px")
