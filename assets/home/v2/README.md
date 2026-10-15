# 홈 v2 자산

홈 v2(`src/features/home/ui/v2/`)가 그리는 그림이다 — 계획
[`docs/redesign/HOME_V2_ROLLOUT_PLAN.md`](../../../docs/redesign/HOME_V2_ROLLOUT_PLAN.md) §2.5 · P1.
⚠ 운영 홈(`app/(tabs)/home.tsx`)은 **아직 옛 화면**이라(P3 전) 앱에서 이 그림을 그리는 화면은 없다 —
Expo Lab 의 「운영판 v2」 변형이 같은 파일을 그린다.

## `baba/` — 레이어 카피바라 9장 (2026-10-15 승격)

| 순서(아래 → 위) | 파일               |
| --------------- | ------------------ |
| 1               | `base-tail.webp`   |
| 2               | `base-body.webp`   |
| 3               | `base-feet.webp`   |
| 4               | `base-arms.webp`   |
| 5               | `base-muzzle.webp` |
| 6               | `base-mouth.webp`  |
| 7               | `base-cheeks.webp` |
| 8               | `base-eyes.webp`   |
| 9               | `base-ears.webp`   |

- 같은 캔버스(170 × 227 자리 · `contain`)에 **위 순서로 겹쳐** 한 마리가 된다 — `ui/v2/Baba.tsx` 의
  `LAYERS` 배열이 이 표와 같은 순서다. 아홉 장 합계 약 155KB.
- **출처**: Claude Design `design-imports/claude-home/홈화면 시안 3개 검토/Baba.dc.html`
  (v2 시안 `홈화면 시안 v2.dc.html` 이 부르는 컴포넌트). Lab 사본 `expo-lab/assets/claude-home/baba/` 를
  그대로 복사했다 — Lab 원본은 「시안 원본」 변형이 계속 쓰므로 지우지 않는다.
- ⚠ **`base-ears-front.webp` 는 옮기지 않았다.** 원본 `Baba.dc.html` 에서 이 장은 **모자
  (`hat-beanie-2.webp`) 를 씌울 때만** 그 위에 다시 얹는 귀다(`<sc-if value="{{ beanie2 }}">` 안).
  홈 v2 는 모자를 쓰지 않으므로 쓰지 않는다. 모자가 들어오면 그때 함께 승격한다.
- **장식이다** — 낭독기에서 숨고 손짓을 받지 않는다. **손짓(팔 든 장 · 감은 눈)은 아직 없다** —
  `DESIGN.md` 「손짓은 그림이 하고 코드는 갈아 끼우기만」에 따라 코드로 흉내 내지 않는다(§2.5).

## 날씨 그림은 아직 없다

v2 의 날씨 스티커 6장(`expo-lab/assets/claude-home/weather/*.png` · 9.2MB)은 **P4 에서 조건별로
늘리고 최적화한 뒤** `weather/` 로 승격한다(결정 D4). 그전까지 홈 v2 는 날씨 자리를 그리지 않는다.
