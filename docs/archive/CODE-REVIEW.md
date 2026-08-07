# 코드 품질 및 유지보수 리뷰

> 📦 **기록물 — 정본이 아니다.** 2026-08-07 시점의 리뷰와 그 반영 결과를 남긴 문서다.
> §2 검증 표는 리뷰 시점 값이고 같은 문서의 인용 블록이 정정했다. **현재 작업 상태의
> 정본은 [`../TASKS.md`](../TASKS.md)**, 작업 규칙의 정본은 [`../CONTRIBUTING.md`](../CONTRIBUTING.md)다.

> 작성일: 2026-08-07  
> 범위: 정적 MVP 40화면 구현 완료 시점의 `main` 전체  
> 목적: UI 완성 여부가 아니라 **재사용성·수정 용이성·데이터 경계·테스트·문서 정합성**을 점검한다.
>
> **반영: 2026-08-07 — §6 의 1~3단계를 코드에 반영했다.** 아래 체크박스는 반영
> 결과다. 남은 것은 P3(테스트 체계 보강)와 4단계 — 둘 다 팀 결정(`DISCUSSION.md`
> §2)과 빌드 인프라를 기다린다.

## 1. 결론

현재 코드는 정적 MVP 화면 구현 기준으로 완성도가 높다. 공통 컴포넌트, 디자인 토큰,
Zustand action, strict TypeScript와 화면 규칙 테스트가 잘 갖춰져 있다. UI 기반을
갈아엎을 필요는 없다.

다음 단계에서 가장 큰 위험은 UI가 아니라 **데이터 공급 계층**이다. 일부 화면이
샘플 데이터를 직접 읽고, 도메인 타입 일부가 mock 파일에 있으며, 현재 날짜와 시각이
여러 곳에 직접 결합돼 있다. 이 상태로 BE·MMKV를 붙이면 화면까지 수정할 가능성이 크다.

우선순위는 다음과 같다.

1. Prettier 정리 및 CI 포맷 검사 추가
2. 도메인 타입을 mock에서 분리
3. 화면의 직접 mock 접근을 feature hook/store 경유로 변경
4. 현재 날짜·시각 공급자 추상화
5. 큰 화면과 일기 store의 책임 분리
6. OpenAPI·데이터 보안 결정 후 영속화와 BE 연결

---

## 2. 검증 결과

검토 시점 자동 검증 결과:

| 검사                      | 결과                             |
| ------------------------- | -------------------------------- |
| `npm run typecheck`       | 통과                             |
| `npm run lint`            | 통과, 경고 0                     |
| `npm test -- --runInBand` | 22 suites · 373 tests 통과       |
| `npm run check:theme`     | 통과                             |
| `git diff --check`        | 통과                             |
| `npx prettier --check .`  | **실패 — 46개 파일 포맷 불일치** |

현재 CI는 테마·타입·린트·테스트·시크릿 추적을 검사하지만 Prettier는 검사하지 않는다.

> 반영 후: 전체 포맷을 적용했고 `format:check` 가 통과하며 CI 단계로 들어갔다.
> 테스트는 23 suites · 385 tests (clock 경계·라우트 이탈 보호 테스트 추가).

---

## 3. 잘된 점

### 3.1 공통 UI 재사용

- 기본: `AppText`, `AppButton`, `Card`, `InputRow`, `ScreenBackground`
- 레이아웃: `TabScreen`, `RetroNav`, `Sheet`, `SegBar`
- 도메인 공통: `EmotionGrid`, `EmotionPill`, `ChipFlow`, `Toggle`
- 기존 사용처를 깨지 않고 `ChipFlow.showCheck` 같은 옵션으로 확장했다.
- 화면 코드에 raw hex가 퍼지지 않도록 ESLint가 막는다.

### 3.2 타입과 상태 변경

- TypeScript `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`를 사용한다.
- Zustand action이 배열을 불변 방식으로 갱신한다.
- 일기와 행동 카드, 편집 가능한 감정 태그와 원본 감정을 타입에서 구분한다.
- 중복 저장, 삭제 되돌리기, 완료 기록 되돌리기 같은 도메인 규칙이 store에 있다.

### 3.3 테스트

- 문구 존재 여부뿐 아니라 store 결과와 라우팅을 함께 검증한다.
- 인증 fail-closed, 일기 중복 저장, 삭제 복원, 리포트 주차 이동을 테스트한다.
- 선택 상태의 접근성 속성과 색 이외의 표시도 검사한다.

### 3.4 문서

