/**
 * 디자인 편집 패널 — 셸이 오른쪽에 끼워 쓴다. 셸은 A=지금 앱(승인본) 프레임, B=시안 프레임을 나란히 둔다.
 *
 * 처음 보는 사람이 순서를 따라가게 짰다(위 「순서」 네 칸):
 * ① 시안 만들기 → ② 값 고치기 → ③ B 화면에서 확인(A와 비교) → ④ 코드에 반영.
 *
 * - 시안(여러 벌 · 이름): 만들기 · 복제 · 이름 바꾸기 · 지우기 · 고르기(`onActiveDraftChange`)
 * - **이 화면에 쓰인 값**(기본): 프레임에 보이는 요소의 계산된 값과 같은 토큰만 묶음별로(`screenUsage.ts`)
 * - **화면에서 눌러 고르기**(시안이 있으면 켜져 있다): B 의 요소를 누르면 그 요소 카드(`ElementCard`)
 * - **탭 배경 바꿔 보기**: 탭 다섯 칸의 종이 배경(`TabBackgroundEditor` · 탭 화면이면 「이 화면에 쓰인 값」에도)
 * - 바꾼 목록 · 내보내기 · 코드 반영
 * - 고급: 모든 공통 값(`src/design/ds` 의 편집 가능한 잎 전부) · 화면별 값(Studio 등록표 다섯 화면)
 *
 * 편집은 곧바로 localStorage 에 쓰고, ~300ms 모아서 `onDraftChanged(id)` 를 부른다 —
 * 셸은 그때 시안 프레임을 다시 불러온다(프레임은 앱 모듈보다 먼저 시안을 덮어쓴다 · `applyDraft.ts`).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, ScrollView, Text, TextInput, View } from "react-native";

import { DESIGN_DRAFTS_STORAGE_KEY, type DesignDraft } from "../lab-contract";
import {
  createDraft,
  deleteDraft,
  draftNameError,
  duplicateDraft,
  exportDraftJson,
  findDraft,
  migrateLegacyStudioDrafts,
  parseDraftExport,
  readDrafts,
  renameDraft,
  setOverride,
  uniqueDraftName,
  updateDraftContent,
  writeDrafts,
  type DraftContent,
  type ImportValidators,
} from "./drafts";
import { ElementCard, type PickedCard } from "./ElementCard";
import {
  buildHandoff,
  dropNotes,
  emptyNotes,
  HANDOFF_PROMPT,
  handoffFileName,
  handoffRoutes,
  labFromHash,
  normalizeRoute,
  readNotes,
  writeNotes,
  type DraftNotes,
  type HandoffReference,
  type LabHandoff,
} from "./handoff";
import { dropHistory, readHistory, recordEdit, redo, saveHistory, undo } from "./history";
import { ScreenUsage } from "./ScreenUsageList";
import {
  candidatesFor,
  describeElement,
  matchUsage,
  screenGroupsForRoute,
  usageCount,
  type MatchContext,
  type UsageProperty,
} from "./screenUsage";
import { StudioEditor } from "./StudioEditor";
import {
  editableComponents,
  findStudioProperty,
  STUDIO_SCREENS,
  studioScreenForRoute,
  validValue,
} from "./studioRegistry";
import { TabBackgroundEditor } from "./TabBackgroundEditor";
import {
  approvedTabBackgroundFor,
  isTabBackgroundKey,
  tabBackgroundLabel,
  tabBackgroundName,
  tabBackgroundValueError,
  tabForRoute,
} from "./tabBackgrounds";
import { loadStudioApproved, loadTokenModules } from "./tokenModules";
import { TokenEditor } from "./TokenEditor";
import {
  buildTokenCatalog,
  canonicalTokenKey,
  tokenLabel,
  tokenValueError,
  type TokenCatalog,
  type TokenValue,
} from "./tokens";
import { BeforeAfter, PanelButton, palette, Row, Section, styles } from "./ui";
import {
  useFrameBoxes,
  useFrameHighlight,
  useFrameInspector,
  useFrameReports,
  useScreenUsage,
  type FrameReports,
} from "./useFrames";

export type EditorFrameRef = {
  frameId: string;
  /** 같은 출처 iframe — 화면 요소 선택에 `contentDocument` 를 쓸 수 있다 */
  element: HTMLIFrameElement | null;
  /** 시안이 적용된 프레임인가(승인본 프레임은 false) */
  isDraft: boolean;
};

export type DesignEditorPanelProps = {
  /** 지금 시안 프레임에 걸린 시안 id. null 이면 시안 없음 */
  activeDraftId: string | null;
  onActiveDraftChange: (draftId: string | null) => void;
  /** 시안 내용이 바뀌었다 — 셸은 시안 프레임을 다시 불러온다 */
  onDraftChanged: (draftId: string) => void;
  frames: readonly EditorFrameRef[];
  /** 지금 보고 있는 라우트(예: "/home") */
  currentRoute: string;
  /** 「AI에게 넘기기」에 실을 기기 · 데이터 — 없으면 셸 주소(`#/screens?…`)에서 읽는다 */
  labContext?: LabHandoff["lab"];
  /** 화면별 참고 시안 이미지(`expo-lab/src/reference/`) — 통합 전에는 없다 */
  getReferences?: (route: string) => Promise<HandoffReference | null>;
};

/** 프레임을 다시 부르기 전에 편집을 모으는 시간 */
export const DRAFT_CHANGE_DEBOUNCE_MS = 300;
/** 같은 키를 이 시간 안에 다시 고치면 되돌리기 한 칸으로 묶는다(숫자 칸을 칠 때) */
const COALESCE_MS = 800;

type Tab = "screen" | "tabBg" | "changes" | "file" | "tokens" | "studio";

