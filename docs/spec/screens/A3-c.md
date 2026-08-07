<!--
⚠ 반입 스냅샷 — 직접 고치지 말 것. 재반입 절차: docs/spec/SNAPSHOT.md
@generated-from momentory@b850920 (09_MVP/docs/A3-c.md)
@generated-sha256 c23d15c0c5694e36d4ed2f58e0193406f7b9967bcd5dde4e4f7a479a6520be7f
-->
<!-- ─── 여기부터 상류 원본 ─── -->
---
layer: canonical
owner: 파이프라인
generated: null
---

# A3-c · 일기 상세 · 행동을 해본 뒤

**완료하면 버튼이 채워진 상태 + 해본 날짜로 바뀌고 느낀 점 한 줄이 자리에 들어온다.** 빈 줄로 미리 열어두지 않는다 — 쓰지 않은 칸이 먼저 보이면 안 한 일이 된다.

## 상태

| 상태 | 화면 |
|---|---|
| `A3-c` | `.dobtnOn` "✓ 해봤어요 · 7월 28일" · 느낀 점 한 줄 · 각주 |

- 느낀 점 "세 문장으로 줄이니 오히려 말이 덜 막혔다."
- 각주 "7월 27일 회고에서 만들어졌어요"

## 규칙

- 이 한 줄은 **다음 회고에서 같은 상황이 나올 때 바바가 사용자가 실제로 해본 것으로 꺼낼 수 있는 유일한 근거**다.
- **실행 횟수·연속 일수를 세지 않는다.** 한 번의 기록이다.
- 되돌리려면 확인을 묻는다 — 완료 기록과 느낀 점이 함께 사라진다.
- 느낀 점은 **선택**이다. 버튼만 누르고 비워 둬도 완료다.
- `ActionCard.done` / `doneAt` / `reflection` 세 필드가 이 화면의 전부다.

## 컴포넌트

`scr` `nav` `ir7` `epill` `seg` `card` `dprev` `hint` `sec` `acrow` `ack` `bd13f` `sep` `dobtn` `dobtnOn` `icoi` `ghost`

## 계측

- `arch_view`
