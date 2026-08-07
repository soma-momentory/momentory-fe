/**
 * 오늘 하루의 도메인 타입 — `momentory.schema.mvp.json` 이 정본이다.
 *
 * 타입의 소유자는 feature 이고, `src/mocks/sample.ts` 는 이 타입을 **구현하는
 * 샘플 값만** 제공한다. mock 이 타입을 소유하면 서버가 붙을 때 mock 을 지우며
 * 타입까지 사라진다(`docs/CODE-REVIEW.md` P1).
 */
import type { EmotionId } from "@/design/theme";

export type ScheduleSource = "calendar" | "manual";

/** `schema.Schedule` 그대로. 서버가 붙어도 모양이 바뀌지 않게 필드를 다 든다 */
export type Schedule = {
  id: string;
  date: string;
  title: string;
  /** MVP 는 항상 `null` — 직접 추가(`12-e`)에 시간 입력이 없다 */
  time: null;
  source: ScheduleSource;
  externalId: string | null;
  done: boolean;
  doneAt: string | null;
  /** 1~9 · 0~2개 권장, 상한 없음 */
  emotions: EmotionId[];
  /** 목록에서만 감춘다 — 캘린더 원본은 지우지 않는다 */
  hidden: boolean;
};

/** `schema.Moment`. 화면 문구는 **「순간」**이다 — "메모"라고 부르지 않는다 */
export type Moment = {
  id: string;
  createdAt: string;
  date: string;
  text: string;
  /** 실패로 표시하지 않고 "올리는 중" — `local | uploading | synced` */
  syncState: "local" | "uploading" | "synced";
};

/** 「맑음 · 27℃」 — 홈 상단·회고 확인(`C2`)·일기의 날씨 한 줄 */
export type Weather = {
  label: string;
  celsius: number;
};
