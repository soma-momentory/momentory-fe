# 작업 규칙

이 문서가 **저장소 작업 규칙의 정본**이다 — 커밋·브랜치·PR·품질 게이트·시크릿·의존성·생성물.
다른 문서(README·CLAUDE.md 등)는 여기를 링크하고 규칙을 다시 적지 않는다.
제품·디자인 규칙의 정본은 [`docs/spec/`](spec/SNAPSHOT.md) 스냅샷이다.

## 저장소 구조

**이 저장소 하나만 clone 하면 개발·실행·검증이 전부 된다.**
화면 스펙·값·상태 기계는 [`docs/spec/`](spec/SNAPSHOT.md)에 반입돼 있고,
토큰(`src/design/theme.ts`)과 폰트는 커밋돼 있다.

설계 상류(momentory — 리모트 없는 로컬 저장소)에 접근할 일은
**재반입과 `npm run sync:theme` 둘뿐**이고, 전부 상류 접근 담당자의 몫이다
(절차: [spec/SNAPSHOT.md](spec/SNAPSHOT.md)). 상류 폴더가 없어서 실패하는
일반 개발 절차는 없어야 한다 — 있다면 그것이 버그다.

## 상류 동기화 — 클로드 디자인 → 피그마 → 구현

세 단계가 **같은 정본 하나**를 본다. 정본을 복사하면 한쪽만 고쳐졌을 때
어느 쪽이 맞는지 알 수 없게 된다.

```
① 클로드 디자인 ──번들──▶ 상류 09_MVP/ ← 정본
                              │
        ② 피그마 (상류 flows) ┤ (정본의 figma 번역)
        ③ 구현 (이 저장소)    ┘ (정본의 RN 번역 — docs/spec/ 스냅샷을 지나서)
```

| 무엇의 정본                      | 어디                                                                         |
| -------------------------------- | ---------------------------------------------------------------------------- |
| 화면이 무엇인가 (규칙·문안·상태) | [`docs/spec/`](spec/SNAPSHOT.md) — `RULES.md` + `screens/<ID>.md` + JSON 2개 |
| 값 (색·크기·반경·여백)           | [`docs/spec/momentory.css`](spec/momentory.css)                              |
| RN 토큰                          | `src/design/theme.ts`(생성물) + `tokens.mvp.ts`(상류 미반영분 임시)          |

### 구현이 스펙과 다르게 가야 할 때

RN 제약이든 스펙의 모순 발견이든, **화면 코드에 조용히 반영하고 끝내지 않는다.**

1. [`docs/PRODUCT.md` 「상류와 차이」](PRODUCT.md)에 기록한다 — 차이·근거·임시 기록 자리·닫히는 조건.
2. 상류 접근 담당자가 상류 `06_운영문서/OPEN-ISSUES.md` 에 R-항목으로 제기한다.
   선례: `R-40`·`R-41`·`R-42`·`R-43` — 전부 이 저장소가 제기해 상류가 닫았다.
3. 상류가 반영하기 전까지의 임시 기록 자리는 둘뿐이다 —
   **값**이면 `src/design/tokens.mvp.ts`, **동작·범위**면 `TASKS.md` 해당 절.
4. 상류가 닫으면 임시 기록을 지운다. 지우지 않으면 정본이 둘이 된다.

상류가 개정판을 냈을 때의 재반입 체크리스트는 [spec/SNAPSHOT.md](spec/SNAPSHOT.md)에 있다 (담당자 전용).

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
- 브랜치를 main 에 맞출 때는 **rebase** 를 쓴다(브랜치는 개인 소유 전제).
  둘 이상이 같이 쓰는 브랜치만 merge 로 당긴다. **main 의 이력은 어떤 경우에도 재작성하지 않는다.**

## PR · 리뷰 · 머지

- **PR 제목은 커밋 제목 규칙과 같다** — 머지 커밋 본문으로 이력에 영구히 남기 때문이다.
- 본문은 [PR 템플릿](../.github/PULL_REQUEST_TEMPLATE.md)의 8항목을 채운다.
- **머지 조건**: CI(아래 품질 게이트) 통과 + 리뷰 승인 1.
  1인 작업 구간에서는 스스로 템플릿 체크를 다 채우는 것으로 갈음한다.
