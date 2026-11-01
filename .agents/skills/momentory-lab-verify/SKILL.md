---
name: momentory-lab-verify
description: 바뀐 앱 화면을 Expo Lab 으로 전·후 비교한다 — 라우트 × 기기 × 테스트 데이터 × 글씨 크기로 찍고, 화소 차이와 배치 문제(가로 넘침 · 글자 잘림 · 탭바/안전 영역 가림 · 콘솔 오류 · 실패한 요청)를 보고서로 낸다. Lab 시안 반영(momentory-lab-handoff) 뒤 PR 전에, 또는 "이 화면들 확인해줘", "전후 비교해줘", "PR 스크린샷 만들어줘" 요청에 사용한다.
---

# Lab 전·후 비교

몸통은 스크립트 [`expo-lab/scripts/lab-verify.mjs`](../../../expo-lab/scripts/lab-verify.mjs)다(옵션 전부는 그 머리말 · `--help`).
이 스킬은 **어느 서버를 전 · 후로 쓸지 정하고, 돌리고, 결과를 직접 보고, 한국어로 보고하는** 절차다.

## 언제

- `momentory-lab-handoff` 로 값 · 구조를 바꾼 뒤 PR 전 — `expo-lab/HANDOFF.md` 절차 7 「Lab 에서 다시 본다」가 이 스킬이다.
- 사용자가 화면을 짚어 「확인해줘」 · 「전후 비교」 · 「PR 스크린샷」을 요청할 때.
- 하지 않는 것: 상호작용(누르기 · 입력 · 흐름) 검수는 `momentory-screen-qa`, 값 단위 시각 감사는 `momentory-design-audit` 다. 이 스킬은 **처음 열린 화면 한 장**을 본다.

## 절차

1. **범위.** 사용자가 라우트를 말했으면 그것(`--routes /home,/my/nickname` · `tabs` · `all` · 구체 주소 `/diary/12`).
   아니면 `--changed`(기준 `--base main` 대비 커밋 + 커밋 안 한 변경 → `app/**` 라우트 · 거슬러 부르는 화면 · 그림 이름을 부르는 소스).
   먼저 `--dry-run` 으로 몇 장인지 보고, **150장을 넘으면** 기기 · 데이터 세트를 줄일지 사용자에게 묻는다.
2. **서버 정하기 — 전(before)과 후(after)가 각각 어느 코드인지 확실히 한다.** 서버의 코드는 그 서버를 띄운 폴더의 코드다.
   - **8085 는 사용자의 Lab 이다 — 읽기만 한다.** 끄거나 다시 띄우지 않는다. 그 폴더가 main 이고 고친 것이 없으면 「전」으로 쓴다.
     같은 폴더에서 코드를 고쳤으면(핸드오프 브랜치) 8085 는 이미 「후」다 — 「전」은 따로 띄운다.
   - 「후」 = Lab 「AI에게 맡기기」 작업 공간의 미리보기 주소, 또는 고친 폴더에서 `cd <폴더>/expo-lab && npx expo start --web --port 8097`.
   - 「전」이 따로 필요하면 main 을 임시 worktree 로 꺼내(`git worktree add <임시 폴더> main`, `node_modules` 는 저장소의 것을 junction/symlink 로)
     `npx expo start --web --port 8096`. **`node_modules` 는 지우지 않는다**(junction 이면 링크만 푼다).
   - 띄운 뒤 `curl -s -o /dev/null -w "%{http_code}" http://localhost:<포트>/` 가 200 인지 본다. 첫 번들은 30초쯤 걸린다.
3. **돌리기.**

   ```bash
   node expo-lab/scripts/lab-verify.mjs --before http://localhost:8096 --after http://localhost:8097 --changed
   node expo-lab/scripts/lab-verify.mjs --after http://localhost:8100 --routes /home,/my/nickname --devices iphone-se-3,pixel-8
   node expo-lab/scripts/lab-verify.mjs --before http://localhost:8085 --after http://localhost:8097 --routes tabs --datasets normal,long-copy
   ```

   - 기본: 기기 = 가장 작은 iOS · iphone-16 · pixel-8(+ Galaxy 가 표에 있으면) · 데이터 = empty · normal · many · long-copy · 글씨 = 1 · 1.3 ·
     고정 시각 = 오늘 21:30(KST · 전 · 후가 같은 시각). 로그인 전 · 온보딩 화면은 제 프리셋 데이터 하나만 찍는다.
   - Windows Git Bash 에서는 `/home` 이 경로로 바뀌므로 `MSYS_NO_PATHCONV=1` 을 앞에 붙인다(스크립트도 되돌리긴 한다).
   - 결과는 `<OS 임시>/momentory-lab-verify/<시각>/`(`--out` 로 바꾼다) — `report.html` · `report.json` · `pr-screenshots.md` · `before/` `after/` `diff/`.
   - 종료 코드는 스크립트가 깨졌을 때만 0 이 아니다. 문제는 보고서에 있다.

4. **report.json 읽기.** `summary` → 라우트별 최대 `diff.percent` → `issues` 중 `side: "after"` · `existing` 없음 · `severity` 가 `error`/`warn` 인 것(= 이번에 생긴 문제).
   `existing: true` 는 전에도 있던 것, `resolved: true` 는 이번에 사라진 것이다. **바뀌지 않아야 할 라우트에 차이가 있으면** 그것부터 의심한다.
