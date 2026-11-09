"""Downloads 의 **모래 언덕** 한 장에서 흰 배경을 걷어 내고, 리포트의 「땅」을 만든다.

받은 파일은 흰 바탕에 언덕 두 겹을 칠한 그림이라(알파 없음) 배경이 그대로 흰 면이다.
카피바라·감정 스티커처럼 체커 무늬를 가릴 일은 없어서 **흰색 하나만 지우면 된다**
(옛 `keyout-home-capybara.py` — 2026-11-09 삭제 — 는 훨씬 복잡한 사정이었다).

가르는 기준은 **흰색에서 얼마나 멀어졌는가** 하나다. 언덕 두 색은 가장 어두운 채널이
각각 154·192 라 흰색(255)과 넉넉히 떨어져 있다. 경계의 안티에일리어싱 픽셀은 그 사이
값이라 **알파를 0~1 로 부드럽게** 주고, 흰색이 섞여 있던 만큼을 되돌려(역프리멀티플라이)
색을 원래대로 편다 — 그러지 않으면 가장자리에 흰 테가 남아 카드 면 위에서 빛나 보인다.

⚠ **흰 바탕이 순백이 아니다.** 받은 그림의 배경에는 231~254 를 오가는 옅은 잡티가 깔려 있어
「흰색보다 조금이라도 어두우면 언덕」으로 가르면 **화면 전체가 언덕이 된다**(알파 10~21 이
고르게 깔려 자르는 상자가 원본 크기 그대로였다). 그래서 문턱(`FLOOR`)을 두어 그 잡티를
통째로 배경으로 눕힌다 — 가장 옅은 언덕색도 흰색에서 63 이나 떨어져 있어 여유가 있다.

마지막으로 언덕이 실제로 있는 자리만 남기고 자른다 — 위쪽 빈 하늘과 바닥 아래 여백은
화면에서 높이만 잡아먹는다.

    python3 scripts/keyout-report-ground.py ~/Downloads/<받은 그림>.png assets/report
"""

import sys
from pathlib import Path

import numpy as np
from PIL import Image

# 배경의 잡티를 눕히는 문턱 — 흰색에서 이만큼 안쪽은 전부 배경이다(위 머리말 ⚠)
FLOOR = 30.0

# 그 위로 알파가 1 이 될 때까지의 폭 — 경계의 안티에일리어싱 몇 px 가 이 사이에 든다
EDGE = 24.0


def keyout(src: Path, out_dir: Path) -> Path:
    rgb = np.asarray(Image.open(src).convert("RGB"), dtype=np.float32)

    # 흰색에서 얼마나 멀어졌나 — 가장 어두운 채널 하나로 잰다(언덕 두 색 다 이 값이 뚜렷하다)
    distance = 255.0 - rgb.min(axis=2)
    alpha = np.clip((distance - FLOOR) / EDGE, 0.0, 1.0)

    # 역프리멀티플라이 — 섞여 있던 흰색을 빼야 가장자리에 흰 테가 남지 않는다
    safe = np.maximum(alpha, 1e-4)[..., None]
    color = np.clip((rgb - 255.0 * (1.0 - safe)) / safe, 0, 255)

    rgba = np.dstack([color, alpha * 255.0]).astype(np.uint8)

    # 언덕이 있는 자리만 남긴다
    rows = np.where(alpha.max(axis=1) > 0.02)[0]
    cols = np.where(alpha.max(axis=0) > 0.02)[0]
    cropped = rgba[rows[0] : rows[-1] + 1, cols[0] : cols[-1] + 1]

    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / "ground.png"
    Image.fromarray(cropped, mode="RGBA").save(out)
    print(f"{out} — {cropped.shape[1]}×{cropped.shape[0]} (가로세로비 {cropped.shape[1] / cropped.shape[0]:.2f})")
    return out


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    keyout(Path(sys.argv[1]).expanduser(), Path(sys.argv[2]))
