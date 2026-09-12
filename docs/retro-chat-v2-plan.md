# 회고 AI 채팅 v2 재설계 — FE 실행 계획

> 정본은 `momentory-be/docs/retro-chat-v2-plan.md`(대화는 서버 주도). 이 문서는 FE 화면·상태 작업만 다룬다.
> 브랜치: `feat/retro-chat-overhaul`.

## 진행 상황 (2026-08-28 작성 · **2026-09-12 종료 확인**)

**BE 는 tasks 1~5 완료**(엔진·영속화·읽기·Gemini). FE 착수:

- ✅ **감정 taxonomy 10종 긍정→부정 재번호 — 소스 완료, `npm run typecheck` green.**
  - `emotion.ts`(EMOTIONS 10종 재번호, EMOTIONS_BY_SENTIMENT=EMOTIONS), `retro/model/retro.ts` `EMOTION_KEYS`,
    `diary/data/diaryApi.ts`·`report/data/weeklyReportApi.ts` 키→id 표, `home/data/scheduleApi.ts` `SCHEDULE_EMOTIONS`
    (⚠ BE 스케줄 enum 은 미분리 — 화남 9·답답함 10 둘 다 `ANGRY_FRUSTRATED`, 반전은 화남 9로 확정),
    `design/ds/color.ts` 감정 10색 재배치 + 답답함(10) 색 신설(초안).
- ⚠ **`npm test` 25개 실패** — 두 부류:
  1. 순수 taxonomy 기대값 갱신 필요: `emotion.test`·`scheduleApi.test`·`diaryApi.test`·`weeklyReportApi.test`
     - 화면 감정이름/필터 테스트(`home`·`archive`·`report-my`). → 새 번호로 기대값만 고치면 됨.
  2. **흐름 결합(= 화면 재작성 필요)**: `retro.test` C3 시작감정 9종, `talk.test` currentEmotion 전송,
     `diary.test` C6 시작감정. **v2 가 `emotion.tsx`(C3)를 없애고 start 에서 감정을 빼므로** 지금 고치면 throwaway.

**FE 다음 = 흐름 재작성(아래 §1~4)** — emotion.tsx(C3) 제거·`confirm→talk` 직결·start payload 에서 currentEmotion 제거·
`talk` 새 phase 렌더·`WishCardSection`. 그와 함께 위 테스트들을 v2 로 갱신/삭제한다. (taxonomy 소스는 이미 반영됨)

### ✅ 흐름 재작성 — 소스 완료 (2026-08-28, `npm run typecheck` 0 에러)

- **삭제**: `app/retro/emotion.tsx`(C3). `confirm.tsx` "다음" → `/retro/talk` 직결.
- **`retroApi.ts` v2**: 슬라이더(ui/measures) 제거, 행동카드→`ReplyWishCard`(situation·emotions키[]·needs[{word,meaning}]·
  desiredState·smallAction·sentiment), `TurnInput.optionIds`(복수), `StartInput` 에서 currentEmotion 제거, phase 상수.
- **`retro.ts` 스토어**: `startEmotion` 제거, `actionCard`→`wishCard`, `emotionIdOfKey`(키→id 역매퍼) 추가.
- **`talk.tsx` 재작성**: 마운트 시 시작(감정 없이), 감정·바람 최대 2택(optionIds toggle), `직접 적기`→입력창, 분기점 단일택,
  슬라이더/measure 제거, `done`→"일기 확인하러 가기".
- **`draft.tsx`/`done.tsx`**: 바람카드 기반(감정 태그·바람 단어·바랐던 모습·작은 행동). draft 저장은 wishCard→기존 save 필드 매핑.

### ✅ 테스트 갱신 완료 — FE 전부 green (2026-08-28)

- `npm run typecheck` **0 에러**, `npm run test` **1019 통과 / 62 스위트**, `npm run lint` **clean**.
- 흐름 테스트 재작성: `retro.test`(C2만 남기고 C3 제거·nav→talk), `talk.test`(v2 흐름), `diary.test`(바람카드·startEmotion 제거).
- taxonomy 기대값 갱신: `emotion.test`·`scheduleApi.test`·`diaryApi.test`·`weeklyReportApi.test`.
- **fixture 재매핑**: `src/testing/fixtures.ts` + `report-my.test` 주간 fixture의 감정 id 를 새 번호로(감정 정체 보존).
  화면 테스트(`home`·`archive`·`report-my`)는 이름/필터가 다시 맞아 통과.

