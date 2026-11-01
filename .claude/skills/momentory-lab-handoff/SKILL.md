---
name: momentory-lab-handoff
description: Expo Lab 에서 넘어온 디자인 작업을 앱 코드에 반영한다 — 「AI에게 넘기기」 시안 파일(momentory-handoff-*.json) 반영, Lab 「AI에게 맡기기」 작업 공간에서의 화면 수정, 「새 화면 만들기」. "Lab 시안 반영해줘", "이 시안 코드로 옮겨줘", "새 화면 만들어줘(Lab)" 요청에 사용한다.
---

# Lab 시안 반영

정본은 [`expo-lab/HANDOFF.md`](../../../expo-lab/HANDOFF.md)다. 시작할 때 그 문서를 읽고 「AI 의 절차」 1~8 을 그대로 따른다. 이 파일은 요약이다.

## 순서

1. **파일 찾기** — 사용자가 경로를 주지 않으면 `~/Downloads` 에서 가장 최근 `momentory-handoff-*.json` 을 쓰고, 어느 파일인지 먼저 말한다. `dataUrl` 은 크므로 파일 전체를 출력하지 않는다.
2. **요약 · 확인** — 시안 이름, 값 전 → 후, 화면별 메모, 참고 이미지 유무. 값으로 안 되는 요청은 「코드 작업이 필요한 것」으로 따로 묶는다.
3. **브랜치** — main 이면 먼저 `design/<시안이름>` 브랜치.
4. **값 반영** — `npm run design:apply-tokens -- <파일>`(diff) → `--write`, `npm run design:apply -- <파일>` → `--write`. 거절된 키는 원래 정의(계산식 · 원본 토큰)를 찾아 손으로 고친다.
5. **구조 차이** — 참고 이미지 · 메모를 근거로 화면 코드를 고친다. `CLAUDE.md` 규칙(DESIGN.md 우선 · hex 는 `src/design/ds` 에만 · 선택 상태를 색만으로 표시 금지 · 오류는 한 줄 · 숫자 압박 금지)이 시안보다 우선이다. 부딪히면 고치지 말고 묻는다.
6. **정본 갱신** — 토큰 값이 바뀌면 `docs/DESIGN.md` 도 고친다. 대비 보정 자리를 건드리면 `PLAN.md` A-5 표도.
   6-1. **검수 스킬** — 새 화면 · 문구가 바뀌었으면 `momentory-ux-writing`, 색 · 글자 · 간격 · 배치가 바뀌었으면 `momentory-design-audit` 를 바뀐 범위에만 돌린다(HANDOFF.md 「함께 돌리는 검수 스킬」).
7. **검사** — `typecheck` · `lint` · `format:check` · `test`(대비 테스트 포함). 대비가 깨지면 후보를 들고 되묻는다.
8. **Lab 확인** — `npm run lab:web`(포트 8085), 바뀐 화면을 A(승인본)로 열어 참고 이미지와 겹쳐 확인하고 스크린샷을 남긴다.
9. **PR** — 템플릿대로, 값 전 → 후 표 · Lab 확인 주소 · 전후 스크린샷. **머지는 사용자 승인 뒤에만.**

## Lab 작업 공간에서 돌 때 · 새 화면

Lab 「AI에게 맡기기」로 불렸으면 HANDOFF.md 「Lab 에서 바로 맡길 때」를 따른다 — 질문 대신 요약 출력, 브랜치는 이미 있음, **커밋 · push · PR 하지 않고** `COMMIT_MESSAGE:` · `PR_BODY:` 블록을 끝에 낸다. 「새 화면 만들기」면 HANDOFF.md 「새 화면 만들기」 1~6(자리 · 공용 부품 · 가짜 서버 임시 응답 + 필요한 API 표 · `lab:routes` + routeMeta · PRODUCT.md/CLAUDE.md 한 줄 · 테스트)을 더한다.

## 예시

`/momentory-lab-handoff 다운로드 폴더의 최신 핸드오프 파일 반영해줘.`
