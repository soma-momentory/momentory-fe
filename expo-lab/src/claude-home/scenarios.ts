import type { ClaudeHomeTask } from "./HomeView";

export type ClaudeHomeScenario = {
  id: "5a" | "5b" | "5c" | "5d" | "5e" | "5f";
  label: string;
  tasks: ClaudeHomeTask[];
  showWeekDock: boolean;
};

const few: ClaudeHomeTask[] = [
  { id: "walk", title: "아침 산책 20분", time: "09:00", done: true },
  { id: "meeting", title: "프젝 회의", time: "14:00", done: false },
];

const many: ClaudeHomeTask[] = [
  ...few,
  { id: "library", title: "도서관 책 반납하기", time: "18:00", done: false },
  { id: "shopping", title: "저녁 장보기", time: "19:00", done: false },
  { id: "mother", title: "엄마한테 전화하기", time: "20:00", done: false },
];

/** `홈화면 시안 v2.dc.html`의 5a–5f 상태. 각 인스턴스에서 복제해 사용한다. */
export const claudeHomeScenarios: ClaudeHomeScenario[] = [
  { id: "5a", label: "일정 없음", tasks: [], showWeekDock: false },
  { id: "5b", label: "일정 2개", tasks: few, showWeekDock: false },
  { id: "5c", label: "일정 5개", tasks: many, showWeekDock: false },
  { id: "5d", label: "감정 하단 고정", tasks: few, showWeekDock: true },
  { id: "5e", label: "일정 많음 + 감정 고정", tasks: many, showWeekDock: true },
  { id: "5f", label: "일정 없음 + 감정 고정", tasks: [], showWeekDock: true },
];
