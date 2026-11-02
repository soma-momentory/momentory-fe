/**
 * 디자인 편집 패널 — 셸(갈래 C)이 오른쪽에 끼워 쓴다. 셸은 A=승인본 프레임, B=시안 프레임을 나란히 둔다.
 *
 * - 시안(여러 벌 · 이름): 만들기 · 복제 · 이름 바꾸기 · 지우기 · 고르기(`onActiveDraftChange`)
 * - 토큰: `src/design/ds` 의 편집 가능한 잎 전부(검색 · 무리 · 형식) · 색 대비 읽기 값
 * - 화면 속성: Studio 등록표 47개(다섯 View)
 * - 바뀐 것: 승인본 대비 목록 · 되돌리기 · 코드 반영 명령 · 각 프레임의 반영 결과
 * - 파일: JSON 내보내기 · 가져오기
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
import { matchTokens, type InspectedElement, type TokenMatch } from "./frameInspector";
import { dropHistory, readHistory, recordEdit, redo, saveHistory, undo } from "./history";
import { StudioEditor } from "./StudioEditor";
import {
  componentByTestId,
  editableComponents,
  findStudioProperty,
  STUDIO_SCREENS,
  studioScreenForRoute,
  validValue,
} from "./studioRegistry";
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
import { PanelButton, palette, Row, Section, styles } from "./ui";
import { useFrameHighlight, useFrameInspector, useFrameReports } from "./useFrames";

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
};

/** 프레임을 다시 부르기 전에 편집을 모으는 시간 */
export const DRAFT_CHANGE_DEBOUNCE_MS = 300;
/** 같은 키를 이 시간 안에 다시 고치면 되돌리기 한 칸으로 묶는다(숫자 칸을 칠 때) */
const COALESCE_MS = 800;

type Tab = "tokens" | "studio" | "changes" | "file";

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

