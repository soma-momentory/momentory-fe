import { create } from "zustand";

import type { Gender } from "@/features/onboarding/model/draft";
import { SAMPLE_USER } from "@/mocks/sample";

/**
 * 알림 설정(`M3`) — 스키마 `User.notify*` 넷.
 *
 * **하나의 설정을 두 줄로 나누지 않는다**(`M3.md`) — 한 행이 시각과 켜짐을
 * 함께 담는다. 그래서 켜짐과 시각이 같은 항목 안에 있다.
 *
 * **꺼도 설정한 시각은 남는다** — 다시 켜면 그 시각 그대로다. 껐다는 이유로
 * 값을 지우면 다시 켜는 일이 다시 설정하는 일이 된다. 그래서 `enabled` 를
 * 끌 때 `time` 을 건드리지 않는다.
 *
 * **회고 완료 축하 토글을 만들지 않는다** — 목록에 없는 것이 규칙이다.
 * 캘린더도 여기 없다(마이 홈의 `[연결 관리]` 한 곳뿐).
 */
export type NotifyKey = "retro" | "daily" | "weekly" | "news";

export type NotifySetting = {
  enabled: boolean;
  /** 시각이 없는 알림(새로운 소식)은 `null` — 그 줄에는 `›` 를 두지 않는다 */
  time: string | null;
};

type SettingsStore = {
  notify: Record<NotifyKey, NotifySetting>;
  toggle: (key: NotifyKey) => void;
  /** 행을 눌러 시각을 고친다 — 스위치는 켜고 끄기만 한다 */
  setTime: (key: NotifyKey, time: string) => void;
  reset: () => void;
};

const EMPTY: Record<NotifyKey, NotifySetting> = {
  // 온보딩 `08` 에서 정한 회고 시각이 여기로 이어진다 — 데모 시작값은 샘플 사용자다
  retro: { enabled: SAMPLE_USER.notifyRetro, time: SAMPLE_USER.retroTime },
  daily: { enabled: false, time: "14:00" },
  weekly: { enabled: true, time: "21:00" },
  // 시각이 없는 알림 — 누를 곳이 없는 표식(`›`)을 만들지 않는다
  news: { enabled: false, time: null },
};

export const useSettings = create<SettingsStore>((set) => ({
  notify: { ...EMPTY },

  toggle: (key) =>
    set((s) => ({
      notify: {
        ...s.notify,
        // 시각은 그대로 둔다 — 다시 켜면 그 시각이다
        [key]: { ...s.notify[key], enabled: !s.notify[key].enabled },
      },
    })),

  setTime: (key, time) =>
    set((s) => ({ notify: { ...s.notify, [key]: { ...s.notify[key], time } } })),

  reset: () => set({ notify: { ...EMPTY } }),
}));

/**
 * 회고 프로필(`M2`) — 온보딩에서 답한 것을 고치는 자리.
 *
 * **온보딩에서 묻지 않은 것을 여기서 편집하게 두지 않는다**(`M2.md`).
 * 반대로 **물은 것은 전부 여기 또는 `M1` 의 다른 줄에 있어야 한다** —
 * 쉬는 방법(`07`) 섹션이 그래서 있다.
 *
 * ⚠ **나이·성별(`05-b`)도 여기 있다.** `M1` 은 「기본 정보」를 별도 줄로 두지만
 * 상류 상태 기계(`momentory.states.mvp.json` `my`)의 전이는 `editProfile →
 * profile` · `notify` · `lock` 셋뿐이라 **기본 정보만 가는 화면이 없다.**
 * 화면을 새로 만들지 않고 `M2` 안에 섹션으로 두는 쪽을 골랐다 — 그래야
 * "빠짐없이 편집 경로가 있다"는 invariant 를 지킬 수 있다.
 * 시안(`M2`)에는 이 섹션이 없다 — 상류 확인 후보다(`TASKS.md`).
 */
type ProfileStore = {
  nickname: string;
  interests: string[];
  restMethods: string[];
  /**
   * 온보딩 `05-b` 의 기본 정보 — **선택**이라 비어 있을 수 있다.
   * `M1` 의 「기본 정보」 줄이 여기로 온다(아래 주석 참조).
   */
  age: string;
  gender: Gender | null;
  set: (v: Partial<Omit<ProfileStore, "set" | "reset">>) => void;
  reset: () => void;
};

const PROFILE = {
  // 홈·회고 대화가 같은 닉네임을 봐야 한다 — 값의 정본은 샘플 사용자 한 곳이다
  nickname: SAMPLE_USER.nickname as string,
  interests: ["relations", "self"],
  restMethods: ["🎵 음악 듣기", "🚶 산책하기"],
  age: "25",
  gender: "female" as Gender | null,
};

export const useProfile = create<ProfileStore>((set) => ({
  ...PROFILE,
  set: (v) => set(v),
  reset: () => set(PROFILE),
}));
