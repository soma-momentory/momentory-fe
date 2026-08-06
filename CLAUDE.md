# momentory-fe

모멘토리 앱의 React Native 프론트. **MVP 30화면**을 만든다.

## 먼저 읽을 것 — 순서대로

설계는 부모 저장소 `C:\SWM\momentory\` 에 있다. **화면을 만들기 전에 반드시 본다.**

1. `../09_MVP/docs/RULES.md` — **1순위.** 범위 · 「원본과 다른 것」 표 · 불변 규칙 · 구현 순서
2. `../09_MVP/스펙/momentory.states.mvp.json` — 상태 기계 6개. `states.<키>` 하나가 화면 하나
3. `../09_MVP/스펙/momentory.schema.mvp.json` — 엔티티 6개. `guard` 문장이 여기 필드로 번역된다
4. `../09_MVP/docs/<ID>.md` — 화면별 스펙
5. `docs/ARCHITECTURE.md` — 이 저장소의 기술 설계
6. `docs/CONTRIBUTING.md` — 커밋 · 시크릿 · 생성물 규칙

> ⚠ **`01_화면설계/` 와 `09_MVP/` 에 같은 ID 가 있고 내용이 다르다.**
> 우리가 만드는 것은 `09_MVP/` 다. 특히 `C4-b` 는 양쪽이 아예 다른 화면이다.
> 예외(`E*` `X*`)·쉼터(`R*`)는 MVP 범위 밖이지만 **규칙이 사라진 것은 아니다** — 마주치면 `01_화면설계/` 를 본다.

## 규칙의 정본은 여기가 아니다

이 파일은 **길잡이**다. 규칙을 여기에 옮겨 적으면 정본이 둘이 되고, 한쪽만 고쳐졌을 때
어느 쪽이 맞는지 알 수 없게 된다. 실제 규칙은 두 곳에 산다:

- **제품·디자인 규칙** → `../09_MVP/docs/RULES.md` (상류 정본)
- **저장소 작업 규칙** → [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) (커밋·시크릿·의존성·생성물)

아래는 **자주 어기게 되는 것 다섯 개**의 요약일 뿐이다. 판단이 갈리면 위 두 문서를 본다.

1. **색·크기·시간을 하드코딩하지 않는다.** 린터가 hex 를 막는다 — `src/design/` 을 쓴다
2. 글자색은 semantic 6종만 (`text.strong` `body` `caption` `legal` `accent` `onDark`).
   `primary #C2703D` 는 **장식 전용**이고 글자가 얹히는 면은 `primaryDeep` 이다
3. **선택 상태를 색만으로 표시하지 않는다** — 테두리 굵기(1→2px)와 글자 굵기를 함께 바꾼다
4. **오류·거부·실패는 한 줄 안내로 흡수한다** — 모달·재시도·경고 아이콘 금지.
   **숫자로 압박하지 않는다** — 진행률·연속 일수·점수·배지 금지
5. 폰트는 `fontFamily: "Pretendard-Bold"` 처럼 **파일 이름**으로 (Android 는 `fontWeight` 가 안 먹는다)

## 생성물 — 직접 고치지 말 것

- `src/design/theme.ts` ← 상류 `05_도구/lib.mjs`. `npm run sync:theme`
- `ios/` `android/` ← `app.config.ts`. `npx expo prebuild`

`src/design/tokens.mvp.ts` 는 **임시**다 — 상류가 semantic 6토큰을 `lib.mjs` 에
흡수하면 지운다. 오버라이드를 화면 코드에 흩지 않는다.

## 지금 어디까지 왔나

**M0 완료, M1 진행 중.** 지금 있는 것은 아래와 같다 — 문서의 목표 구조를 이미 있는 것으로 착각하지 말 것.

```
app/_layout.tsx  app/index.tsx  app/(auth)/login.tsx
src/design/{theme.ts, tokens.mvp.ts}
src/components/primitives/{ScreenBackground.tsx, AppText.tsx, AppButton.tsx, Card.tsx}
src/lib/providers.tsx   ← Provider 는 여기. _layout.tsx 가 아니다
src/components/primitives/__tests__/
```

설치된 것: expo-router · expo-dev-client · expo-font · react-native-svg · safe-area-context.
**아직 없는 것: TanStack Query · Zustand · MMKV · Reanimated · MSW.**
도입 시점은 `docs/ARCHITECTURE.md §1` 「도입 예정」 표에 있다.

CI 는 `check:theme` · `typecheck` · `lint` · `test` · 시크릿 검사를 돈다.

다음으로 넘어가기 전에 닫혀야 하는 것:

| 막는 것 | 필요한 것 |
|---|---|
| M2 이후 | `docs/api/openapi.yaml` — BE 팀과 합의한 계약 + 멱등성 규약 |
| M3 (첫 로컬 쓰기) | `docs/DATA-SECURITY.md` — 민감 필드 저장 위치·암호화·삭제 보장 |

## 명령

```bash
npm start            npm run typecheck    npm run lint
npm run sync:theme   npm run check:theme
npm run android      # 공식 개발 환경인 dev client 빌드 — Expo Go 는 지원하지 않는다
```
