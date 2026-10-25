import { useProfile, useSettings } from "@/features/my/model/settings";
import { useDraft } from "@/features/onboarding/model/draft";
import {
  defaultRetroTime,
  FIRST_RETRO,
  INTRO_CARDS,
  introProgress,
  isValidAge,
  LETTER_AND_SCHEDULE_EMOTION_READY,
  nextIntro,
  READING_LINES,
  RESEARCH_DETAILS,
  skipIntro,
} from "@/features/onboarding/model/flow";

/**
 * 온보딩 v2 의 순서 · 갈래 규칙(2026-10-25). 화면은 이 함수들만 따른다.
 * 10/25 결정: 「일정마다 감정」과 「바바의 편지」가 앱에 없어서 그 두 장을 감추고 문구를 맞춘다.
 */
beforeEach(() => {
  useDraft.getState().reset();
  useProfile.getState().reset();
  useSettings.getState().reset();
});

it("아직 없는 기능을 약속하는 소개 두 장을 감춘다 — 소개는 네 장이다", () => {
  expect(LETTER_AND_SCHEDULE_EMOTION_READY).toBe(false);
  expect(INTRO_CARDS.filter((c) => c.group === "feature").map((c) => c.id)).toEqual([
    "talk",
    "diary",
    "rest",
    "report",
  ]);
  expect(INTRO_CARDS.find((c) => c.id === "talk")?.body).toBe(
    "오늘 일정을 보고, 바바가 먼저 물어봐요",
  );
  expect(READING_LINES[2]).toBe("바바에게 전하는 중");
  expect(FIRST_RETRO.title).toBe("이야기하면, 오늘 일기가 바로 생겨요");
  expect(RESEARCH_DETAILS.some((d) => d.body.includes("바바 편지"))).toBe(false);
});

it("다음 장은 감춘 장을 건너뛰고, 마지막 장 다음은 없다(로그인)", () => {
  expect(nextIntro("start")).toBe("feelings");
  expect(nextIntro("help")).toBe("talk");
  expect(nextIntro("rest")).toBe("report");
  expect(nextIntro("report")).toBeNull();
  // 감춘 장 라우트로 들어와도 앞으로 간다 — 첫 장으로 되돌아가지 않는다
  expect(nextIntro("schedule")).toBe("talk");
});

it("건너뛰기 — 문제 장은 소개 첫 장으로, 소개 장은 끝(로그인)으로", () => {
  expect(skipIntro("blur")).toBe("talk");
  expect(skipIntro("diary")).toBeNull();
});

it("진행 막대는 묶음 안의 칸이다 — 시작 장은 막대가 없다", () => {
  expect(introProgress("start")).toBeNull();
  expect(introProgress("ruminate")).toEqual({ index: 2, count: 5 });
  expect(introProgress("report")).toEqual({ index: 3, count: 4 });
});

it("질문 3 이 알림 기본 시각을 정한다 — 「지쳐서 바로 자요」만 9시", () => {
  expect(defaultRetroTime("TIRED_SLEEP")).toBe("21:00");
  expect(defaultRetroTime("OVERTHINK")).toBe("22:30");
  expect(defaultRetroTime(null)).toBe("22:30");
});

it("나이는 비거나 1~120 정수다", () => {
  expect(isValidAge("")).toBe(true);
  expect(isValidAge("25")).toBe(true);
  expect(isValidAge("0")).toBe(false);
  expect(isValidAge("121")).toBe(false);
});

it("다시 온보딩하는 사람은 이름 · 나이 · 성별 · 알림 · 캘린더를 지금 값으로 미리 채운다", () => {
  useProfile.getState().set({ nickname: "모리", age: "30", gender: "MALE", calendarLinked: true });
  useSettings.getState().setTime("retro", "07:00");
  useDraft.getState().answer("dayEnd", "OKAY");

  useDraft.getState().prefill();

  const d = useDraft.getState();
  expect(d).toMatchObject({
    nickname: "모리",
    age: "30",
    gender: "MALE",
    retroTime: "07:00",
    notifyRetro: true,
    calendarLinked: true,
    reonboarding: true,
  });
  // 질문 답은 모두에게서 새로 받는다
  expect(d.answers.dayEnd).toBeNull();
});

it("처음 가입한 사람은 빈 초안으로 시작한다 — 알림 시각은 질문 3 이 정한다", () => {
  useDraft.getState().prefill();
  expect(useDraft.getState()).toMatchObject({ nickname: "", retroTime: null, reonboarding: false });
});
