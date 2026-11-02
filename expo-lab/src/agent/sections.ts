/** 새 화면이 들어갈 묶음 — id 는 서버(`server/prompt.js` SECTIONS)와 같다. */
export const NEW_SCREEN_SECTIONS = [
  { id: "intro", label: "소개" },
  { id: "onboarding", label: "온보딩" },
  { id: "home", label: "홈" },
  { id: "retro", label: "회고" },
  { id: "letter", label: "편지" },
  { id: "rest", label: "쉼터" },
  { id: "archive", label: "보관함" },
  { id: "report", label: "리포트" },
  { id: "my", label: "마이" },
  { id: "other", label: "기타" },
] as const;

export type NewScreenSectionId = (typeof NEW_SCREEN_SECTIONS)[number]["id"];

/** 주소에 쓸 영문 이름 다듬기 — 서버도 같은 규칙으로 한 번 더 다듬는다. */
export const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