- `README.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `TASKS.md`가 역할별로 잘 나뉘어 있다.
- `DISCUSSION.md`가 BE·보안·상류 미결 사항을 한곳에 모은다.
- “정적 화면 완료”와 “MVP 제품 완료”를 구분한다.

---

## 4. 수정 권장 사항

### P1. 화면의 직접 mock 접근 제거

`CLAUDE.md`는 화면이 `src/mocks/sample.ts`를 직접 읽지 않고 feature model을
거친다고 규정한다. 실제로는 다음 7개 화면이 mock을 직접 import한다.

- `app/(tabs)/home.tsx`
- `app/(tabs)/archive.tsx`
- `app/(tabs)/report.tsx`
- `app/(tabs)/my.tsx`
- `app/retro/confirm.tsx`
- `app/retro/talk.tsx`
- `app/retro/draft.tsx`

현재 구조:

```text
화면 ─────────────→ sample.ts
화면 → Zustand store
```

목표 구조:

```text
화면 → feature hook/store → repository → mock 또는 API
```

권장 인터페이스 예시:

```ts
useHomeViewModel();
useArchiveViewModel();
useReportViewModel();
useCurrentUser();
useTodayContext();
```

완료 조건:

- [x] production 화면에서 `@/mocks/sample` import가 0개다 — ESLint
      `no-restricted-imports` 가 `app/**`·`src/components/**` 에서 막는다.
- [x] mock과 API 교체가 repository 또는 feature model 내부 변경으로 끝난다 —
      `features/{home,report}/data/sampleRepository.ts` · `features/diary/data/sampleAdapter.ts`.
- [x] 화면 테스트는 store 상태 주입(`setState`)으로 검증한다.

### P1. 도메인 타입을 mock에서 분리

`src/features/home/model/day.ts`가 `Schedule`, `Moment` 타입을 `mocks/sample.ts`에서
가져온다. mock은 도메인 타입을 구현해야 하며 타입의 소유자가 되어서는 안 된다.

권장 구조:

```text
src/features/home/model/types.ts
src/features/home/model/day.ts
src/features/home/data/sampleRepository.ts
src/mocks/sample.ts
```

완료 조건:

- [x] `Schedule`, `Moment` 등 도메인 타입이 feature 에 있다 —
      `features/home/model/types.ts` · `features/diary/model/types.ts` ·
      `WeekAnalysis` 는 `features/report/model/report.ts`.
- [x] `sample.ts`는 도메인 타입을 import해 샘플 값만 제공한다.
- [x] 추후 OpenAPI 생성 타입과 도메인 타입의 변환 위치가 정해져 있다 —
      각 feature 의 `data/` 어댑터가 그 자리다.

### P1. Prettier 일관성 및 CI 검사

46개 파일이 `prettier --check`에서 실패한다. ESLint에
`eslint-config-prettier`를 넣는 것은 충돌 규칙을 끄는 것이지 포맷을 검사하는 것이 아니다.

권장 변경:

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

CI에 다음 단계를 추가한다.

```yaml
- run: npm run format:check
```

완료 조건:

- [x] `npm run format` 실행 후 의도하지 않은 의미 변경이 없는지 검토한다 —
      typecheck·lint·테스트 385개 통과로 확인.
- [x] `npm run format:check`가 통과한다.
- [x] CI에서 포맷 불일치를 차단한다.
- [x] 생성물 `src/design/theme.ts`는 기존 `.prettierignore`를 유지한다.

### P2. 날짜·시각 공급자 추상화

`SAMPLE_TODAY`와 `new Date()`가 화면과 store 여러 곳에서 직접 사용된다. 실제 날짜,
타임존, 04:00 하루 경계, 테스트 고정 시각을 적용할 때 수정 지점이 많아진다.

권장 인터페이스:

```ts
export type Clock = {
  now(): Date;
  today(): string;
};
```

용도:

- `SystemClock`: 운영 시각과 04:00 하루 경계
- `SampleClock`: 2026-07-27 화면 데이터
- `TestClock`: 테스트별 고정 시각

완료 조건:

- [x] 일정·순간·일기·행동 완료가 같은 Clock(`src/lib/clock.ts`)을 사용한다.
- [x] production 코드에서 `SAMPLE_TODAY` 직접 접근이 없다 — 샘플 하루의 정본은
      `SampleClock` 한 곳이고, 화면·store 는 `clock.today()` 를 지난다.
- [x] 날짜 경계 03:59/04:00 테스트가 있다 (`src/lib/__tests__/clock.test.ts`).

### P2. 라우트 이탈 보호 강화

`app/my/profile.tsx`의 저장하지 않은 변경 확인은 커스텀 상단 뒤로가기에 적용된다.
Android 하드웨어 뒤로가기나 네이티브 스와이프 제스처가 같은 확인을 거치는지는
라우트 수준에서 보장해야 한다.

완료 조건:

- [x] 커스텀 뒤로가기, Android back, 스와이프가 같은 이탈 정책을 사용한다 —
      `beforeRemove` 리스너가 라우트 수준에서 막는다.
- [x] 변경 없음은 즉시 이탈한다.
- [x] 변경 있음은 확인 후 이탈한다 — `[나가기]` 가 막아 둔 네비게이션을 이어서 실행한다.
- [x] 관련 네비게이션 테스트가 있다 (`app/my/__tests__/my.test.tsx` 「이탈 보호는 라우트 수준이다」).

> 반영 후: `beforeRemove` 는 단위 테스트로 보호했다. 다만 **스와이프 제스처와
> Android 하드웨어 back 이 실제 네이티브 스택에서 같은 확인을 지나는지는
> P3 의 E2E(실기기) 단계에서 한 번 확인해야 한다** — 남은 것은 코드가 아니라
> 실기기 검증이다.

### P2. 큰 화면 파일의 UI 조각 분리

큰 파일 자체가 문제는 아니지만 다음 파일은 데이터 계산·상태·UI가 함께 있다.

| 파일                       | 대략적인 크기 |
| -------------------------- | ------------: |
| `app/diary/[id]/index.tsx` |         366줄 |
| `app/(tabs)/report.tsx`    |         360줄 |
| `app/(tabs)/home.tsx`      |         281줄 |
| `app/(tabs)/archive.tsx`   |         257줄 |
| `app/my/profile.tsx`       |         253줄 |

분리 후보:

- `WeeklySummaryCard`
- `WeeklyEmotionGrid`
- `ActionInsightCard`
- `DiaryUserFace`
- `DiaryBabaFace`
- `ActionCardSection`
- `ProfileInterestsSection`
- `BasicInfoSection`

분리 원칙:

- 페이지는 라우팅·화면 상태·조합만 담당한다.
- 단순히 줄 수를 줄이기 위한 일회성 컴포넌트는 만들지 않는다.
- 둘 이상의 화면에서 쓰거나 독립 규칙·테스트가 있는 조각부터 분리한다.

> 반영 후: 독립 규칙이 있는 조각을 분리했다 — `components/report/` 의
> `WeeklySummaryCard`·`WeeklyEmotionGrid`·`ActionInsightCard`, `components/diary/`
> 의 `DiaryBabaFace`·`ActionCardSection`·`ActionRow`(초안 `C6-b` 와 상세 `A3` 가
> 공유), `components/common/` 의 `SectionLabel`(화면 6곳)·`ConfirmCard`(`M2`·`A3-c`
> 공유). `ProfileInterestsSection`·`BasicInfoSection` 은 일회성이라 **분리 원칙
> 둘째 줄에 따라 만들지 않았다.**

### P2. 일기 store 책임 분리

`src/features/diary/model/diary.ts`는 다음 책임을 모두 가진다.

- 도메인 타입
- 샘플 seed 생성
- 일기 CRUD
- 행동 카드 CRUD
- 삭제 되돌리기
- 완료·느낀 점 기록
- UI 테스트용 reset

권장 구조:

```text
src/features/diary/model/types.ts
src/features/diary/model/store.ts
src/features/diary/model/selectors.ts
src/features/diary/data/repository.ts
src/features/diary/data/sampleAdapter.ts
```

완료 조건:

- [x] 화면 selector와 mutation action의 위치가 분리된다 — `model/selectors.ts` 와
      `model/diary.ts`(store). 파일명은 기존 import 를 깨지 않으려 `store.ts` 대신
      `diary.ts` 를 유지했다.
- [x] 샘플 seed가 운영 store 구현에서 빠진다 — `data/sampleAdapter.ts`.
- [x] API/MMKV 구현이 화면과 selector를 바꾸지 않는다 — 어댑터만 갈린다.

### P3. 테스트 체계 보강

현재 단위·컴포넌트 테스트는 좋은 편이지만 다음은 아직 없다.

- 전체 사용자 흐름 E2E
- 테스트 커버리지 기준
- MMKV 복원·삭제 테스트
- 아웃박스 재생·중복 방지·409 테스트
- OS 알림·캘린더 권한 테스트
- 네이티브 뒤로가기·스와이프 테스트

최소 Maestro 흐름:

```text
로그인 → 온보딩 → 홈 → 회고 → 일기 저장 → 보관함에서 다시 열기
```

권장 완료 조건:

- [ ] 핵심 흐름 1개를 실제 빌드에서 실행한다.
- [ ] model/lib부터 coverage를 측정한다.
- [ ] 커버리지 숫자보다 핵심 invariant 누락 여부를 우선한다.

---

## 5. 문서와 구현의 차이

### 5.1 명확한 불일치

`CLAUDE.md`의 데이터 원칙:

> 화면은 mock을 직접 읽지 않고 `src/features/<도메인>/model/` store를 지난다.

현재 구현은 production 화면 7개에서 mock을 직접 읽는다. 장기적으로는 문서를
완화하기보다 코드를 원칙에 맞추는 것을 권장한다.

> 반영 후: 해소됐다 — 화면 7개 전부 feature 의 store·repository 를 지나고,
> ESLint 가 재발을 막는다.

### 5.2 아직 존재하지 않는 필수 선행 문서

- `docs/api/openapi.yaml`
- `docs/DATA-SECURITY.md`

이는 실수로 빠진 파일이 아니라 `DISCUSSION.md`에 기록된 팀 결정 대기 항목이다.
하지만 다음 작업의 실제 blocker이므로 결정 후 가장 먼저 작성해야 한다.

### 5.3 의도적으로 남은 차이

- M2의 기본 정보 섹션은 상류 시안에 없지만 편집 invariant를 지키기 위해 추가됐다.
- M1 연결 관리는 상태 기계에 목적 화면이 없어 읽기 전용이다.
- 약관·문의·회원 탈퇴는 결정 전이라 눌리지 않는다.
- 회고 응답, 일기 초안, 주간 해석은 BE 연결 전 데모 데이터다.
- 앱 잠금은 상류가 토글을 내렸기 때문에 게이트도 함께 보류됐다.

위 항목은 `DISCUSSION.md`와 `TASKS.md`에 적절하게 기록돼 있다.

---

## 6. 실행 순서 제안

### 1단계 — 코드 위생, 동작 변경 없음

- [x] Prettier 전체 적용
- [x] `format:check` 및 CI 추가
- [x] mock에 있는 도메인 타입 이동
- [x] 직접 mock import 목록을 lint로 감시 (`no-restricted-imports`)

### 2단계 — 데이터 경계

- [x] feature별 repository 작성 (`features/{home,report}/data/` · `features/diary/data/`)
- [x] sample repository 구현
- [x] 화면을 feature view model/store에만 연결
- [x] Clock/Today 공급자 추가

### 3단계 — 유지보수 리팩터링

- [x] report/diary의 독립 UI 조각 분리 (profile 의 두 섹션은 일회성이라 만들지 않음)
- [x] diary store를 types/store/selectors/data 어댑터로 분리
- [x] 라우트 이탈 보호를 네비게이션 수준으로 이동

### 4단계 — 다음 제품 단계

- [ ] `DISCUSSION.md` §2 결정
- [ ] `DATA-SECURITY.md` 작성
- [ ] MMKV 영속화
- [ ] OpenAPI 및 멱등성 계약 합의
- [ ] TanStack Query·MSW·아웃박스
- [ ] 소셜 SDK·알림·캘린더·계측
- [ ] E2E와 내부 배포

---

## 7. 최종 판단

| 항목                    | 리뷰 시점                            | 반영 후            |
| ----------------------- | ------------------------------------ | ------------------ |
| 화면 구현 완성도        | 좋음                                 | 좋음               |
| UI 컴포넌트 재사용성    | 좋음                                 | 좋음               |
| 타입 안정성             | 좋음                                 | 좋음               |
| 테스트 품질             | 좋음                                 | 좋음               |
| 코드 포맷 일관성        | 개선 필요                            | 해소 — CI가 지킨다 |
| 데이터 계층 교체 용이성 | 개선 필요                            | 해소               |
| 화면 파일 책임 분리     | 보통                                 | 좋음               |
| 문서 품질               | 매우 좋음                            | 매우 좋음          |
| 문서·구현 정합성        | 대체로 일치, mock 접근 원칙은 불일치 | 일치               |

현재 UI 기반은 유지할 가치가 충분하다. 다음 리팩터링은 화면 재작성보다
**데이터 출처를 숨기는 경계와 시간 의존성 정리**에 집중하는 것이 비용 대비 효과가 크다.
