# Codex 자동 리뷰 게이트

Claude Code 가 **구현자**, Codex CLI 가 **독립 리뷰어**다.
Claude 가 턴을 끝내려 할 때 `Stop` 훅이 걸려서 현재 워킹 트리를 검증하고, Codex 에게 리뷰를 맡긴다.

```
Claude 구현
   ↓
Stop 훅  ──▶ 변경 없음 ────────────────────────────────▶ 종료 허용
   ↓ 변경 있음
typecheck → lint → test        (코드 파일이 바뀐 경우에만)
   ↓ 실패 → 종료 block, 출력 전달 → Claude 수정 → 다시 종료 시도
   ↓ 통과
Codex read-only 리뷰
   ↓ 인프라 문제(미설치·미인증·타임아웃·JSON 깨짐) → skip → 종료 허용
   ↓ verdict = pass ─────────────────────────────────▶ 종료 허용
   ↓ verdict = fail
findings 를 붙여 종료 block → Claude 수정 → 재검증 → 재리뷰 → PASS 시 종료
```

**Codex 는 절대 구현하지 않는다.** `--sandbox read-only` 로만 돌고, 산출물은 판정 JSON 하나뿐이다.
(read-only 로 파일 생성을 시켜 보고 차단되는 것을 확인했다.)

## 파일

| 파일                       | 무엇                                                             |
| -------------------------- | ---------------------------------------------------------------- |
| `../settings.json`         | `Stop` 훅 등록 (프로젝트 설정 — 커밋한다)                        |
| `codex-review.mjs`         | 훅 본체                                                          |
| `codex-review-prompt.md`   | 리뷰 프롬프트 — **검토 항목·판정 기준을 고치려면 여기를 고친다** |
| `codex-review-schema.json` | Codex 의 최종 응답 JSON Schema (`codex exec --output-schema`)    |
| `codex-review.config.json` | 타임아웃·게이트·제외 경로 등 조절값                              |

상태(리뷰한 diff 해시, block 횟수)와 실행 로그는 **OS 임시 디렉터리**에 쌓인다 —
`%TEMP%/claude-codex-review/<프로젝트>-<해시>/`. 저장소에는 아무것도 쓰지 않는다.

## 실제로 도는 명령

```
codex exec --sandbox read-only --color never --skip-git-repo-check \
           -C <프로젝트 루트> \
           --output-schema .claude/hooks/codex-review-schema.json \
           -o <임시>/last-message.json \
           -c approval_policy=never \
           -
```

프롬프트는 **stdin** 으로 넣는다(`-`). 셸을 거치지 않으므로 한글·따옴표·경로 공백이 깨지지 않는다.
Windows 에서는 `codex.cmd` 대신 `node .../@openai/codex/bin/codex.js` 를 직접 돌린다 (`npm` 도 같은 방식).

## 팀원 환경

| 상황                        | 결과                               |
| --------------------------- | ---------------------------------- |
| Codex 설치 + 인증됨         | 자동 리뷰 실행                     |
| Codex 없음                  | `Codex review skipped: ...` → 통과 |
| Codex 설치 + 인증 안 됨     | `Codex review skipped: ...` → 통과 |
| 타임아웃 · 오류 · JSON 깨짐 | `Codex review skipped: ...` → 통과 |

**Codex 리뷰는 optional local quality gate 다.** 훅 파일만 받은 팀원도 작업이 막히지 않는다.
인증이 필요하면 `codex login` 한 번이면 된다.

> **커밋하면 안 되는 것**: `~/.codex/auth.json` · API key · access/refresh token · ChatGPT 로그인 정보.
> 전부 각자의 로컬(`$CODEX_HOME`, 기본 `~/.codex`)에 있고 이 저장소는 건드리지 않는다.
> `.claude/settings.local.json` 도 이미 `.gitignore` 에 있다(기기별 권한 목록).

## 조절값

`codex-review.config.json`:

