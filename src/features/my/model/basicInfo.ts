import type { Option } from "@/features/onboarding/data/optionsApi";
import { completeOnboarding } from "@/features/onboarding/data/completeOnboardingApi";
import { ONBOARDING_FAILURE_MESSAGES } from "@/features/onboarding/model/submit";

import { useProfile, useSettings } from "./settings";

/**
 * 기본 정보 수정(`M3`~`M8`)의 공통 부분 — **한 항목만 고치고 저장한다.**
 *
 * 새 디자인은 한 화면 일괄 편집을 **목록 → 항목 하나 → 저장**으로 쪼갰다
 * (`design.md` 「마이」). 그런데 **서버는 통째로 덮어쓴다**
 * (`PUT /api/v1/users/me/onboarding` — 온보딩 `10` 과 같은 엔드포인트라
 * 한 필드만 보내는 길이 없다). 그래서 다섯 화면이 각자 「지금 값 + 내가 고친 것」을
 * 조립하게 두지 않고 여기 한 곳에 뒀다 — 화면마다 조립하면 한 화면이
 * 회고 시각이나 「기타」를 빠뜨리는 순간 그 값이 조용히 지워진다.
 */

/** 다섯 화면이 나눠 고치는 값 — 프로필의 부분집합이다 */
export type BasicInfo = {
  nickname: string;
  age: string;
  gender: string | null;
  interests: string[];
  interestOther: string;
  restMethods: string[];
  restMethodOther: string;
};

/** 실패는 **한 줄**로 닫는다 — 모달도 재시도 버튼도 없다(`RULES.md` 4) */
export type SaveResult = { ok: true } | { ok: false; message: string };

/**
 * 고친 항목만 넘기면 나머지는 지금 값으로 채워 보낸다.
 *
 * 이 화면들이 묻지 않는 값(회고 시각·알림·캘린더)도 **지금 값 그대로 함께**
 * 간다 — 빼고 보내면 온보딩 `08`·`09` 에서 정한 답이 지워진다.
 */
export async function saveBasicInfo(patch: Partial<BasicInfo>): Promise<SaveResult> {
  const profile = useProfile.getState();
  const retro = useSettings.getState().notify.retro;

  const next: BasicInfo = {
    nickname: profile.nickname,
    age: profile.age,
    gender: profile.gender,
    interests: profile.interests,
    interestOther: profile.interestOther,
    restMethods: profile.restMethods,
    restMethodOther: profile.restMethodOther,
    ...patch,
  };

  const result = await completeOnboarding({
    ...next,
    retroTime: retro.time ?? "",
    notifyRetro: retro.enabled,
    calendarLinked: profile.calendarLinked,
  });

  if (!result.ok) return { ok: false, message: ONBOARDING_FAILURE_MESSAGES[result.code] };

  // 서버가 받은 뒤에 기기에 남긴다 — 반대로 하면 실패한 값이 화면에 남는다
  profile.set(next);
  return { ok: true };
}

/**
 * **「바뀌었는가」는 값으로 판단한다** — 「건드렸는가」로 보면 원래 값으로
 * 되돌려 놓고도 저장이 열린 채로 남는다(`design.md` 「마이」).
 * 복수 선택은 순서가 달라도 같은 답이다.
 */
export const sameChoices = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x) => b.includes(x));

/** 아직 고르지 않은 항목의 값 — 「비었다」를 빈칸으로 두면 줄이 무너진 것처럼 보인다 */
export const NOT_CHOSEN = "선택 안 함";

/** 서버 코드 → 사람이 읽는 말. 못 받은 코드는 코드 그대로 둔다(빈칸으로 지우지 않는다) */
export const labelsOf = (items: readonly Option[], ids: readonly string[]) =>
  ids.map((id) => items.find((o) => o.id === id)?.label ?? id);

/**
 * 목록의 값 한 줄(`M3`) — 「일·직장생활 외 1개」.
 * **몇 개인지가 아니라 무엇인지를 먼저 말한다** — 세는 값이 아니라 고른 답이다.
 */
export const summarize = (labels: readonly string[]) => {
  const [first, ...rest] = labels;
  if (first == null) return NOT_CHOSEN;
  return rest.length === 0 ? first : `${first} 외 ${rest.length}개`;
};

/** 나이는 단위와 함께 읽어야 뜻이 산다 — 「25」가 아니라 「25세」다 */
export const ageText = (age: string) => (age.trim().length > 0 ? `${age.trim()}세` : NOT_CHOSEN);
