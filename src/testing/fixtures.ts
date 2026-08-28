/**
 * **테스트 전용 고정값** — 앱 코드는 이 파일을 읽지 않는다(린터가 막는다).
 *
 * 옛 `src/mocks/sample.ts` 는 **화면이 보는 데모 데이터**였다. 서버가 붙으면서
 * 그 자리를 서버 응답이 가져갔고(일정·일기·프로필·회고), 남아 있던 샘플은
 * 「로그인했는데 남의 일기 12편이 보인다」는 화면을 만들었다 — 그래서 지웠다
 * (2026-08-21).
 *
 * 지운 값 중 **화면 테스트가 목록·달력·집계를 그리기 위해 필요한 것만** 여기로
 * 옮겼다. 앱의 시작값이 아니라 **테스트가 스스로 심는 재료**다 — store 는 이제
 * 어디서도 이 값을 스스로 불러오지 않는다.
 *
 * 날짜는 `SampleClock`(`src/lib/clock.ts`)의 고정 하루와 같은 달(2026-07)이다 —
 * 테스트의 「오늘」과 재료가 어긋나면 달력·주간 집계가 빈 화면이 된다.
 */
import { useDiary } from "@/features/diary/model/diary";
import type { ActionCard, Diary } from "@/features/diary/model/types";
import type { EmotionId } from "@/features/emotion/model/emotion";
import type { Schedule } from "@/features/home/model/types";
import { useProfile } from "@/features/my/model/settings";
import { SAMPLE_TODAY } from "@/lib/clock";

/**
 * 고정 하루의 일정 넷 — 마침 2 · 감정 3.
 *
 * 마침과 감정은 서로를 요구하지 않는다(`12-c`) — 「면접 스터디」가 그 자리다
 * (감정은 있고 마침은 없다).
 */
export const testSchedules = (): Schedule[] => [
  {
    id: "s1",
    date: SAMPLE_TODAY,
    title: "팀 회의",
    time: null,
    source: "calendar",
    externalId: "cal-1",
    done: true,
    doneAt: `${SAMPLE_TODAY}T11:20:00`,
    emotions: [9],
    hidden: false,
  },
  {
    id: "s2",
    date: SAMPLE_TODAY,
    title: "발표 준비",
    time: null,
    source: "calendar",
    externalId: "cal-2",
    done: true,
    doneAt: `${SAMPLE_TODAY}T13:40:00`,
    emotions: [1],
    hidden: false,
  },
  {
    id: "s3",
    date: SAMPLE_TODAY,
    title: "면접 스터디",
    time: null,
    source: "calendar",
    externalId: "cal-3",
    done: false,
    doneAt: null,
    emotions: [7],
    hidden: false,
  },
  {
    id: "s4",
    date: SAMPLE_TODAY,
    title: "운동 가기",
    time: null,
    source: "manual",
    externalId: null,
    done: false,
    doneAt: null,
    emotions: [],
    hidden: false,
  },
];

type DiarySeed = {
  /** 2026-07 의 며칠 */
  day: number;
  /** `[이야기 속 감정, 회고 시작 감정]` — 감정 태그의 초기값이기도 하다 */
  emotions: [EmotionId, EmotionId];
  body: string;
  babaView?: string;
  babaViewBasis?: string;
  weather?: string;
  /** 그 일기에 붙는 행동 카드 — **한 장뿐**이다 */
  action?: { situation: string; targetAction: string; done?: boolean };
};

/** 테스트가 보는 달 — `SAMPLE_TODAY` 와 같은 달이다 */
export const TEST_DIARY_MONTH = "2026-07";

/**
 * 일기 12편 — **기록한 날 12일 · 감정 기록 24개(12편 × 2)**.
 *
 * 보관함(`A1`·`A2`)의 「12편」·달력 점, 리포트(`W1`)의 주간 집계가 이 배열에서
 * 나온다. 값이 바뀌면 그 화면 테스트의 숫자도 함께 바뀐다.
 */
