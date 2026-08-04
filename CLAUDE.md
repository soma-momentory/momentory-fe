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

## 절대 어기지 않는 것

`09_MVP/docs/RULES.md` 에서 가져온 것. 어기면 화면이 아니라 **제품이 틀린다.**

1. **색·크기·시간을 하드코딩하지 않는다.** 린터가 hex 를 막는다. `src/design/theme.ts` · `tokens.mvp.ts` 를 쓴다
2. 글자색은 semantic 6종만 — `text.strong` `body` `caption` `legal` `accent` `onDark`
3. `primary #C2703D` 는 **장식 전용**(점·바·테두리). 글자가 얹히는 면은 `primaryDeep`
4. 감정은 `theme.emotions` 9종만. 이모지 척도로 바꾸지 않는다
5. 탭 대상 44pt+, 선택지·칩 52pt, 칩 간격 8pt
6. **선택 상태를 색만으로 표시하지 않는다** — 테두리 굵기(1→2px)와 글자 굵기를 함께 바꾼다
7. 모션은 `theme.motion.spec.*` 만. Reduce Motion 이면 opacity 120ms
8. **오류·거부·실패는 한 줄 안내로 흡수한다** — 모달·재시도 버튼·경고 아이콘 금지
9. **숫자로 압박하지 않는다** — 진행률·연속 일수·점수·배지 금지
10. 시안은 절대좌표 375×812지만 **구현은 flex**. 비율 스케일 금지, 여백만 유지
11. 폰트는 `fontFamily: "Pretendard-Bold"` 처럼 **파일 이름**으로 (Android 에서 `fontWeight` 안 먹음)

## 생성물 — 직접 고치지 말 것

- `src/design/theme.ts` ← 상류 `05_도구/lib.mjs`. `npm run sync:theme`
- `ios/` `android/` ← `app.config.ts`. `npx expo prebuild`

`src/design/tokens.mvp.ts` 는 **임시**다 — 상류가 semantic 6토큰을 `lib.mjs` 에
흡수하면 지운다. 오버라이드를 화면 코드에 흩지 않는다.

## 지금 어디까지 왔나

**M0 완료** — 셋업 · git 위생 · 폰트 · 테마 동기화 · `ScreenBackground`.

다음으로 넘어가기 전에 닫혀야 하는 것 (`docs/ARCHITECTURE.md` 말미):

| 막는 것 | 필요한 것 |
|---|---|
| M1 (컴포넌트) | 상류가 semantic 6토큰 + `primaryDeepPress` + 새 배경 그라디언트를 `lib.mjs` 에 반영 |
| M2 이후 | `docs/api/openapi.yaml` — BE 팀과 합의한 계약 + 멱등성 규약 |
| M3 (첫 로컬 쓰기) | `docs/DATA-SECURITY.md` — 민감 필드 저장 위치·암호화·삭제 보장 |

## 명령

```bash
npm start            npm run typecheck    npm run lint
npm run sync:theme   npm run check:theme
```
