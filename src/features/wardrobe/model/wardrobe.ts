import { create } from "zustand";

import { track } from "@/features/analytics";
import { showToast } from "@/lib/toast";

import { ART_BY_ID } from "./figure";
import {
  NO_OUTFIT,
  type Outfit,
  type TangerineReason,
  type TangerineReward,
  type WardrobeItem,
} from "./types";

type WardrobeApi = typeof import("@/features/wardrobe/data/wardrobeApi");
const wardrobeApi = (): WardrobeApi =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("@/features/wardrobe/data/wardrobeApi");

export type PurchaseOutcome = "bought" | "not_enough" | "failed";

type WardrobeStore = {
  /** 서버에서 받은 적이 있는가 — 받기 전에는 기본 바바를 그린다 */
  loaded: boolean;
  /** 마지막으로 받으려다 실패했는가 — 옷장 화면이 한 줄로 알린다 */
  failed: boolean;
  tangerines: number;
  outfit: Outfit;
  items: WardrobeItem[];
  /** 오늘 날짜로 이미 받은 보상 — 오늘의 미션에 받았다고 표시한다 */
  todayRewards: TangerineReason[];
  /** 출석 이레 중 오늘 칸(1~7) */
  attendanceDay: number;
  /** 출석 칸마다 받는 귤 — 서버가 일곱 개를 준다. 비면 칸을 그리지 않는다 */
  attendanceRewards: number[];
  /** 옷장 첫 선물을 받았는가 — 모를 때는 받은 것으로 둔다(팝업을 띄우지 않는다) */
  welcomed: boolean;
  /** 마지막 정산이 「오늘 위기 안내가 있던 날」이라고 했는가 — 참이면 귤을 알리지 않는다 */
  quiet: boolean;
  reset: () => void;
  load: () => Promise<void>;
  /** 홈이 뜰 때 — 정산을 먼저 끝내고 옷장을 받는다(동시에 보내면 정산 전 잔액이 늦게 와 덮는다) */
  refresh: () => Promise<TangerineReward[]>;
  /** 귤 정산 — 새로 받은 귤을 돌려준다. 알리지 않을 날(위기 안내)이면 빈 목록 */
  checkIn: () => Promise<TangerineReward[]>;
  /** 입은 것을 바로 바꾸고 서버에 남긴다. 서버가 거절하면 앞 모습으로 돌린다 */
  wear: (outfit: Outfit) => Promise<boolean>;
  purchase: (itemId: string) => Promise<PurchaseOutcome>;
  /** 옷장 첫 선물 받기 — 받은 귤 수(이미 받았으면 0), 실패하면 null */
  welcome: () => Promise<number | null>;
  /** 지금 띄울 귤 축하 — 앱 맨 위의 `TangerineCelebrationHost` 가 귤 터짐으로 그린다 */
  celebration: { key: number; amount: number; title: string } | null;
  /**
   * 받은 귤을 알린다 — 일기 · 일정 · 편지 · 쉼터가 섞이면 귤 카드, 아니면 토스트 한 줄.
   * 빈 목록이면 아무것도 안 한다
   */
  celebrate: (rewards: readonly TangerineReward[]) => void;
  endCelebration: () => void;
  /**
   * 미션을 끝낸 그 자리에서 부른다(회고 저장 · 쉼터에서 나옴 · 편지 열기 · 일정 다 끝냄) — 정산하고 받은 게 있으면
   * 바로 축하하고 옷장을 다시 받는다. 홈에 다시 올 때까지 기다리지 않게 하려는 것이다
   */
  settle: () => Promise<TangerineReward[]>;
};

const EMPTY = {
  loaded: false,
  failed: false,
  tangerines: 0,
  outfit: NO_OUTFIT,
  items: [] as WardrobeItem[],
  todayRewards: [] as TangerineReason[],
  attendanceDay: 1,
  attendanceRewards: [] as number[],
  welcomed: true,
  quiet: false,
  celebration: null as { key: number; amount: number; title: string } | null,
};

/** 로그아웃마다 하나씩 오른다 — 그 전에 출발한 응답이 다음 사람의 옷장에 들어오지 않게 버린다 */
let epoch = 0;

