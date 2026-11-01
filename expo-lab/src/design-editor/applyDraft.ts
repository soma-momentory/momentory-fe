/**
 * 디자인 시안 적용 — 프레임 부트스트랩이 **앱 모듈을 불러오기 전에** 부른다.
 *
 * `config.designDraftId` 의 시안을 localStorage(`DESIGN_DRAFTS_STORAGE_KEY`)에서 읽어
 * - DS 토큰: `src/design/ds/*` 가 내보낸 객체를 **제자리에서** 바꾼다. 컴포넌트는 모듈이 올라올 때
 *   `StyleSheet.create` 로 값을 굳히므로, 그 전에 바꾸면 모든 화면이 시안 값으로 그려진다
 * - Studio 속성: `src/design/studioDesign.ts` 의 `approvedDesign`(JSON) 객체를 바꾼다 — 다섯 View 의 기본 prop
 * - 탭 배경(`studio` 의 `tabBackground.<탭>`): `src/design/tabBackgrounds.ts` 의 `tabBackgroundByTab` 을 바꾼다.
 *   앱(`TabPaperBackground`)은 그릴 때마다 그 객체를 읽는다(`tabBackgrounds.ts` 머리말)
 *
 * ⚠ 부트스트랩이 `Platform.OS` 를 기기 값으로 맞춘 **뒤에** 불러야 한다. 토큰 모듈은 이 함수 안에서야
 * 불러오므로(`tokenModules.ts`) 정적 import 순서는 상관없다 — `typography.ts` 가 그때 `typeScale` 을 잰다.
 *
 * 모르는 키 · 읽기 전용 키 · 틀린 값은 건너뛰고 `skipped` 에 이유를 남긴다. 결과는 프레임의
 * `window.__MOMENTORY_LAB_DESIGN__` 에도 걸어 두어 셸의 편집기가 읽는다(같은 출처 iframe).
 */
import type { DesignDraft, LabFrameConfig } from "../lab-contract";
import { findDraft, readDrafts } from "./drafts";
import { findStudioProperty, validValue } from "./studioRegistry";
import {
  applyTabBackground,
  isTabBackgroundKey,
  loadTabBackgroundTargets,
  type TabBackgroundTargets,
} from "./tabBackgrounds";
import { loadStudioApproved, loadTokenModules, type TokenModules } from "./tokenModules";
import {
  buildTokenCatalog,
  canonicalTokenKey,
  tokenValueError,
  type TokenCatalog,
  type TokenEntry,
} from "./tokens";

export type SkippedKey = { kind: "token" | "studio"; key: string; reason: string };

export type DesignApplyReport = {
  draftId: string | null;
  draftName: string | null;
  /** 실제로 바꾼 키(정규 키 · Studio 키) */
  applied: string[];
  skipped: SkippedKey[];
};

/** 프레임 `window` 에 거는 이름 — 편집기가 `iframe.contentWindow[LAB_DESIGN_GLOBAL]` 로 읽는다 */
export const LAB_DESIGN_GLOBAL = "__MOMENTORY_LAB_DESIGN__";

