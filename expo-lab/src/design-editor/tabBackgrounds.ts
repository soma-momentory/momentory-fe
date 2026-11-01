/**
 * 「탭 배경 바꿔 보기」 — 탭 다섯 칸의 종이 배경(`src/design/tabBackgrounds.ts`)을 시안으로 바꿔 본다.
 *
 * 시안에는 `studio` 의 **`tabBackground.<탭>`** 키로 둔다(예: `"tabBackground.쉼터": "warm-ivory"`).
 * `DesignDraft` 타입을 바꾸지 않고, 화면별 값(Studio)처럼 「승인본과 다른 것만」 드는 덮어쓰기라 같은 자리에 둔다.
 * Studio 등록표(`studioRegistry.ts`)의 키는 아니다 — 등록표를 보는 곳은 이 접두사를 먼저 거른다.
 *
 * 앱은 `TabPaperBackground` 가 **그릴 때마다** `tabBackgroundByTab[tab]` 을 읽는다(모듈이 올라올 때 굳히지 않는다).
 * 그래서 프레임이 앱 화면을 그리기 전에 그 객체를 제자리에서 바꾸면 B 의 모든 탭이 시안 배경으로 그려진다
 * (`applyDraft.ts`). `as const` 는 타입일 뿐이라 객체는 얼어 있지 않다 — 얼어 있으면 이유를 남기고 건너뛴다.
 *
 * 코드 반영은 `apply-design.mjs` 가 같은 키를 읽어 `tabBackgroundByTab` 리터럴을 바꾼다.
 */
import {
  tabBackgroundAssets,
  tabBackgroundByTab,
  type TabBackgroundTab,
} from "../../../src/design/tabBackgrounds";

export const TAB_BACKGROUND_PREFIX = "tabBackground.";

/** 탭바 순서 — 홈 · 쉼터 · 보관함 · 리포트 · 마이 */
export const TAB_BACKGROUND_TABS = [
  { tab: "홈", route: "/home" },
  { tab: "쉼터", route: "/rest" },
  { tab: "보관함", route: "/archive" },
  { tab: "리포트", route: "/report" },
  { tab: "마이", route: "/my" },
] as const satisfies readonly { tab: TabBackgroundTab; route: string }[];

export type TabBackgroundId = keyof typeof tabBackgroundAssets;

export type TabBackgroundTargets = {
  /** 앱이 그릴 때 읽는 탭 → 배경 id 객체 — 제자리에서 바꾼다 */
  byTab: Record<string, string>;
  /** 고를 수 있는 배경 id */
  assets: Readonly<Record<string, unknown>>;
};

/** 이 문맥의 앱 객체 — 프레임에서는 앱 화면과 같은 모듈 인스턴스다 */
export const loadTabBackgroundTargets = (): TabBackgroundTargets => ({
  byTab: tabBackgroundByTab as unknown as Record<string, string>,
  assets: tabBackgroundAssets,
});

/**
 * 승인값(운영 기본값) — 모듈이 올라올 때 한 번 베껴 둔다. 프레임은 이 파일을 시안 적용 **전에** 부르므로
 * 프레임 안에서도 승인값이고, 셸은 시안을 적용하지 않는다.
 */
const APPROVED: Readonly<Record<string, string>> = { ...tabBackgroundByTab };

export const tabBackgroundKey = (tab: TabBackgroundTab) => `${TAB_BACKGROUND_PREFIX}${tab}`;

export const isTabBackgroundKey = (key: string) => key.startsWith(TAB_BACKGROUND_PREFIX);

/** `tabBackground.쉼터` → `쉼터`. 탭이 아니면 null */
export function tabOfKey(key: string): TabBackgroundTab | null {
  if (!isTabBackgroundKey(key)) return null;
  const tab = key.slice(TAB_BACKGROUND_PREFIX.length);
  return TAB_BACKGROUND_TABS.some((item) => item.tab === tab) ? (tab as TabBackgroundTab) : null;
}