5. **그림을 직접 본다 — 숫자만으로 판정하지 않는다.** Read 로 연다:
   - 라우트마다 차이가 가장 큰 장의 `before/` · `after/` · `diff/`(빨강 = 바뀐 화소, `diff.bounds` = 바뀐 범위),
   - 새 `error`/`warn` 이 있는 장 전부(같은 문제가 기기만 다르면 한두 장),
   - `after/*.end.png`(끝까지 내린 모습 — 아래쪽이 가렸다고 판정된 장에만 생긴다).
     의도한 변경(시안 · 요청)과 의도하지 않은 변경을 나눈다.
6. **보고 — 한국어, 심각도 순.** ① 오류(화면이 뜨지 않음 · 가로 넘침) ② 주의(글자 잘림 · 가림 · 안전 영역 · 요청 실패 · 콘솔 오류) ③ 참고(말줄임 · 웹 전용 경고 · 다른 화면으로 넘어감 · 움직임).
   항목마다 라우트 · 기기 · 데이터 · 글씨 · 「새로 생김 / 전에도」 · 근거 그림 경로를 단다. 끝에 `report.html` · `report.json` · `pr-screenshots.md` 의 **절대 경로**.
   검사는 웹(react-native-web) 배치 기준이고 기기 외형 · 상태바는 그리지 않는다 — **실기기 통과라고 쓰지 않는다.**
7. **고치지 않는다 — 요청 범위 밖은.** 핸드오프 작업 중이면 그 범위 안의 문제만 고치고 다시 돌린다. 범위 밖이면 PR 「미결」로 적거나 사용자에게 묻는다.
   감사 요청만 받았으면 제품 코드를 고치지 않는다.
8. **PR 스크린샷.** `pr-screenshots.md` 를 PR 「스크린샷」 칸에 쓴다. 그림 경로는 로컬이라 GitHub 에서 보이지 않는다 —
   `gh` 로는 PR 본문에 그림을 올릴 수 없으므로 **사용자에게 그림 파일을 PR 편집창에 끌어 넣어 달라고** 하거나, 경로를 둔 채 「로컬 보고서」라고 적는다.
   그림을 저장소에 커밋하지 않는다.
9. **정리.** 이 스킬이 띄운 서버(8096 · 8097 등)를 끄고 임시 worktree 를 지운다(`git worktree remove`). 8085 와 사용자가 띄운 서버는 건드리지 않는다.

## 공유 페이지 — 요청이 있을 때만

사용자가 **「공유 페이지로 올려 줘」처럼 분명히 말했을 때만** 보고서를 artifact 공개 도구(claude-artifacts `publish_files`)로 올린다:
`report.html` 을 `index.html` 로, 보고서가 가리키는 그림(`before/` `after/` `diff/` 중 보고서에 나오는 것)을 같은 상대 경로로.
올린 페이지는 **처음엔 본인만 볼 수 있는 비공개**다 — 링크를 주면서 그렇게 말하고, 다른 사람과 나누는 것은 사용자가 claude.ai 화면에서 정한다고 알린다.
요청이 없으면 올리지 않는다(가짜 서버 데이터뿐이어도 마찬가지). 도구가 없는 환경이면 없다고 말하고 로컬 경로만 준다.

## 검사 항목과 한계

| 종류(kind)                                | 무엇을                                                                          | 한계                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `horizontal-overflow`                     | 문서가 가로로 2px 넘게 넘침(e2e `layout-matrix` 와 같은 식)                     | 넘친 요소는 `offscreen-text` 가 짚는다                                      |
| `text-clipped` · `text-truncated`         | `overflow: hidden` 에 잘린 글자 · 말줄임(numberOfLines)                         | 말줄임은 의도일 수 있어 참고                                                |
| `under-tab-bar` · `covered`               | 끝까지 내려도 탭바 · 떠 있는 독에 덮인 글자/버튼, 고정 배치인데 덮인 것         | 화면 절반 넘는 층(모달 · 시트 · 배경막) 아래는 일부러 가린 것으로 보고 뺀다 |
| `under-top-inset` · `under-bottom-inset`  | 상태바/노치 · 홈 인디케이터 영역에 들어간 글자/버튼                             | 글자 상자는 글꼴 위 여백을 품어 높이의 1/4 까지 봐준다                      |
| `below-screen`                            | 끝까지 내렸는데도 화면 아래에 있는 것(스크롤 없음)                              |                                                                             |
| `request-failed` · `console-error`        | 가짜 서버 4xx/5xx(프리셋이 일부러 실패시킨 것은 뺀다) · 콘솔 오류 · 페이지 오류 | 네이티브 전용 속성 경고는 `console-web-warning`(참고)                       |
| `redirected` · `unstable` · `load-failed` | 가드가 다른 화면으로 보냄 · 연속 두 장이 다름(움직임) · 화면이 안 뜸            | 넘어간 화면은 `routeMeta.ts` 의 `hint` 를 같이 본다                         |

화소 비교는 채널 차이 24 넘는 화소를 센다(글자 가장자리 흔들림은 무시). 두 단계로 여는 화면(`openVia`)은 셸처럼 경유 화면을 연 뒤 옮긴다.

## 예시

`$momentory-lab-verify 방금 반영한 시안 — 바뀐 화면만 main 이랑 비교해줘.`
`$momentory-lab-verify /home 이랑 /my/nickname 을 작은 아이폰 · 픽셀에서 큰 글씨까지 확인해줘.`
