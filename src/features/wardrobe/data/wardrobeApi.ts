import { authedRequest, type HttpError } from "@/lib/http";

import type {
  Outfit,
  TangerineReason,
  TangerineReward,
  WardrobeItem,
  WardrobeSlot,
} from "../model/types";

/**
 * 바바 꾸미기 — `/api/v1/wardrobe` 네 갈래 (2026-11-17 · BE `feat/baba-wardrobe`).
 *
 * ```
 * GET  /api/v1/wardrobe                         200 { tangerines, outfit, items, todayRewards,
 *                                                     attendanceDay, attendanceRewards, welcomed }
 * POST /api/v1/wardrobe/check-in                200 { tangerines, rewards, quiet }
 * POST /api/v1/wardrobe/welcome                 200 { tangerines, rewards, quiet }  평생 한 번
 * PUT  /api/v1/wardrobe/outfit                  200 { hat, eyes, clothes }   벗으면 null
 * POST /api/v1/wardrobe/items/{itemId}/purchase 200 { tangerines }  409 TANGERINE_NOT_ENOUGH
 * ```
 *
 * 귤은 **서버가 정산한다** — 앱은 「정산해 주세요」만 부르고, 얼마를 줄지는 서버가 일기 · 일정을 보고 정한다.
 * **던지지 않는다** — 실패는 코드로 닫는다(`treasureApi.ts` 와 같은 결).
 */
export const WARDROBE_PATH = "/api/v1/wardrobe";

const TIMEOUT_MS = 8_000;

export type Wardrobe = {
  tangerines: number;
  outfit: Outfit;
  items: WardrobeItem[];
  todayRewards: TangerineReason[];
  /** 출석 이레 중 오늘 칸(1~7) */
  attendanceDay: number;
  /** 출석 칸마다 받는 귤(일곱 개) — 서버가 정한다 */
  attendanceRewards: number[];
  /** 옷장 첫 선물을 이미 받았는가 */
  welcomed: boolean;
};
export type CheckIn = { tangerines: number; rewards: TangerineReward[]; quiet: boolean };

export type WardrobeFailureCode =
  | "not_enough"
  | "unauthorized"
  | "no_session"
  | "network"
  | "server"
  | "malformed"
  | "unconfigured";

export type WardrobeResult<T> = { ok: true; data: T } | { ok: false; code: WardrobeFailureCode };

