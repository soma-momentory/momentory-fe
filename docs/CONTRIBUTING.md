# 작업 규칙

이 문서가 **저장소 작업 규칙의 정본**이다 — 커밋·브랜치·PR·품질 게이트·시크릿·의존성·생성물.
다른 문서(README·CLAUDE.md 등)는 여기를 링크하고 규칙을 다시 적지 않는다.
제품·디자인 규칙의 정본은 [`docs/DESIGN.md`](DESIGN.md)(디자인 SSOT)와 [`docs/spec/`](spec/SNAPSHOT.md)(동결 스냅샷)이다 —
둘이 부딪히면 **문안까지 `DESIGN.md` 가 이긴다**(결정 N0 · N6). `DESIGN.md` 가 말하지 않는 것은 `docs/spec/screens/` 에서 찾는다.

## 저장소 구조

**이 저장소 하나만 clone 하면 개발·실행·검증이 전부 된다.**
화면 스펙·상태 기계는 [`docs/spec/`](spec/SNAPSHOT.md)에 반입돼 있고,
**토큰([`src/design/ds/`](../src/design/ds/index.ts))과 폰트·자산은 커밋돼 있다.**
디자인 값·규칙의 SSOT 는 [`docs/DESIGN.md`](DESIGN.md) 다(2026-08-20 3세대 전환).

**상류(설계 저장소)는 더 이상 전제하지 않는다**(2026-08-14 D8 · [`PLAN.md`](../PLAN.md) §0). 재반입은
폐기됐고, 상류 폴더 없이 개발·검증이 전부 돈다 — 상류가 없어서 실패하는 절차가 있다면 그것이 버그다.

## 스펙과 디자인 — 결정은 이 저장소에서 닫는다

| 무엇의 정본                      | 어디                                                                                                   |
| -------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 시각 · 화면 흐름 · 문안          | [`docs/DESIGN.md`](DESIGN.md) — **디자인 SSOT**(2026-08-20~ · 이 저장소가 소유하고 고친다)             |
| 화면별 규칙 · 상태 · 남은 문안   | [`docs/spec/`](spec/SNAPSHOT.md) — `RULES.md` + `screens/<ID>.md` + JSON 2개 · **동결 · 손 수정 금지** |
| RN 토큰                          | [`src/design/ds/`](../src/design/ds/index.ts) — 코드가 쓰는 값, 여기만 hex                             |
| 화면 ID ↔ 라우트 · 스펙과의 차이 | [`docs/PRODUCT.md`](PRODUCT.md) — 라우트 표 · 「상류와 차이」 대장                                     |

### 구현이 스펙과 다르게 가야 할 때

RN 제약이든 스펙의 모순 발견이든, **화면 코드에 조용히 반영하고 끝내지 않는다.**

1. [`docs/PRODUCT.md` 「상류와 차이」](PRODUCT.md)에 번호를 매겨 기록한다 — 차이 · 근거 · 닫히는 조건.
2. 결정을 [`docs/DESIGN.md`](DESIGN.md) 해당 절에 적는다 — 이것이 새 정본이다. 값이면 `src/design/ds/` 에
   **이름을 먼저 만들고** 쓴다. 동작·범위면 [`TASKS.md`](TASKS.md) 해당 절에도 남긴다.
3. `docs/spec/` 은 고치지 않는다 — 스냅샷과 다른 점은 1 의 대장이 말한다.

(2026-08-14 전에는 상류 `OPEN-ISSUES.md` 에 R-항목으로 제기했다 — 선례 `R-40`~`R-43`. 지금은 기록일 뿐이다.)

## 커밋

> 이 절이 커밋 규칙의 정본이다. 2026-08-07 까지의 이력 대부분(92%)은 type 없는
> 문장형 제목이다 — 그날부터 아래 형식으로 통일했고, 과거 이력은 고치지 않는다.

**제목**: `type: 한국어 문장형` — 마침표 없이 50자 안팎. 보충은 `—`, 나열은 `·`.

