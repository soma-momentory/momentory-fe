---
name: momentory-lab-handoff
description: Expo Lab 「AI에게 맡기기」로 넘어온 화면 작업을 앱 코드에 반영한다 — 작업 공간에서의 화면 수정(지시 + 참고 그림 · 앱에 넣을 그림 첨부)과 「새 화면 만들기」. "Lab 에서 맡긴 수정 반영해줘", "이 그림처럼 화면 고쳐줘(Lab)", "새 화면 만들어줘(Lab)" 요청에 사용한다.
---

# Lab 화면 작업 반영

정본은 [`expo-lab/HANDOFF.md`](../../../expo-lab/HANDOFF.md)다. 시작할 때 그 문서를 읽고 「AI 의 절차」 1~7 을 그대로 따른다. 이 파일은 요약이다.
Lab 의 디자인 편집 · 시안 · 「AI에게 넘기기」 파일(`momentory-handoff-*.json`) · `design:apply*` 스크립트는 2026-11-02 에 지웠다 — 그런 파일을 찾지 않는다.

## 순서

1. **요약 · 확인** — 지시 · 화면(라우트 · 파일) · 첨부(참고용 / 앱에 넣기), 바꿀 값과 바꿀 구조. 값으로 안 되는 요청은 「코드 작업이 필요한 것」으로 따로 묶는다.
2. **브랜치** — main 이면 먼저 `design/<짧은 이름>` 브랜치.
3. **고치기** — 값은 정의된 자리(`src/design/ds/` · `src/design/studioApproved.json` · `src/design/tabBackgrounds.ts`)에서, 계산되는 값은 원래 정의에서. 구조는 참고 그림 · 지시를 근거로 화면 코드에서. `CLAUDE.md` 규칙(DESIGN.md 우선 · hex 는 `src/design/ds` 에만 · 선택 상태를 색만으로 표시 금지 · 오류는 한 줄 · 숫자 압박 금지)이 지시보다 우선이다. 부딪히면 고치지 말고 묻는다.
4. **정본 갱신** — 토큰 값이 바뀌면 `docs/DESIGN.md` 도 고친다. 대비 보정 자리를 건드리면 `PLAN.md` A-5 표도.
   4-1. **검수 스킬** — 새 화면 · 문구가 바뀌었으면 `momentory-ux-writing`, 색 · 글자 · 간격 · 배치가 바뀌었으면 `momentory-design-audit` 를 바뀐 범위에만 돌린다(HANDOFF.md 「함께 돌리는 검수 스킬」).
5. **검사** — `typecheck` · `lint` · `format:check` · `test`(대비 테스트 포함). 대비가 깨지면 후보를 들고 되묻는다.
6. **Lab 확인** — /momentory-lab-verify 로 바뀐 화면을 전 · 후 비교한다(기기 · 화면 상태 · 글씨 크기, `npm run lab:verify -- …`). 보고서의 주요 장면은 직접 열어 본다. 참고 그림이 있으면 나란히 놓고 견준다.
7. **PR** — 템플릿대로, 값 전 → 후 표 · Lab 확인 주소 · 전후 스크린샷(lab-verify 의 `pr-screenshots.md`). **머지는 사용자 승인 뒤에만.**

## Lab 작업 공간에서 돌 때 · 새 화면

Lab 「AI에게 맡기기」로 불렸으면 HANDOFF.md 「Lab 에서 바로 맡길 때」를 따른다 — 질문 대신 요약 출력, 브랜치는 이미 있음, Lab 확인은 사용자가 미리보기에서, **커밋 · push · PR 하지 않고** `COMMIT_MESSAGE:` · `PR_BODY:` 블록을 끝에 낸다. 「새 화면 만들기」면 HANDOFF.md 「새 화면 만들기」 1~6(자리 · 공용 부품 · 가짜 서버 임시 응답 + 필요한 API 표 · `lab:routes` + routeMeta · PRODUCT.md/CLAUDE.md 한 줄 · 테스트)을 더한다. 첨부 그림은 HANDOFF.md 「이미지 넣기」대로.

## 예시

`/momentory-lab-handoff 홈 카드 간격을 첨부한 그림처럼 넓혀줘.`