const mapError = (error: HttpError): WardrobeFailureCode => {
  switch (error.code) {
    case "unauthenticated":
      return "no_session";
    case "http":
      if (error.status === 401) return "unauthorized";
      return isObject(error.body) && error.body.code === "TANGERINE_NOT_ENOUGH"
        ? "not_enough"
        : "server";
    default:
      return error.code;
  }
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const SLOTS: Record<string, WardrobeSlot> = { HAT: "hat", EYES: "eyes", CLOTHES: "clothes" };
const REASONS: readonly TangerineReason[] = [
  "CHECK_IN",
  "DIARY",
  "SCHEDULES_DONE",
  "REST",
  "LETTER",
  "WELCOME",
];

const idOrNull = (v: unknown): string | null | undefined =>
  v == null ? null : typeof v === "string" ? v : undefined;

/** 없거나 앱이 모르는 사유는 빼고 읽는다 — 이 칸이 없던 서버도 옷장은 그대로 연다 */
const toReasons = (raw: unknown): TangerineReason[] =>
  Array.isArray(raw)
    ? raw.filter((r): r is TangerineReason => REASONS.includes(r as TangerineReason))
    : [];

export const toOutfit = (raw: unknown): Outfit | null => {
  if (!isObject(raw)) return null;
  const hat = idOrNull(raw.hat);
  const eyes = idOrNull(raw.eyes);
  const clothes = idOrNull(raw.clothes);
  if (hat === undefined || eyes === undefined || clothes === undefined) return null;
  return { hat, eyes, clothes };
};

const toItem = (raw: unknown): WardrobeItem | null => {
  if (!isObject(raw)) return null;
  const { id, slot, tier, price, owned } = raw;
  const s = typeof slot === "string" ? SLOTS[slot] : undefined;
  if (typeof id !== "string" || s == null || typeof price !== "number") return null;
  if ((tier !== "FREE" && tier !== "TANGERINE") || typeof owned !== "boolean") return null;
  return { id, slot: s, tier, price, owned };
};

const ATTENDANCE_CELLS = 7;

/** 출석 칸 — 일곱 개가 아니면 칸을 그리지 않는다(빈 목록) */
const toAttendanceRewards = (raw: unknown): number[] =>
  Array.isArray(raw) && raw.length === ATTENDANCE_CELLS && raw.every((n) => typeof n === "number")
    ? raw
    : [];

export const toWardrobe = (raw: unknown): Wardrobe | null => {
  if (!isObject(raw) || typeof raw.tangerines !== "number" || !Array.isArray(raw.items)) {
    return null;
  }
  const outfit = toOutfit(raw.outfit);
  const items = raw.items.map(toItem);
  if (outfit == null || !items.every((i) => i != null)) return null;
  return {
    tangerines: raw.tangerines,
    outfit,
    items: items as WardrobeItem[],
    todayRewards: toReasons(raw.todayRewards),
    attendanceDay:
      typeof raw.attendanceDay === "number" &&
      raw.attendanceDay >= 1 &&
      raw.attendanceDay <= ATTENDANCE_CELLS
        ? raw.attendanceDay
        : 1,
    attendanceRewards: toAttendanceRewards(raw.attendanceRewards),
    // 모르면 받은 것으로 둔다 — 선물 단추를 잘못 띄우는 것보다 안 띄우는 편이 낫다
    welcomed: raw.welcomed !== false,
  };
};

/** 앱이 모르는 사유(서버가 새 보상을 더했을 때)는 빼고 읽는다 */
export const toCheckIn = (raw: unknown): CheckIn | null => {
  if (!isObject(raw) || typeof raw.tangerines !== "number" || !Array.isArray(raw.rewards)) {
    return null;
  }
  const rewards = raw.rewards.flatMap((r): TangerineReward[] =>
    isObject(r) && REASONS.includes(r.reason as TangerineReason) && typeof r.amount === "number"
      ? [{ reason: r.reason as TangerineReason, amount: r.amount }]
      : [],
  );
  return { tangerines: raw.tangerines, rewards, quiet: raw.quiet === true };
};

const toTangerines = (raw: unknown): number | null =>
  isObject(raw) && typeof raw.tangerines === "number" ? raw.tangerines : null;

const call = async <T>(
  method: "GET" | "POST" | "PUT",
  path: string,
  body: unknown,
  parse: (raw: unknown) => T | null,
): Promise<WardrobeResult<T>> => {
  const result = await authedRequest<unknown>(method, path, body, { timeoutMs: TIMEOUT_MS });
  if (!result.ok) return { ok: false, code: mapError(result.error) };
  const data = parse(result.data);
  return data == null ? { ok: false, code: "malformed" } : { ok: true, data };
};

export const fetchWardrobe = () => call("GET", WARDROBE_PATH, undefined, toWardrobe);

export const checkIn = () => call("POST", `${WARDROBE_PATH}/check-in`, undefined, toCheckIn);

export const claimWelcome = () => call("POST", `${WARDROBE_PATH}/welcome`, undefined, toCheckIn);

export const wearOutfit = (outfit: Outfit) =>
  call("PUT", `${WARDROBE_PATH}/outfit`, outfit, toOutfit);

export const purchaseItem = (itemId: string) =>
  call(
    "POST",
    `${WARDROBE_PATH}/items/${encodeURIComponent(itemId)}/purchase`,
    undefined,
    toTangerines,
  );
