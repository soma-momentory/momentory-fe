# 감정 스티커 — 보관함 달력 칸의 얼굴 10종

`src/components/ds/EmotionSticker.tsx` 가 이 열 장을 감정 id 로 고른다.
파일 이름은 **서버 감정 키**(`features/retro/model/retro.ts` 의 `EMOTION_KEYS`)와 같다 —
`happy` `proud` `calm` `tired` `stuck` `lethargic` `anxious` `depressed` `angry` `frustrated`.

- 132×132 (44pt @3x) · 투명 배경 · 정사각. 여백을 잘라 낸 앱용이다.
- **원본은 디자이너 그림 열 장**(2026-09-07 반입). 받은 파일은 투명 미리보기를 그대로
  찍은 것이라 **알파가 전부 불투명**했고 배경 자리에 체커 무늬와 워터마크 획이 RGB 로
  들어 있었다 — [`scripts/keyout-emotion-stickers.py`](../../scripts/keyout-emotion-stickers.py)
  가 그 배경을 걷어 내고 잘라 이 열 장을 만들었다.
  ⚠ **색으로 지우지 않는다**: 「피곤함」의 머리는 `(222,220,220)` 이라 체커의 회색과
  사실상 같은 색이라서, 무늬(국소 명도 폭)로 갈라야 얼굴이 함께 지워지지 않는다.
  또 「피곤함」은 **두 귀가 머리와 떨어져 있어** 가장 큰 덩어리 하나만 남기면 귀가 사라진다.
- 더 좋은 원본(투명 PNG 진본)이 오면 **같은 이름·같은 규격으로 덮어쓰면 코드는 손대지
  않아도 된다.** 그때 위 스크립트는 필요 없다.
- **그림이 든 색은 코드가 다시 정하지 않는다**(`DESIGN.md` 「쉼터」의 카피바라와 같은
  판단) — 화면은 tint 하지 않고 받은 색 그대로 그린다.