```
fix: SampleClock 이 오전 0~3시에도 샘플 하루에 속하게 한다
feat: A3 · A3-b — 일기 상세 두 면과 행동 카드
docs: 상류 스냅샷을 docs/spec/ 으로 반입한다
```

**type** (브랜치와 같은 집합):

| type       | 언제                      |
| ---------- | ------------------------- |
| `feat`     | 화면·기능 추가            |
| `fix`      | 잘못된 동작·값 수정       |
| `refactor` | 동작 변화 없는 구조 변경  |
| `docs`     | 문서만                    |
| `test`     | 테스트만                  |
| `chore`    | 빌드·도구·의존성·설정     |
| `setup`    | 저장소·프로젝트 초기 구성 |

- **scope 는 쓰지 않는다** (`feat(home):` ✕) — 화면 ID 를 제목 본문에 쓰는 관행이 그 역할을 이미 한다.
- **type 을 겹치지 않는다** (`docs+refactor:` ✕) — 겹치면 커밋을 쪼갠다.
- **작업 단위로 커밋한다.** 첫 줄은 무엇을 했는지, 본문은 **왜** 했는지 —
  산문 한두 단락 + 필요하면 `-` 불릿. 테스트 수치를 적는 관행을 유지한다.
- 판단이 바뀐 것(규칙 변경·범위 축소)은 해당 문서의 「변경 이력」 절에도 남긴다.
  git 로그는 터미널을 열어야 보이기 때문이다.

```
fix: 아웃박스 재생에 멱등 키를 더한다

응답 유실 후 재시도가 일기를 중복 생성하던 경로를 막는다.
사용자에게 오류를 띄우지 않는 설계라 중복이 조용히 쌓였다.
```

### Conventional Commits 와 다른 점

| 항목            | 표준             | 우리         | 이유                                              |
| --------------- | ---------------- | ------------ | ------------------------------------------------- |
| 제목 언어       | (영어 관례)      | 한국어       | 이력 100% 가 한국어 — 전환은 순수한 마찰          |
| scope           | `type(scope):`   | 안 쓴다      | 화면 ID(`A3` `C4-d`)가 제목 안에서 그 역할을 한다 |
| 머지            | squash 관례 많음 | merge commit | 커밋 본문의 "왜"와 공저자 푸터를 보존한다         |
| BREAKING CHANGE | 푸터             | 안 쓴다      | 앱 저장소라 소비자 API 가 없다                    |

## 브랜치

- `main` 에 직접 밀지 않는다. **모든 변경은 PR 로 들어간다.**
- 이름: `<type>/<slug>` — type 은 커밋과 같은 집합, slug 는 마일스톤·화면 ID·주제의 kebab-case.
  예: `feat/m5-2-diary-detail` · `fix/a4-undo-delete` · `docs/self-contained-repo`
- **issue 번호는 붙이지 않는다** — 이슈 트래커를 쓰지 않고 [`TASKS.md`](TASKS.md)가
  작업 대장이다. 트래커를 도입하면 그때 재론한다.
- **브랜치 하나 = PR 하나.** 머지된 브랜치는 재사용하지 않고 지운다
  (초기 `setup/m0` 이 PR 10개를 소비한 전례가 반례다 — 이력 추적이 어려워진다).
- 브랜치를 main 에 맞출 때는 **rebase** 가 기본이다(브랜치는 개인 소유 전제). PR 을 연 뒤나
  둘 이상이 같이 쓰는 브랜치는 main 을 **merge 로 당긴다** — 리뷰 중인 커밋을 갈아엎지 않는다.
  **main 의 이력은 어떤 경우에도 재작성하지 않는다.**
- 머지된 브랜치는 로컬 · 원격 둘 다 지운다(`gh pr merge --delete-branch`). Expo Lab 「AI에게 맡기기」의
  `workspace/*` 브랜치는 작업 공간(worktree)이 쓰는 동안 지우지 않는다.

## PR · 리뷰 · 머지

