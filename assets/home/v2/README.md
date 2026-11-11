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
- **출처**: Claude Design `Baba.dc.html`(`design-imports/` 는 2026-11-05 에 지웠다 — 원본은 깃 기록 `9bbe605`)
  (v2 시안 `홈화면 시안 v2.dc.html` 이 부르는 컴포넌트). Lab 사본 `expo-lab/assets/claude-home/baba/` 를
  그대로 복사했다. Lab 사본과 「시안 원본」 변형은 2026-11-02 Expo Lab 전 화면 전환 때 지웠다(이 폴더가 이제 유일한 사본이다).
- ⚠ **`base-ears-front.webp` 는 옮기지 않았다.** 원본 `Baba.dc.html` 에서 이 장은 **모자
  (`hat-beanie-2.webp`) 를 씌울 때만** 그 위에 다시 얹는 귀다(`<sc-if value="{{ beanie2 }}">` 안).
  홈 v2 는 모자를 쓰지 않으므로 쓰지 않는다. 모자가 들어오면 그때 함께 승격한다.
- **장식이다** — 낭독기에서 숨고 손짓을 받지 않는다. **손짓(팔 든 장 · 감은 눈)은 아직 없다** —
  `DESIGN.md` 「손짓은 그림이 하고 코드는 갈아 끼우기만」에 따라 코드로 흉내 내지 않는다(§2.5).

## `baba-composite.png` — 온보딩용 한 장 바바 (2026-10-25)

위 9장을 같은 순서로 **미리 합치고 투명 여백을 잘라** 436 × 600 PNG 한 장으로 만든 것이다(ffmpeg overlay → crop
826×1138+185+218 → scale). 온보딩(`components/onboarding/OnboardingParts` 의 `Baba`)이 쓴다 — 레이어 9장을 그대로
겹치면 장마다 따로 풀려서 화면이 바뀔 때마다 몸통부터 차례로 보였다. 레이어 그림이 바뀌면 이 장도 다시 만든다.

## `weather/` — 날씨 스티커 6장 (P4 자산 준비)

`/Users/kjh/Momentory/wheather-png` 의 `-1`~`-6` 투명 PNG를 500×500에서 246×246으로 줄였다.
원본은 수정하지 않았다. 여섯 장 모두 RGBA이며 투명 배경을 유지한다.

| 원본 번호 | 앱 파일       | 그림           |
| --------- | ------------- | -------------- |
| 1         | `sunny.png`   | 해와 작은 구름 |
| 2         | `cloudy.png`  | 구름           |
| 3         | `rainy.png`   | 비             |
| 4         | `snowy.png`   | 눈             |
| 5         | `thunder.png` | 비와 천둥      |
| 6         | `windy.png`   | 바람           |

`src/features/home/ui/v2/weatherStickers.ts`가 정적 `require`와 낮·밤 대응을 소유한다.
밤 맑음과 아직 그림이 없는 상태는 `null`을 반환한다.
`cloudy.png`는 구름 상태에만 쓴다.

### `default.webp` — 날씨를 못 받았을 때의 사진 (2026-11-11)

홈의 사진 틀은 날씨를 못 받아도(권한 없음 · 조회 실패 · 그림이 없는 조건 · 받는 중) 늘 붙어 있고, 그때 이
사진을 넣는다. 사용자가 고른 그림 — 하늘 · 풀숲 앞에서 바바의 손이 꽃다발을 든 장면(1254×1254 원본을
300×300 WebP 로 줄였다 · 2026-11-11). 다른 사진으로 바꾸려면 **이 파일만** 갈아 끼운다(정사각형 · 틀이 `cover` 로 자른다).
