/**
 * 회고를 마치면 남는 것의 타입 — `momentory.schema.mvp.json` 그대로다.
 *
 * 서버가 붙으면 store 와 data 어댑터 안쪽만 갈리고 화면은 그대로다
 * (`CLAUDE.md` 「BE 는 마지막에 붙인다」).
 */
import type { EmotionId } from "@/features/emotion/model/emotion";

/**
 * 일기 본문 상한 — `C6` 초안과 `A4` 수정이 같은 값을 쓴다.
 * **최소 글자 수를 요구하지 않는다**(`C6.md`) — 카운터만 둔다.
 *
 * ⚠ **디자인 값이 아니라 제품 규칙이다** — `design/tokens.mvp.ts` 의
 * `diaryBody.maxLength` 에서 옮겨 왔다(토큰 파일과 함께 사라지면 안 된다).
 * 본문의 크기·행간은 여전히 디자인 몫이라 `diaryBody` 쪽에 남아 있다.
 */
export const DIARY_BODY_MAX_LENGTH = 500;

export type Diary = {
  id: string;
  date: string;
  /** 3~4문장 산문 — **요약 한 문장이 아니다**. 「내가 남긴 오늘」(`C6`·`A3`) */
  body: string;
  /** 「바바가 함께 본 오늘」(`C6-b`·`A3-b`). **회고를 마친 당시의 고정 스냅샷** */
  babaView: string | null;
  /** 그 문장을 쓴 근거 한 줄 — 대화에서 나온 말과 고른 방향을 밝힌다 */
  babaViewBasis: string | null;
  /**
   * 이 일기의 **감정 태그** — 목록·필터에 쓰는 값이다(`A2`·`A4` 에서 고칠 수 있음).
   * 초기값은 그날 남은 감정이고, **고쳐도 원본 감정 기록은 그대로다**.
   */
  emotions: EmotionId[];
  /** 초안은 `baba`, 사용자가 고치면 `user` */
  authoredBy: "baba" | "user";
  editedAt: string | null;
  /** 몇 번째 장. **연속 일수가 아니다** */
  ordinal: number;

  /**
   * 이 일기를 남긴 **서버 회고 세션 id**. 회고로 저장된 일기에만 있고(`null` 이면
   * 직접 쓴 일기 또는 로컬/샘플 일기다), 서버에 저장된 일기 본문·행동 카드를 다시
   * 불러오는 열쇠다(`GET /api/v1/retrospect/{id}/diary`). 위 「그날의 기록」 주석이
   * 예고한 `retroId` 가 이것이다 — 행동 카드에서 그날의 일기로 돌아오는 길이기도 하다.
   */
  retrospectId: string | null;

  /**
   * ── 여기부터는 **그날의 기록**(`A3-b`)이다. 읽기 전용이고 `A4` 에서 고칠 수 없다.
   *
   * `emotions`(감정 태그)와 **다른 값**이다 — 태그는 목록·필터용이라 고칠 수
   * 있고, 이쪽은 그날 실제로 남은 기록이다. 한 줄로 합치면 어느 시점의 감정인지
   * 알 수 없어 상류가 두 줄로 나눴다(`A3-b.md` — 「회고 전 감정」은 폐기된 라벨).
   *
   * ⚠ 스키마상 원본은 `Schedule.emotions` 와 `Retro` 에 있는데 MVP 는 `Retro` 를
   * 따로 두지 않는다. **고정 스냅샷**이라는 규칙을 지키려면 일기가 들고 있어야
   * 해서 여기 뒀다 — 서버가 붙으면 `retroId` 로 따라가는 값이 된다(`TASKS.md`).
   */
  /** 일정에 붙었던 감정 */
  storyEmotion: EmotionId | null;
  /** `C3` 에서 고른 회고 시작 감정 */
  startEmotion: EmotionId | null;
  /** 그날의 날씨 — 읽기 전용 표시 */
  weather: string | null;
};

/**
 * 그 일기에 **딱 한 장** 붙는다 — 따로 목록 화면을 만들지 않는다.
 * 여러 장을 만들면 할 일 목록이 되고, 할 일 목록은 지키지 못한 것의 목록이 된다.
 */
export type ActionCard = {
  id: string;
  diaryId: string;
  /** 감정이 생긴 핵심 장면 */
  situation: string;
  /** 확인한 감정(최대 2). 감정 탐색을 안 거쳤으면 빈 목록 */
  emotions: EmotionId[];
  /** 바란 것(단어, 최대 2). 안 골랐으면 빈 목록 */
  needs: string[];
  /** 바랐던 모습(불편)/좋았던 모습(긍정) — 없으면 null */
  desiredState: string | null;
  /** 감정 성격 — 라벨 워딩이 갈린다(불편 vs 긍정) */
  sentiment: "uncomfortable" | "positive";
  /** 작은 행동 · 한 문장. **사용자가 말한 것을 옮긴다.** 안 정했으면 null */
  targetAction: string | null;
  /** `[해봤어요]` — 토글이 아니라 **한 번의 기록**이다(`A3`·`A3-c`) */
  done: boolean;
  doneAt: string | null;
  /** 해본 뒤 한 줄. **완료 전에는 자리를 열어두지 않는다** */
  reflection: string | null;
  createdAt: string;
};
