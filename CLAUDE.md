# momentory-fe — AI 작업 규칙

모멘토리 앱의 React Native(Expo) 프론트. 이 파일은 **AI 도구가 이 저장소에서 꼭 지킬 것**만 담는다.

| 무엇이 궁금한가                  | 어디                                                                     |
| -------------------------------- | ------------------------------------------------------------------------ |
| 코드가 어디에 무엇이 있나        | [`NAV.md`](NAV.md) — 코드를 읽는 목차                                    |
| 커밋 · 브랜치 · PR · 품질 게이트 | [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) — 저장소 작업 규칙의 정본 |
| 지금 상태 · 남은 일              | [`README.md`](README.md) · [`docs/TASKS.md`](docs/TASKS.md)              |

규칙을 여기에 옮겨 적지 않는다 — 정본이 둘이 되면 한쪽만 고쳐졌을 때 어느 쪽이 맞는지 알 수 없다.
아래는 정본을 가리키는 요약과, 이 저장소에서 AI 가 특히 자주 어긋나는 것이다.

## 화면을 만들기 전에 읽는 것 — 순서대로

1. [`docs/spec/RULES.md`](docs/spec/RULES.md) — 제품 규칙 1순위(범위 · 불변 규칙)
2. [`docs/DESIGN.md`](docs/DESIGN.md) — **디자인 SSOT.** 화면 흐름 · 시각 값 · 문안
3. [`docs/spec/screens/<ID>.md`](docs/spec/screens/) — 화면별 스펙. 화면 ID ↔ 라우트는 [`docs/PRODUCT.md`](docs/PRODUCT.md) 표
4. [`docs/spec/momentory.states.mvp.json`](docs/spec/momentory.states.mvp.json) · [`momentory.schema.mvp.json`](docs/spec/momentory.schema.mvp.json) — 상태 기계 · 엔티티
5. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 기술 설계

**정본이 부딪히면**

- `DESIGN.md` 가 `docs/spec/` 을 **문안까지** 이긴다(결정 N0 · N6). `DESIGN.md` 가 말하지 않는 문안은 `spec/screens/` 가 유일한 출처다.
- 구현이 스펙과 어긋나야 하면 [`docs/PRODUCT.md` 「상류와 차이」](docs/PRODUCT.md)에 적는다 — **코드에 조용히 반영하지 않는다.**
- 예외 화면(`E*` `X*`)은 범위 밖이다 — 마주치면 `PLAN.md` 에 결정을 남기고 진행한다. 스펙 ID 가 겹치면 `docs/spec/` 것을 쓴다.

## 값을 찾는 순서

색 · 크기 · 반경 · 여백을 정할 때 **위에서부터 보고, 없을 때만 아래로 내려간다.**

|     | 어디                                                 | 무엇                                                                  |
| --- | ---------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | [`docs/spec/screens/<ID>.md`](docs/spec/screens/)    | 그 화면의 규칙 · 문안 — `DESIGN.md` 와 겹치면 그쪽이 이긴다           |
| 2   | [`src/design/ds/`](src/design/ds/index.ts)           | **토큰 정본** — 코드에서 쓰는 값                                      |
| 3   | [`docs/DESIGN.md`](docs/DESIGN.md)                   | `ds/` 에 없는 값 · 규칙 — 확인하고 `ds/` 에 **이름을 먼저 만든다**    |
| 4   | [`docs/spec/COMPONENTS.md`](docs/spec/COMPONENTS.md) | ⚠ 원본 기준 · 구조 참고용. 그대로 만들면 어긋난다(배너를 먼저 읽는다) |

- `ds/` 는 대비 검수(WCAG AA)로 시안 값 여섯을 **일부러** 보정했다(`PLAN.md` A-5 · `ds/color.ts` 머리말) —
  되돌리면 `ds/__tests__/contrast.test.ts` 가 깨진다. 대비를 못 넘는 값은 억지로 맞추지 말고 사용자에게 되묻는다.
- `COMPONENTS.md` 와 MVP 정본이 다른 셋: `Card` r18 · ink 10% · 여백 15/17 · `ProgressDots` gap 6 · `BackChevron` 글리프 19 · body.

## 자주 어기게 되는 것

1. **색 · 크기 · 시간을 하드코딩하지 않는다.** 린터가 hex 를 막는다 — `src/design/` 을 쓰고, 새 값은 이름부터 만든다
2. 글자색은 `label` 여섯 단만(`strong` `normal` `neutral` `alternative` `assistive` `disabled` · 색 면 위는 `onFill`).
   브랜드 초록 `primary.normal` 에는 글자를 얹지 않고, 글자가 얹히는 면(주 CTA)은 `primary.heavy` 다