export const useWardrobe = create<WardrobeStore>((set, get) => ({
  ...EMPTY,

  reset: () => {
    epoch += 1;
    set(EMPTY);
  },

  load: async () => {
    const started = epoch;
    const result = await wardrobeApi().fetchWardrobe();
    if (started !== epoch) return;
    if (result.ok) set({ loaded: true, failed: false, ...result.data });
    else set({ failed: true });
  },

  refresh: async () => {
    const rewards = await get().checkIn();
    await get().load();
    return rewards;
  },

  checkIn: async () => {
    const started = epoch;
    const result = await wardrobeApi().checkIn();
    if (!result.ok || started !== epoch) return [];
    set({ tangerines: result.data.tangerines, quiet: result.data.quiet });
    if (result.data.rewards.length > 0) {
      const has = (...reasons: string[]) =>
        result.data.rewards.some((r) => reasons.includes(r.reason));
      track("tangerine_rewarded", {
        amount: rewardTotal(result.data.rewards),
        check_in: has("CHECK_IN"),
        diary: has("DIARY"),
        schedules: has("SCHEDULES_DONE"),
        rest: has("REST"),
        letter: has("LETTER"),
        quiet: result.data.quiet,
      });
    }
    return result.data.quiet ? [] : result.data.rewards;
  },

  wear: async (outfit) => {
    const started = epoch;
    const before = get().outfit;
    set({ outfit });
    const result = await wardrobeApi().wearOutfit(outfit);
    if (started !== epoch) return false;
    if (!result.ok) {
      set({ outfit: before });
      return false;
    }
    track("wardrobe_outfit_changed", {
      hat: outfit.hat ?? "none",
      eyes: outfit.eyes ?? "none",
      clothes: outfit.clothes ?? "none",
    });
    return true;
  },

  purchase: async (itemId) => {
    const price = get().items.find((item) => item.id === itemId)?.price ?? 0;
    const started = epoch;
    const result = await wardrobeApi().purchaseItem(itemId);
    if (started !== epoch) return "failed";
    if (!result.ok) return result.code === "not_enough" ? "not_enough" : "failed";
    set((s) => ({
      tangerines: result.data,
      items: s.items.map((item) => (item.id === itemId ? { ...item, owned: true } : item)),
    }));
    track("wardrobe_item_purchased", { item_id: itemId, price });
    return "bought";
  },

  celebrate: (rewards) => {
    const message = rewardMessage(rewards);
    if (message == null) return;
    const title = burstTitle(rewards);
    // 해낸 일은 카드가 이유와 귤을 함께 말한다 — 토스트를 겹쳐 띄우지 않는다
    if (title != null)
      set({ celebration: { key: Date.now(), amount: rewardTotal(rewards), title } });
    else showToast(message, "positive");
  },

  endCelebration: () => set({ celebration: null }),

  settle: async () => {
    const rewards = await get().checkIn();
    if (rewards.length > 0) {
      get().celebrate(rewards);
      void get().load();
    }
    return rewards;
  },

  welcome: async () => {
    const started = epoch;
    const result = await wardrobeApi().claimWelcome();
    if (!result.ok || started !== epoch) return null;
    set({ tangerines: result.data.tangerines, welcomed: true });
    const amount = rewardTotal(result.data.rewards);
    if (amount > 0) track("wardrobe_welcome_claimed", {});
    return amount;
  },
}));

export const rewardTotal = (rewards: readonly TangerineReward[]) =>
  rewards.reduce((sum, r) => sum + r.amount, 0);

/**
 * 귤 카드의 제목 — 일기 · 일정 · 편지 · 쉼터가 섞였을 때만 있다. 출석은 출석 시트가 따로 알리고,
 * 그 밖에는 카드 없이 토스트만 띄우므로 `null`
 */
export const burstTitle = (rewards: readonly TangerineReward[]): string | null => {
  const done = BURST_TITLE.filter(([reason]) => rewards.some((r) => r.reason === reason));
  if (done.length === 0) return null;
  if (done.length === 1) return done[0]![1];
  const reasons = done.map(([reason]) => reason);
  return reasons.length === 2 && reasons.includes("DIARY") && reasons.includes("SCHEDULES_DONE")
    ? "일기도 일정도 다 끝냈어요"
    : "오늘 할 일을 해냈어요";
};