export function DesignEditorPanel({
  activeDraftId,
  onActiveDraftChange,
  onDraftChanged,
  frames,
  currentRoute,
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
  const [tab, setTab] = useState<Tab>("tokens");
  const [message, setMessage] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [tokenQuery, setTokenQuery] = useState("");
  const routeScreenId = studioScreenForRoute(currentRoute);
  const [studioScreen, setStudioScreen] = useState<string>(routeScreenId ?? STUDIO_SCREENS[0].id);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [picked, setPicked] = useState<{ info: InspectedElement; matches: TokenMatch[] } | null>(
    null,
  );
  const [historyTick, setHistoryTick] = useState(0);
  const reports = useFrameReports(frames);

  // 지금 라우트가 Studio 화면이면 그 화면을 먼저 보인다
  const [seenRoute, setSeenRoute] = useState(currentRoute);
  if (seenRoute !== currentRoute) {
    setSeenRoute(currentRoute);
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
      say(`「${result.draft.name}」을 만들었다`);
    } catch (error) {
      say(error instanceof Error ? error.message : String(error));
    }
  };
  const duplicate = () => {
    if (!active) return;
    const result = duplicateDraft(drafts, active.id);
    commitDrafts(result.drafts);
    onActiveDraftChange(result.draft.id);
    say(`「${result.draft.name}」으로 복제했다`);
  };
  const rename = () => {
    if (!active) return;
    try {
      commitDrafts(renameDraft(drafts, active.id, nameInput));
      setNameInput("");
      say("이름을 바꿨다");
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
    onActiveDraftChange(null);
    say(`「${active.name}」을 지웠다`);
  };
  const resetAll = () => {
    if (!active) return;
    replaceContent(EMPTY, null);
    say("이 시안의 바꾼 값을 모두 승인본으로 되돌렸다(되돌리기로 되살릴 수 있다)");
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
    say("JSON 을 내보냈다 — 아래 명령으로 코드에 반영한다");
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
          say(`「${file.name}」을 지금 시안에 덮어썼다`);
        } else {
          const result = createDraft(
            drafts,
            uniqueDraftName(drafts, imported.name),
            imported.content,
          );
          commitDrafts(result.drafts);
          onActiveDraftChange(result.draft.id);
          say(`「${result.draft.name}」으로 가져왔다`);
        }
      } catch (error) {
        say(`가져오지 못했다 — ${error instanceof Error ? error.message : String(error)}`);
      }
    };
    input.click();
  };

  // ── 화면 요소 선택 ─────────────────────────────────────────
  const onPick = useCallback(
    (info: InspectedElement) => {
      const frameGlobal = reports[info.frameId];
      const typeScale = frameGlobal?.typeScale() ?? catalog.typeScale;
      setPicked({ info, matches: matchTokens(info, catalog, content.tokens, typeScale) });
      if (info.component) {
        setTab("studio");
        setStudioScreen(info.component.screenId);
        setSelectedLayer(info.component.id);
      }
    },
    [catalog, content.tokens, reports],
  );
  useFrameInspector({ frames, enabled: inspecting, outlineColor: palette.outline, onPick });
  const selectedTestId =
    editableComponents.find((layer) => layer.id === selectedLayer)?.testId ?? null;
  useFrameHighlight(frames, tab === "studio" ? selectedTestId : null, palette.outline);

  // ── 바뀐 것 ────────────────────────────────────────────────
  const tokenChanges = Object.entries(content.tokens).sort(([a], [b]) => a.localeCompare(b));
  const studioChanges = Object.entries(content.studio).sort(([a], [b]) => a.localeCompare(b));
  const unmappable = tokenChanges.filter(([key]) => !catalog.byKey.get(key)?.editable);
  const changeCount = tokenChanges.length + studioChanges.length;
  const draftFrames = frames.filter((frame) => frame.isDraft);

  return (
    <ScrollView
      testID="design-editor-panel"
      style={{ flex: 1, backgroundColor: palette.panel }}
      contentContainerStyle={{ padding: 12, gap: 4 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={[styles.sectionTitle, { fontSize: 15 }]}>디자인 편집</Text>
      <Text style={styles.hint}>
        A = 승인본 · B = {active ? `시안 「${active.name}」` : "시안 없음(승인본)"} · 라우트{" "}
        {currentRoute}
      </Text>
      {message ? (
        <Text style={styles.hint} accessibilityLiveRegion="polite" testID="design-editor-message">
          {message}
        </Text>
      ) : null}

      <Section title={`시안 ${drafts.length}`} testID="design-editor-drafts">
        <Row>
          <PanelButton
            label="승인본"
            selected={!active}
            onPress={() => onActiveDraftChange(null)}
          />
          {drafts.map((draft) => (
            <PanelButton
              key={draft.id}
              label={`${draft.name} · ${Object.keys(draft.tokens).length + Object.keys(draft.studio).length}`}
              accessibilityLabel={`시안 ${draft.name}`}
              selected={draft.id === active?.id}
              onPress={() => {
                flush();
                setConfirmDelete(false);
                onActiveDraftChange(draft.id);
              }}
            />
          ))}
        </Row>
        <TextInput
          accessibilityLabel="시안 이름"
          placeholder={active ? "새 이름 또는 새 시안 이름" : "새 시안 이름(비우면 「시안」)"}
          value={nameInput}
          onChangeText={setNameInput}
          style={[
            styles.input,
            nameInput && draftNameError(drafts, nameInput, active?.id) ? styles.inputInvalid : null,
          ]}
        />
        <Row>
          <PanelButton label="새 시안" tone="primary" onPress={() => create(EMPTY)} />
          <PanelButton label="복제" disabled={!active} onPress={duplicate} />
          <PanelButton
            label="이름 바꾸기"
            disabled={!active || !nameInput.trim()}
            onPress={rename}
          />
          <PanelButton
            label={confirmDelete ? "한 번 더 누르면 지운다" : "지우기"}
            tone="danger"
            disabled={!active}
            onPress={remove}
          />
        </Row>
      </Section>

      <Section title="편집">
        <Row>
          <PanelButton
            label="되돌리기"
            accessibilityLabel="되돌리기 (Ctrl+Z)"
            disabled={!history?.past.length}
            onPress={() => step("undo")}
          />
          <PanelButton
            label="다시 하기"
            accessibilityLabel="다시 하기 (Ctrl+Shift+Z)"
            disabled={!history?.future.length}
            onPress={() => step("redo")}
          />
          <PanelButton label="모두 승인본으로" disabled={!changeCount} onPress={resetAll} />
          <PanelButton
            label={inspecting ? "요소 선택 끄기" : "요소 선택"}
            selected={inspecting}
            disabled={!draftFrames.length}
            onPress={() => {
              setInspecting((v) => !v);
              setPicked(null);
            }}
          />
        </Row>
        {inspecting ? (
          <Text style={styles.hint}>
            B 프레임에서 요소를 누르면 고른다 — 그동안 앱은 누름을 받지 않는다.
          </Text>
        ) : null}
        {picked ? (
          <InspectorCard
            picked={picked}
            catalog={catalog}
            onOpenToken={(key) => {
              setTab("tokens");
              setTokenQuery(key);
            }}
          />
        ) : null}
      </Section>

      <Row style={{ paddingVertical: 8 }}>
        {(
          [
            ["tokens", "토큰"],
            ["studio", "화면 속성"],
            ["changes", `바뀐 것 ${changeCount}`],
            ["file", "파일 · 코드 반영"],
          ] as const
        ).map(([id, text]) => (
          <PanelButton key={id} label={text} selected={tab === id} onPress={() => setTab(id)} />
        ))}
      </Row>

      {tab === "tokens" ? (
        <TokenEditor
          catalog={catalog}
          tokens={content.tokens}
          disabled={!active}
          onChange={setToken}
          onRevert={revertToken}
          query={tokenQuery}
          onQueryChange={setTokenQuery}
        />
      ) : null}
      {tab === "studio" ? (
        <StudioEditor
          approved={approvedStudio}
          studio={content.studio}
          disabled={!active}
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
          {!changeCount ? <Text style={styles.hint}>승인본과 다른 값이 없다.</Text> : null}
          {tokenChanges.map(([key, value]) => {
            const entry = catalog.byKey.get(key);
            return (
              <Row key={key} style={{ justifyContent: "space-between" }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={styles.label}>{entry ? tokenLabel(entry) : key}</Text>
                  <Text style={styles.mono} selectable>
                    {key}: {String(entry?.approved ?? "?")} → {String(value)}
                  </Text>
                </View>
                <PanelButton
                  label="되돌리기"
                  accessibilityLabel={`${key} 되돌리기`}
                  onPress={() => revertToken(key)}
                />
              </Row>
            );
          })}
          {studioChanges.map(([key, value]) => (
            <Row key={key} style={{ justifyContent: "space-between" }}>
              <View style={{ flexShrink: 1 }}>
                <Text style={styles.label}>
                  화면 속성 · {findStudioProperty(key)?.label ?? key}
                </Text>
                <Text style={styles.mono} selectable>
                  {key}: {String(approvedStudio[key])} → {String(value)}
                </Text>
              </View>
              <PanelButton
                label="되돌리기"
                accessibilityLabel={`${key} 되돌리기`}
                onPress={() => revertStudio(key)}
              />
            </Row>
          ))}
          {unmappable.length ? (
            <Text style={styles.error}>
              코드로 옮길 수 없는 토큰 {unmappable.length}개 —{" "}
              {unmappable.map(([k]) => k).join(", ")}
            </Text>
          ) : null}
          <Section title="프레임 반영">
            {frames.length ? null : <Text style={styles.hint}>셸이 넘겨준 프레임이 없다.</Text>}
            {frames.map((frame) => {
              const report = reports[frame.frameId];
              return (
                <Text key={frame.frameId} style={styles.hint}>
                  {frame.frameId} ({frame.isDraft ? "시안" : "승인본"}) —{" "}
                  {report
                    ? `${report.draftName ?? "승인본"} · 적용 ${report.applied.length} · 건너뜀 ${report.skipped.length}${report.skipped
                        .slice(0, 3)
                        .map((item) => ` · ${item.key}: ${item.reason}`)
                        .join("")}`
                    : "아직 읽지 못했다"}
                </Text>
              );
            })}
          </Section>
        </View>
      ) : null}
      {tab === "file" ? (
        <View style={{ gap: 8 }} testID="design-editor-file">
          <Row>
            <PanelButton
              label="JSON 내보내기"
              tone="primary"
              disabled={!active}
              onPress={exportActive}
            />
            <PanelButton label="새 시안으로 가져오기" onPress={() => importFile("new")} />
            <PanelButton
              label="지금 시안에 가져오기"
              disabled={!active}
              onPress={() => importFile("active")}
            />
          </Row>
          <Text style={styles.hint}>
            브라우저 편집은 저장소 파일을 바꾸지 않는다. 내보낸 파일을 저장소 루트에서 검토한 뒤
            반영한다:
          </Text>
          <Text style={styles.mono} selectable>
            {[
              "npm run design:apply-tokens -- <파일.json>          # DS 토큰 diff",
              "npm run design:apply -- <파일.json>                 # 화면 속성 변경 목록",
              "npm run design:apply-tokens -- <파일.json> --write",
              "npm run design:apply -- <파일.json> --write",
              "git diff -- src/design && npm run test",
            ].join("\n")}
          </Text>
          <Text style={styles.hint}>
            계산된 값 · 배열 · 최상위 값은 스크립트가 거부하고 아무것도 쓰지 않는다. 대비 보정값을
            되돌리면 `contrast.test.ts` 가 막는다.
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function InspectorCard({
  picked,
  catalog,
  onOpenToken,
}: {
  picked: { info: InspectedElement; matches: TokenMatch[] };
  catalog: TokenCatalog;
  onOpenToken: (key: string) => void;
}) {
  const { info, matches } = picked;
  const component = info.component ?? (info.testId ? componentByTestId.get(info.testId) : null);
  return (
    <View
      testID="design-editor-inspector"
      style={{ gap: 4, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: palette.line }}
    >
      <Text style={styles.label}>
        {component ? `등록 요소 「${component.label}」` : "등록되지 않은 요소"} · {info.tag}
        {info.testId ? ` · ${info.testId}` : ""}
      </Text>
      {info.text ? <Text style={styles.hint}>「{info.text}」</Text> : null}
      <Text style={styles.mono}>
        글자 {info.color || "—"} · 면 {info.backgroundColor || "—"}
        {info.borderColor ? ` · 선 ${info.borderColor}` : ""} · {info.fontSize ?? "?"}px ·{" "}
        {info.fontFamily || "—"}
      </Text>
      {matches.length ? (
        <Row>
          {matches.map((match) => (
            <PanelButton
              key={`${match.property}:${match.key}`}
              label={`${match.property} = ${match.key}${match.editable ? "" : " (읽기 전용)"}`}
              onPress={() => onOpenToken(match.key)}
            />
          ))}
        </Row>
      ) : (
        <Text style={styles.hint}>같은 값의 토큰을 찾지 못했다(직접 적은 값이거나 계산된 색).</Text>
      )}
      {!matches.length || catalog.entries.length === 0 ? null : (
        <Text style={styles.hint}>어림짐작이다 — 같은 값의 토큰이 여럿이면 모두 보인다.</Text>
      )}
    </View>
  );
}