| 키                        | 기본값      | 무엇                                                    |
| ------------------------- | ----------- | ------------------------------------------------------- |
| `enabled`                 | `true`      | 훅 전체 on/off                                          |
| `model`                   | `null`      | `null` 이면 Codex 기본 모델                             |
| `codexTimeoutMs`          | `480000`    | 리뷰 타임아웃 (넘으면 skip)                             |
| `gateTimeoutMs`           | `600000`    | 검증 명령 하나당 타임아웃                               |
| `maxBlocksPerSession`     | `3`         | 세션당 block 상한 (루프 방지)                           |
| `maxPatchBytes`           | `180000`    | 패치를 이만큼만 보낸다                                  |
| `maxUntrackedInlineBytes` | `60000`     | 새 파일 본문을 합쳐 이만큼까지 붙인다                   |
| `runGates` / `runTests`   | `true`      | typecheck·lint / test 실행 여부                         |
| `gates`                   | 3개         | 실제로 도는 npm 스크립트                                |
| `excludePathspecs`        | 바이너리 등 | 리뷰에서 뺄 git pathspec                                |
| `designSsotPaths`         | 3개         | UI 변경 시 Codex 가 볼 디자인 정본 (존재하는 것만 쓴다) |

환경변수로 그때그때 덮어쓸 수 있다:

```bash
CODEX_REVIEW=0                # 훅 끄기
CODEX_REVIEW_SKIP_GATES=1     # typecheck/lint/test 건너뛰기
CODEX_REVIEW_SKIP_TESTS=1     # jest 만 건너뛰기
CODEX_REVIEW_MAX_BLOCKS=1     # block 상한
CODEX_REVIEW_MODEL=<모델명>
CODEX_BIN=<codex 경로>        # 다른 codex 를 쓸 때
```

## 무한 루프를 어떻게 막나

`Stop` 훅은 block 할 때마다 다시 불린다. 세 겹으로 막는다.

1. **diff 해시 캐시** — 같은 diff 는 두 번 리뷰하지 않는다.
   이미 `pass` 면 Codex 를 부르지 않고 통과, 이미 `fail` 인데 diff 가 그대로면 **통과시킨다**
   (Claude 가 안 고쳤다는 뜻이고, 또 막으면 그냥 루프다). 해시에는 untracked 파일의 **내용**도 들어간다.

   ⚠ **이 캐시는 Codex 리뷰 결과에만 적용된다.** typecheck·lint·test 실패는
   같은 diff 여도 **다시 막는다** — 리뷰 findings 는 의견이라 두 번 말할 필요가 없지만
   게이트는 사실이고, 안 고쳤으면 트리는 여전히 깨져 있다. 갇히지 않는 것은
   아래 2번(세션 상한)이 맡는다.

2. **세션당 block 상한** — 기본 3회. 넘으면 안내만 남기고 통과시킨다.
   **게이트 차단과 리뷰 차단을 함께 센다**(`gateBlockCount` + `blockedHashes`) —
   둘을 따로 세면 상한이 사실상 두 배가 된다. 게이트는 diff 해시가 아니라
   **횟수**로 세는 것이 중요하다: 조금씩 고쳐 해시가 바뀔 때마다 1 로 초기화되면
   상한에 영영 닿지 않아 이 보장이 깨진다. `state.gateBlocks[diff]` 는
   「같은 diff 로 n번째」를 알려 주는 **진단용**일 뿐 해제 조건이 아니다.
3. **인프라 실패는 block 하지 않는다** — Codex 문제와 코드 문제를 가른다.
   `npm` 이 안 돌거나 스크립트가 없는 것도 인프라 문제로 본다(그 게이트만 건너뛴다).

## 병렬 Codex 세션 규칙

같은 워킹 트리를 **읽기만** 하는 Codex 세션(구조 분석·`git diff` 리뷰·질문)은 그대로 둬도 된다.
이 훅이 돌리는 Codex 도 read-only 라 여기 해당한다.

Codex 가 **파일을 고치는** 작업(리팩터링·자동 fix·커밋·포맷)을 맡을 때는 반드시 worktree 를 나눈다.

```bash
git worktree add ../momentory-fe-<용도> -b <브랜치>
```

## 겹치는 것 하나

`codex@openai-codex` 플러그인에도 stop-time review gate 가 있다(`/codex:setup`).
**둘 다 켜면 종료할 때마다 리뷰가 두 번 돈다.** 플러그인 쪽은 기본이 꺼짐이고,
이 저장소에서도 꺼진 것을 확인했다 — 켜지 마라. 플러그인 게이트는 타임아웃·JSON 깨짐에도
block 하기 때문에 이쪽 규칙(인프라 문제는 안 막는다)과도 어긋난다.
