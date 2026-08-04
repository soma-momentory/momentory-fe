# 작업 규칙

## 저장소 구조

이 저장소는 설계 저장소 `momentory` **안에** 있지만 **별도 저장소**다.

```
C:\SWM\momentory\            설계 — 화면 스펙 · 토큰 · 파이프라인 (자체 git)
  09_MVP/                    ← 우리가 구현하는 30화면. 여기가 1순위 소스
  02_디자인시스템/theme.ts     ← npm run sync:theme 의 원본
  momentory-fe/              ← 여기. 부모 .gitignore 에 등록돼 있다
```

부모가 우리를 무시하는 이유는 `.gitmodules` 없는 gitlink 를 막기 위해서다.
폴더를 안에 둔 것은 `sync:theme` 의 상대 경로를 짧게 쓰기 위해서일 뿐이고,
**이 저장소는 부모 없이도 빌드된다** — 테마와 폰트를 커밋해뒀기 때문이다.

## 커밋

부모 저장소 관행을 따른다 (`06_운영문서/README.md`).

- **작업 단위로 커밋한다.** 첫 줄은 무엇을 했는지, 본문은 왜 했는지.
- 첫 줄에 마침표를 찍지 않고, 50자 안팎으로 끊는다.
- 판단이 바뀐 것(규칙 변경·범위 축소)은 해당 문서의 「변경 이력」 절에도 남긴다.
  git 로그는 터미널을 열어야 보이기 때문이다.

```
아웃박스 재생에 멱등 키 추가

응답 유실 후 재시도가 일기를 중복 생성하던 경로를 막는다.
사용자에게 오류를 띄우지 않는 설계라 중복이 조용히 쌓였다.
```

## 브랜치

- `main` 에 직접 밀지 않는다. `feat/…` `fix/…` `setup/…` 로 나눠 PR 을 연다.
- CI(typecheck · lint · check:theme · 시크릿 검사)가 통과해야 머지한다.

## 값을 다루는 세 등급

**"시크릿"이라는 한 단어로 뭉뜽그리면 사고가 난다.** 세 가지는 성격이 다르다.

### ① 공개 식별자 — 커밋만 안 할 뿐, 비밀이 아니다

| | |
|---|---|
| 카카오 네이티브 앱 키 | `EXPO_PUBLIC_KAKAO_APP_KEY` |
| 구글 OAuth 클라이언트 ID | `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` |
| Firebase 설정 | `google-services.json` · `GoogleService-Info.plist` |

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

`*.jks` `*.p8` `*.p12` `*.keystore` `*.mobileprovision`.
EAS 가 관리하게 두고 로컬에 내려받지 않는다. 받았다면 저장소 밖에 둔다.

세 등급 모두 `.gitignore` 에 있고, CI 가 매 PR 마다 추적 여부를 검사한다.

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

## 생성물

직접 고치면 다음 생성 때 덮인다. **소스를 고치고 다시 만든다.**

| 생성물 | 소스 | 다시 만들기 |
|---|---|---|
| `src/design/theme.ts` | 상류 `05_도구/lib.mjs` | 상류에서 `node 05_도구/export-theme.mjs` → 여기서 `npm run sync:theme` |
| `ios/` `android/` | `app.config.ts` + config plugin | `npx expo prebuild --clean` |

`theme.ts` 는 헤더에 원본 커밋 SHA 와 본문 sha256 을 달고 있다.
`npm run check:theme` 가 손댔는지 검사하고 CI 가 매번 돌린다.

**생성물을 커밋하는 이유**는 재현성이다 — 저장소 밖 파일에 의존하면
CI 와 새 개발자가 같은 빌드를 만들 수 없다.

## 코드 규칙

`09_MVP/docs/RULES.md` 가 정본이고, 아래는 린터가 강제하는 것이다.

- **색을 리터럴로 쓰지 않는다.** `no-restricted-syntax` 가 hex 를 막는다.
  예외는 `src/design/` 과 `app.config.ts` 뿐이다.
- 글자색은 semantic 6종만 — `text.strong` `text.body` `text.caption`
  `text.legal` `text.accent` `text.onDark` (`src/design/tokens.mvp.ts`)
- 폰트는 `fontWeight` 가 아니라 **파일 이름**으로 지정한다
  (`fontFamily: "Pretendard-Bold"`). Android 에서 `fontWeight` 로는 OTF 굵기가 안 바뀐다.
- 경고도 실패다 — `npm run lint` 는 `--max-warnings 0` 으로 돈다.

## 명령

```bash
npm start              # Expo 개발 서버
npm run typecheck      # tsc --noEmit
npm run lint           # eslint (경고 0)
npm run format         # prettier
npm run sync:theme     # 상류 토큰 다시 가져오기
npm run check:theme    # 생성물이 손대졌는지 검사 (CI)
```