export type LabDesignGlobal = DesignApplyReport & {
  /** 이 프레임의 `typeScale` — 화면 요소의 글씨 크기를 `text.*` 기준 pt 와 맞출 때 쓴다 */
  typeScale: () => number;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** 잎 하나를 제자리에서 바꾼다. 못 바꾸면 이유 */
function setLeaf(modules: TokenModules, entry: TokenEntry, value: string | number): string | null {
  let target: unknown = modules[entry.module];
  for (const part of entry.path.slice(0, -1)) {
    if (!isPlainObject(target)) return "경로가 객체가 아니다";
    target = target[part];
  }
  const leaf = entry.path[entry.path.length - 1]!;
  if (!isPlainObject(target)) return "경로가 객체가 아니다";
  if (Object.isFrozen(target)) return "Object.freeze 된 객체다";
  const descriptor = Object.getOwnPropertyDescriptor(target, leaf);
  if (!descriptor) return "없는 속성이다";
  if ("value" in descriptor ? !descriptor.writable : !descriptor.set) return "쓸 수 없는 속성이다";
  target[leaf] = value;
  return target[leaf] === value ? null : "값이 들어가지 않았다";
}

export function applyDraftToTargets(
  draft: Pick<DesignDraft, "id" | "name" | "tokens" | "studio">,
  targets: {
    modules: TokenModules;
    studioApproved: Record<string, string | number>;
    /** 탭 배경 — 없으면 `tabBackground.*` 키는 이유와 함께 건너뛴다 */
    tabBackgrounds?: TabBackgroundTargets;
    catalog?: TokenCatalog;
  },
): DesignApplyReport {
  const catalog = targets.catalog ?? buildTokenCatalog(targets.modules);
  const report: DesignApplyReport = {
    draftId: draft.id,
    draftName: draft.name,
    applied: [],
    skipped: [],
  };
  for (const [rawKey, value] of Object.entries(draft.tokens)) {
    const key = canonicalTokenKey(rawKey, catalog);
    const entry = catalog.byKey.get(key);
    if (!entry) {
      report.skipped.push({ kind: "token", key: rawKey, reason: "모르는 토큰이다" });
      continue;
    }
    const error = tokenValueError(entry, value, catalog.fonts);
    if (error) {
      report.skipped.push({ kind: "token", key: rawKey, reason: error });
      continue;
    }
    const runtime = entry.scaled ? Math.round((value as number) * catalog.typeScale) : value;
    const failed = setLeaf(targets.modules, entry, runtime);
    if (failed) report.skipped.push({ kind: "token", key: rawKey, reason: failed });
    else report.applied.push(key);
  }
  for (const [key, value] of Object.entries(draft.studio)) {
    if (isTabBackgroundKey(key)) {
      const failed = targets.tabBackgrounds
        ? applyTabBackground(targets.tabBackgrounds, key, value)
        : "탭 배경 객체를 받지 못했다";
      if (failed) report.skipped.push({ kind: "studio", key, reason: failed });
      else report.applied.push(key);
      continue;
    }
    const property = findStudioProperty(key);
    if (!property) {
      report.skipped.push({ kind: "studio", key, reason: "등록되지 않은 Studio 속성이다" });
      continue;
    }
    if (!validValue(property, value)) {
      report.skipped.push({ kind: "studio", key, reason: "허용되지 않는 값이다" });
      continue;
    }
    targets.studioApproved[key] = value;
    report.applied.push(key);
  }
  return report;
}

const browserStorage = (): Pick<Storage, "getItem"> | null => {
  try {
    return typeof globalThis.localStorage === "undefined" ? null : globalThis.localStorage;
  } catch {
    return null; // 저장소 접근이 막힌 문맥(sandbox iframe 등)
  }
};

export function applyDesignDraft(
  config: LabFrameConfig,
  storage: Pick<Storage, "getItem"> | null = browserStorage(),
): DesignApplyReport {
  const draftId = config.designDraftId ?? null;
  let report: DesignApplyReport = { draftId, draftName: null, applied: [], skipped: [] };
  if (draftId) {
    const draft = findDraft(readDrafts(storage), draftId);
    if (!draft) {
      report.skipped.push({ kind: "token", key: "*", reason: "시안을 찾지 못했다(지워졌나?)" });
    } else {
      report = applyDraftToTargets(draft, {
        modules: loadTokenModules(),
        studioApproved: loadStudioApproved(),
        tabBackgrounds: loadTabBackgroundTargets(),
      });
    }
  }
  if (typeof window !== "undefined") {
    const global: LabDesignGlobal = {
      ...report,
      typeScale: () => {
        const value = loadTokenModules().typography?.typeScale;
        return typeof value === "number" ? value : 1;
      },
    };
    (window as unknown as Record<string, unknown>)[LAB_DESIGN_GLOBAL] = global;
  }
  return report;
}