### ✅ 마무리 (2026-09-12 대조)

- **BE 가 v2 를 머지했다** — `momentory-be` `#60`~`#62`(엔진 재설계) · `#53`(위기 안내 뒤 이어가기 ·
  `phase="safety_hold"` 는 `done=false`). 마이그레이션 `V20`(바람카드 필드) · `V21`(일기 감정 태그) ·
  `V22`(회고 토픽) · `V23`(`current_emotion` → `primary_emotion`).
- ✅ **리치 바람카드 읽기측 — 끝났다.** `src/components/diary/WishCardFields.tsx` 를 만들어
  쉼터(`R2`)와 일기 상세(`A3`)가 **같은 항목·같은 말**로 그린다(비운 항목은 「아직 정하지 않음」 ·
  `sentiment` 에 따라 라벨 분기). 쉼터 카드만 높이 제약 때문에 `inline` 한 줄이다.
- ✅ **감정 없이 끝난 일기**도 화면이 생겼다(2026-09-12 · 빈 얼굴·빈 조약돌) — `V21` 이
  `primary_emotion` 을 nullable 로 푼 것과 짝이다.

### ⚠ 남은 것 (선택 · 후속)

- **스케줄 감정 분리**: BE `ScheduleEmotion` 은 **아직 `ANGRY_FRUSTRATED` 합침**(2026-09-12 확인).
  화남/답답함을 일정 태그에서도 나누려면 BE enum + 마이그레이션이 필요하다(retro v2 범위 밖).
  그때까지 FE 는 9·10 을 같은 코드로 보내고 **되돌아올 때 화남(9)으로 정한다**(`scheduleApi.ts`).
- **답답함(10) 색**은 아직 초안이다(`ds/color.ts` 의 `#B8917C`) — `DESIGN.md` 감정 팔레트에
  확정 값을 받으면 바꾼다.

## 0. 무엇이 바뀌나

- **초기 감정 선택 화면(C3 `emotion.tsx`) 제거** — 분기 없이 일기 작성부터 시작.
- 회고 흐름: `confirm → talk(일기 작성 → 분기점 → 감정 탐색) → draft(일기+감정 태그) → done(바람 카드)`.
- **행동 카드 → 바람 카드로 대체** — 쉼터(R2)·일기상세(A3)·done 이 함께 바뀐다.
- 감정 다중(N:N 태그), 감정·욕구 후보는 **서버가 옵션으로 내려주므로 FE 하드코딩 없음**.

## 1. 화면 (`app/retro/`)

- **제거**: `emotion.tsx`(C3). `confirm.tsx` 의 "다음" → `router.push("/retro/talk")` 로 직결.
- **`talk.tsx`**: 서버 `phase` 기반 렌더 구조는 유지. 새 phase 대응:
  - `diary_chat` → 자유 입력(`ChatDock`) 위주, 서버가 준 옵션 있으면 인라인 렌더
  - `await_branch` → 옵션 2개(`감정을 더 알아볼래요` / `일기 확인하러 갈래요`)
  - `emotion_exploration` → 옵션 선택(최대 2) + `직접 적기`(input) + `아직 잘 모르겠어요`/`오늘은 여기까지 할래요`
  - 기존 `await_direction`/`await_sub_direction`/measure 슬라이더 분기는 제거 또는 미사용
- **`draft.tsx`**: 일기 본문 + **감정 태그(다중)** 표시. `startEmotion` 가드 제거. 편집·저장 경로 유지.
- **`done.tsx`**: 감정 탐색을 거친 경우에만 **바람 카드** 표시. CTA는 항상 "일기 확인하러 가기"(홈/쉼터).

## 2. 상태 (`src/features/retro/model/retro.ts`)

- **`startEmotion` / `setStartEmotion` 제거.** 시작은 스케줄 소재만으로(`talk.runStart` 에서 `currentEmotion`
  전송 제거).