- **PR 제목은 커밋 제목 규칙과 같다** — 머지 커밋 본문으로 이력에 영구히 남기 때문이다.
- 본문은 [PR 템플릿](../.github/PULL_REQUEST_TEMPLATE.md)의 8항목을 채운다.
- **머지 조건**: CI(아래 품질 게이트) 통과 + 리뷰 승인 1.
  1인 작업 구간에서는 스스로 템플릿 체크를 다 채우는 것으로 갈음한다.
  ⚠ **GitHub 가 강제하지 않는다** — 비공개 저장소 · 무료 요금제라 브랜치 보호를 걸 수 없다(2026-11-06 확인).
  지키는 것은 사람과 훅이다: **머지는 사람이 한다** — 에이전트의 `gh pr merge` 와 main 으로 가는 push 는
  훅이 막는다(아래 「AI 훅」).
- **머지 방식은 GitHub merge commit** — squash·rebase 머지를 쓰지 않는다.
  ⚠ BE 저장소(`momentory-be`)는 반대로 **squash 만** 받는다 — 두 저장소를 오갈 때 헷갈리지 않는다.
- 리뷰에서 함께 보는 것:
  - 화면 변경이면 [`docs/spec/screens/<ID>.md`](spec/) 의 규칙과 대조했는가
  - 스펙과 어긋나는 부분이 [`PRODUCT.md` 「상류와 차이」](PRODUCT.md)에 기록됐는가
  - **`docs/spec/` 이 바뀌었으면** 재반입 절차([SNAPSHOT.md](spec/SNAPSHOT.md))를 거쳤는가 — 손 수정은 반려
  - `package.json`·`providers.tsx` 등 「둘이 부딪히는 곳」([TASKS.md](TASKS.md))을 건드리면 사전 공유했는가
- PR 은 작게 — 컴포넌트 두세 개 또는 화면 두세 장이 한 PR ([TASKS.md](TASKS.md) 분담 규칙).

## 품질 게이트

**이 표가 정본이다. `.github/workflows/ci.yml` 과 어긋나면 이 표와 ci.yml 을 같이 고친다.**
전 단계가 **상류 폴더 없이** 돈다.

| 순서 | 명령                         | 무엇을 잡나                                                                                                                  |
| ---- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1    | `npm ci`                     | 앱·Expo Web Lab lockfile 과 동일한 트리                                                                                      |
| 2    | `npm run typecheck`          | 기존 앱 타입 오류                                                                                                            |
| 3    | `npm run typecheck:expo-lab` | Expo Web Lab 타입 오류                                                                                                       |
| 4    | `npm run lint`               | 규칙 위반 — **경고도 실패** (`--max-warnings 0`)                                                                             |
| 5    | `npm run format:check`       | Prettier 서식                                                                                                                |
| 6    | `npm run test -- --ci`       | 화면 규칙·store·라우팅 테스트 · Lab 라우트 목록이 `app/` 과 맞는지 · 코드 지도(`NAV.md`)에 새 폴더·통로·라우트 수가 적혔는지 |
| 7    | 시크릿 추적 검사             | `.env`·키 파일이 이력에 들어갔는지                                                                                           |
| 별도 | `npm run test:visual`        | Expo Lab 셸 Playwright(`expo-lab/e2e/`) — CI 의 `design-studio-visual` 잡(Windows)                                           |

1~7 은 `check` 잡(ubuntu)이고, `test:visual` 은 같은 워크플로의 다른 잡이라 따로 돈다
(실패하면 `test-results/` 를 아티팩트로 올린다). 두 잡 모두 PR 과 main push 에 돈다.

**CI 에 없는 검사** — 바꿨을 때 손으로 돌린다: AI 훅(`node --test ".claude/hooks/__tests__/*.test.mjs"`) ·
Lab 에이전트 서버(`npm run test:lab-agent`).

로컬에서 PR 전에 같은 것을 돌린다:

```bash
npm run typecheck && npm run typecheck:expo-lab
npm run lint && npm run format:check && npm test
```

## AI 훅