const DIARY_SEEDS: DiarySeed[] = [
  { day: 1, emotions: [5, 1], body: "새 달의 첫날. 계획을 세우다 말았지만 그래도 적어는 뒀다." },
  { day: 4, emotions: [3, 1], body: "오랜만에 늦잠을 잤다. 죄책감보다 개운함이 컸다." },
  { day: 8, emotions: [1, 2], body: "발표 준비를 끝냈다. 마지막 장을 덮을 때가 제일 좋다." },
  {
    day: 13,
    emotions: [9, 7],
    body: "메일 하나에 하루 기분이 흔들렸다. 답장은 내일 쓰기로 했다.",
    action: { situation: "답장이 밀렸을 때", targetAction: "한 줄만 먼저 보내기", done: true },
  },
  { day: 15, emotions: [4, 6], body: "몸이 무거운 하루. 그래도 저녁에 일찍 누웠다." },
  {
    day: 17,
    emotions: [5, 8],
    body: "그런 날도 있다. 이런 날은 그냥 지나가게 두기로 했다.",
    action: { situation: "아무것도 하기 싫을 때", targetAction: "10분만 밖에 나가 보기" },
  },
  {
    day: 20,
    emotions: [4, 2],
    body: "미루던 운동을 10분이라도 했다. 시작하니 생각보다 가벼웠다.",
    action: {
      situation: "운동을 미루고 싶을 때",
      targetAction: "10분만 하고 그만두기",
      done: true,
    },
  },
  { day: 21, emotions: [7, 3], body: "면접 일정이 잡혔다. 걱정이 앞섰지만 일단 달력에 적었다." },
  {
    day: 22,
    emotions: [9, 2],
    body: "회의는 답답했지만, 그 답답함은 내 의견을 전하고 싶다는 마음에서 왔다.",
    action: {
      situation: "회의에서 말이 막힐 때",
      targetAction: "핵심 한 가지부터 다시 말하기",
      done: true,
    },
  },
  { day: 24, emotions: [3, 1], body: "산책하다 해가 지는 걸 오래 봤다. 별일 없는 날이 좋았다." },
  {
    day: 26,
    emotions: [3, 1],
    body: "주말 내내 아무것도 안 했다. 그게 필요했던 것 같다.",
    action: {
      situation: "쉬고 나서도 개운하지 않을 때",
      targetAction: "다음 주 할 일 하나만 적어두기",
    },
  },
  {
    day: 27,
    emotions: [7, 8],
    body: "오늘 모의 면접에서 내 차례가 되자 준비했던 말이 잘 떠오르지 않았다. 다른 사람들은 자연스럽게 답하는 것 같아 나만 부족하다는 생각이 들었고, 집에 온 뒤에도 마음이 무거웠다. 그래도 중간에 포기하지 않고 기억나는 내용부터 다시 말해 끝까지 답했다.",
    babaView:
      "오늘 모의 면접에서 긴장해 답이 막혔지만, 그 한 번이 면접을 못한다는 뜻은 아니다. 중간에 포기하지 않고 다시 말을 이어 끝까지 답했다. 다음에는 예상 질문 하나를 골라 핵심 세 문장으로 답하는 연습부터 해보려고 한다.",
    babaViewBasis:
      "대화에서 '아예 포기하지는 않았어요', '기억나는 내용부터 다시 말해서 끝까지 답했어요'라고 하셨어요. 그 말에서 문장을 옮겨 적었어요.",
    weather: "맑음 · 27℃",
    action: {
      situation: "면접 연습을 시작할 때",
      targetAction: "예상 질문 하나를 골라 핵심 세 문장으로 답해보기",
    },
  },
];

/** 일기 12편과 거기 붙는 행동 카드 — 짝을 이룬 한 벌 */
export const testDiaryData = (): { diaries: Diary[]; actionCards: ActionCard[] } => {
  const diaries: Diary[] = DIARY_SEEDS.map((d, i) => ({
    id: `d-fixture-${d.day}`,
    date: `${TEST_DIARY_MONTH}-${String(d.day).padStart(2, "0")}`,
    body: d.body,
    babaView: d.babaView ?? null,
    babaViewBasis: d.babaViewBasis ?? null,
    emotions: [...d.emotions],
    authoredBy: "baba",
    editedAt: null,
    ordinal: i + 1,
    // 서버 회고에서 온 것이 아니다 — 서버 조회 열쇠가 없다
    retrospectId: null,
    storyEmotion: d.emotions[0],
    startEmotion: d.emotions[1],
    weather: d.weather ?? null,
  }));

  const actionCards: ActionCard[] = DIARY_SEEDS.flatMap((d, i) => {
    if (d.action == null) return [];
    const diary = diaries[i];
    if (diary == null) return [];
    return [
      {
        id: `ac-fixture-${d.day}`,
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

  return { diaries, actionCards };
};

/**
 * 온보딩을 마친 사용자 한 벌 — 마이(`M1`~`M8`)가 그릴 값이 있어야 하는 테스트용.
 *
 * 앱의 시작값은 **비어 있다**(`features/my/model/settings.ts`) — 서버
 * `GET /users/me` 나 온보딩 완료가 채운다.
 */
export const testProfile = {
  nickname: "지현",
  age: "25",
  gender: "FEMALE" as string | null,
  interests: ["RELATIONSHIP", "SELF"],
  interestOther: "",
  restMethods: ["LISTENING_TO_MUSIC", "WALKING"],
  restMethodOther: "",
  calendarLinked: true,
};

/**
 * 일기 12편을 store 에 심는다 — 옛 `useDiary.getState().reset()` 이 하던 일이다
 * (그 함수는 이제 **비우기만** 한다).
 *
 * `loaded: true` 로 둔다 — 이 뒤에 화면이 `load()` 를 불러도 심어 둔 재료를
 * 서버 응답으로 덮지 않는다.
 */
export const seedDiaries = (): void => {
  useDiary.setState({ ...testDiaryData(), loaded: true });
};

/** 온보딩을 마친 사용자를 store 에 심는다 — 마이 화면이 그릴 값이 있어야 한다 */
export const seedProfile = (): void => {
  useProfile.setState({ ...testProfile });
};
