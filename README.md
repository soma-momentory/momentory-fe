# momentory-fe

모멘토리 앱의 React Native 프론트엔드. **MVP 30화면** — 열고 → 다섯 가지 묻고 → 담고 →
밤에 돌아보고 → 일기가 남고 → 다시 읽는다.

## 시작하기

```bash
nvm use              # .nvmrc — Node 22.14
npm ci
cp .env.example .env # 값은 팀 시크릿(EAS Secrets)에서 받는다
npm start
```

네이티브 모듈(카카오 로그인·캘린더·알림·생체인증)이 들어가면 Expo Go 로는 못 돌린다.
그때부터는 dev client 를 쓴다 — `npx expo prebuild` 후 `npm run ios` / `npm run android`.

## 스택

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript 6 (strict) · expo-router.
선택 이유와 대안은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 설계는 어디에 있나

이 저장소에 화면 스펙이 없다. 부모 저장소 `momentory` 가 갖는다.

| 무엇 | 어디 |
|---|---|
| **MVP 30화면 규칙 · 구현 순서** | `../09_MVP/docs/RULES.md` ← 1순위 |
| 상태 기계 6개 · 엔티티 6개 | `../09_MVP/스펙/` |
| 화면별 스펙 | `../09_MVP/docs/<ID>.md` |
| 눈으로 보기 | `../03_미리보기/MVP.html` |
| 토큰 정본 | `../02_디자인시스템/theme.ts` → `npm run sync:theme` |

**이 저장소는 부모 없이도 빌드된다** — 테마와 폰트를 커밋해뒀다. 부모는 설계를 고칠 때만 필요하다.

## 문서

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 기술 설계 · 데이터 레이어 · 아웃박스 계약
- [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — 커밋 · 브랜치 · 시크릿 · 생성물
- [`CLAUDE.md`](CLAUDE.md) — 절대 어기지 않는 규칙 11개
- [`assets/fonts/README.md`](assets/fonts/README.md) — Pretendard 출처·해시·라이선스

## 진행

**M0 완료** — 셋업 · git 위생 · Pretendard · 테마 동기화 · `ScreenBackground`.
다음 단계의 선행 조건은 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) 말미에 있다.