AI 에이전트(Claude Code · Codex)가 이 문서의 규칙을 **산문이 아니라 훅으로** 지킨다 —
특히 사람이 지켜보지 않는 Lab 「AI에게 맡기기」 실행에서. 설명·판정 표·실측은
[`.claude/hooks/README.md`](../.claude/hooks/README.md) 「저장소 규칙 훅」이 정본이고, 여기는 요약이다.

| 언제                   | 무엇                                                                                                                                                                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 편집 **전**            | 거부 — `docs/spec/**` · `docs/api/openapi.json` · `ios/` `android/` · `.env*`(견본 제외) · `harness/runs/**` · `harness/parallel-runs/**` · Lab 무인 실행이면 훅·설정(`.claude/settings.json` · `.claude/hooks/**` · `.codex/**`) |
| 명령 **전**            | 거부 — `gh pr merge` · main 으로 가는 push · main 에서 `reset --hard` · `git clean -x` · node_modules 재귀 삭제                                                                                                                   |
| 편집 **뒤**            | 그 파일만 prettier · `src/design/ds/**` 면 대비 테스트 · 새 `app/**` 화면이면 Lab 라우트 목록 확인                                                                                                                                |
| 권한 묻기·대기 (선택)  | Windows 토스트 — `MOMENTORY_NOTIFY=1` 일 때만                                                                                                                                                                                     |
| 턴 끝 (Claude Code 만) | Codex 자동 리뷰 게이트 — 바뀐 것이 있으면 typecheck · lint · test 뒤 Codex read-only 리뷰 · Codex 가 없으면 건너뛴다(`codex-review.mjs`)                                                                                          |

- 설정: Claude Code `.claude/settings.json` · Codex `.codex/hooks.json`(같은 스크립트 · 판정은 `.claude/hooks/lib/rules.mjs` 하나).
  리뷰 게이트(`Stop`)는 Claude Code 쪽에만 걸려 있다 — 설명은 같은 README 머리 「Codex 자동 리뷰 게이트」.
- **끄기는 사람만** — `MOMENTORY_GUARD=0` · `MOMENTORY_POST_EDIT=0` 으로 에이전트를 다시 띄운다.
- Lab 러너는 `MOMENTORY_LAB_RUN=1` 을 넘기고, Codex 는 `--dangerously-bypass-hook-trust` 로 돌린다
  (검토 안 된 프로젝트 훅은 `codex exec` 가 조용히 건너뛴다).
- **품질 게이트(CI)에는 넣지 않았다.** 훅을 고치면 `node --test ".claude/hooks/__tests__/*.test.mjs"` 를 손으로 돌린다.
- 훅은 가드레일이다 — 규칙의 정본은 여전히 이 문서다(`CLAUDE.md` 「생성물·반입물」은 그 요약). 규칙을 바꾸면 `rules.mjs` 도 함께 고친다.

## 값을 다루는 세 등급

**"시크릿"이라는 한 단어로 뭉뚱그리면 사고가 난다.** 세 가지는 성격이 다르다.

### ① 공개 식별자 — 커밋만 안 할 뿐, 비밀이 아니다

|                          |                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------- |
| 서버 주소                | `EXPO_PUBLIC_API_BASE_URL` — `.env` 는 개발 서버, 출시 빌드는 운영 주소만 받는다 |
| 카카오 네이티브 앱 키    | `EXPO_PUBLIC_KAKAO_APP_KEY`                                                      |
| 구글 OAuth 클라이언트 ID | `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` · `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`          |
| Amplitude 키             | `EXPO_PUBLIC_AMPLITUDE_API_KEY` · `EXPO_PUBLIC_AMPLITUDE_ALLOW_DEVELOPMENT`      |
| 빌드 구분                | `MOMENTORY_BUILD_ENV` — `app.config.ts` 가 읽는다(앱 번들에 싣지 않는다)         |
| Firebase 설정            | `google-services.json` · `GoogleService-Info.plist`                              |

