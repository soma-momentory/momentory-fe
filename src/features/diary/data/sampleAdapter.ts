/**
 * 샘플 일기 → 도메인 타입 변환 — **store 와 mock 사이의 경계다.**
 *
 * 데모 시작값은 **서버가 이 사용자에 대해 갖고 있는 것**에 해당한다.
 * 보관함(`A1`·`A2`)이 이걸 읽어 「12편」과 달력 점을 그린다. 서버가 붙으면
 * 이 파일 안쪽만 API 응답 변환으로 갈리고 store 와 화면은 그대로다.
 */
import type { ActionCard, Diary } from "@/features/diary/model/types";
import { SAMPLE_DIARIES, SAMPLE_DIARY_MONTH } from "@/mocks/sample";

const seedDiaries = (): Diary[] =>
  SAMPLE_DIARIES.map((d, i) => ({
    id: `d-sample-${d.day}`,
    date: `${SAMPLE_DIARY_MONTH}-${String(d.day).padStart(2, "0")}`,
    body: d.body,
    babaView: d.babaView ?? null,
    babaViewBasis: d.babaViewBasis ?? null,
    emotions: [...d.emotions],
    authoredBy: "baba",
    editedAt: null,
    ordinal: i + 1,
    // 그날의 기록 — 감정 태그의 초기값이 여기서 왔다
    storyEmotion: d.emotions[0],
    startEmotion: d.emotions[1],
    weather: d.weather ?? null,
  }));

/** 샘플 일기에 붙는 행동 카드 — **일기 한 장에 한 장**뿐이다 */
const seedCards = (diaries: readonly Diary[]): ActionCard[] =>
  SAMPLE_DIARIES.flatMap((d, i) => {
    if (d.action == null) return [];
    const diary = diaries[i];
    if (diary == null) return [];
    return [
      {
        id: `ac-sample-${d.day}`,
        diaryId: diary.id,
        situation: d.action.situation,
        targetAction: d.action.targetAction,
        done: d.action.done ?? false,
        // 해본 날짜는 만든 다음 날로 둔다 — 「해봤어요 · 7월 21일」처럼 보인다
        doneAt: d.action.done === true ? `${diary.date}T09:00:00` : null,
        reflection: null,
        createdAt: diary.date,
      },
    ];
  });

/** store 의 시작값 한 벌 — 일기와 행동 카드가 짝을 이룬다 */
export const initialDiaryData = (): { diaries: Diary[]; actionCards: ActionCard[] } => {
  const diaries = seedDiaries();
  return { diaries, actionCards: seedCards(diaries) };
};