3. **선택 상태를 색만으로 표시하지 않는다** — 테두리 굵기(1→2px)와 글자 굵기를 함께 바꾼다
4. **오류 · 거부 · 실패는 한 줄 안내로 흡수한다** — 모달 · 재시도 · 경고 아이콘 금지(모달은 되돌릴 수 없는 **행동의 확인**에만).
   **숫자로 압박하지 않는다** — 진행률 · 연속 일수 · 점수 · 배지 · % 금지
5. 폰트는 **파일 이름**으로 — 앱 전체가 `"KyoboHandwriting2025lyb"`(`ds/typography.ts`)다(Android 는 `fontWeight` 가 안 먹는다).
   Pretendard(`gothic`)는 로드만 되고 2026-11-08 로그인 개편 뒤 쓰는 화면이 없다
6. **눌리는데 아무 일도 없는 줄을 만들지 않는다** — 갈 곳이 없으면 눌리지 않게 둔다
7. 다크 모드를 넣지 않는다(결정 N1) · 없는 아이콘 글리프를 만들지 않는다(Wanted 세트만 · `components/ds/icons/`)

## 코드를 쓸 때의 경계

자세한 지도는 [`NAV.md`](NAV.md) 「1. 한 바퀴」 · 「6. 단일 통로」.

- **서버 호출은 `src/lib/http.ts` 하나를 지난다** — 자기 `fetch` 래퍼를 만들지 않는다. 응답 형태 검증은 `features/<도메인>/data/` 어댑터 몫
- **화면은 store · `data/` 경계를 지난다.** 서버가 주지 않는 값은 **비워 둔다** — 목 데이터를 되살리지 않는다(테스트 재료는 `src/testing/fixtures.ts` · 앱 코드 import 는 린터가 막는다)
- 시각 · 날짜는 `src/lib/clock.ts` 를 지난다(하루 경계 04:00 · 서버와 같다). 기기 기능(알림 · 캘린더 · 위치 · 소리 · 웹 문서 · 기기 기억)은 `src/lib/` · `deviceStorage.ts` 의 **단일 통로 하나**를 지난다 — 두 번째 길을 만들지 않는다
- `features/**` 는 `ui/` 를 빼고 `@/design/` 을 import 하지 않는다. **제품 규칙(개수 · 글자 수 · 접기)은 도메인 `model/` 에** 둔다 — 디자인 파일에 넣으면 토큰을 지울 때 규칙이 사라진다
- 스키마(`momentory.schema.mvp.json`)에 있는 필드는 지금 안 써도 타입에 둔다
- **화면은 세지 않는다** — 리포트 · 집계 값은 서버 것이다
- 계측은 `src/features/analytics/` 하나 — **본문 · 감정 · 이름을 보내지 않는다.** 새 이벤트 · 속성은 `docs/ANALYTICS.md` 와 함께, 개인정보 경계가 바뀌면 `docs/DATA-SECURITY.md` · `docs/PLAY-DATA-SAFETY.md` 도 고친다
- 앱은 `expo-lab/` 을 import 하지 않는다(Lab 이 앱을 빌려 쓰는 한 방향)
- 새 라이브러리는 사람이 정한다 — 제안만 하고 설치하지 않는다(`docs/CONTRIBUTING.md` 「의존성」)

## 생성물·반입물 — 직접 고치지 말 것

훅(`.claude/hooks/lib/rules.mjs`)이 막는다. 표의 정본은 `docs/CONTRIBUTING.md` 「생성물 — 직접 수정 금지 파일」.

- `docs/spec/**` — 동결 스냅샷. 어긋나야 하면 `PRODUCT.md` 「상류와 차이」, 새 규칙 · 문안은 `DESIGN.md`
- `docs/api/openapi.json` — 서버 계약 스냅샷. `npm run sync:api` 로만
- `ios/` `android/` — `app.config.ts` + `plugins/` 에서 `npx expo prebuild`
- `expo-lab/src/shell/routes.generated.ts` — `npm run lab:routes`
- `.env` · `.env.*` — 쓰지 않는다. 새 키는 `.env.example` 에 이름만 더한다
- `docs/DESIGN.md` 는 생성물이 아니다 — **이 저장소가 소유한다.** 값 · 규칙이 바뀌면 여기를 고친다

## 작업 방식

- **브랜치에서 일한다** — `main` 에 직접 커밋 · push 하지 않는다. 커밋 · 브랜치 · PR 형식은 `docs/CONTRIBUTING.md`
- **머지는 사용자가 결과를 보고 승인한 뒤에만** — 에이전트의 `gh pr merge` · `main` push 는 훅이 막는다. PR 을 올리고 멈춘다
- **검증은 좁게 시작한다** — 바꾼 영역의 테스트 → `npm run typecheck` · `npm run lint` · `npm run test`.
  턴을 끝낼 때 Stop 훅이 typecheck → lint → test → Codex 리뷰를 돈다(`.claude/hooks/README.md`) — 막히면 고친다. 훅을 끄지 않는다