**`EXPO_PUBLIC_` 접두가 붙은 값은 앱 번들에 그대로 박힌다.** APK 를 풀면 누구나 읽을 수 있으므로
**보호되고 있다고 생각하면 안 된다.** 이 값들의 안전은 값을 숨기는 데서 오지 않고,
플랫폼 쪽 설정(패키지명·서명 지문·리다이렉트 URI 허용목록)에서 온다.

저장소에 넣지 않는 이유는 기밀이라서가 아니라 **환경마다 다르고(dev/prod) 남의 프로젝트에
붙는 것을 막기 위해서**다. `app.config.ts` 가 env 에서 읽고, 공유되는 것은 `.env.example` 뿐이다.
**EAS 는 쓰지 않는다** — 출시 빌드는 로컬에서 만들고, 값은 그 기기의 `.env` 에서 온다
([`SETUP.md`](SETUP.md) §8).

### ② 진짜 시크릿 — 앱에 넣지 않는다

DB 접속 정보 · 서드파티 API 시크릿 · LLM 키 같은 것. **클라이언트 코드에 어떤 형태로도 두지 않는다.**
`EXPO_PUBLIC_` 이든 아니든 번들을 뜯으면 나온다 — 접두를 떼도 `extra` 를 통해 앱에 실린다.
이 값들은 서버에만 있고, 앱은 우리 API 를 통해서만 접근한다.

### ③ 서명 키 — 유출되면 앱을 위조당한다

`*.jks` `*.p8` `*.p12` `*.key` `*.pem` `*.keystore` `*.mobileprovision`.
**저장소 밖에 둔다** — Android 업로드 키스토어는 `~/keys/`, 비밀번호 · 별칭은 `~/.gradle/gradle.properties` 의
`MOMENTORY_RELEASE_*` 이고 저장소는 **이름만** 참조한다(`plugins/withReleaseSigning.ts` · [`SETUP.md`](SETUP.md) §8).
`/android` 안에 두면 `expo prebuild --clean` 이 지운다. 업로드 키를 잃으면 같은 앱을 갱신하기 어렵다 — 따로 백업한다.
애플 `.p8`(로그인 연결 해제용)은 서버 몫이라 앱 저장소에 오지 않는다.

세 등급 모두 `.gitignore` 에 있고, CI 가 매 PR 마다 추적 여부를 검사한다.
**로그·계측에도 남기지 않는 것**: 사용자가 쓴 글 전부(일기 · 회고 · 보물 · 걱정 · 소원 · 주간 행복 · 문의 · 편지의
작은 일) · AI 가 쓴 글 · 이름 · 토큰 — 감정은 숫자 id 만 보낸다. 허용 목록은 `src/features/analytics/events.ts` 가
타입과 런타임 둘로 막는다([ANALYTICS.md](ANALYTICS.md) · [ARCHITECTURE.md](ARCHITECTURE.md) §6).

## 의존성

### `.npmrc` 의 `legacy-peer-deps=true` — 언제 지우나

Expo SDK 57 트리의 peer 충돌(expo 가 고정한 `react@19.2.3` vs `react-dom` 이 요구하는 `^19.2.8`)
때문에 켜 뒀다. **이 플래그는 진짜 충돌도 함께 숨긴다** — 실제로 M0 에서 ESLint 10 이 조용히
설치됐고, `eslint-plugin-react` 가 ESLint 9 까지만 지원해서 린트가 통째로 터졌다.

그래서 지키는 것:

- **SDK 를 올릴 때마다 이 줄이 아직 필요한지 확인한다.** 지우고 `rm -rf node_modules && npm i` 가
  통과하면 지운다.
- **린터·빌드 도구는 메이저를 직접 고정한다**(`eslint@^9`). 플래그가 가려주기 때문에 범위를
  열어두면 안 맞는 메이저가 들어온다.
- 새 패키지를 넣은 뒤에는 `npm run lint` 와 `npm run typecheck` 를 반드시 돌린다.

## 생성물 — 직접 수정 금지 파일

직접 고치면 다음 생성 때 덮인다. **소스를 고치고 다시 만든다.**

