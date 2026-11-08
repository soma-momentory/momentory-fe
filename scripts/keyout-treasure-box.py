"""오늘의 보물함의 생성 그림 두 장을 앱 자산으로 만든다 (2026-10-05).

`assets/treasure-box/source/`(이력에 담지 않는다)의 두 장을 읽는다 — ChatGPT 로 생성했고,
보물함은 순수 초록(#00FF00) 위에 그렸다. 걷어 내기와 상자에 맞추기는 걱정상자와 같아서
그 스크립트의 `keyout` · `place` 를 그대로 빌린다(`keyout-worry-box.py`).

| 원본          | 무엇                                   | 만드는 것                          |
| ------------- | -------------------------------------- | ---------------------------------- |
| `meadow.webp` | 노을빛 풀밭 · 큰 나무                  | `meadow.webp`                      |
| `chest.webp`  | 열린 보물함 뒤판 · 앞판 · 닫힌 보물함  | `chest-{back,front,closed}.webp`   |

카피바라는 새로 그리지 않는다 — 걱정상자 포즈(앉기 · 쪽지 들기 · 넣기 · 쉬기)를 그대로 쓴다.

보물함 셋은 **바닥과 가로 가운데**를 맞춘다. 앞판이 뒤판의 아랫부분을 정확히 덮어, 카드가
그 사이로 내려가면 보물함 안에 들어간 것으로 보인다.

⚠ 2026-11-08 — `meadow.webp` 는 납작한 카툰 그림(ai-gateway `gemini-2.5-flash-image`)으로 바꿔 자산에 바로 넣었다.
이 스크립트를 다시 돌리면 옛 풀밭으로 돌아간다 — 원본을 새 그림으로 바꾼 뒤에 돌린다.

다시 만들 때: `python3 scripts/keyout-treasure-box.py` (Pillow · numpy 필요). 빌드에 끼지 않는다.
"""

import importlib.util
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent / "assets" / "treasure-box"
SRC = ROOT / "source"

_spec = importlib.util.spec_from_file_location("worry", HERE / "keyout-worry-box.py")
worry = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(worry)

# 상자 크기(가로 × 세로) — 가장 넓은 · 가장 높은 것(뚜껑이 선 뒤판)을 여유 있게 담는다
CHEST_BOX = (460, 480)


def main() -> None:
    Image.open(SRC / "meadow.webp").convert("RGB").save(ROOT / "meadow.webp", quality=86)

    chest = worry.keyout("chest", SRC)
    for name, (x0, x1) in {"back": (0, 530), "front": (530, 1015), "closed": (1015, 1536)}.items():
        box = worry.place(chest[:, x0:x1], CHEST_BOX, center_on_feet=False)
        Image.fromarray(box).save(ROOT / f"chest-{name}.webp", quality=90)


if __name__ == "__main__":
    main()