const storage = (): Storage | null => {
  try {
    return Platform.OS === "web" && typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

let shellCatalog: TokenCatalog | null = null;
/** 셸 창의 토큰 목록 — 셸은 시안을 적용하지 않으므로 승인값이다 */
export const getShellCatalog = () => (shellCatalog ??= buildTokenCatalog(loadTokenModules()));

const EMPTY: DraftContent = { tokens: {}, studio: {} };

/** 순서 네 칸 — 지금 칸을 굵은 테두리로 보인다 */
export const WORKFLOW_STEPS = [
  { title: "시안 만들기", body: "지금 앱(A)은 그대로 두고 고쳐 볼 사본을 만들어요" },
  { title: "값 고치기", body: "B 화면에서 요소를 누르거나 「이 화면에 쓰인 값」에서 고쳐요" },
  { title: "B 화면에서 확인", body: "왼쪽 B가 바로 다시 그려져요 — A와 나란히 비교해요" },
  {
    title: "AI에게 넘기기",
    body: "「AI에게 넘기기」로 받은 파일을 AI(Claude Code · Codex)에게 주면 코드에 옮겨요",
  },
] as const;

export function workflowStep(hasDraft: boolean, changeCount: number, tab: Tab): 1 | 2 | 3 | 4 {
  if (!hasDraft) return 1;
  if (!changeCount) return 2;
  return tab === "file" ? 4 : 3;
}

function WorkflowSteps({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <View style={{ gap: 3 }} testID="design-editor-steps" accessibilityLabel={`순서 ${step}단계`}>
      {WORKFLOW_STEPS.map((item, index) => {
        const number = (index + 1) as 1 | 2 | 3 | 4;
        const current = number === step;
        const done = number < step;
        return (
          <View
            key={item.title}
            testID={current ? "design-editor-step-current" : undefined}
            style={{
              flexDirection: "row",
              gap: 6,
              paddingHorizontal: 6,
              paddingVertical: current ? 5 : 2,
              borderRadius: 6,
              borderWidth: current ? 2 : 0,
              borderColor: palette.accent,
              backgroundColor: current ? palette.accentSoft : "transparent",
            }}
          >
            <Text
              style={[
                styles.hint,
                {
                  fontWeight: current ? "800" : "600",
                  color: current ? palette.ink : palette.muted,
                },
              ]}
            >
              {done ? "✓" : `${number}.`}
            </Text>
            <View style={{ flexShrink: 1 }}>
              <Text
                style={[
                  styles.hint,
                  {
                    fontWeight: current ? "800" : "600",
                    color: current ? palette.ink : palette.muted,
                  },
                ]}
              >
                {item.title}
                {current ? " · 지금" : ""}
              </Text>
              {current ? <Text style={styles.hint}>{item.body}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** 그 프레임의 `typeScale` — 못 읽으면 셸 값 */
const frameTypeScale = (reports: FrameReports, frameId: string, fallback: number) => {
  try {
    return reports[frameId]?.typeScale() ?? fallback;
  } catch {
    return fallback;
  }
};

export function DesignEditorPanel({
  activeDraftId,
  onActiveDraftChange,
  onDraftChanged,
  frames,
  currentRoute,
  labContext,
  getReferences,
}: DesignEditorPanelProps) {
  const catalog = getShellCatalog();
  const approvedStudio = useMemo(() => ({ ...loadStudioApproved() }), []);
  const [drafts, setDrafts] = useState<DesignDraft[]>(() => {
    migrateLegacyStudioDrafts(storage(), approvedStudio, (key, value) => {
      const property = findStudioProperty(key);
      return !!property && validValue(property, value);
    });
    return readDrafts(storage());
  });
  const active = findDraft(drafts, activeDraftId);
  const content: DraftContent = active ?? EMPTY;
  const [tab, setTab] = useState<Tab>("screen");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tokenQuery, setTokenQuery] = useState("");
  const routeScreenId = studioScreenForRoute(currentRoute);
  const [studioScreen, setStudioScreen] = useState<string>(routeScreenId ?? STUDIO_SCREENS[0].id);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  /** 눌러 고르기 — 사람이 정하기 전에는 시안이 있으면 켜져 있다 */
  const [inspectChoice, setInspectChoice] = useState<boolean | null>(null);
  const inspecting = inspectChoice ?? !!active;
  const [picked, setPicked] = useState<PickedCard | null>(null);
  const [hovered, setHovered] = useState<readonly Element[] | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const reports = useFrameReports(frames);
  const [fileAdvanced, setFileAdvanced] = useState(false);
  const [handedOff, setHandedOff] = useState<string | null>(null);
  // 메모 — 시안마다 따로(`momentory.lab.draftNotes:<id>`) · 시안이 바뀌면 다시 읽는다
  const [notesState, setNotesState] = useState<{ id: string | null; notes: DraftNotes }>(() => ({
    id: active?.id ?? null,
    notes: active ? readNotes(storage(), active.id) : emptyNotes(),
  }));
  let notes = notesState.notes;
  if (notesState.id !== (active?.id ?? null)) {
    notes = active ? readNotes(storage(), active.id) : emptyNotes();
    setNotesState({ id: active?.id ?? null, notes });
    setHandedOff(null);
  }
  const updateNotes = (next: DraftNotes) => {
    if (!active) return;
    writeNotes(storage(), active.id, next);
    setNotesState({ id: active.id, notes: next });
  };
  // 시안을 건 채로 지나간 화면을 적어 둔다 — 「AI에게 넘기기」의 screens
  const route = normalizeRoute(currentRoute);
  if (active && notesState.id === active.id && !notes.visited.includes(route)) {
    notes = { ...notes, visited: [...notes.visited, route] };
    writeNotes(storage(), active.id, notes);
    setNotesState({ id: active.id, notes });
  }
  const hasRouteNotes = Object.values(notes.notes).some((note) => note.trim());

  // 지금 라우트가 Studio 화면이면 그 화면을 먼저 보인다 · 고른 요소는 그 화면의 것이다
  const [seenRoute, setSeenRoute] = useState(currentRoute);
  if (seenRoute !== currentRoute) {
    setSeenRoute(currentRoute);
    setPicked(null);
    setHovered(null);
    if (routeScreenId) setStudioScreen(routeScreenId);
  }

  // ── 저장 · 알림 ─────────────────────────────────────────────
  const pending = useRef<{ id: string; timer: ReturnType<typeof setTimeout> } | null>(null);
  const notify = useRef(onDraftChanged);
  useEffect(() => {
    notify.current = onDraftChanged;
  });
  const flush = useCallback(() => {
    const current = pending.current;
    if (!current) return;
    clearTimeout(current.timer);
    pending.current = null;
    notify.current(current.id);
  }, []);
  const schedule = useCallback(
    (id: string) => {
      if (pending.current && pending.current.id !== id) flush();
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = { id, timer: setTimeout(flush, DRAFT_CHANGE_DEBOUNCE_MS) };
    },
    [flush],
  );
  useEffect(() => flush, [flush]);

  const commitDrafts = useCallback((next: DesignDraft[]) => {
    writeDrafts(storage(), next);
    setDrafts(next);
  }, []);

  // 다른 탭이 시안을 바꾸면 따라간다
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key === DESIGN_DRAFTS_STORAGE_KEY) setDrafts(readDrafts(storage()));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ── 편집 ───────────────────────────────────────────────────
  const lastEdit = useRef<{ draftId: string; key: string; at: number } | null>(null);
  const replaceContent = useCallback(
    (next: DraftContent, edit: { key: string } | null) => {
      if (!active) return;
      const now = Date.now();
      const last = lastEdit.current;
      const coalesce =
        edit &&
        last &&
        last.draftId === active.id &&
        last.key === edit.key &&
        now - last.at < COALESCE_MS;
      if (!coalesce) saveHistory(active.id, recordEdit(readHistory(active.id), active));
      lastEdit.current = edit ? { draftId: active.id, key: edit.key, at: now } : null;
      commitDrafts(updateDraftContent(drafts, active.id, next));
      setHistoryTick((n) => n + 1);
      schedule(active.id);
    },
    [active, drafts, commitDrafts, schedule],
  );

  const setToken = useCallback(
    (key: string, value: TokenValue) =>
      replaceContent(
        {
          ...content,
          tokens: setOverride(content.tokens, key, value, catalog.byKey.get(key)?.approved),
        },
        { key: `t:${key}` },
      ),
    [content, catalog, replaceContent],
  );
  const revertToken = useCallback(
    (key: string) => {
      const tokens = { ...content.tokens };
      delete tokens[key];
      replaceContent({ ...content, tokens }, null);
    },
    [content, replaceContent],
  );
  const setStudio = useCallback(
    (key: string, value: string | number) =>
      replaceContent(
        { ...content, studio: setOverride(content.studio, key, value, approvedStudio[key]) },
        { key: `s:${key}` },
      ),
    [content, approvedStudio, replaceContent],
  );
  /** 탭 배경 — `studio` 의 `tabBackground.<탭>` 키를 통째로 받는다(「모든 탭에 같은 배경」이 한 번의 편집) */
  const setTabBackgroundStudio = useCallback(
    (studio: Record<string, string | number>) =>
      replaceContent({ ...content, studio }, { key: "s:tabBackground" }),
    [content, replaceContent],
  );
  const revertStudio = useCallback(
    (key: string) => {
      const studio = { ...content.studio };
      delete studio[key];
      replaceContent({ ...content, studio }, null);
    },
    [content, replaceContent],
  );

  // 되돌리기 줄은 모듈 Map 에 있다 — historyTick 이 바뀔 때 다시 읽는다
  const history = useMemo(
    () => (active ? readHistory(active.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [active, historyTick],
  );
  const step = useCallback(
    (direction: "undo" | "redo") => {
      if (!active) return;
      const result = (direction === "undo" ? undo : redo)(readHistory(active.id), active);
      if (!result) return;
      saveHistory(active.id, result.history);
      lastEdit.current = null;
      commitDrafts(updateDraftContent(drafts, active.id, result.content));
      setHistoryTick((n) => n + 1);
      schedule(active.id);
    },
    [active, drafts, commitDrafts, schedule],
  );

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest?.("input, textarea, [contenteditable='true']")) return;
      if (!(event.ctrlKey || event.metaKey)) return;
      const key = event.key.toLowerCase();
      if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault();
        step("redo");
      } else if (key === "z") {
        event.preventDefault();
        step("undo");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [step]);

  // ── 시안 목록 ───────────────────────────────────────────────
  const say = (text: string) => setMessage(text);
  const create = (from: DraftContent) => {
    try {
      const name = nameInput.trim() || uniqueDraftName(drafts, "시안");
      const result = createDraft(drafts, name, from);
      commitDrafts(result.drafts);
      setNameInput("");
      onActiveDraftChange(result.draft.id);
      say(`시안 「${result.draft.name}」을 만들었어요 — 이제 B 화면에만 걸려요`);
    } catch (error) {
      say(error instanceof Error ? error.message : String(error));
    }
  };
  const duplicate = () => {
    if (!active) return;
    const result = duplicateDraft(drafts, active.id);
    commitDrafts(result.drafts);
    writeNotes(storage(), result.draft.id, readNotes(storage(), active.id));
    onActiveDraftChange(result.draft.id);
    say(`「${result.draft.name}」으로 복제했어요`);
  };
  const rename = () => {
    if (!active) return;
    try {
      commitDrafts(renameDraft(drafts, active.id, nameInput));
      setNameInput("");
      say("이름을 바꿨어요");
    } catch (error) {
      say(error instanceof Error ? error.message : String(error));
    }
  };
  const remove = () => {
    if (!active) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setConfirmDelete(false);
    commitDrafts(deleteDraft(drafts, active.id));
    dropHistory(active.id);
    dropNotes(storage(), active.id);
    onActiveDraftChange(null);
    say(`「${active.name}」을 지웠어요`);
  };
  const resetAll = () => {
    if (!active) return;
    replaceContent(EMPTY, null);
    say("이 시안에서 바꾼 값을 모두 지웠어요 — 「실행 취소」로 되살릴 수 있어요");
  };

  // ── 파일 ───────────────────────────────────────────────────
  const validators: ImportValidators = useMemo(
    () => ({
      token: (key, value) => {
        const canonical = canonicalTokenKey(key, catalog);
        const entry = catalog.byKey.get(canonical);
        if (!entry) throw new Error("모르는 토큰이다");
        const error = tokenValueError(entry, value, catalog.fonts);
        if (error) throw new Error(error);
        return canonical;
      },
      studio: (key, value) => {
        if (isTabBackgroundKey(key)) return tabBackgroundValueError(key, value);
        const property = findStudioProperty(key);
        if (!property) return "등록되지 않은 Studio 속성이다";
        return validValue(property, value) ? null : "허용되지 않는 값이다";
      },
      studioApproved: approvedStudio,
    }),
    [catalog, approvedStudio],
  );
  const exportActive = () => {
    if (!active || Platform.OS !== "web") return;
    const blob = new Blob([exportDraftJson(active)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `momentory-design-${active.name.replace(/[^\p{L}\p{N}_-]+/gu, "-")}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    say("시안 파일을 저장했어요 — 아래 명령으로 코드에 옮겨요");
  };
  const handOff = async () => {
    if (!active || Platform.OS !== "web") return;
    const now = new Date();
    try {
      const handoff = await buildHandoff({
        draft: active,
        notes,
        catalog,
        approvedStudio,
        lab: labContext ?? labFromHash(window.location.hash),
        now,
        getReferences,
      });
      const name = handoffFileName(active.name, now);
      const blob = new Blob(
        [
          `${JSON.stringify(handoff, null, 2)}
`,
        ],
        {
          type: "application/json",
        },
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setHandedOff(name);
    } catch (error) {
      say(
        `넘길 파일을 만들지 못했어요 — ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  };
  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(HANDOFF_PROMPT);
      say(`「${HANDOFF_PROMPT}」를 복사했어요`);
    } catch {
      say(`복사하지 못했어요 — 「${HANDOFF_PROMPT}」를 직접 적어 주세요`);
    }
  };
  const importFile = (into: "new" | "active") => {
    if (Platform.OS !== "web") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const imported = parseDraftExport(await file.text(), validators);
        if (into === "active" && active) {
          replaceContent(imported.content, null);
          say(`「${file.name}」을 지금 시안에 덮어썼어요`);
        } else {
          const result = createDraft(
            drafts,
            uniqueDraftName(drafts, imported.name),
            imported.content,
          );
          commitDrafts(result.drafts);
          onActiveDraftChange(result.draft.id);
          say(`「${result.draft.name}」으로 가져왔어요`);
        }
      } catch (error) {
        say(`가져오지 못했어요 — ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    input.click();
  };

  // ── 이 화면에 쓰인 값 · 눌러 고르기 ─────────────────────────
  /** 값을 읽고 고르는 프레임 — 시안 프레임, 없으면 B, 없으면 첫 프레임 */
  const target =
    frames.find((frame) => frame.isDraft) ??
    frames.find((frame) => frame.frameId === "B") ??
    frames[0] ??
    null;
  const screenGroups = useMemo(() => screenGroupsForRoute(currentRoute), [currentRoute]);
  // 후보는 모은 순간의 값으로 짝짓는다 — 고치는 동안(프레임이 다시 그려지기 전) 줄이 사라지지 않게
  const tokensRef = useRef(content.tokens);
  useEffect(() => {
    tokensRef.current = content.tokens;
  });
  const snapshot = useScreenUsage(target, currentRoute, !!active || inspecting, (samples, scale) =>
    matchUsage(samples, {
      catalog,
      tokens: tokensRef.current,
      typeScale: scale ?? catalog.typeScale,
      screenGroups,
    }),
  );
  const usage = snapshot?.items ?? null;

  const onPick = useCallback(
    (element: Element, frameId: string) => {
      const info = describeElement(element, frameId);
      const context: MatchContext = {
        catalog,
        tokens: tokensRef.current,
        typeScale: frameTypeScale(reports, frameId, catalog.typeScale),
        screenGroups,
      };
      const candidates: PickedCard["candidates"] = {};
      const counts: PickedCard["counts"] = {};
      for (const [property, value] of Object.entries(info.style) as [
        UsageProperty,
        string | number,
      ][]) {
        candidates[property] = candidatesFor(property, value, context);
        counts[property] = usage ? usageCount(usage, property, value) : 0;
      }
      setPicked({ element: info, candidates, counts });
      setHovered(null);
      setTab("screen");
    },
    [catalog, screenGroups, reports, usage],
  );
  useFrameInspector({
    frame: target,
    enabled: inspecting,
    outlineColor: palette.outline,
    onPick,
  });
  const pickedElement = useMemo(
    () => (picked?.element.element ? [picked.element.element] : null),
    [picked],
  );
  useFrameBoxes(target, hovered ?? pickedElement, palette.outline);
  const selectedTestId =
    editableComponents.find((layer) => layer.id === selectedLayer)?.testId ?? null;
  useFrameHighlight(
    frames,
    tab === "studio" || tab === "screen" ? selectedTestId : null,
    palette.outline,
  );
  const openAll = useCallback((key: string) => {
    setAdvancedOpen(true);
    setTab("tokens");
    setTokenQuery(key);
  }, []);

  // ── 바꾼 목록 ──────────────────────────────────────────────
  const tokenChanges = Object.entries(content.tokens).sort(([a], [b]) => a.localeCompare(b));
  const allStudioChanges = Object.entries(content.studio).sort(([a], [b]) => a.localeCompare(b));
  const studioChanges = allStudioChanges.filter(([key]) => !isTabBackgroundKey(key));
  const tabBgChanges = allStudioChanges.filter(([key]) => isTabBackgroundKey(key));
  const unmappable = tokenChanges.filter(([key]) => !catalog.byKey.get(key)?.editable);
  const changeCount = tokenChanges.length + allStudioChanges.length;
  const currentTabName = tabForRoute(currentRoute);
  const hasApprovedFrame = frames.some((frame) => !frame.isDraft);
  const currentStep = workflowStep(!!active, changeCount, tab);
  const advanced = advancedOpen || tab === "tokens" || tab === "studio";
  const onHome = /^\/(\(tabs\)\/)?home$/.test(currentRoute.split("?")[0] ?? "");

  const routeNoteField = (
    <View style={{ gap: 4 }}>
      <Text style={styles.label}>이 화면({route}) 메모</Text>
      <TextInput
        accessibilityLabel="이 화면 메모"
        placeholder="이 화면에서 바라는 것 (예: 일정 카드 사이를 조금 더 띄우기)"
        value={notes.notes[route] ?? ""}
        onChangeText={(note) => updateNotes({ ...notes, notes: { ...notes.notes, [route]: note } })}
        multiline
        style={[styles.input, { minHeight: 40, textAlignVertical: "top" }]}
      />
    </View>
  );
  const nameField = (
    <TextInput
      accessibilityLabel="시안 이름"
      placeholder={
        active ? "새 이름 (이름 바꾸기 · 새 시안에 써요)" : "시안 이름 (비우면 「시안」)"
      }
      value={nameInput}
      onChangeText={setNameInput}
      style={[
        styles.input,
        nameInput && draftNameError(drafts, nameInput, active?.id) ? styles.inputInvalid : null,
      ]}
    />
  );
  const pickButton = (
    <PanelButton
      label={inspecting ? "화면에서 눌러 고르기 · 켜짐" : "화면에서 눌러 고르기"}
      tone={inspecting ? "default" : "primary"}
      selected={inspecting}
      hint={
        inspecting
          ? "켜져 있어요 — B 화면의 요소를 누르면 그 요소의 값이 카드로 열려요. 다시 누르면 꺼지고 B 화면을 앱처럼 누를 수 있어요"
          : "B 화면의 요소를 누르면 그 요소의 값이나 같은 색을 쓰는 공통 값을 찾아 줘요"
      }
      disabled={!target}
      disabledReason="고를 화면(프레임)이 없어요"
      onPress={() => setInspectChoice(!inspecting)}
      testID="design-editor-pick"
      style={{ alignSelf: "stretch", alignItems: "center", paddingVertical: 8 }}
    />
  );
  const elementCard = picked ? (
    <ElementCard
      picked={picked}
      catalog={catalog}
      tokens={content.tokens}
      studio={content.studio}
      approvedStudio={approvedStudio}
      hasDraft={!!active}
      route={currentRoute}
      onCreateDraft={() => create(EMPTY)}
      onChange={setToken}
      onRevert={revertToken}
      onStudioChange={setStudio}
      onStudioRevert={revertStudio}
      onOpenAll={openAll}
      onClose={() => setPicked(null)}
    />
  ) : null;

  return (
    <ScrollView
      testID="design-editor-panel"
      style={{ flex: 1, backgroundColor: palette.panel }}
      contentContainerStyle={{ padding: 12, gap: 6 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.sectionTitle, { fontSize: 15 }]}>디자인 편집</Text>
      <Text style={styles.hint} testID="design-editor-summary">
        A = 지금 앱 · B = {active ? `시안 「${active.name}」` : "시안 없음(A와 같음)"} · 화면{" "}
        {currentRoute}
      </Text>
      <WorkflowSteps step={currentStep} />
      <Text style={styles.hint}>
        시안은 화면 보기(한 화면 · A/B)와 상관없이 하나예요 — 한 번 만들면 모든 화면에 걸려요.
        세밀하게 맞출 땐 한 화면, 최종 확인은 A/B.
      </Text>
      {message ? (
        <Text style={styles.note} accessibilityLiveRegion="polite" testID="design-editor-message">
          {message}
        </Text>
      ) : null}

      {!active ? (
        <View style={[styles.card, { marginTop: 4 }]} testID="design-editor-empty">
          <Text style={styles.label}>시안이 뭔가요?</Text>
          <Text style={styles.hint}>
            시안은 지금 앱(A)을 건드리지 않고 고쳐 보는 사본이에요. 만들면 B 화면에만 적용돼요.
          </Text>
          {nameField}
          <Row>
            <PanelButton
              label="새 시안 만들기"
              tone="primary"
              hint="빈 시안을 만들어 B 화면에 걸어요 — 이름 칸이 비면 「시안」이라고 지어요"
              onPress={() => create(EMPTY)}
            />
            <PanelButton
              label="시안 파일 열기"
              hint="전에 저장한 시안 파일을 새 시안으로 열어요"
              onPress={() => importFile("new")}
            />
            <PanelButton
              label="탭 배경 바꿔 보기"
              hint="새 시안을 만들고 탭 다섯 칸(홈 · 쉼터 · 보관함 · 리포트 · 마이)의 종이 배경 고르기를 열어요"
              onPress={() => {
                create(EMPTY);
                setTab("tabBg");
              }}
              testID="design-editor-open-tab-bg"
            />
          </Row>
          {drafts.length ? (
            <View style={{ gap: 6 }}>
              <Text style={styles.hint}>만들어 둔 시안 — 누르면 B 화면에 걸어요</Text>
              <Row>
                {drafts.map((draft) => {
                  const count = Object.keys(draft.tokens).length + Object.keys(draft.studio).length;
                  return (
                    <PanelButton
                      key={draft.id}
                      label={`${draft.name} (${count})`}
                      accessibilityLabel={`시안 ${draft.name}`}
                      hint={`이 시안을 B 화면에 걸어요 · 바꾼 값 ${count}개`}
                      onPress={() => onActiveDraftChange(draft.id)}
                    />
                  );
                })}
              </Row>
            </View>
          ) : null}
          <Text style={styles.hint}>
            먼저 둘러보고 싶으면 아래 버튼을 켜고 B 화면의 요소를 눌러 보세요 — 그 요소가 어떤 값을
            쓰는지 보여 줘요.
          </Text>
          {pickButton}
        </View>
      ) : null}
      {!active ? elementCard : null}

      {active ? (
        <>
          <Section title="시안" testID="design-editor-drafts">
            <Row>
              <PanelButton
                label="시안 끄기"
                hint="B 화면에서 시안을 내려 A와 같은 지금 앱으로 보여요 — 시안은 지워지지 않아요"
                onPress={() => {
                  flush();
                  setConfirmDelete(false);
                  onActiveDraftChange(null);
                }}
              />
              {drafts.map((draft) => {
                const count = Object.keys(draft.tokens).length + Object.keys(draft.studio).length;
                return (
                  <PanelButton
                    key={draft.id}
                    label={`${draft.name} (${count})`}
                    accessibilityLabel={`시안 ${draft.name}`}
                    hint={`이 시안을 B 화면에 걸어요 · 바꾼 값 ${count}개`}
                    selected={draft.id === active.id}
                    onPress={() => {
                      flush();
                      setConfirmDelete(false);
                      onActiveDraftChange(draft.id);
                    }}
                  />
                );
              })}
            </Row>
            {nameField}
            <Row>
              <PanelButton
                label="새 시안 만들기"
                hint="빈 시안을 하나 더 만들어 B 화면에 걸어요 — 위 칸의 이름을 써요"
                onPress={() => create(EMPTY)}
              />
              <PanelButton
                label="사본 만들기"
                hint="지금 시안을 바꾼 값까지 그대로 베껴 새 시안으로 만들어요"
                onPress={duplicate}
              />
              <PanelButton
                label="이름 바꾸기"
                hint="지금 시안의 이름을 위 칸에 적은 이름으로 바꿔요"
                disabled={!nameInput.trim()}
                disabledReason="위 칸에 새 이름을 먼저 적어요"
                onPress={rename}
              />
              <PanelButton
                label={confirmDelete ? "한 번 더 누르면 지운다" : "시안 지우기"}
                tone="danger"
                hint="이 시안을 지워요 — 두 번 눌러야 지워지고, 지우면 되살릴 수 없어요"
                onPress={remove}
              />
            </Row>
          </Section>

          <Section title="고치기">
            {pickButton}
            {inspecting ? (
              <Text style={styles.hint}>
                B 화면에서 요소를 눌러 보세요 — 고르는 동안에는 B 화면이 누름에 반응하지 않아요.
              </Text>
            ) : null}
            {!hasApprovedFrame ? (
              <Text style={styles.hint}>
                A와 나란히 보려면 위 레이아웃을 「A/B 비교」로 바꿔요.
              </Text>
            ) : null}
            <Row>
              <PanelButton
                label="실행 취소"
                accessibilityLabel="실행 취소 (Ctrl+Z)"
                hint="방금 한 편집을 하나 되돌려요 (Ctrl+Z)"
                disabled={!history?.past.length}
                disabledReason="되돌릴 편집이 없어요"
                onPress={() => step("undo")}
              />
              <PanelButton
                label="다시 실행"
                accessibilityLabel="다시 실행 (Ctrl+Shift+Z)"
                hint="실행 취소한 편집을 다시 해요 (Ctrl+Shift+Z · Ctrl+Y)"
                disabled={!history?.future.length}
                disabledReason="다시 할 편집이 없어요 — 실행 취소를 한 뒤에 쓸 수 있어요"
                onPress={() => step("redo")}
              />
              <PanelButton
                label="바꾼 값 모두 되돌리기"
                hint="이 시안에서 바꾼 값을 모두 지워 A와 같게 해요 — 실행 취소로 되살릴 수 있어요"
                disabled={!changeCount}
                disabledReason="바꾼 값이 없어요"
                onPress={resetAll}
              />
            </Row>
          </Section>
          {elementCard}

          <View style={{ gap: 6, paddingVertical: 8 }}>
            <Row>
              {(
                [
                  [
                    "screen",
                    "이 화면에 쓰인 값",
                    currentRoute,
                    "지금 B 화면에 보이는 요소가 실제로 쓰는 값만 모아 보여요",
                  ],
                  [
                    "tabBg",
                    "탭 배경 바꿔 보기",
                    "홈 · 쉼터 · 보관함 · 리포트 · 마이",
                    "탭 다섯 칸의 종이 배경을 골라 B 화면에서 봐요 — 모든 탭에 같은 배경도 한 번에",
                  ],
                  [
                    "changes",
                    `바꾼 값 ${changeCount}`,
                    undefined,
                    "이 시안에서 A와 달라진 값을 모아 보고 하나씩 되돌려요",
                  ],
                  [
                    "file",
                    "코드 반영 · AI에게 넘기기",
                    undefined,
                    "바꾼 값과 메모를 파일 하나로 AI(Claude Code · Codex)에게 넘겨 코드에 옮겨요 · 파일로 직접 옮기는 방법은 그 안의 고급에 있어요",
                  ],
                ] as const
              ).map(([id, text, sub, hint]) => (
                <PanelButton
                  key={id}
                  label={text}
                  sublabel={sub}
                  accessibilityLabel={text}
                  hint={hint}
                  selected={tab === id}
                  onPress={() => setTab(id)}
                />
              ))}
            </Row>
            <PanelButton
              label={advanced ? "모든 값 목록 접기" : "모든 값 목록 보기"}
              hint={
                advanced
                  ? "고급 보기 탭을 숨겨요"
                  : "화면과 상관없이 앱의 모든 공통 값과 다섯 화면의 화면별 값을 목록으로 봐요"
              }
              onPress={() => {
                if (advanced) {
                  setAdvancedOpen(false);
                  if (tab === "tokens" || tab === "studio") setTab("screen");
                } else setAdvancedOpen(true);
              }}
            />
            {advanced ? (
              <Row>
                <PanelButton
                  label={`모든 공통 값 (${catalog.entries.filter((entry) => entry.editable).length})`}
                  sublabel="모든 화면"
                  accessibilityLabel="모든 공통 값 (모든 화면)"
                  hint="색 · 글자 · 간격처럼 여러 화면이 함께 쓰는 값(src/design/ds)을 전부 목록으로 봐요"
                  selected={tab === "tokens"}
                  onPress={() => setTab("tokens")}
                />
                <PanelButton
                  label="화면별 값"
                  sublabel="홈 · 쉼터 · 보관함 · 마이 · 리포트"
                  accessibilityLabel="화면별 값 (홈 · 쉼터 · 보관함 · 마이 · 리포트)"
                  hint="다섯 화면에만 있는 값(studioApproved.json)을 요소별로 고쳐요"
                  selected={tab === "studio"}
                  onPress={() => setTab("studio")}
                />
              </Row>
            ) : null}
          </View>

          {tab === "screen" ? (
            <View style={{ gap: 10 }}>
              {/* 탭 화면이면 배경(화면에서 가장 넓은 면)을 맨 위에 — 지금 탭 한 줄 + 한꺼번에 바꾸기 */}
              {currentTabName ? (
                <Section title="탭 배경 바꿔 보기" testID="design-editor-screen-tab-bg">
                  <TabBackgroundEditor
                    studio={content.studio}
                    currentTab={currentTabName}
                    compact
                    onChange={setTabBackgroundStudio}
                    onOpenAll={() => setTab("tabBg")}
                  />
                </Section>
              ) : null}
              <ScreenUsage
                items={usage}
                catalog={catalog}
                tokens={content.tokens}
                disabled={false}
                route={currentRoute}
                onChange={setToken}
                onRevert={revertToken}
                onHover={setHovered}
                onOpenAll={openAll}
              />
              {routeScreenId ? (
                <Section title="이 화면의 요소별 값 (화면별 값)">
                  <StudioEditor
                    approved={approvedStudio}
                    studio={content.studio}
                    disabled={false}
                    routeScreenId={routeScreenId}
                    screenId={routeScreenId}
                    onScreenChange={() => undefined}
                    selectedId={selectedLayer}
                    onSelect={setSelectedLayer}
                    onChange={setStudio}
                    onRevert={revertStudio}
                    lockScreen
                    visibleTestIds={snapshot?.testIds ?? null}
                  />
                </Section>
              ) : null}
              <Section title="값으로 못 맞춘 것">
                <Text style={styles.hint}>
                  값으로 안 되는 차이는 메모로 남겨요 — 「AI에게 넘기기」에 실려 AI가 코드로 고쳐요.
                </Text>
                {routeNoteField}
              </Section>
            </View>
          ) : null}
          {tab === "tabBg" ? (
            <Section title="탭 배경 바꿔 보기" testID="design-editor-tab-bg">
              <TabBackgroundEditor
                studio={content.studio}
                currentTab={currentTabName}
                onChange={setTabBackgroundStudio}
              />
            </Section>
          ) : null}
          {tab === "tokens" ? (
            <TokenEditor
              catalog={catalog}
              tokens={content.tokens}
              disabled={false}
              onChange={setToken}
              onRevert={revertToken}
              query={tokenQuery}
              onQueryChange={setTokenQuery}
              onHome={onHome}
            />
          ) : null}
          {tab === "studio" ? (
            <StudioEditor
              approved={approvedStudio}
              studio={content.studio}
              disabled={false}
              routeScreenId={routeScreenId}
              screenId={studioScreen}
              onScreenChange={(id) => {
                setStudioScreen(id);
                setSelectedLayer(null);
              }}
              selectedId={selectedLayer}
              onSelect={setSelectedLayer}
              onChange={setStudio}
              onRevert={revertStudio}
            />
          ) : null}
          {tab === "changes" ? (
            <View style={{ gap: 6 }} testID="design-editor-changes">
              {!changeCount ? (
                <Text style={styles.hint}>
                  아직 바꾼 값이 없어요. B 화면에서 요소를 누르거나 「이 화면에 쓰인 값」에서 고치면
                  여기에 모여요.
                </Text>
              ) : null}
              {tokenChanges.map(([key, value]) => {
                const entry = catalog.byKey.get(key);
                return (
                  <Row key={key} style={{ justifyContent: "space-between" }}>
                    <View style={{ flexShrink: 1, gap: 2 }}>
                      <Text style={styles.label}>{entry ? tokenLabel(entry) : key}</Text>
                      <Text style={styles.keyText} selectable>
                        {key}
                      </Text>
                      <BeforeAfter approved={entry?.approved ?? "?"} value={value} />
                    </View>
                    <PanelButton
                      label="되돌리기"
                      hint="이 값만 지금 앱(A) 값으로 되돌려요"
                      accessibilityLabel={`${key} 되돌리기`}
                      onPress={() => revertToken(key)}
                    />
                  </Row>
                );
              })}
              {studioChanges.map(([key, value]) => (
                <Row key={key} style={{ justifyContent: "space-between" }}>
                  <View style={{ flexShrink: 1, gap: 2 }}>
                    <Text style={styles.label}>
                      화면별 값 · {findStudioProperty(key)?.label ?? key}
                    </Text>
                    <Text style={styles.keyText} selectable>
                      {key}
                    </Text>
                    <BeforeAfter approved={approvedStudio[key]} value={value} />
                  </View>
                  <PanelButton
                    label="되돌리기"
                    hint="이 값만 지금 앱(A) 값으로 되돌려요"
                    accessibilityLabel={`${key} 되돌리기`}
                    onPress={() => revertStudio(key)}
                  />
                </Row>
              ))}
              {tabBgChanges.map(([key, value]) => (
                <Row key={key} style={{ justifyContent: "space-between" }}>
                  <View style={{ flexShrink: 1, gap: 2 }}>
                    <Text style={styles.label}>탭 배경 · {tabBackgroundLabel(key) ?? key}</Text>
                    <Text style={styles.keyText} selectable>
                      {key}
                    </Text>
                    <Text style={styles.hint}>
                      A {tabBackgroundName(approvedTabBackgroundFor(key))} → B{" "}
                      {tabBackgroundName(value)}
                    </Text>
                  </View>
                  <PanelButton
                    label="되돌리기"
                    hint="이 탭 배경만 지금 앱(A) 배경으로 되돌려요"
                    accessibilityLabel={`${key} 되돌리기`}
                    onPress={() => revertStudio(key)}
                  />
                </Row>
              ))}
              {unmappable.length ? (
                <Text style={styles.error}>
                  코드로 옮길 수 없는 값 {unmappable.length}개 — 내보내도 반영 명령이 거부해요:{" "}
                  {unmappable.map(([k]) => k).join(", ")}
                </Text>
              ) : null}
              <Section title="화면에 걸렸는지 확인">
                {frames.length ? null : (
                  <Text style={styles.hint}>열린 화면(프레임)이 없어요.</Text>
                )}
                {frames.map((frame) => {
                  const report = reports[frame.frameId];
                  return (
                    <Text key={frame.frameId} style={styles.hint}>
                      {frame.frameId} ({frame.isDraft ? "시안" : "지금 앱"}) —{" "}
                      {report
                        ? `${report.draftName ? `시안 「${report.draftName}」` : "시안 없음"} · 걸린 값 ${report.applied.length} · 못 건 값 ${report.skipped.length}${report.skipped
                            .slice(0, 3)
                            .map((item) => ` · ${item.key}: ${item.reason}`)
                            .join("")}`
                        : "아직 확인 중이에요"}
                    </Text>
                  );
                })}
              </Section>
            </View>
          ) : null}
          {tab === "file" ? (
            <View style={{ gap: 8 }} testID="design-editor-file">
              <Text style={styles.note}>
                코드 반영은 AI(Claude Code · Codex)에게 맡겨요. 바꾼 값과 메모를 파일 하나로 넘기면
                AI가 앱 코드를 고치고 검사까지 돌려요. A(지금 앱)는 코드가 바뀌고 앱이 다시 불러와진
                뒤에야 바뀌어요.
              </Text>
              <Text style={styles.label}>AI에게 남길 메모</Text>
              <TextInput
                accessibilityLabel="AI에게 남길 메모"
                placeholder="값으로 못 맞춘 차이 · 의도를 적어 두면 AI가 코드로 고쳐요"
                value={notes.request}
                onChangeText={(request) => updateNotes({ ...notes, request })}
                multiline
                numberOfLines={4}
                style={[styles.input, { minHeight: 72, textAlignVertical: "top" }]}
              />
              {routeNoteField}
              <Text style={styles.hint} testID="design-editor-handoff-summary">
                넘길 것 — 공통 값 {tokenChanges.length} · 화면별 값 {studioChanges.length} · 탭 배경{" "}
                {tabBgChanges.length} · 화면 {handoffRoutes(notes).length}개
                {handoffRoutes(notes).length ? ` (${handoffRoutes(notes).join(", ")})` : ""}
              </Text>
              <PanelButton
                label="AI에게 넘기기"
                tone="primary"
                hint="바꾼 값 · 메모 · 본 화면을 파일 하나(momentory-handoff-….json)로 내려받아요 — 그 파일을 AI에게 주면 코드에 옮겨요"
                disabled={!changeCount && !notes.request.trim() && !hasRouteNotes}
                disabledReason="바꾼 값이나 메모가 없어요"
                onPress={handOff}
                testID="design-editor-handoff"
                style={{ alignSelf: "stretch", alignItems: "center", paddingVertical: 8 }}
              />
              {handedOff ? (
                <View style={[styles.note, { gap: 6 }]} testID="design-editor-handoff-done">
                  <Text style={styles.label}>「{handedOff}」을 내려받았어요</Text>
                  <Text style={styles.hint}>
                    다운로드한 파일을 AI에게 ‘{HANDOFF_PROMPT}’라고 주면 돼요 (경로를 안 주면
                    다운로드 폴더의 가장 최근 파일을 찾아요).
                  </Text>
                  <PanelButton
                    label="요청 문장 복사"
                    hint={`「${HANDOFF_PROMPT}」를 클립보드에 복사해요 — AI 대화창에 붙여 넣어요`}
                    onPress={copyPrompt}
                  />
                </View>
              ) : null}
              <PanelButton
                label={fileAdvanced ? "직접 옮기기 접기" : "파일로 직접 옮기기 (고급)"}
                hint={
                  fileAdvanced
                    ? "고급 칸을 접어요"
                    : "AI 없이 시안 파일을 저장 · 열고, 사람이 명령으로 코드에 옮기는 방법을 봐요"
                }
                onPress={() => setFileAdvanced((v) => !v)}
              />
              {fileAdvanced ? (
                <View style={{ gap: 8 }} testID="design-editor-file-advanced">
                  <Text style={styles.hint}>
                    직접 옮길 때: 1. 「시안 파일 저장」으로 파일을 받아요. 2. 저장소 루트에서 아래
                    명령으로 바뀔 코드를 먼저 확인하고(diff), 괜찮으면 `--write` 를 붙여 써요. 3.
                    `npm run test` 로 대비 검사까지 통과하면 끝이에요.
                  </Text>
                  <Row>
                    <PanelButton
                      label="시안 파일 저장"
                      hint="지금 시안을 파일(.json)로 내려받아요 — 아래 명령에 이 파일을 넘겨요"
                      onPress={exportActive}
                    />
                    <PanelButton
                      label="파일을 새 시안으로 열기"
                      hint="저장해 둔 시안 파일을 새 시안으로 열어요 — 지금 시안은 그대로예요"
                      onPress={() => importFile("new")}
                    />
                    <PanelButton
                      label="파일로 지금 시안 덮어쓰기"
                      hint="시안 파일의 값으로 지금 시안을 통째로 바꿔요 — 실행 취소로 되돌릴 수 있어요"
                      onPress={() => importFile("active")}
                    />
                  </Row>
                  <Text style={styles.label}>공통 값 (모든 화면 · src/design/ds)</Text>
                  <Text style={styles.mono} selectable>
                    {[
                      "npm run design:apply-tokens -- <파일.json>",
                      "npm run design:apply-tokens -- <파일.json> --write",
                    ].join("\n")}
                  </Text>
                  <Text style={styles.label}>
                    화면별 값 (studioApproved.json) · 탭 배경 (tabBackgrounds.ts)
                  </Text>
                  <Text style={styles.mono} selectable>
                    {[
                      "npm run design:apply -- <파일.json>",
                      "npm run design:apply -- <파일.json> --write",
                    ].join("\n")}
                  </Text>
                  <Text style={styles.label}>마지막 확인</Text>
                  <Text style={styles.mono} selectable>
                    git diff -- src/design && npm run test
                  </Text>
                  <Text style={styles.hint}>
                    계산된 값 · 배열 · 최상위 값이 섞여 있으면 명령이 거부하고 아무것도 쓰지 않아요.
                    대비 보정값을 되돌리면 `contrast.test.ts` 가 막아요.
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
