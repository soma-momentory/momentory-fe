"""「온천에 몸을 담근 카피바라」 장면 한 장에서 일기 저장 완료 화면(`C7`)이 쓰는
`assets/retro/capybara-onsen.png` 를 **동그랗게** 잘라 만든다.

원본은 받은 장면 그림이다(2026-10-03 · 사용자 반입 · 1478 × 1064 · 알파 없음).
같은 날 세 번 잡았다(사용자 요청): 얼굴만 원으로 → 배경이 보이게 4:3 네모로 → **다시 원으로,
대신 배경이 잘 보이게 넓게.** 카피바라 머리는 원의 가운데 조금 아래에 두고, 그 위로 수풀과
하늘 한 조각 · 양옆으로 바위와 김 · 아래로 물결이 원을 채운다 — 얼굴만 있으면 「누구」이고,
배경이 보여야 「온천에서 쉬는」 장면이 되어 아래 「쉼터로 가기」와 이어진다.

- 원 밖만 투명이다. 원 안은 장면 그대로라 코드는 바탕을 칠하지 않는다(`RetroOnsen.tsx`).
- `CENTER` · `RADIUS` 는 원본 1478 × 1064 의 좌표다. 원본 크기가 다르면 다시 잡는다.

    python3 scripts/make-retro-onsen.py <원본 그림> [assets/retro/capybara-onsen.png]
"""

import sys

from PIL import Image, ImageDraw

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else "assets/retro/capybara-onsen.png"

# 원의 중심과 반지름 — 원본 좌표. 지름 940 이라 원본 높이(1064)의 거의 전부를 쓴다
CENTER = (738, 520)
RADIUS = 470

# 화면에서 140dp @3x — 잘라 낸 940px 에서 줄이기만 한다
SIZE = 420

im = Image.open(SRC).convert("RGBA")
cx, cy = CENTER
scene = im.crop((cx - RADIUS, cy - RADIUS, cx + RADIUS, cy + RADIUS))

# 원 밖을 투명으로 — 가장자리 계단이 생기지 않게 4배로 그린 원을 줄여 마스크로 쓴다
scale = 4
big = Image.new("L", (scene.width * scale, scene.height * scale), 0)
ImageDraw.Draw(big).ellipse((0, 0, big.width - 1, big.height - 1), fill=255)
scene.putalpha(big.resize(scene.size, Image.LANCZOS))

scene.resize((SIZE, SIZE), Image.LANCZOS).save(OUT, optimize=True)
print(f"{OUT} {SIZE}x{SIZE}")