| 생성물·반입물                            | 소스                            | 다시 만들기                                           |
| ---------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| `docs/spec/**`                           | 상류 `09_MVP/` 등               | ⚠ 재반입은 폐기됐다 ([SNAPSHOT.md](spec/SNAPSHOT.md)) |
| `docs/api/openapi.json`                  | 개발 서버 `/v3/api-docs`        | `npm run sync:api` ([api/README.md](api/README.md))   |
| `ios/` `android/`                        | `app.config.ts` + config plugin | `npx expo prebuild --clean`                           |
| `expo-lab/src/shell/routes.generated.ts` | `app/` 라우트 파일              | `npm run lab:routes` (어긋나면 jest 가 잡는다)        |

⚠ 옛 생성물 `theme.ts` 와 그 검사(`check:theme`)는 **3세대 이관이 끝나면서 사라졌다**
(`PLAN.md` A-16) — 지금 토큰은 손으로 쓰는 `src/design/ds/` 하나다.
`docs/spec/**` 은 헤더에 원본 커밋 SHA 와 본문 sha256 을 달고 있다(검증은 수동 — SNAPSHOT.md).
**`docs/api/openapi.json` 도 생성물이다** — `npm run sync:api` 로만 갱신한다.

**생성물을 커밋하는 이유**는 재현성이다 — 저장소 밖 파일에 의존하면
CI 와 새 개발자가 같은 빌드를 만들 수 없다.

## 코드 규칙

[`docs/spec/RULES.md`](spec/RULES.md) 가 정본이고, 아래는 린터가 강제하는 것이다.

- **색을 리터럴로 쓰지 않는다.** `no-restricted-syntax` 가 hex 를 막는다.
  예외는 `src/design/` 과 `app.config.ts` 뿐이다.
- 글자색은 `label` **여섯 단**만 — `strong` `normal` `neutral` `alternative` `assistive`(플레이스홀더 전용)
  `disabled` · 색 면 위 글자는 `onFill` (`src/design/ds/color.ts` · 새 단을 만들지 않는다).
  브랜드 초록 `primary.normal` 에는 글자를 얹지 않는다 — 글자가 얹히는 면(주 CTA)은 `primary.heavy` 다.
  대비 보정 값은 `ds/__tests__/contrast.test.ts` 가 고정한다
- 폰트는 `fontWeight` 가 아니라 **파일 이름**으로 지정한다 — 앱 전체 서체는 교보손글씨
  (`"KyoboHandwriting2025lyb"` · `ds/typography.ts`)이다(로그인 포함 · Pretendard 는 2026-11-09 에 지웠다).
  Android 에서 `fontWeight` 로는 굵기가 안 바뀐다.
- **앱 코드는 고정값을 읽지 않는다** — 목 데이터는 2026-08-21 에 전부 지웠고
  (`src/mocks/sample.ts`), 남은 것은 **테스트 전용** `src/testing/fixtures.ts` 뿐이다.
  `no-restricted-imports` 가 `app/**`·`src/**`(테스트 제외)의 그 import 를 막는다 —
  데이터는 `src/features/<도메인>/` 의 store·`data/` 를 지난다.
- **앱은 Expo Lab 을 import 하지 않는다** — `no-restricted-imports` 가 `**/expo-lab/**` 를 막는다(Lab 이 앱을 빌려 쓰는 한 방향).
- 서버 호출은 `src/lib/http.ts` 의 `authedRequest` 하나를 지난다 — 자기 `fetch` 래퍼를 만들지 않는다(린터가 아니라 리뷰가 본다).
- 경고도 실패다 — `npm run lint` 는 `--max-warnings 0` 으로 돈다.

## 명령