- **문서는 같은 PR 에서 고친다**:
  | 바뀐 것                              | 고칠 문서                                                      |
  | ------------------------------------ | -------------------------------------------------------------- |
  | 새 파일 · 폴더 · 라우트, 모듈의 역할 | `NAV.md` — 빠지면 `scripts/__tests__/navMap.test.ts` 가 깨진다 |
  | 시각 값 · 문안 · 화면 흐름           | `docs/DESIGN.md`                                               |
  | 스펙과 다르게 간 것                  | `docs/PRODUCT.md` 「상류와 차이」                              |
  | 붙이거나 뗀 API                      | `docs/api/README.md`                                           |
  | 계측 이벤트 · 보내는 데이터          | `docs/ANALYTICS.md` (+ 개인정보 문서)                          |
  | 끝낸 일 · 새로 남은 일               | `docs/TASKS.md`                                                |
- 새 화면 파일을 만들면 Lab 목록도 — `npm run lab:routes` + `expo-lab/src/shell/routeMeta.ts` 제목(저장 후 훅이 알려 준다)
- **감사 · 리뷰 요청만으로 제품 코드를 고치지 않는다** — 찾은 것을 보고하고 묻는다
- Expo Lab(웹)은 키보드 · 제스처 · 서체 렌더 · 네이티브 애니메이션이 기기와 다르다 — 마지막 확인은 기기에서

## 스킬 — `.claude/skills/`

Codex 사본이 `.agents/skills/` 에 있다(같은 16개 · [`AGENTS.md`](AGENTS.md) · 차이는 [`docs/CODEX_SKILLS.md`](docs/CODEX_SKILLS.md)) — **고치면 두 사본을 함께 고친다.**
**주 스킬 하나를 먼저 고른다.** 변경 성격이 실제로 겹칠 때만 보조 스킬을 더한다.

| 스킬                        | 언제                                                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `momentory-ux-writing`      | 문구 점검 · 모멘토리 톤으로 다시 쓰기                                                                                                                          |
| `momentory-design-audit`    | 시각 · 서체 · 간격 · 대비 · 토큰 일관성                                                                                                                        |
| `momentory-screen-qa`       | 수정한 화면의 동작 · 상태(로딩 · 빈 · 오류) · 반응형 · 접근성 · 회귀                                                                                           |
| `momentory-pr-review`       | diff 리뷰 — 회귀 · 접근성 · 계측 · 성능                                                                                                                        |
| `momentory-product-journey` | 온보딩 → 기록 → 쉼터 → 회고 → 편지 흐름 점검                                                                                                                   |
| `momentory-analytics-audit` | Amplitude 계측의 누락 · 중복 · 개인정보 경계                                                                                                                   |
| `momentory-ai-quality-eval` | AI 회고 · 다음 날 편지 품질을 합성 사례로 평가                                                                                                                 |
| `momentory-lab-handoff`     | Expo Lab 「AI에게 맡기기」로 넘어온 화면 수정 · 새 화면(정본 `expo-lab/HANDOFF.md`)                                                                            |
| `momentory-lab-verify`      | 바뀐 화면의 Lab 전 · 후 비교 · PR 스크린샷                                                                                                                     |
| `playwright-cli`            | Expo Lab 로컬 화면 관찰                                                                                                                                        |
| 외부 참고 여섯              | `ux-writing` `expo-design-system` `vercel-react-native-skills` `diagnose-activation` `diagnose-retention` `craft-experiment-design` — **이름으로 불렀을 때만** |

- 실제 일기 · 감정 데이터를 외부 도구로 보내지 않는다. Amplitude 가 연결되지 않았으면 운영 데이터를 분석했다고 말하지 않는다

## Expo Lab

`npm run lab:web` → `http://localhost:8085/` — 실제 앱 코드(`app/` 전 라우트)를 웹에서 가짜 서버 데이터로 띄운다
(기기 외형 · 화면 상태 · A/B 비교 · 「AI에게 맡기기」). 사람이 Lab 에서 지시와 참고 그림을 남기면 AI 는 `momentory-lab-handoff`
스킬로 [`expo-lab/HANDOFF.md`](expo-lab/HANDOFF.md) 절차를 따른다. 사용법 정본 [`expo-lab/README.md`](expo-lab/README.md).

## 명령

```bash
npm start            npm run typecheck    npm run lint    npm run test    npm run format:check
npm run android      # dev client 빌드 — Expo Go 는 지원하지 않는다(네이티브 모듈)
npm run lab:web      # Expo Lab(8085)   ·   npm run lab:verify — 바뀐 화면 전 · 후 비교
npm run lab:routes   # app/ 에서 Lab 라우트 목록 다시 만들기
npm run sync:api     # 서버 OpenAPI 계약 재반입 — docs/api/README.md
npm run check:ios-release  # 출시 prebuild 뒤 — iOS Info.plist 에 개발 도구 · 미사용 권한 문구가 없는지(docs/SETUP.md)
```