- **머지 방식은 GitHub merge commit** — squash·rebase 머지를 쓰지 않는다.
- 리뷰에서 함께 보는 것:
  - 화면 변경이면 [`docs/spec/screens/<ID>.md`](spec/) 의 규칙과 대조했는가
  - 스펙과 어긋나는 부분이 [`PRODUCT.md` 「상류와 차이」](PRODUCT.md)에 기록됐는가
  - **`docs/spec/` 이 바뀌었으면** 재반입 절차([SNAPSHOT.md](spec/SNAPSHOT.md))를 거쳤는가 — 손 수정은 반려
  - `package.json`·`providers.tsx` 등 「둘이 부딪히는 곳」([TASKS.md](TASKS.md))을 건드리면 사전 공유했는가
- PR 은 작게 — 컴포넌트 2~~3개 또는 화면 2~~3장이 한 PR ([TASKS.md](TASKS.md) 분담 규칙).

## 품질 게이트

**이 표가 정본이다. `.github/workflows/ci.yml` 과 어긋나면 이 표와 ci.yml 을 같이 고친다.**
전 단계가 **상류 폴더 없이** 돈다.

| 순서 | 명령                   | 무엇을 잡나                                                |
| ---- | ---------------------- | ---------------------------------------------------------- |
| 1    | `npm ci`               | lockfile 과 동일한 트리                                    |
| 2    | `npm run check:theme`  | 생성물 `theme.ts` 손 수정 (sha256 자기 검증 — 상류 불필요) |
| 3    | `npm run typecheck`    | 타입 오류                                                  |
| 4    | `npm run lint`         | 규칙 위반 — **경고도 실패** (`--max-warnings 0`)           |
| 5    | `npm run format:check` | Prettier 서식                                              |
| 6    | `npm run test -- --ci` | 화면 규칙·store·라우팅 테스트                              |
| 7    | 시크릿 추적 검사       | `.env`·키 파일이 이력에 들어갔는지                         |

로컬에서 PR 전에 같은 것을 돌린다:

```bash
npm run check:theme && npm run typecheck && npm run lint && npm run format:check && npm test
```

## 값을 다루는 세 등급

**"시크릿"이라는 한 단어로 뭉뚱그리면 사고가 난다.** 세 가지는 성격이 다르다.

### ① 공개 식별자 — 커밋만 안 할 뿐, 비밀이 아니다

|                          |                                                     |
| ------------------------ | --------------------------------------------------- |
| 카카오 네이티브 앱 키    | `EXPO_PUBLIC_KAKAO_APP_KEY`                         |
| 구글 OAuth 클라이언트 ID | `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID`                    |
| Firebase 설정            | `google-services.json` · `GoogleService-Info.plist` |

**`EXPO_PUBLIC_` 접두가 붙은 값은 앱 번들에 그대로 박힌다.** APK 를 풀면 누구나 읽을 수 있으므로
**보호되고 있다고 생각하면 안 된다.** 이 값들의 안전은 값을 숨기는 데서 오지 않고,
플랫폼 쪽 설정(패키지명·서명 지문·리다이렉트 URI 허용목록)에서 온다.

저장소에 넣지 않는 이유는 기밀이라서가 아니라 **환경마다 다르고(dev/staging/prod) 남의 프로젝트에
붙는 것을 막기 위해서**다. `app.config.ts` 가 env 에서 읽고, 공유되는 것은 `.env.example` 뿐이다.
빌드 환경(EAS)에는 **빌드 환경 변수**로 넣는다.

### ② 진짜 시크릿 — 앱에 넣지 않는다

DB 접속 정보 · 서드파티 API 시크릿 · LLM 키 같은 것. **클라이언트 코드에 어떤 형태로도 두지 않는다.**
`EXPO_PUBLIC_` 이든 아니든 번들을 뜯으면 나온다 — 접두를 떼도 `extra` 를 통해 앱에 실린다.
이 값들은 서버에만 있고, 앱은 우리 API 를 통해서만 접근한다.

