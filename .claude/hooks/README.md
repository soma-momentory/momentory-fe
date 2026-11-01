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

같은 폴더의 `guard.mjs` · `post-edit.mjs` · `notify.mjs` · `lib/` 는 리뷰 게이트와 따로 도는
**저장소 규칙 훅**이다 — 아래 「저장소 규칙 훅」 절.

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

---

# 저장소 규칙 훅 — guard · post-edit · notify

산문 규칙(`CLAUDE.md` · `docs/CONTRIBUTING.md` · `expo-lab/HANDOFF.md`)을 **기계로 지키게** 하는 훅이다.
특히 사람이 지켜보지 않는 Lab 「AI에게 맡기기」 실행(`claude -p --permission-mode acceptEdits` ·
`codex exec`)을 위한 것이다. 규칙의 정본은 여전히 그 문서들이고, 판정을 기계로 옮긴 것은
**`lib/rules.mjs` 하나**다 — Claude Code 와 Codex 가 같은 진입점·같은 판정을 쓴다.

| 이벤트       | 스크립트        | 하는 일                                                                                       | 실측 (Windows)                          |
| ------------ | --------------- | --------------------------------------------------------------------------------------------- | --------------------------------------- |
| PreToolUse   | `guard.mjs`     | 보호 경로 편집 · 위험한 git/gh/삭제 명령을 **실행 전에 거부**                                 | 0.15–0.3초                              |
| PostToolUse  | `post-edit.mjs` | ① 그 파일만 prettier ② `src/design/ds/**` 면 대비 테스트 ③ 새 `app/**` 화면이면 Lab 목록 확인 | 서식 ~0.9초 · 대비 ~5–7초 · 목록 ~0.7초 |
| Notification | `notify.mjs`    | Windows 토스트(BurntToast) — **기본 꺼짐**                                                    | ~0.2초                                  |

matcher — Claude Code(`../settings.json`): PreToolUse `Edit|Write|MultiEdit|NotebookEdit|Bash|PowerShell` ·
PostToolUse `Edit|Write|MultiEdit` · Notification `permission_prompt|idle_prompt`.
Codex(`../../.codex/hooks.json`): 같은 스크립트를 `--agent=codex` 로 — PreToolUse `^(Bash|apply_patch)$` ·
PostToolUse `^apply_patch$`.

## guard — 거부하는 것

**파일 편집** (Claude 의 Edit·Write·MultiEdit·NotebookEdit · Codex 의 apply_patch · 셸의 쓰기 명령):

| 경로                                                   | 왜                                                                    |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `docs/spec/**`                                         | 동결 스냅샷 — `docs/PRODUCT.md` 「상류와 차이」·`docs/DESIGN.md` 로   |
| `docs/api/openapi.json`                                | 반입 스냅샷 — `npm run sync:api` 로만(그 명령은 막지 않는다)          |
| `ios/**` `android/**`                                  | 생성물 — `app.config.ts`·plugin 을 고치고 `npx expo prebuild --clean` |
| `.env` `.env.*` (`.env.example` 제외)                  | 기기별 시크릿 자리                                                    |
| `harness/runs/**` `harness/parallel-runs/**`           | 하네스 실행 기록                                                      |
| `.claude/settings.json` `.claude/hooks/**` `.codex/**` | **Lab 무인 실행(`MOMENTORY_LAB_RUN=1`)에서만** — 훅을 스스로 끄는 길  |

경로는 **그 파일이 속한 저장소 루트**(위로 올라가며 처음 만나는 `.git`)를 기준으로 잰다 —
저장소 바깥 Lab worktree 에서도, 본 저장소 경로를 절대 경로로 겨눠도 같은 판정이 난다.

**명령** (Bash · PowerShell · `bash -c` / `cmd /c` / `powershell -Command` 안쪽까지):

- `gh pr merge` · `gh api …/pulls/<n>/merge` — 머지는 사람이 승인한 뒤에만
- main 으로 가는 push 전부 — `git push origin main` · `HEAD:main` · `--force`/`-f`/`--force-with-lease` ·
  main 에서의 맨 `git push` · `--all`/`--mirror` · `:main` 삭제
- main 에서 `git reset --hard` (앞 단계의 `git checkout main` 도 따라간다)
- `git clean` 에 `-x`/`-X` + 강제, 경로 없이 — 무시된 파일(node_modules 연결 · .env)까지 지운다
- `node_modules` 를 겨눈 재귀 삭제 — `rm -rf` · `Remove-Item -Recurse` · `rmdir /s`.
  worktree 의 node_modules 는 본 저장소로 이어진 **연결(junction)** 이라 따라 들어가 지운다.
  연결만 끊는 `cmd //c rmdir node_modules`(/s 없이)는 막지 않는다
- 위 보호 경로에 쓰는 셸 명령 — `>`·`>>` · `tee` · `sed -i` · `cp`(대상) · `mv` · `rm` · `git rm/mv` ·
  `Set-Content`/`Out-File` 류 · `node -e "…writeFileSync…"`. **읽기는 막지 않는다**(`cat` · `grep` · `git diff`)

