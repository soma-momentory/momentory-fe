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

## 시크릿 — 절대 커밋하지 않는 것

| | |
|---|---|
| 카카오 네이티브 앱 키 | `EXPO_PUBLIC_KAKAO_APP_KEY` |
| 구글 OAuth 클라이언트 ID | `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` |
| Firebase 설정 | `google-services.json` · `GoogleService-Info.plist` |
| 서명 키 | `*.jks` `*.p8` `*.p12` `*.keystore` `*.mobileprovision` |

`app.config.ts` 가 env 에서 읽는다. 공유되는 것은 `.env.example` 뿐이고,
빌드·CI 는 EAS Secrets 를 쓴다. CI 가 매 PR 마다 추적 여부를 검사한다.

> `EXPO_PUBLIC_` 접두는 **번들에 박힌다**. 클라이언트가 어차피 들고 다녀야 하는
> 공개 식별자(앱 키·클라이언트 ID)만 여기 둔다. 서버 시크릿은 절대 넣지 않는다.

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