### ③ 서명 키 — 유출되면 앱을 위조당한다

`*.jks` `*.p8` `*.p12` `*.key` `*.pem` `*.keystore` `*.mobileprovision`.
EAS 가 관리하게 두고 로컬에 내려받지 않는다. 받았다면 저장소 밖에 둔다.

세 등급 모두 `.gitignore` 에 있고, CI 가 매 PR 마다 추적 여부를 검사한다.
**로그·계측에도 남기지 않는 것**: 일기·순간·회고의 본문과 자유 텍스트, 토큰 —
감정은 `emotion_id` 숫자만 보낸다([ARCHITECTURE.md](ARCHITECTURE.md) §6).

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

| 생성물·반입물         | 소스                            | 다시 만들기                                                                       |
| --------------------- | ------------------------------- | --------------------------------------------------------------------------------- |
| `src/design/theme.ts` | 상류 `05_도구/lib.mjs`          | 담당자: 상류에서 export 후 `npm run sync:theme` ([SNAPSHOT.md](spec/SNAPSHOT.md)) |
| `docs/spec/**`        | 상류 `09_MVP/` 등               | 담당자: 재반입 절차 ([SNAPSHOT.md](spec/SNAPSHOT.md))                             |
| `ios/` `android/`     | `app.config.ts` + config plugin | `npx expo prebuild --clean`                                                       |

`theme.ts` 는 헤더에 원본 커밋 SHA 와 본문 sha256 을 달고 있다.
`npm run check:theme` 가 손댔는지 검사하고 CI 가 매번 돌린다. `docs/spec/**` 도 같은
헤더 규약을 쓴다(검증은 수동 — SNAPSHOT.md).

**생성물을 커밋하는 이유**는 재현성이다 — 저장소 밖 파일에 의존하면
CI 와 새 개발자가 같은 빌드를 만들 수 없다.

## 코드 규칙

[`docs/spec/RULES.md`](spec/RULES.md) 가 정본이고, 아래는 린터가 강제하는 것이다.

- **색을 리터럴로 쓰지 않는다.** `no-restricted-syntax` 가 hex 를 막는다.
  예외는 `src/design/` 과 `app.config.ts` 뿐이다.
- 글자색은 semantic 6종만 — `text.strong` `text.body` `text.caption`
  `text.legal` `text.accent` `text.onDark` (`src/design/tokens.mvp.ts`)
- 폰트는 `fontWeight` 가 아니라 **파일 이름**으로 지정한다
  (`fontFamily: "Pretendard-Bold"`). Android 에서 `fontWeight` 로는 OTF 굵기가 안 바뀐다.
- **화면은 mock 을 직접 읽지 않는다** — `no-restricted-imports` 가
  `app/**`·`src/components/**` 의 `@/mocks/sample` import 를 막는다.
  데이터는 `src/features/<도메인>/` 의 store·repository 를 지난다.
- 경고도 실패다 — `npm run lint` 는 `--max-warnings 0` 으로 돈다.

## 명령

```bash
# 매일 쓰는 것
npm start              # Expo 개발 서버 (dev client)
npm run android        # dev client 빌드·설치 (네이티브 변경 시)
npm run ios            # 〃 iOS
npm run typecheck      # tsc --noEmit
npm run lint           # eslint (경고 0)
npm run test           # jest        (test:watch — 감시 모드)
npm run format         # prettier 쓰기 (format:check — 검사만, CI 용)
npm run check:theme    # 생성물 자기 검증 — 상류 불필요

# 담당자 전용 (상류 로컬 폴더 필요)
npm run sync:theme     # 상류 토큰 다시 가져오기 — docs/spec/SNAPSHOT.md
```

## 변경 이력

| 날짜       | 변경                                                                                                                                                                                                                                                 |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-07 | **자급형 전환.** 커밋 type 접두 필수화(과거 이력은 불변), 품질 게이트 표 신설(CI 서술 정본화), 상류 참조를 `docs/spec/` 스냅샷으로 교체, 반입 체크리스트를 SNAPSHOT.md 로 이관. "부모 저장소 관행을 따른다"는 상속 선언을 이 문서 자체 규정으로 대체 |