**막지 않는 것**(테스트로 고정): `git push -u origin lab/…` · 작업 브랜치 force push · `gh pr create` ·
`npm run sync:api` · `npx expo prebuild` · `git reset --hard origin/main`(작업 브랜치에서) · `git clean -fd`.

⚠ **가드레일이지 감옥이 아니다.** 셸 명령은 어림으로 해석한다 — 스크립트 파일 안에서 쓰거나
`$(…)` 로 감추면 지나간다. 평소 작업을 막지 않는 쪽으로 기울여 두었다.

## post-edit — 고친 뒤에 하는 것

1. **prettier** — 고친 파일 하나만 `node node_modules/prettier/bin/prettier.cjs --write`.
   `.prettierignore`(docs/spec · openapi.json · 반입 스킬 등)는 prettier 가 직접 걸러 낸다. 1MB 넘으면 건너뛴다.
2. **대비 테스트** — `src/design/ds/**` 를 고치면 `contrast.test.ts` 하나만 jest 로
   (상한 60초 · `MOMENTORY_CONTRAST_TIMEOUT_MS`). 깨지면 어느 쌍이 몇으로 깨졌는지와
   「값을 억지로 맞추지 말고 사용자에게 되묻는다」를 모델에게 붙인다.
3. **Lab 라우트** — `app/**` 에 화면 파일을 새로 쓰면 `node expo-lab/scripts/gen-routes.mjs --check` 와
   `routeMeta.ts` 의 `path:` 를 본다. 어긋나면 `npm run lab:routes` + 한국어 제목 추가를 알린다.

무엇도 되돌리지 않는다(도구는 이미 돌았다). Claude Code 에는 `decision: "block"` 으로 알리고
(결과는 그대로 두고 이유를 붙인다), Codex 에는 `additionalContext` 로만 알린다 —
Codex 의 `block` 은 도구 결과를 갈아 끼워 패치가 실패한 것처럼 읽히기 때문이다.
도구(prettier · jest · gen-routes)가 없거나 시간이 넘으면 **조용히 지나간다.**

## 끄는 법 · Lab 이 할 일

| 환경변수                | 효과                                                                     |
| ----------------------- | ------------------------------------------------------------------------ |
| `MOMENTORY_GUARD=0`     | guard 끄기 — **사람이 일부러 할 때만.** 에이전트를 이 값으로 다시 띄운다 |
| `MOMENTORY_POST_EDIT=0` | post-edit 끄기                                                           |
| `MOMENTORY_NOTIFY=1`    | 토스트 켜기 — 각자 `.claude/settings.local.json` 의 `env` 에             |
| `MOMENTORY_LAB_RUN=1`   | **Lab 러너가 설정한다** — 토스트를 끄고, 에이전트 설정(훅) 편집을 막는다 |

훅은 **에이전트 프로세스의 환경**을 물려받는다 — 에이전트가 `MOMENTORY_GUARD=0 git push …` 처럼
명령 앞에 붙여도 훅에는 닿지 않는다(그 명령도 테스트로 막는다).

## Codex 쪽 조건

- 프로젝트 훅은 `.codex/hooks.json` 이고 **프로젝트가 trusted 일 때만** 읽힌다.
  `codex exec -s workspace-write -C <폴더>` 는 그 폴더를 `~/.codex/config.toml` 에 trusted 로 **스스로 적는다**(실측).
- 그다음 **훅 자체의 신뢰**가 따로 있다 — 검토하지 않은 훅은 **조용히 건너뛴다**(`codex exec` 실측 · 경고도 없다).
  - 사람: 대화형 `codex` 에서 `/hooks` 로 한 번 검토·신뢰한다. 훅 정의가 바뀌면 다시 묻는다.
  - **Lab 무인 실행: `codex exec --dangerously-bypass-hook-trust …`** — 훅은 Lab 이 만든 worktree 의
    커밋에서 오므로 출처는 이미 이 저장소다. 이 플래그가 없으면 Codex 쪽 가드는 돌지 않는다.
- 명령은 `node "$(git rev-parse --show-toplevel)/.claude/hooks/…"` — Codex 는 Windows 에서 훅을 PowerShell 로
  돌리고 `$(…)` 가 그대로 먹는다(실측). 하위 폴더에서 시작해도 경로가 흔들리지 않는다.

## 테스트

```bash
node --test ".claude/hooks/__tests__/*.test.mjs"   # 판정 표 + 진입점을 실제로 띄우는 통합 테스트
```

Node 22 의 `node --test` 는 디렉터리 인자를 받지 않는다 — glob 을 따옴표로 넘긴다.
CI 품질 게이트에는 들어 있지 않다(`docs/CONTRIBUTING.md` 「AI 훅」) — 훅을 고치면 손으로 돌린다.
