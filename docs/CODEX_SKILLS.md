# Momentory Codex 검수 스킬

저장소 루트에서 Codex를 열면 `.agents/skills/`의 전용 스킬 세 개가 요청에 따라 선택된다. `AGENTS.md`는 이 세 검수 작업의 경로만 안내한다. 디자인·제품 결정은 `docs/DESIGN.md`, `src/design/ds/`, 화면 스펙과 실제 구현을 확인한다. 감사 요청은 읽기 전용이다.

## 설치 목록

| 스킬                         | 목적                               | 출처와 고정 커밋                                                                                                                                 | 선택 방식                         |
| ---------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------- |
| `momentory-ux-writing`       | 한국어 문구·회고·다음 날 편지      | 이 저장소                                                                                                                                        | 자동                              |
| `momentory-design-audit`     | 타이포그래피·대비·토큰·화면 일관성 | 이 저장소                                                                                                                                        | 자동                              |
| `momentory-screen-qa`        | 수정 화면·상태·상호작용·성능 QA    | 이 저장소                                                                                                                                        | 자동                              |
| `ux-writing`                 | 일반 UX 문장 기준과 참고 자료      | [content-designer/ux-writing-skill](https://github.com/content-designer/ux-writing-skill/tree/98cacde4ba2dd10ed28df43a8d53eef1e321c539)          | 직접 지정 또는 전용 스킬에서 참고 |
| `expo-design-system`         | Expo 토큰·컴포넌트 드리프트 감사   | [expo/skills](https://github.com/expo/skills/tree/3d1ca4e2a3c5ffc14817a85dde0bf1b188e9753d/plugins/expo/skills/expo-design-system)               | 직접 지정 또는 전용 스킬에서 참고 |
| `vercel-react-native-skills` | React Native 성능 위험 참고        | [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/063bee94c3f4df8453406c830b0a7df0f2860278/skills/react-native-skills) | 직접 지정 또는 전용 스킬에서 참고 |

외부 스킬은 설치 도우미로 프로젝트 로컬에 복사했다. 일반 스킬이 모멘토리 전용 판단과 중복 실행되지 않도록 외부 세 개의 자동 선택을 껐다. Expo 설치본의 `version`을 Codex 검증기가 허용하는 `metadata.version`으로 옮기고, 사용자가 요청하지 않은 Expo 피드백 전송 명령을 제거했다. `ux-writing`의 Figma 연동 문서와 중복 배포 ZIP, `vercel-react-native-skills`의 소개·메타 파일 및 규칙 파일과 중복되는 합본 `AGENTS.md`는 이번 검수에 필요하지 않아 포함하지 않았다. 외부 원문의 서식을 보존하려고 세 설치 폴더를 `.prettierignore`에 넣었다. 외부 명령·설치 스크립트는 실행하지 않았고 `package.json`도 바꾸지 않았다.

## Claude Code 사본

같은 14개 스킬을 `.claude/skills/` 에도 둔다(2026-11-01). Claude Code 는 `.agents/skills/` 를 읽지 않기 때문이다. Codex 사본과의 차이는 넷뿐이다:

- `agents/openai.yaml`(Codex 전용)은 없다.
- 위에서 자동 선택을 끈 외부 스킬 5개(`ux-writing` · `expo-design-system` · `vercel-react-native-skills` · `diagnose-activation` · `diagnose-retention`)는 `SKILL.md` frontmatter 에 `disable-model-invocation: true` 를 둔다 — Codex 의 `allow_implicit_invocation: false` 와 같은 뜻이다.
- 본문의 Codex 호출 표기 `$스킬이름` 을 Claude 표기 `/스킬이름` 으로 바꿨다.
- `momentory-analytics-audit` 의 MCP 확인 명령이 `codex mcp list` 대신 `claude mcp list` 다.

스킬을 고칠 때는 **두 사본을 함께 고친다.**

## 조사했지만 설치하지 않은 후보

| 후보                                                                                              | 확인 결과                                                                                                                                            |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| [claudianus/toss-ux-writing-skill](https://github.com/claudianus/toss-ux-writing-skill)           | 존재하지만 현재 `SKILL.md`의 YAML `description`에 인용되지 않은 콜론이 있어 파싱 실패. 토스식 명확성은 전용 스킬에 원칙 수준으로 반영했다.           |
| [brunoviews/agent-skills](https://github.com/brunoviews/agent-skills)                             | React Native 디자인 스킬과 대비 스크립트가 있으나 Expo 디자인 스킬과 저장소의 대비 테스트에 중복된다.                                                |
| [Community-Access/accessibility-agents](https://github.com/Community-Access/accessibility-agents) | Codex용 스킬이 있지만 검토한 디자인 감사 스킬은 웹 CSS/Tailwind 중심이고 별도 에이전트 위임 흐름을 요구한다. RN 접근성은 전용 감사에서 점검한다.     |
| [microsoft/playwright](https://github.com/microsoft/playwright)                                   | 공식 `playwright-cli` 스킬이 있지만 별도 CLI를 전제로 한다. 이 저장소는 이미 `@playwright/test`, `expo-lab/e2e/`, `playwright.config.ts`를 사용한다. |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)의 웹 스킬                 | React DOM·웹 디자인 규칙은 RN 운영 화면의 직접 기준이 아니므로 모바일 성능 스킬만 골랐다.                                                            |

## 빠른 사용법

| 요청 예시                                                          | 선택할 전용 스킬         |
| ------------------------------------------------------------------ | ------------------------ |
| `모멘토리 문구 점검해줘` / `이 문장을 모멘토리 톤으로 바꿔줘`      | `momentory-ux-writing`   |
| `이 화면 타이포그래피 검사해줘` / `전체 앱 디자인 일관성 검사해줘` | `momentory-design-audit` |
| `방금 수정한 화면 QA 해줘` / `프론트 성능 점검해줘`                | `momentory-screen-qa`    |

자동 선택이 애매하면 `$momentory-design-audit`처럼 이름을 지정한다. 외부 자료를 직접 보고 싶으면 `$expo-design-system`, `$ux-writing`, `$vercel-react-native-skills`로 부른다. 스킬 목록이 표시되지 않으면 저장소 루트에서 새 Codex 세션을 열거나 Codex를 다시 시작한다.

Expo Lab은 `npm run lab:web`으로 띄우고 기본 8081에서 `http://localhost:8081/#studio/home-main`을 연다. 화면 비교는 Lab의 Mock과 운영 앱 라우트·데이터 차이를 구분해 보고한다. QA 명령은 범위에 따라 `npm run typecheck`, `npm run typecheck:expo-lab`, `npm run lint`, 관련 Jest, `EXPO_LAB_PORT=8081 npx playwright test ...`를 사용한다. Windows PowerShell에서는 Playwright 실행 전 `$env:EXPO_LAB_PORT='8081'`로 지정한다.

## 샘플 감사: 홈 v2

- **범위:** Expo Web Design Studio의 `home-main`, B 미리보기, 375pt, 글씨 1×/1.5×. `HomeV2Preview`는 운영 `HomeV2View`를 공유하지만 데이터·라우팅은 Mock이다.
- **확인:** 홈 Jest 27개, 앱/Expo Lab 타입 검사, ESLint 통과. `layout-matrix.spec.ts`의 홈 4개 폭 × 3개 글씨 배율도 통과했다. 이 테스트는 루트의 가로 넘침과 존재 여부를 확인하며 요소 간 겹침은 검출하지 않는다.
- **높음 — 1.5× 겹침:** 375pt에서 히어로 카드 하단이 Lab 화면 좌표 818.8px, 고정된 `WeekDock` 상단이 800.6px으로 **약 18.3px 겹친다**. ‘오늘 일정’ 제목과 감정 버튼도 시각적으로 가까워 읽기 어렵다. `src/features/home/ui/v2/HomeV2View.tsx`의 절대 배치와 큰 글씨의 세로 확장을 함께 검토할 필요가 있다. 이번 작업에서는 수정하지 않았다.
- **결정 필요 — 서체 기준:** 이번 요청은 본문 Pretendard·짧은 제목 Gaegu를 설명하지만, 현재 `docs/DESIGN.md` §2와 `src/design/ds/typography.ts`는 앱 대부분을 교보손글씨, 로그인만 Pretendard, 홈 v2만 Gaegu 예외로 정의한다. 향후 감사의 합격 기준을 정하기 전 이 차이를 확인해야 한다.
- **문서 차이:** `docs/DESIGN.md`의 홈 v2 설명에는 운영 미적용이라고 남아 있지만 현재 `app/(tabs)/home.tsx`는 `HomeV2View`를 사용한다. 문서 갱신은 별도 작업이다.
- **미검증:** iOS·Android 실기기 글자 배율, 스크린리더, 키보드, 성능 계측, 전체 화면 감사. Expo Web 결과를 기기 통과로 간주하지 않는다.

## 검증 기록

- `quick_validate.py`로 설치·제작한 6개 스킬의 형식 검사 통과. Windows에서는 `PYTHONUTF8=1` 지정이 필요했다.
- 새 `codex exec --ephemeral --sandbox read-only` 세션에서 자동 노출 스킬 이름 세 개를 확인하고 위 예시 문장 여섯 개의 선택 경로가 모두 의도한 스킬과 맞는지 점검했다. 이 검사는 경로 선택 확인이며 실제 감사 품질이나 향후 요청의 적중률을 보증하지 않는다.
- `npm run typecheck`, `npm run typecheck:expo-lab`, `npm run lint`, 홈 Jest 27개, 8081의 홈 Lab 레이아웃 매트릭스 1개 통과.
- 기존 미커밋 제품 변경은 그대로 두었고, 커밋·푸시·PR은 만들지 않았다.

## 2026-10-22 확장: P0 검수 환경

기존 6개 스킬과 미커밋 변경을 보존했다. 프로젝트 로컬 `.agents/skills/`에 공식 스킬 4개, 모멘토리 전용 스킬 4개를 추가했다. 공식 스킬은 고정 커밋에서 반입했다. Amplitude 3개는 Codex 형식 검사에서 허용되지 않는 `suggest_when` frontmatter 줄만 제거했으며 설명과 본문은 유지했다. 실행 스크립트는 추가하지 않았다. 앱 UI·문구·비즈니스 로직, 의존성, 외부 계정·유료 기능, 원격 데이터는 변경하지 않았다.

| 스킬                        | 상태와 역할                           | 출처·실행 조건                                                                                                                                                                                         |
| --------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `playwright-cli`            | 설치·Lab 실행 확인                    | [Microsoft@b1a5903](https://github.com/microsoft/playwright-cli/tree/b1a5903c5b633b8c9f843ad7b629c2a78437040c/skills/playwright-cli); 기존 `@playwright/test`의 `npx --no-install playwright cli` 사용 |
| `diagnose-activation`       | 설치, 온보딩·첫 가치 가설             | [Amplitude@51838c2](https://github.com/amplitude/builder-skills/tree/51838c2d85560466d1bbc174ea0e645bb9c44ea9/growth-skills/skills/diagnose-activation); 실측 수치 없으면 퍼널 수치 작성 금지          |
| `diagnose-retention`        | 설치, 재방문·유지율 정의              | [Amplitude@51838c2](https://github.com/amplitude/builder-skills/tree/51838c2d85560466d1bbc174ea0e645bb9c44ea9/growth-skills/skills/diagnose-retention); 코호트 수치는 연결 전 미검증                   |
| `craft-experiment-design`   | 설치, 실험안 설계                     | [Amplitude@51838c2](https://github.com/amplitude/builder-skills/tree/51838c2d85560466d1bbc174ea0e645bb9c44ea9/product-skills/skills/craft-experiment-design); 실험 게시 없음                           |
| `momentory-product-journey` | 설치, 화면·이벤트 사전 기반 여정 검수 | 요청 여정만 검수                                                                                                                                                                                       |
| `momentory-ai-quality-eval` | 설치, AI 회고·편지 합성 사례 평가     | 실제 일기·감정 데이터 외부 전송 금지                                                                                                                                                                   |
| `momentory-analytics-audit` | 설치, 이벤트 계측·개인정보 감사       | MCP 미연결 시 정적 확인만                                                                                                                                                                              |
| `momentory-pr-review`       | 설치, 변경 diff 중심 회귀 리뷰        | 리뷰 요청만으로 수정·게시하지 않음                                                                                                                                                                     |

각 전용 `SKILL.md`는 **트리거, 검수 범위, 검사 근거, 결과 형식, 실행 비용, 수정 승인 조건**을 명시한다. 공식 스킬은 원문을 유지하고 `AGENTS.md`의 프로젝트 경계를 따른다. Amplitude 원문의 차트 작성·세션 리플레이 제안은 현재 환경에서 실행하지 않는다. `docs/ANALYTICS.md`에 따르면 자동 리플레이는 사용하지 않는다. 작은 변경은 변경 영역만, 전체 앱 감사는 명시적 요청 때만 검사한다. 외부 조회·전송·유료 실행·게시에는 범위와 비용을 밝히고 별도 명시적 허가를 받는다.

### 선별·연결 판단

| 후보                     | 상태와 근거                                                                                                                                                                                                                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `map-growth-loops`       | 보류. 현재 온보딩·기록·재방문보다 범위가 넓고 측정할 루프가 정의되지 않음                                                                                                                                                                                                                                                       |
| `discover-opportunities` | 보류. Amplitude 지표·실험·피드백을 합치는 넓은 조사이며 MCP 미연결                                                                                                                                                                                                                                                              |
| `analyze-dashboard`      | 보류. Amplitude 대시보드 연결과 조회 권한 필요                                                                                                                                                                                                                                                                                  |
| `analyze-feedback`       | 보류. 실제 사용자 피드백 접근과 개인정보 검토 필요                                                                                                                                                                                                                                                                              |
| Amplitude MCP            | **미연결**. `codex mcp list`와 현재 도구 목록에 없음. 앱의 `@amplitude/analytics-react-native`는 발송 SDK이지 Codex 조회 연결이 아님. 운영 지표·코호트 분석 **미검증**                                                                                                                                                          |
| Maestro MCP              | **미연결·설치 보류**. 공식 [Maestro MCP 안내](https://docs.maestro.dev/get-started/maestro-mcp)는 CLI 내장 서버와 `codex mcp add maestro -- maestro mcp`를 안내한다. Windows에 Java 21·`JAVA_HOME`·ADB는 있으나 `maestro` 명령과 `.maestro/` 테스트가 없음. Android 에뮬레이터/앱 빌드 준비 후 합성 데이터용 흐름부터 별도 구축 |
| `getsentry/plugin-codex` | 도입 보류. [공식 플러그인](https://github.com/getsentry/plugin-codex)은 Sentry MCP·SDK 설정·운영 이슈 분석용. 저장소의 의존성·앱 설정·운영 문서에서 Sentry 또는 다른 크래시 모니터링 SDK/설정을 발견하지 못했다. 저장소 밖의 운영 모니터링 여부는 확인할 수 없어 팀 확인 후 재평가                                              |
| Expo EAS 스킬            | 도입 보류. [Expo 공식 목록](https://github.com/expo/skills/blob/main/plugins/expo/skills/README.md)의 `eas-app-stores`, `eas-workflows`, `eas-update` 등은 서비스·계정·요금 영향이 있음. `eas.json`이 없고 `docs/SETUP.md`는 현재 로컬 Xcode/Gradle 배포를 명시. EAS Build/Submit은 향후 별도 검토 대상                         |

Maestro는 네이티브 E2E, Playwright는 Expo **Web** Lab에 사용한다. 웹 통과를 기기 통과로 간주하지 않는다. [Maestro Windows 설치 안내](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli)는 Java 17 이상을 요구한다. CLI 설치·MCP 등록·테스트 실행과 iOS/Android 실기기 검증은 이번 작업에서 하지 않았다.

Maestro 준비 순서: Android 에뮬레이터와 테스트용 네이티브 빌드를 확보하고, 테스트 계정·합성 기록만 사용하는 첫 시나리오(앱 실행 → 홈 확인 → 이번 주 감정 열기 → 기록 없음 확인)를 정한다. 그다음 공식 CLI 설치·`maestro --version` 확인, 로컬 flow 작성·실행, `codex mcp add maestro -- maestro mcp` 등록 순서로 검증한다. CLI 없는 현재 상태에서 실행 가능하다고 표시하지 않는다.

### 호출 예시·우선순위

- P0 `방금 수정한 홈 화면 QA 해줘` → `$momentory-screen-qa`, 필요한 경우 `$playwright-cli`. `npm run lab:web`의 기본 포트 **8081**에서 `http://127.0.0.1:8081/#studio/home-main`을 확인한다. 예: `npx --no-install playwright cli open 'http://127.0.0.1:8081/#studio/home-main' --mobile`, `npx --no-install playwright cli find '이번 주 감정'`, `npx --no-install playwright cli close`.
- P0 `온보딩에서 첫 기록까지 사용자 여정 점검해줘` → `$momentory-product-journey`; `diagnose-activation`은 가설 틀로 참고한다.
- P0 `AI 회고 품질을 합성 사례로 평가해줘` → `$momentory-ai-quality-eval`; 실제 데이터·외부 모델 호출 없이 정적 검사부터 한다.
- P0 `새 이벤트가 일기 내용을 보내는지 점검해줘` → `$momentory-analytics-audit`; MCP가 없으면 코드·사전만 판단한다.
- P0 `현재 diff PR 리뷰해줘` → `$momentory-pr-review`; 변경 파일과 직접 영향받는 경로만 본다.
- 추후 `$diagnose-retention 재방문 정의를 검토해줘`, `$craft-experiment-design 첫 기록 유도 실험안을 만들어줘`. 실측 통계는 Amplitude MCP 연결과 명시적 조회 요청 이후로 분리한다.

### 읽기 전용 샘플: 홈 v2 Lab

- 2026-10-22, 이미 실행 중이던 `localhost:8081`의 `#studio/home-main`을 `npx --no-install playwright cli` 모바일 브라우저로 열었다. Lab Mock이며 운영 앱/사용자 데이터가 아니다.
- 미리보기 A에서 `이번 주 감정`을 누르면 일~토 버튼이 나타났고 `수요일 · 기록 없음`을 누르면 선택 결과가 같은 영역에 표시됐다. 브라우저 세션은 닫고 생성된 스냅샷/로그는 제거했다.
- 웹 콘솔 오류 2건: `accessibilityElementsHidden`, `importantForAccessibility` React Native prop이 DOM 요소로 전달된다는 React 오류. 화면 코드 수정은 범위 밖이라 하지 않았다. 레이아웃·시각적 겹침과 네이티브 접근성은 이번 좁은 샘플에서 검증하지 않았다. 앞선 감사의 375pt/1.5배 겹침 발견은 위 기록대로 남아 있다.
- 새 8개 스킬의 `quick_validate.py` 형식 검사, `AGENTS.md`·이 문서·전용 스킬의 Prettier 검사, `npm run typecheck`, `npm run typecheck:expo-lab`, `npm run lint`가 통과했다. 실제 자동 호출 여부는 새 Codex 세션에서 확인해야 한다. 운영 데이터 분석, Maestro E2E, iOS/Android 실기기, Sentry/EAS 연결은 수행하지 않았다.

## 2026-10-22 실사용 검증: 14개 스킬

### 자동 선택·명시 호출

합성 문구·상태만 넣은 독립 `codex exec --ephemeral --sandbox read-only --json` 세션에서 **라우팅 이름 응답**을 확인했다. 도구 실행을 막은 짧은 프롬프트이므로 스킬 내부 절차의 실제 완료나 미래 요청의 자동 선택 성공률을 증명하지 않는다. 14개 모두 `quick_validate.py` 형식 검사를 통과했다. 아래 `자동`은 해당 자연어 요청에서 기대한 주 스킬 이름이 응답된 경우, `명시`는 `$이름` 호출의 인식만 확인한 경우다.

| 스킬                         | 자연어 시나리오                             | 확인 수준                                                                                 |
| ---------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `momentory-ux-writing`       | 모멘토리 버튼 문구 점검                     | 자동·명시 라우팅 확인; 홈·쉼터·보관함 문구 샘플 적용                                      |
| `momentory-design-audit`     | 화면 타이포그래피 검사 / 버튼 간격 4px 수정 | 자동 라우팅 확인; 대표 화면 시각·코드 감사 적용                                           |
| `momentory-screen-qa`        | 수정한 쉼터 화면 QA / Lab 조작              | 자동 라우팅 확인; Lab 상태·콘솔·겹침 검증 적용                                            |
| `momentory-product-journey`  | 온보딩→첫 기록 이탈                         | 자동 라우팅 확인; 전체 여정 감사 실행은 미검증                                            |
| `momentory-ai-quality-eval`  | AI 회고 합성 사례 평가                      | 자동 라우팅 확인; 실제 평가 실행은 미검증                                                 |
| `momentory-analytics-audit`  | 일기 내용 이벤트 전송 여부 검사             | 자동 라우팅 확인; 전체 계측 감사·운영 조회 미검증                                         |
| `momentory-pr-review`        | 로컬 diff PR 리뷰                           | 자동 라우팅 확인; 실제 PR 전체 리뷰 미검증                                                |
| `ux-writing`                 | 일반 UX 문구 검토                           | 명시 호출 인식; 자동 호출은 기존 정책상 비활성                                            |
| `expo-design-system`         | Expo 토큰 드리프트 검사                     | 명시 호출 인식; 자동 호출은 기존 정책상 비활성                                            |
| `vercel-react-native-skills` | RN 긴 목록 성능 위험                        | 명시 호출 인식; 자동 호출은 기존 정책상 비활성, 성능 계측 미실시                          |
| `playwright-cli`             | Expo Web Lab 브라우저 확인                  | 명시 호출 인식·로컬 CLI 실사용 확인; 자연어 Lab 요청은 주 스킬 `momentory-screen-qa` 선택 |
| `diagnose-activation`        | 신규 사용자 활성화 진단                     | 명시 호출 인식; 중복 선택 방지를 위해 자동 호출 비활성, 실측 분석 미실시                  |
| `diagnose-retention`         | 재방문 코호트 진단                          | 명시 호출 인식; 자동 호출 비활성, 코호트 데이터 미연결                                    |
| `craft-experiment-design`    | 첫 기록 유도 A/B 실험안                     | 자동 라우팅 확인; 실제 실험 설계·게시 미실시                                              |

처음에는 `첫 기록 전 이탈을 여정과 이벤트 정의로 진단` 요청에 여정·계측·활성화 **3개**가 함께 제안됐다. `AGENTS.md`에 주 스킬 하나와 보조 스킬 추가 조건을 명시하고 `diagnose-activation`·`diagnose-retention`을 명시 호출 전용으로 설정한 뒤, 같은 요청의 주 스킬 응답이 **`momentory-product-journey` 하나**로 바뀌었다. 이는 해당 프롬프트의 라우팅 확인이며 실제 스킬 로딩 횟수 측정은 아니다. 일반 버튼 간격 수정은 `momentory-design-audit` 하나를 제안했다.

단문 UX 재작성은 **실제 실행**도 비교했다. 합성 문장 `오늘도 꼭 일기를 써야 해요`를 처음 자동 재작성했을 때 결과의 톤은 적절했지만 디자인 문서 전체와 넓은 코드 검색으로 입력 토큰 91,137개를 사용했다. `momentory-ux-writing`과 `AGENTS.md`에 단문 재작성은 화면 문서를 열지 않는 규칙을 추가한 뒤 같은 요청은 스킬 파일만 읽고 문서·코드 전체 검색 없이 답했으며 입력 토큰은 44,954개였다(약 51% 감소). 이 수치는 해당 세션의 보고값이고 이후 모든 실행의 비용을 보장하지 않는다.

다만 재작성 예시가 `일기`를 `마음`으로 바꿔 원문의 대상을 좁혔다. 톤은 부드러워졌지만 의미 보존에는 미흡했다. UX 스킬 체크리스트에 **강요를 덜면서도 구체적인 대상·기능을 유지**하도록 추가했다. 이 수정 이후의 실제 재작성 품질은 다시 실행하지 않았으므로 미검증이다.

### 대표 화면 검수 — Expo Web Lab Mock

`localhost:8081`의 홈 `home-main`, 쉼터 `rest-hub`, 보관함 `archive`를 검사했다. 각 화면의 실제 공유 RN View와 Lab Mock 데이터를 구분했다. 회고는 이 Studio의 대표 화면 목록에 없어 직접 실행하지 않았다.

| 관점        | 찾은 내용                                                                                                                                                                                                 | 근거와 한계                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 디자인 감사 | **높음:** 홈 B, 375pt·글씨 1.5×에서 히어로 하단 818.825px, 감정 도크 상단 800.550px으로 **18.275px 겹침**. 1×에서는 114.75px 간격. **결정 필요:** 본문 Pretendard·제목 Gaegu 목표와 현행 서체 정본 불일치 | 브라우저 경계 측정·화면 캡처·`HomeV2View`/`HeroCard`/`WeekDock`/타이포 토큰 확인. 쉼터 긴 요약과 보관함 빈 상태는 같은 375pt·1.5×에서 확인한 루트의 가로 넘침 없음(각각 375/375px) |
| UX 문구     | 보관함 빈 상태의 `비어 있어도 괜찮은 날이에요.`는 정보 뒤에 위로를 더한다. **낮음·편집 판단 필요**: 빈 상태에서 설명만 남길지 톤 결정 필요. 검사한 홈·쉼터 기본 문구에는 확정 결함 없음                   | `ArchiveView.tsx` 실제 문자열과 Lab 표시를 대조. 전체 문구·오류 상태 감사를 뜻하지 않음                                                                                            |
| 화면 QA     | 홈 겹침 재현. 홈·쉼터·보관함을 **각각 새 브라우저 세션**으로 열면 React 웹 콘솔에 같은 접근성 prop 오류 2건 발생. 쉼터 긴 요약은 카드 안에서 줄바꿈되고 가로 넘침 없음. 보관함 빈 상태 문구 노출 확인     | Lab Mock·웹 결과. 스크린리더, 네이티브 E2E, 운영 데이터 미검증                                                                                                                     |

디자인과 QA가 함께 잡은 **홈 겹침은 한 건**으로 집계한다. 디자인 감사가 위치·서체·토큰을, QA가 실제 동작·콘솔·상태를, UX 문구 스킬이 사용자에게 읽히는 말을 맡는다. 화면마다 세 스킬을 모두 실행하지 않는다. `layout-matrix.spec.ts`의 홈 폭·배율 검사는 루트의 가로 넘침과 존재만 확인해 위 겹침을 잡지 못한다. 해당 홈 검사와 쉼터 상태 비교 Playwright 검사 **2개가 통과**했어도 겹침은 남아 있다. `momentory-screen-qa`에 고정 도크·탭바의 실제 경계 교차 확인을 추가했다.

### 재현 원인·수정 제안

1. **홈 겹침 — 높음.** `HeroCard`는 글씨 배율이 커지면 상단 패딩(`128 + 60 × 추가 배율`)과 텍스트 행간으로 높이가 늘어난다. `WeekDock`은 선택 결과가 없어도 큰 글씨 기준 말풍선 자리를 높이에 예약하고, `HomeV2View`는 도크를 아래에 절대 배치한다. 목록 모드 계산과 아래 여백은 도크의 실제 전체 높이·고정 히어로 간 최소 간격을 보장하지 않는다. 홈 375pt·1.5×에서 가독성과 조작 가능성에 위험이 생긴다. 수정 시 도크의 실제 점유 높이를 측정·예약하고 히어로가 커지면 본문 스크롤로 전환하며, 주요 요소의 경계 교차를 회귀 검사에 넣어야 한다.
2. **웹 접근성 prop 오류 — 보통.** 장식용 RN `View`/`Image`에 준 `accessibilityElementsHidden`과 `importantForAccessibility`가 Web DOM까지 전달돼 React가 알 수 없는 prop으로 경고한다. 홈 `HeroCard`·`WeekDock`·모눈 배경, 쉼터 장식, 보관함 장식 등 여러 사용처가 있다. Lab 콘솔 신호를 가리고 Web 접근성 의미 전달 여부를 별도 확인해야 한다. 수정 시 웹에서는 지원되는 `aria-hidden` 방식으로, iOS/Android에서는 기존 RN 속성으로 전달하도록 공통 장식 처리 방식을 검토한다. 스크린리더 실제 영향은 미검증이다.
3. **서체 정본 차이 — 결정 필요.** 과거 요청의 본문 Pretendard·짧은 제목 Gaegu와 달리 `docs/DESIGN.md` §2 및 `src/design/ds/typography.ts`는 앱 대부분 교보손글씨, 로그인 Pretendard, 홈 v2 Gaegu 예외다. 현행 코드가 이 정본을 따른다. 동시에 디자인 문서의 일부 홈 문구는 아직 운영 미적용이라고 적지만 `app/(tabs)/home.tsx`는 이미 `HomeV2View`를 렌더링한다. 팀이 서체 목표를 확정한 뒤 문서와 화면 기준을 함께 갱신해야 한다. 이번에는 제품 파일을 고치지 않았다.

### 효율적인 사용과 남은 연결

- 일반 프론트 수정은 변경 파일을 보고 **주 스킬 하나**부터: 문구 → UX, 간격/서체 → 디자인, 동작/상태 → QA, diff 리뷰 → PR 리뷰. 필요한 경우에만 보조 항목을 더하고 관련 테스트만 실행한다. 전체 앱 감사와 전체 E2E는 명시 요청 때 수행한다.
- Lab 조작이 필요한 QA에서만 `playwright-cli`를 사용한다. 홈처럼 고정 요소가 있으면 DOM 경계 교차를 직접 확인한다. 스냅샷·가로 넘침 검사만으로 통과 판정하지 않는다.
- `codex mcp list` 재확인 결과 Amplitude·Maestro 서버 항목이 없다. `maestro` CLI와 `.maestro/` flow도 없다. 운영 Amplitude 데이터 분석과 네이티브 E2E는 **미검증**이다. 합성 AI 품질 평가도 실제 모델 실행 없이 라우팅만 확인했다.
- 제품 UI·비즈니스 로직과 기존 미커밋 변경은 보존했다. 커밋·푸시·PR은 만들지 않았다.

## 2026-10-22 후속: 결함 수정과 좁은 회귀 검사

> ⚠ **2026-11-01 — 아래 코드 수정은 main 에 없다.** 그 작업 트리를 폐기하고 `origin/main` 으로 되돌리면서 스킬만 다시 들였다.
> `HomeV2View` 실측 배치 · `decorativeAccessibilityProps` · `expo-lab/e2e/home-accessibility-layout.spec.ts` 는 지금 저장소에 없으니 아래 표는 **재현 이력**으로만 읽는다.

위 실사용 검증의 **겹침·웹 콘솔 오류는 이후 이 작업에서 수정했다.** 당시 측정값과 미검증 기록은 재현 이력으로 남긴다. 기존 14개 스킬은 그대로 보존했다.

| 항목                   | 원인과 조치                                                                                                                                                                                                                                                                                             | 검증                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 홈 18.275px 겹침       | `HeroCard`가 글씨 확대에 따라 커지고, `WeekDock`은 선택 결과의 자리까지 차지하는데 `HomeV2View`의 절대 도크와 `DOCK_SPACE`는 이 높이를 반영하지 못했다. 루트·고정 영역·도크의 **실측 높이**로 충돌을 판정하고, 공간이 모자라면 도크를 본문 스크롤 흐름에 둔다. 넉넉한 화면의 하단 고정 동작은 유지한다. | `expo-lab/e2e/home-accessibility-layout.spec.ts`: Lab B의 375·390·402·430pt × 1·1.5배 × 기본/긴 일정 제목에서 `getBoundingClientRect` 기반 고정 영역·히어로·도크 경계 교차 없음. 펼치기·요일 선택·접기도 확인. |
| React 웹 콘솔 오류 2건 | RN iOS 전용 `accessibilityElementsHidden`과 Android 전용 `importantForAccessibility`가 RN Web의 DOM에 전달됐다. 장식 요소에 `decorativeAccessibilityProps`를 적용해 웹은 `aria-hidden`, 네이티브는 원래 두 속성을 받게 했다. 실제 버튼은 숨기지 않았고 도크의 펼침·선택 상태는 웹 ARIA로 노출한다.      | 홈·쉼터·보관함을 새 페이지에서 열어 콘솔 오류 0건과 장식의 `aria-hidden` 확인. 관련 UI Jest 53건(7개 스위트), 타입 검사·Lab 타입 검사·린트 통과. 스크린리더·실기기 검증은 미실시.                              |

회귀 테스트는 고정 요소가 있는 홈과 위 세 화면의 장식 콘솔만 겨냥한다. 다른 화면의 작은 수정에 전체 Lab 검사를 실행하지 않는다. 웹 접근성 속성 판단 근거는 [React Native 접근성 문서](https://reactnative.dev/docs/accessibility)와 [React Native Web 접근성 API](https://necolas.github.io/react-native-web/docs/accessibility/)다. Web Lab은 합성 상태이며 iOS·Android 화면이나 VoiceOver·TalkBack 검증을 대신하지 않는다.
고정 도크가 유지되는 조건에서는 일정 목록의 스크롤 화면 하단도 도크 상단 이전에 끝나도록 실측 높이를 반영한다. Playwright 경계 테스트는 이 목록 영역까지 확인한다.

### UX 문구 스킬 재시험

합성 문장 `오늘도 꼭 일기를 써야 해요.`를 같은 요청으로 두 번 재작성했다. 자연어 자동 선택은 **`오늘도 일기를 써볼까요?`**(입력 45,336·출력 278토큰), `$momentory-ux-writing` 명시 호출은 **`오늘도 일기를 쓰고 싶다면, 편하게 남겨보세요.`**(입력 22,958·출력 341토큰)로 답했다. 둘 다 `일기`를 보존하고 강요를 줄였다. 자동 실행은 스킬 파일만 읽었고 프로젝트 전체 검색·디자인 문서 로딩은 없었다. 명시 실행은 저장소 파일을 열지 않았다. 한 쌍의 실행 비용 차이는 세션·캐시 상태도 포함하므로 일반적 절감률로 해석하지 않는다. 단문 요청은 현재 `AGENTS.md` 규칙대로 제공 문장만 다루며, 실제 화면 문구 감사 때만 관련 파일을 읽는다.

### 서체 통일 계획 (이번 작업에서는 코드 변경 없음)

현재 `src/design/ds/typography.ts`의 일반 텍스트 단은 모두 **교보손글씨**이고 로그인 문구만 Pretendard로 덮는다. 홈 v2는 `src/design/ds/homeV2.ts`의 Gaegu를 사용한다. 교보손글씨 명시 단은 `title1Hand`·`title3Hand`·`tapeHand`·`label1Hand`(진입 워드마크, 쉼터·보관함·마이 제목, 메모지·날짜), `body1ReadingHand`·`body1ReadingHandLg`(일기 본문·상세, 쉼터 느낀 점, 리포트 감정 요약)이며, 일반 `body*`·`caption*`·버튼 라벨도 현재는 교보손글씨로 해석된다. 홈 v2 밖의 쉼터·보관함·마이 일부 장식 문구는 이미 Gaegu를 직접 쓴다.

1. 사용자 목표인 **본문 Pretendard·짧은 제목과 감성 문구 Gaegu·긴 설명은 가독성 우선**을 `docs/DESIGN.md` §2와 합의해 정본으로 갱신한다. 현재 문서의 교보손글씨 전역 규칙 및 “운영 홈 아직 교보손글씨” 문구는 코드와 충돌하므로 함께 바로잡는다.
2. 공통 타이포 단을 역할별로 분리한 뒤, 긴 일기·AI 회고/편지·쉼터 설명·보관함 상세·리포트 정보·마이 설정 안내부터 Pretendard의 실제 파일별 굵기로 전환한다. 종이 테이프·짧은 감성 제목은 Gaegu를 후보로 두고 날짜·좁은 버튼·한 줄 메타는 길이와 접근성을 따로 판단한다. 교보손글씨를 유지할 브랜드/사용자 기록 영역이 있다면 예외로 명시한다.
3. 변경 전후에 줄바꿈·카드 높이·스크롤·터치 영역을 375~430pt와 글씨 1·1.5배에서 비교하고 iOS·Android 실기기에서 글꼴 높이와 대체 글리프를 확인한다. 기존 서체의 일괄 교체는 하지 않았다.