/** 사람이 읽는 이름 — 「쉼터 탭 배경」 */
export const tabBackgroundLabel = (key: string) => {
  const tab = tabOfKey(key);
  return tab ? `${tab} 탭 배경` : null;
};

export const tabBackgroundIds = () => Object.keys(tabBackgroundAssets) as TabBackgroundId[];

/** 배경 이름 — 「1 · 따뜻한 아이보리」의 비교 번호를 떼고 「따뜻한 아이보리」 */
export function tabBackgroundName(id: string | number | null | undefined): string {
  const asset = (tabBackgroundAssets as Record<string, { label: string } | undefined>)[
    String(id ?? "")
  ];
  return asset ? asset.label.replace(/^\s*\d+\s*·\s*/, "") : String(id ?? "—");
}

export const tabBackgroundSource = (id: string) =>
  (tabBackgroundAssets as Record<string, { source: unknown } | undefined>)[id]?.source ?? null;

/** 승인 배경 id */
export const approvedTabBackground = (tab: TabBackgroundTab): string => APPROVED[tab]!;

/** 시안 키 → 승인 배경 id. 탭 배경 키가 아니면 undefined */
export const approvedTabBackgroundFor = (key: string): string | undefined => {
  const tab = tabOfKey(key);
  return tab ? APPROVED[tab] : undefined;
};

/** 키·값 검사 — 통과하면 null */
export function tabBackgroundValueError(
  key: string,
  value: unknown,
  assets: Readonly<Record<string, unknown>> = tabBackgroundAssets,
): string | null {
  if (!tabOfKey(key)) return "모르는 탭이다(홈 · 쉼터 · 보관함 · 리포트 · 마이)";
  if (typeof value !== "string" || !Object.prototype.hasOwnProperty.call(assets, value))
    return `없는 배경 이미지다 — 고를 수 있는 것: ${Object.keys(assets).join(", ")}`;
  return null;
}

/** 지금 라우트가 탭 화면이면 그 탭 */
export function tabForRoute(route: string): TabBackgroundTab | null {
  const normalized = `/${(route.split("?")[0] ?? "")
    .split("/")
    .filter((part) => part && !/^\(.*\)$/.test(part))
    .join("/")}`;
  return TAB_BACKGROUND_TABS.find((item) => item.route === normalized)?.tab ?? null;
}

/** 시안에서 그 탭이 쓰는 배경 — 덮어쓰기가 없으면 승인값 */
export const draftTabBackground = (
  studio: Readonly<Record<string, string | number>>,
  tab: TabBackgroundTab,
): string => {
  const value = studio[tabBackgroundKey(tab)];
  return typeof value === "string" ? value : approvedTabBackground(tab);
};

/**
 * 탭 배경 하나를 넣거나(승인값과 같으면) 뺀다. `tabs` 를 여럿 주면 한 번에 — 「모든 탭에 같은 배경」
 */
export function setTabBackgrounds(
  studio: Readonly<Record<string, string | number>>,
  tabs: readonly TabBackgroundTab[],
  id: string,
): Record<string, string | number> {
  const next = { ...studio };
  for (const tab of tabs) {
    const key = tabBackgroundKey(tab);
    if (approvedTabBackground(tab) === id) delete next[key];
    else next[key] = id;
  }
  return next;
}

/** 프레임에서 한 키를 앱 객체에 넣는다. 못 넣으면 이유 */
export function applyTabBackground(
  targets: TabBackgroundTargets,
  key: string,
  value: string | number,
): string | null {
  const error = tabBackgroundValueError(key, value, targets.assets);
  if (error) return error;
  const tab = tabOfKey(key)!;
  if (Object.isFrozen(targets.byTab)) return "Object.freeze 된 객체다";
  targets.byTab[tab] = value as string;
  return targets.byTab[tab] === value ? null : "값이 들어가지 않았다";
}
