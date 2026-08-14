# 데이터 모델 & API 계약

날짜 키는 항상 `YYYY-MM-DD`(로컬 기준). 프로토타입 데모 범위는 **2025-08-01 ~ 2026-08-13**입니다.

---

## 1. 도메인 모델

```ts
type Mood =
  | '행복함' | '두근함' | '평온함' | '피곤함' | '무기력'
  | '우울함' | '불안함' | '막막함' | '화남/답답';

interface Task {
  id: string;
  date: string;        // YYYY-MM-DD
  title: string;
  order: number;       // 드래그 정렬
  done: boolean;
  mood: Mood | null;   // done === false 이면 반드시 null
}

interface Diary {
  date: string;
  mood: Mood;                  // 일기에는 감정이 반드시 하나 있음
  excerpt: string;             // 리스트/검색용 한 문장
  mine: string[][];            // 내 시선: 페이지 배열, 각 페이지는 문단 배열
  other: string[][];           // 다른 시선(카피바라 관점)
  score?: number;              // 회고 만족도 1~10
}

interface ActionCard {
  date: string;
  situation: string;   // 상황
  action: string;      // 제안된 행동
  done: boolean;       // 수행 여부
  note: string;        // 느낀 점
}

interface DayRecord {          // 화면이 실제로 소비하는 단위
  date: string;
  tasks: Task[];               // 0~5개, 없을 수 있음
  diary: Diary | null;         // 일정 없이도 존재 가능
  card: ActionCard | null;
}
```

### 불변 규칙

1. `Task.mood`는 `done === true`일 때만 값을 가질 수 있고, `true`여도 `null`일 수 있다(감정 선택 건너뜀).
2. 감정 값은 위 9개 리터럴만 허용. "없음"을 값으로 만들지 않고 `null`로 표현한다.
3. `Diary`는 `tasks.length === 0`이어도 생성 가능하다.
4. `ActionCard`는 하루 최대 1장. 회고를 마친 날에 생성된다.
5. 미래 날짜에는 어떤 레코드도 만들지 않는다.

---

## 2. 화면별 필요 데이터

| 화면 | 쿼리 |
| --- | --- |
| 홈 | `GET /days/today` → `DayRecord` |
| 일기 | `GET /days/:date` (없으면 404 → 빈 상태) |
| 보관함 캘린더 | `GET /days?from=YYYY-MM-01&to=YYYY-MM-31` → `DayRecord[]` |
| 보관함 리스트 | 같은 응답을 클라이언트에서 `diary != null` 필터 + 감정/검색어 필터 |
| 보관함 월 필터 | `GET /months` → `["2026-08", "2026-07", …]` (기록이 있는 월, 내림차순) |
| 쉼터 행동카드 | `GET /cards?month=YYYY-MM`, `GET /cards?before=:date&limit=6` (지난 기록) |
| 리포트 | `GET /report/week?start=YYYY-MM-DD` → 아래 집계 |

### 변경 API

```
POST   /tasks                  { date, title }
PATCH  /tasks/:id              { title? , done?, mood?, order? }
DELETE /tasks/:id
POST   /tasks/reorder          { date, ids: string[] }
POST   /diaries                { date, score, answers[] }  // 회고 결과로 생성
PATCH  /cards/:date            { done?, note? }
```

### 리포트 집계 정의

주는 **일요일 시작**. 한 주 안에서
- 감정 카운트 = (그 주 일기의 `mood`) + (그 주 완료 일정의 `mood != null`) 합산 → 상위 5개, `round(count/total*100)`
- 일정 = `tasks.length` / `done` 개수
- 행동카드 = 카드 있는 날 수 / 그중 `done` 수
- 일기 = `diary != null` 인 날 수
- 데이터가 0이면 도넛은 단색 `#DCD6C8` + "기록 없음"

---

## 3. 샘플 데이터 생성 규칙 (`data.js`)

목 서버 시드로 그대로 옮겨 쓸 수 있습니다. **시드 = `y*10000 + m*100 + d`** 의 mulberry32 PRNG이므로 같은 날짜는 항상 같은 결과가 나옵니다(스크린샷·QA 재현 가능).

| 항목 | 규칙 |
| --- | --- |
| 기간 | 2025-08-01 ~ 2026-08-13 |
| 일정 수 | 0~5개 (균등) |
| 일정 제목 | 10개 풀에서 순회 선택 |
| 완료 | 70% |
| 완료 시 감정 | 60% (나머지는 `null`) |
| 일기 | 55% 확률, 감정 1개 + 발췌 1문장 + 내 시선/다른 시선 본문 |
| 만족도 | 4~8점 |
| 행동카드 | 32% 확률, 수행 60%, 수행 시 느낀 점 70% |
| 2026-08-13 | 랜덤 대신 고정 데이터(홈·일기·리포트 화면과 동일한 canonical 값) |

노출 함수

```js
getDay(y, m, d)        // DayRecord | null  (범위 밖이면 null)
diaryText(y, m, d)     // { mine, other, score } | null
cardLog(y, m, d, n)    // 그 날짜 이전의 카드 n건, 최신순
latestCardDay(y, m)    // 그 달의 마지막 카드 날짜
monthKeys()            // 기록 있는 월 내림차순 (13개월)
```

실제 구현으로 옮길 때: `getDay` 호출부를 그대로 API 훅(`useDay(date)`)으로 바꾸면 화면 로직은 손대지 않아도 됩니다. 프로토타입도 동일하게 화면이 `getDay`만 바라보도록 정리해 두었습니다.

---

## 4. 로컬 상태(서버 저장 대상 아님)

| 상태 | 화면 | 비고 |
| --- | --- | --- |
| 대나무 숲 외침 | 쉼터 | 화면을 벗어나면 사라짐(의도된 동작) |
| 호흡 타이머 | 쉼터 | 세션 한정 |
| 걱정 상자 | 쉼터 | 로컬 저장 권장(기기 내) |
| 검색어 · 감정 필터 · 월 선택 | 보관함 | 뒤로가기 복귀 시 유지 |
| 알림 on/off · 시간 | 마이 | 서버 또는 기기 설정 |