- 나머지(`sessionId`·`turns`·`lastReply`·`diary` + 서버 phase 기반 입력 모드 판정)는 구조 유지.
- 완료 응답에서 `actionCard` 대신 **`wishCard`** 를 받도록 타입 교체.

## 3. 바람 카드 컴포넌트 (행동 카드 대체)

- `src/components/diary/ActionCardSection.tsx` → **`WishCardSection`** 으로 개편.
  - 필드: 상황 · 감정(≤2) · 내 마음이 바랐던 것(≤2) · 바랐던 모습 · 작은 행동. sentiment(불편/긍정)에 따라
    라벨 분기("내 마음이 바랐던 것" vs "내 마음을 채워준 것"). 비운 항목은 `아직 정하지 않음`.
  - `해봤어요` 완료/느낀점은 **작은 행동에 대해 유지**(쉼터 R2 의존) — 정본 문서 §10 미결 2 결론 따름.
- 소비처 함께 수정: 쉼터 `app/(tabs)` 카드 목록/`R2`, 일기 상세 `A3`, `done.tsx`.

## 4. diary 모델 (`src/features/diary/`)

- `ActionCard` 타입 → `WishCard` 로 확장(감정·바람·바랐던 모습·행동). `useDiary.save` 가 바람 카드를 저장/보관.
- `Diary.emotions: EmotionId[]` 는 이미 배열 — 서버의 N:N 감정 태그를 그대로 받는다.
- pgvector 추천 결과는 서버가 옵션으로 내려주므로 FE 변경 없음.

## 5. 감정 도메인 (`src/features/emotion/model/emotion.ts`) — 9→10종 분리 + 긍정→부정 재번호 (확정)

정본 §6.5대로 **9종 → 10종**이고, **id를 긍정→부정 순으로 다시 매긴다**(renumber):
`1 행복 · 2 뿌듯 · 3 평온 · 4 피곤 · 5 막막 · 6 무기력 · 7 불안 · 8 우울 · 9 화남 · 10 답답함(신설)`.
`당황스러움`은 넣지 않는다.

- `EMOTIONS` 를 새 순서·번호로 재작성, `EmotionId` = 1–10, `EMOTIONS_BY_SENTIMENT` 는 항등 순서가 되어 단순화/제거.
- `src/features/retro/model/retro.ts` `EMOTION_KEYS`: **전 항목 새 번호로 재매핑**(9→`angry`, 10→`frustrated` 등).
- `src/features/home/data/scheduleApi.ts` `SCHEDULE_EMOTIONS`: `ANGRY_FRUSTRATED` 분리(ANGRY/FRUSTRATED) + 새 번호 반영.
- 신설 1종 **감정 색**을 `src/design/ds/` 에 정의(하드코딩 금지 · DESIGN.md에 이름 추가).
- sentiment 분류: 긍정 3(id 1–3) / 불편 7(id 4–10) — 서버가 바람 카드 워딩 분기에 사용.
- ⚠ 감정은 서버 key(string)로 오가고 숫자를 영속화하지 않으므로 renumber 는 안전. 단 `EmotionId` 를 숫자로
  들고 있는 소비처(테스트 fixture 포함)를 함께 갱신한다.

## 6. 착수 순서

1. 서버 계약(§7 정본)·`sync:api` 확정 대기 → OpenAPI 반영
2. `emotion.tsx` 제거 + `confirm→talk` 직결 + `startEmotion` 제거 (계약 독립적, 먼저 가능)
3. `talk.tsx` 새 phase 렌더
4. `WishCardSection` + 소비처(쉼터·A3·done) 이관
5. `draft` 감정 태그(다중) 표시
6. 테스트·E2E

## 7. 주의 (레포 규칙)

- 색·크기 하드코딩 금지(`src/design/ds/`), 오류는 한 줄 흡수·모달 금지, 숫자 압박 금지 — `CLAUDE.md` 준수.
- 감정/욕구 후보 목록을 **FE에 박지 않는다**(서버 옵션). 온보딩 선택지처럼 "서버 코드를 그대로" 원칙.