/** 귤 축하 카드를 띄우는 사유와 그 제목 — 미션을 끝내고 그 화면을 나온 순간 같은 카드로 알린다 */
const BURST_TITLE: readonly (readonly [TangerineReason, string])[] = [
  ["DIARY", "오늘 일기를 다 썼어요"],
  ["SCHEDULES_DONE", "오늘 일정을 다 끝냈어요"],
  ["LETTER", "바바의 편지를 읽었어요"],
  ["REST", "쉼터에 다녀왔어요"],
];

const REASON_TEXT: Record<TangerineReason, string> = {
  CHECK_IN: "출석해서",
  DIARY: "일기를 써서",
  SCHEDULES_DONE: "오늘 일정을 다 끝내서",
  REST: "쉼터에 다녀와서",
  LETTER: "편지를 읽어서",
  WELCOME: "첫 선물로",
};

/** 받은 귤을 알리는 한 줄 — 사유가 하나면 왜 받았는지 말하고, 여럿이면 합만 말한다 */
export const rewardMessage = (rewards: readonly TangerineReward[]): string | null => {
  if (rewards.length === 0) return null;
  const total = rewardTotal(rewards);
  return rewards.length === 1
    ? `${REASON_TEXT[rewards[0]!.reason]} 귤 ${total}개를 받았어요`
    : `귤 ${total}개를 받았어요`;
};

export type ShopFilter = WardrobeItem["slot"] | "all";

export const SLOTS: readonly WardrobeItem["slot"][] = ["hat", "eyes", "clothes"];

/** 상점에 보일 아이템 — 앱이 그림을 가진 것만, 칸 안에서는 카탈로그 순서대로 */
export const shopItems = (items: readonly WardrobeItem[], slot: WardrobeItem["slot"]) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  return [...ART_BY_ID.values()]
    .filter((art) => art.slot === slot && byId.has(art.id))
    .map((art) => ({ art, item: byId.get(art.id)! }));
};

/**
 * 오늘의 미션 — 서버 `TangerineReason` 의 하루 보상과 같은 값이다(값을 바꾸면 BE 와 함께 바꾼다).
 * 출석은 이레 칸으로 따로 보인다. 남은 개수나 진행률은 쓰지 않는다 — 받았는지만 표시한다.
 */
export const MISSIONS: readonly { reason: TangerineReason; label: string; amount: number }[] = [
  { reason: "DIARY", label: "일기 쓰기", amount: 30 },
  { reason: "SCHEDULES_DONE", label: "오늘 일정 모두 끝내기", amount: 10 },
  { reason: "REST", label: "쉼터 한 곳 끝까지 다녀오기", amount: 10 },
  { reason: "LETTER", label: "바바의 편지 열어 보기", amount: 10 },
];

/** 출석 이레 한 칸의 상태 — 지난 칸 · 오늘 · 아직 */
export type AttendanceCell = { day: number; amount: number; state: "past" | "today" | "next" };

/**
 * 출석 칸 일곱 개 — 오늘 칸 앞은 이어 온 날이고, 뒤는 앞으로 받을 귤이다.
 * 오늘 칸은 출석했는지와 상관없이 「오늘」로 둔다(받았는지는 `todayRewards` 가 정한다).
 */
export const attendanceCells = (day: number, rewards: readonly number[]): AttendanceCell[] =>
  rewards.map((amount, i) => ({
    day: i + 1,
    amount,
    state: i + 1 < day ? "past" : i + 1 === day ? "today" : "next",
  }));

/** 가진 아이템을 누르면 바로 입고, 입은 것을 다시 누르면 벗는다 */
export const wearToggled = (outfit: Outfit, slot: WardrobeItem["slot"], id: string): Outfit => ({
  ...outfit,
  [slot]: outfit[slot] === id ? null : id,
});

export const SLOT_LABEL: Record<WardrobeItem["slot"], string> = {
  hat: "모자",
  eyes: "얼굴",
  clothes: "옷",
};
