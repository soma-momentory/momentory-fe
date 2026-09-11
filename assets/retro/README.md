# 회고 대화 화면의 그림

## `baba-beanbag.png` — 왼쪽 아래에 앉은 바바

[`src/features/retro/ui/RetroBaba.tsx`](../../src/features/retro/ui/RetroBaba.tsx) 가
`app/retro/talk.tsx` 의 `ChatScaffold` `companion` 으로 화면 왼쪽 아래에 고정해 세운다(260dp · 150 → 300 → 260 으로 맞췄다).

- 900 × 818(300dp @3x 까지 선명하다) · 투명 배경 · 그림 상자에 딱 맞게 잘랐다
- **원본은 사용자가 준 투명 PNG**(2026-09-11 · `…03_40_57-Photoroom.png` · 1225 × 1284). 처음 받은 흰 배경
  원본에서 **사용자가 Photoroom 으로 배경을 걷어 낸 것**이고, 같은 날 「이거 그대로」로 갈아 끼웠다.
  [`scripts/keyout-retro-baba.py`](../../scripts/keyout-retro-baba.py) 는 이 원본의 배경을 건드리지 않고,
  그림 바깥에 흩어진 **알파 8 미만 잔여**만 지운 뒤 자르고 줄인다(잔여를 두면 그림 상자가 캔버스 끝까지 커진다).
  - 그전에는 흰 배경 원본을 스크립트가 직접 걷어 냈다(가장자리에서 이어진 흰 칸 + 윤곽선 바깥 2px 섞임을
    알파로 되돌림). 알파 없는 원본을 주면 스크립트가 여전히 그 길로 간다.
- **색을 다시 칠하지 않는다** — 받은 색 그대로다.

원본이 다시 오면 스크립트로 **같은 이름에 덮어쓰면 된다.** 비율이 바뀌면
`RetroBaba` 의 `ASPECT` 를 함께 고친다.