```bash
# 매일 쓰는 것
npm start              # Expo 개발 서버 (dev client)
npm run android        # dev client 빌드·설치 (네이티브 변경 시)
npm run ios            # 〃 iOS
npm run typecheck      # tsc --noEmit  (typecheck:expo-lab — Lab 워크스페이스)
npm run lint           # eslint (경고 0)
npm run test           # jest        (test:watch — 감시 모드)
npm run format         # prettier 쓰기 (format:check — 검사만, CI 용)

# 가끔 쓰는 것
npm run sync:api       # 서버 OpenAPI 계약 재반입 (docs/api/README.md)
npm run check:ios-release  # 출시 prebuild 뒤 iOS Info.plist 권한 검사 (docs/SETUP.md §6 「API 서버」 아래)
npm run lab:web        # Expo Lab (8085) — expo-lab/README.md
npm run lab:routes     # app/ 이 바뀌면 Lab 라우트 목록 다시 쓰기 (jest 가 어긋남을 잡는다)
npm run lab:verify     # 바뀐 화면의 Lab 전·후 비교
npm run test:visual    # Lab 셸 Playwright (CI 의 design-studio-visual 잡)
npm run lab:skins      # Lab 기기 외형 그림 연결
npm run test:lab-agent # Lab 「AI에게 맡기기」 서버 테스트 (CI 밖)
scripts/screen-sweep.sh  # 화면 크기·글꼴 배율 다섯 벌 훑기 (판정하지 않는다 — 눈으로 대조)
```

⚠ **상류 전용 명령(`sync:theme`·`check:theme`)은 없다** — 2026-08-20 에 삭제됐다.

## 변경 이력

| 날짜       | 변경                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-09 | **코드 대조.** 품질 게이트 6 에 코드 지도(`NAV.md`) 검사를, 「AI 훅」 편집 전 거부에 `harness/parallel-runs/**` 와 Lab 무인 실행의 훅·설정을 더했다                                                                                                                                                                                                                                                                                                                 |
| 2026-11-06 | **두 번째 대조.** 상류 동기화 절을 「결정은 이 저장소에서 닫는다」로 바꿨다(상류 전제 폐기 · D8). EAS 서술을 걷어 냈다 — 출시 빌드는 로컬 · 서명 키는 `~/keys` · `~/.gradle`(SETUP §8). 글자색을 3세대 `label` 여섯 단으로, 서체를 교보손글씨로 고쳤다. 머지 조건을 GitHub 가 강제하지 않는다는 것 · BE 는 squash 라는 것 · 머지된 브랜치를 지운다는 것을 적었다. 값 ① 에 서버 주소 · Amplitude · 빌드 구분을, 생성물에 Lab 라우트 목록을, 명령에 Lab 명령을 더했다 |
| 2026-11-06 | **코드 대조.** 품질 게이트 표에 CI 의 `test:visual`(Lab Playwright) 잡을, 「AI 훅」에 Claude Code `Stop` 리뷰 게이트를, 「명령」에 Lab 명령을 더했다                                                                                                                                                                                                                                                                                                                |
| 2026-11-02 | **AI 훅 신설.** 생성물·반입물 편집 · main push · PR 머지 · node_modules 연결 삭제를 에이전트 훅(`.claude/settings.json` · `.codex/hooks.json`)이 실행 전에 거부하고, 편집 뒤 서식·대비·Lab 라우트를 확인한다(「AI 훅」)                                                                                                                                                                                                                                             |
| 2026-09-12 | **문서 일괄 대조.** 토큰 정본을 `theme.ts`/`tokens.mvp.ts` 에서 `src/design/ds/` 로 고치고, 생성물 표에 `docs/api/openapi.json` 을 추가, 삭제된 상류 명령(`sync:theme`·`check:theme`) 흔적 제거                                                                                                                                                                                                                                                                     |
| 2026-08-07 | **자급형 전환.** 커밋 type 접두 필수화(과거 이력은 불변), 품질 게이트 표 신설(CI 서술 정본화), 상류 참조를 `docs/spec/` 스냅샷으로 교체, 반입 체크리스트를 SNAPSHOT.md 로 이관. "부모 저장소 관행을 따른다"는 상속 선언을 이 문서 자체 규정으로 대체                                                                                                                                                                                                                |
