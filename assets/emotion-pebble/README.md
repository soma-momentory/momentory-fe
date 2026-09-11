# 감정 조약돌 — 「이번 주 감정」의 하루 한 장 10종

[`src/components/ds/EmotionPebble.tsx`](../../src/components/ds/EmotionPebble.tsx) 가 이 열 장을
감정 id 로 고른다. 쓰는 곳은 **홈의 주간 줄**(`WeekEmotionStrip`)과 **리포트의 7일
흐름**(`WeekMoodRow`) 둘뿐이다.

파일 이름은 **서버 감정 키**(`features/retro/model/retro.ts` 의 `EMOTION_KEYS`)와 같다 —
`happy` `proud` `calm` `tired` `stuck` `lethargic` `anxious` `depressed` `angry` `frustrated`.
[`assets/emotion/`](../emotion/README.md) 의 얼굴 스티커와 **이름이 같고 자리가 다르다**:
저기는 보관함 달력의 얼굴, 여기는 주간 줄의 조약돌이다.

- 96×96 (26dp @3x 를 넘기고 여유를 둔 값) · 투명 배경 · 정사각. 조약돌은 정원이 아니라 **모양이 조금씩 달라서**, 일곱 개가 나란히 서도 도장 찍은 것처럼 보이지 않는다.
- **원본은 받은 그림 열 장**(2026-09-11 · 사용자 반입 · `*_3.png`). 얼굴 스티커와 같은
  사정으로 **알파가 전부 불투명**했고 배경 자리에 체커 무늬가 RGB 로 들어 있었다 —
  [`scripts/keyout-week-emotion-pebbles.py`](../../scripts/keyout-week-emotion-pebbles.py)
  가 그 배경을 걷어 내고 잘라 이 열 장을 만든다.
- ⚠ **가장자리를 깎지 않는다.** 조약돌은 수채라 테두리가 부드러운데 한 겹을 깎으면 그 결이
  각진다. 알파만 흐려서 번짐을 남긴다(얼굴 스티커는 테두리가 또렷해 깎는 편이 깔끔했다 —
  같은 파이프라인이지만 이 한 줄이 다르다).
- ⚠ **워터마크 부스러기를 뗀다.** 스톡 워터마크의 획이 조약돌에 닿아 있으면 같은 덩어리로
  묶여 테두리에 점처럼 남는다. 마스크를 한 번 열고(erode→dilate) 다시 가장 큰 덩어리만
  취하면 가느다랗게 붙은 것이 떨어져 나간다.
- **그림이 든 색은 코드가 다시 정하지 않는다** — tint 하지 않고 받은 색 그대로 그린다.
  그래서 **감정 원색 토큰(`emotion[id]`)과 이 그림의 색은 서로 다른 것**이고, 주간 줄은
  더 이상 그 토큰을 보지 않는다.

더 좋은 원본이 오면 **같은 이름·같은 규격으로 덮어쓰면 코드는 손대지 않아도 된다.**
