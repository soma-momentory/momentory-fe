/**
 * 참고 시안 패널 — 시안 이미지(피그마 · Claude Design 에서 뽑은 화면)를 넣고, 비교 방법과 위치 · 크기를 고른다.
 * 실제로 겹쳐 그리는 것은 셸이 기기 화면 안에 놓는 `ReferenceOverlay` 다.
 *
 * 흐름: 이미지 넣기(끌어다 놓기 · 붙여넣기 · 고르기) → 화면 폭에 맞춰 반투명 겹치기 → 다른 곳만 표시 ·
 * 밀어서 앞뒤 비교로 어긋난 곳 찾기 → 디자인 편집에서 값 고치기 → A/B 로 확인 → 코드에 반영.
 *
 * 셸과 같은 평범한 React DOM · 인라인 스타일 · `shellColor` 팔레트다. 폭 300–340px 에서 줄이 넘치지
 * 않게 짰다. 패널에 초점이 있으면 화살표가 시안을 1px(Shift 10px) 옮긴다.
 */
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import type { LabPlatform } from "../lab-contract";
import { DEFAULT_DEVICE_ID, findDevice, type LabDevice } from "../lab-devices";
import { shellColor } from "../shell/theme";
import { describeFit, detectStatusBar, displayScale, guessPixelRatio, toggleFit } from "./fit";
import {
  getReferenceStore,
  referenceApplies,
  ReferenceImageError,
  selectionKey,
  type ReferenceStore,
} from "./referenceStore";
import { isRoutePattern, normalizeRoute } from "./routeMatch";
import { isEditableTarget } from "./shortcuts";
import {
  DEFAULT_ALIGN,
  REFERENCE_IMAGE_TYPES,
  VIEW_MODES,
  type Reference,
  type ReferenceAlign,
} from "./types";
import { useReferenceSnapshot } from "./useReferences";

const PLATFORM_LABEL: Record<LabPlatform, string> = { ios: "iOS", android: "Android" };

const button = (active = false): CSSProperties => ({
  padding: "4px 8px",
  borderRadius: 7,
  border: `1px solid ${active ? shellColor.accent : shellColor.border}`,
  background: active ? shellColor.accent : shellColor.panel,
  color: active ? shellColor.onAccent : shellColor.ink,
  fontSize: 12,
  fontWeight: active ? 700 : 500,
  cursor: "pointer",
  whiteSpace: "nowrap",
});

const iconButton: CSSProperties = {
  ...button(),
  width: 28,
  padding: "4px 0",
  textAlign: "center",
};

const numberInput: CSSProperties = {
  width: 64,
  padding: "3px 6px",
  border: `1px solid ${shellColor.border}`,
  borderRadius: 6,
  fontSize: 12,
  fontVariantNumeric: "tabular-nums",
  background: shellColor.panel,
  color: shellColor.ink,
};

const note: CSSProperties = { margin: 0, fontSize: 11, lineHeight: 1.45, color: shellColor.muted };

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      style={{
        borderTop: `1px solid ${shellColor.border}`,
        padding: "10px 12px",
        display: "grid",
        gap: 8,
      }}
    >
      <h3 style={{ margin: 0, fontSize: 11, fontWeight: 600, color: shellColor.muted }}>{title}</h3>
      {children}
    </section>
  );
}

function Row({ children, gap = 6 }: { children: ReactNode; gap?: number }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap }}>{children}</div>
  );
}

/** 숫자 칸 — 「-」 처럼 쓰는 도중의 글자를 0 으로 튀기지 않게 글자를 따로 든다 */
function NumberField({
  label,
  value,
  step,
  digits,
  title,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  digits: number;
  title: string;
  onChange: (value: number) => void;
}) {
  const shown = String(Math.round(value * 10 ** digits) / 10 ** digits);
  // 쓰는 동안만 글자를 따로 든다 — 놓으면 값으로 돌아간다
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? shown;
  return (
    <label title={title} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
      {label}
      <input
        type="number"
        aria-label={label}
        step={step}
        value={text}
        onChange={(event) => {
          setDraft(event.target.value);
          const next = Number(event.target.value);
          if (event.target.value.trim() !== "" && Number.isFinite(next)) onChange(next);
        }}
        onBlur={() => setDraft(null)}
        style={numberInput}
      />
    </label>
  );
}

function NameField({ reference, store }: { reference: Reference; store: ReferenceStore }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? reference.name;
  const cancelled = useRef(false);
  const commit = () => {
    if (!cancelled.current && text.trim() && text !== reference.name) {
      store.update(reference.id, { name: text });
    }
    cancelled.current = false;
    setDraft(null);
  };
  return (
    <input
      type="text"
      aria-label="시안 이름"
      title="눌러서 이름을 고쳐요 — Enter 나 칸 밖을 누르면 저장"
      value={text}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          cancelled.current = true;
          event.currentTarget.blur();
        }
      }}
      onClick={(event) => event.stopPropagation()}
      style={{
        width: "100%",
        minWidth: 0,
        padding: "2px 4px",
        border: `1px solid transparent`,
        borderRadius: 5,
        background: "transparent",
        fontSize: 12,
        fontWeight: 600,
        color: shellColor.ink,
      }}
    />
  );
}

/** 「이 화면 · 모든 iOS 기기 · 시안과 무관」 */
export function describeScope(reference: Reference): string {
  const route = isRoutePattern(reference.route) ? `${reference.route} 모두` : "이 화면";
  const device = reference.deviceId
    ? findDevice(reference.deviceId).label
    : reference.platform
      ? `모든 ${PLATFORM_LABEL[reference.platform]} 기기`
      : "모든 기기";
  const draft = reference.draftId ? `B(편집 시안 ${reference.draftId})에만` : "A · B 모두에";
  return `${route} · ${device} · ${draft}`;
}

const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;

const imageFiles = (list: FileList | DataTransferItemList | null | undefined): File[] => {
  if (!list) return [];
  const files: File[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const entry = list[i];
    const file = entry instanceof File ? entry : entry?.kind === "file" ? entry.getAsFile() : null;
    if (file) files.push(file);
  }
  return files;
};

export type ReferencePanelProps = {
  /** 지금 화면 — 셸 상태의 라우트 패턴(`/diary/[id]`)을 넘긴다. 새 시안은 이 패턴으로 저장된다 */
  route: string;
  /** 지금 디자인 시안(편집 중인 것) — 없으면 null */
  draftId: string | null;
  platform: LabPlatform;
  deviceId: string;
  /** 시안을 고르거나 새로 넣었을 때 — 셸이 그 프레임을 앞으로 가져오거나 「옆에 나란히 놓기」 칸을 열 때 */
  onFocusReference?: (reference: Reference | null) => void;
  /** 테스트 · 하네스가 저장소를 바꿔 끼운다 */
  store?: ReferenceStore;
};

export function ReferencePanel({
  route,
  draftId,
  platform,
  deviceId,
  onFocusReference,
  store = getReferenceStore(),
}: ReferencePanelProps) {
  const snapshot = useReferenceSnapshot(store);
  const device: LabDevice = findDevice(deviceId || DEFAULT_DEVICE_ID[platform]);
  const routeKey = normalizeRoute(route);
  const scope = { route, draftId, platform, deviceId: device.id };
  // 이 화면(라우트)의 시안 전부 — 지금 기기 · 시안에 안 보이는 것도 흐리게 보여 준다
  const forRoute = snapshot.references.filter((reference) =>
    referenceApplies(reference, { route }),
  );
  const chosenId = snapshot.ui.selected[selectionKey(route)];
  const selected =
    forRoute.find((reference) => reference.id === chosenId) ?? store.activeFor(scope);
  const applies = selected ? referenceApplies(selected, scope) : false;

  const [message, setMessage] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const select = (reference: Reference | null) => {
    store.select(route, reference?.id ?? null);
    onFocusReference?.(reference);
  };

  const addFiles = async (files: readonly File[]) => {
    const images = files.filter((file) =>
      (REFERENCE_IMAGE_TYPES as readonly string[]).includes(file.type),
    );
    if (images.length === 0) {
      if (files.length > 0)
        setMessage({ tone: "error", text: "PNG · JPEG · WebP 이미지만 넣을 수 있어요" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      let last: Reference | null = null;
      for (const file of images) {
        last = await store.save(file, { route: routeKey, platform, deviceId: null, draftId: null });
      }
      if (last) {
        select(last);
        const statusBar = detectStatusBar(
          { width: last.naturalWidth, height: last.naturalHeight },
          device,
        );
        setMessage({
          tone: "info",
          text:
            statusBar === "missing"
              ? "넣었어요. 상태바 없이 뽑은 시안 같아요 — 아래 「상태바 높이만큼 내리기」를 눌러 보세요."
              : `넣었어요${images.length > 1 ? ` (${images.length}장)` : ""}. ${device.label} 폭에 맞춰 겹쳤어요.`,
        });
      }
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof ReferenceImageError ? error.message : "이미지를 저장하지 못했어요",
      });
    } finally {
      setBusy(false);
    }
  };

  // 붙여넣기(Ctrl+V) — 패널이 붙어 있는 동안 문서 전체에서 이미지를 받는다
  const addFilesRef = useRef(addFiles);
  useEffect(() => {
    addFilesRef.current = addFiles;
  });
  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const files = imageFiles(event.clipboardData?.items).filter((file) =>
        file.type.startsWith("image/"),
      );
      if (files.length === 0) return;
      event.preventDefault();
      void addFilesRef.current(files);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const setAlign = (patch: Partial<ReferenceAlign>) => {
    if (selected) store.update(selected.id, { align: patch });
  };
  const nudge = (dx: number, dy: number) => {
    if (!selected) return;
    setAlign({ offsetX: selected.align.offsetX + dx, offsetY: selected.align.offsetY + dy });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!selected || isEditableTarget(event.target)) return;
    const step = event.shiftKey ? 10 : 1;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    nudge(move[0], move[1]);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    void addFiles(imageFiles(event.dataTransfer.files));
  };

  const visible = snapshot.ui.visible;
  const ratio = selected ? guessPixelRatio(selected.naturalWidth, device.width) : null;
  const effectiveScale = selected
    ? displayScale(selected.align, selected.naturalWidth, device.width)
    : 1;
  const statusBarGuess = selected
    ? detectStatusBar({ width: selected.naturalWidth, height: selected.naturalHeight }, device)
    : "unknown";

  return (
    <div
      data-testid="reference-panel"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragOver(false);
      }}
      onDrop={onDrop}
      aria-label="참고 시안"
      style={{ outline: "none", minWidth: 0, fontSize: 12, color: shellColor.ink }}
    >
      <div style={{ padding: "10px 12px", display: "grid", gap: 8 }}>
        <Row>
          <strong style={{ fontSize: 13, flex: 1 }}>참고 시안</strong>
          <button
            type="button"
            aria-pressed={visible}
            title={`앱 화면 위에 겹친 참고 시안을 ${visible ? "숨겨요" : "다시 보여요"} — 단축키 R`}
            onClick={() => store.toggleVisible()}
            style={button(visible)}
            data-testid="reference-visible"
          >
            {visible ? "시안 숨기기 (R)" : "시안 보이기 (R)"}
          </button>
        </Row>
        <p style={note} title="새로 넣는 참고 시안이 겹쳐질 화면과 기기">
          {routeKey}
          {isRoutePattern(routeKey) ? " (모든 id)" : ""} · {device.label}
          {draftId ? ` · 편집 시안 ${draftId}` : " · 승인본"}
        </p>
        <div
          data-testid="reference-dropzone"
          title="PNG · JPEG · WebP. 피그마 · Claude Design 에서 화면 하나를 이미지로 내보내 넣어요"
          style={{
            border: `1.5px dashed ${dragOver ? shellColor.accent : shellColor.border}`,
            background: dragOver ? shellColor.accentSoft : shellColor.page,
            borderRadius: 10,
            padding: "12px 10px",
            display: "grid",
            justifyItems: "center",
            gap: 8,
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 12, color: shellColor.muted }}>
            시안 이미지를 끌어다 놓거나 붙여넣기(Ctrl+V)
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={() => fileInput.current?.click()}
            title="컴퓨터에서 시안 이미지 파일을 골라 넣어요 (PNG · JPEG · WebP)"
            style={button()}
          >
            {busy ? "넣는 중…" : "시안 이미지 고르기"}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={REFERENCE_IMAGE_TYPES.join(",")}
            multiple
            hidden
            data-testid="reference-file-input"
            onChange={(event) => {
              void addFiles(imageFiles(event.target.files));
              event.target.value = "";
            }}
          />
        </div>
        {message ? (
          <p
            role={message.tone === "error" ? "alert" : "status"}
            style={{
              ...note,
              color: message.tone === "error" ? shellColor.danger : shellColor.muted,
            }}
          >
            {message.text}
          </p>
        ) : null}
        {snapshot.loaded && !snapshot.persistent ? (
          <p style={{ ...note, color: shellColor.draft }}>
            이 브라우저에서는 저장하지 못해요 — 새로고침하면 시안이 사라져요.
          </p>
        ) : null}
      </div>

      {forRoute.length > 0 ? (
        <Section title={`이 화면의 참고 시안 ${forRoute.length}`}>
          <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 6 }}>
            {forRoute.map((reference) => {
              const isSelected = reference.id === selected?.id;
              const here = referenceApplies(reference, scope);
              return (
                <li
                  key={reference.id}
                  data-testid={`reference-item-${reference.id}`}
                  onClick={() => select(reference)}
                  title={
                    here
                      ? "눌러서 이 시안을 겹쳐요"
                      : "지금 기기 · 편집 시안에는 겹치지 않게 정해 둔 시안이에요"
                  }
                  style={{
                    display: "grid",
                    gridTemplateColumns: "36px minmax(0, 1fr) auto",
                    gap: 8,
                    alignItems: "center",
                    padding: 6,
                    borderRadius: 8,
                    cursor: "pointer",
                    border: `${isSelected ? 2 : 1}px solid ${isSelected ? shellColor.accent : shellColor.border}`,
                    background: isSelected ? shellColor.accentSoft : shellColor.panel,
                    opacity: here ? 1 : 0.6,
                  }}
                >
                  <Thumb reference={reference} store={store} />
                  <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
                    <NameField reference={reference} store={store} />
                    <span style={{ ...note, paddingLeft: 5, overflowWrap: "anywhere" }}>
                      {describeScope(reference)}
                    </span>
                  </div>
                  {confirmDelete === reference.id ? (
                    <div style={{ display: "grid", gap: 4 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        title="이 참고 시안 이미지를 지워요 — 되돌릴 수 없어요"
                        onClick={() => {
                          setConfirmDelete(null);
                          void store.remove(reference.id);
                          if (isSelected) onFocusReference?.(null);
                        }}
                        style={{
                          ...button(),
                          color: shellColor.danger,
                          borderColor: shellColor.danger,
                        }}
                      >
                        정말 지우기
                      </button>
                      <button
                        type="button"
                        title="지우지 않고 그대로 둬요"
                        onClick={() => setConfirmDelete(null)}
                        style={button()}
                      >
                        그대로 두기
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`${reference.name} 지우기`}
                      title="이 참고 시안을 지워요 — 한 번 더 물어봐요"
                      onClick={(event) => {
                        event.stopPropagation();
                        setConfirmDelete(reference.id);
                      }}
                      style={iconButton}
                    >
                      ✕
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {selected ? (
        <>
          <Section title="어디에 겹칠까">
            <Row>
              {(
                [
                  {
                    id: "device",
                    label: "이 기기에서만",
                    help: `${device.label}에서만 겹쳐요`,
                    patch: { platform, deviceId: device.id },
                    active: selected.deviceId === device.id,
                  },
                  {
                    id: "platform",
                    label: `모든 ${PLATFORM_LABEL[platform]} 기기에서`,
                    help: `${PLATFORM_LABEL[platform]} 기기 전부에 폭을 맞춰 겹쳐요`,
                    patch: { platform, deviceId: null },
                    active: selected.deviceId === null && selected.platform === platform,
                  },
                  {
                    id: "all",
                    label: "모든 기기에서",
                    help: "iOS · Android 어느 기기든 폭을 맞춰 겹쳐요",
                    patch: { platform: null, deviceId: null },
                    active: selected.deviceId === null && selected.platform === null,
                  },
                ] as const
              ).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={chip.active}
                  title={chip.help}
                  onClick={() => store.update(selected.id, chip.patch)}
                  style={button(chip.active)}
                >
                  {chip.label}
                </button>
              ))}
            </Row>
            <Row>
              <button
                type="button"
                aria-pressed={selected.draftId === null}
                title="승인본(A)과 편집 시안(B) 화면 모두에 겹쳐요"
                onClick={() => store.update(selected.id, { draftId: null })}
                style={button(selected.draftId === null)}
              >
                A · B 모두에
              </button>
              <button
                type="button"
                disabled={!draftId}
                aria-pressed={selected.draftId !== null && selected.draftId === draftId}
                title={
                  draftId
                    ? `편집 시안 ${draftId}을 건 화면(B)에만 겹쳐요`
                    : "디자인 편집에서 편집 시안을 먼저 골라야 쓸 수 있어요"
                }
                onClick={() => draftId && store.update(selected.id, { draftId })}
                style={{
                  ...button(selected.draftId !== null && selected.draftId === draftId),
                  opacity: draftId ? 1 : 0.5,
                }}
              >
                B(편집 시안)에만
              </button>
            </Row>
            {!applies ? (
              <p style={{ ...note, color: shellColor.draft }}>
                지금 프레임({device.label}
                {draftId ? ` · 편집 시안 ${draftId}` : " · 승인본"})에는 겹치지 않게 정해 둔
                시안이에요. 위에서 넓혀 주세요.
              </p>
            ) : null}
          </Section>

          <Section title="비교 방법">
            <div
              role="radiogroup"
              aria-label="비교 방법"
              style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 4 }}
            >
              {VIEW_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  role="radio"
                  aria-checked={selected.view.mode === mode.id}
                  title={mode.help}
                  onClick={() => store.update(selected.id, { view: { mode: mode.id } })}
                  style={{ ...button(selected.view.mode === mode.id), padding: "5px 2px" }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p style={note}>{VIEW_MODES.find((mode) => mode.id === selected.view.mode)?.help}</p>
            {selected.view.mode === "overlay" ? (
              <Slider
                label="진하기"
                title="시안을 얼마나 진하게 겹칠지 — 0% 는 앱만, 100% 는 시안만 보여요"
                value={selected.view.opacity}
                onChange={(opacity) => store.update(selected.id, { view: { opacity } })}
              />
            ) : null}
            {selected.view.mode === "wipe" ? (
              <Slider
                label="경계선"
                title="경계선 위치 — 화면 위 손잡이를 끌어서 옮겨도 돼요"
                value={selected.view.wipe}
                onChange={(wipe) => store.update(selected.id, { view: { wipe } })}
              />
            ) : null}
          </Section>

          <Section title="위치 · 크기 맞추기">
            <p style={note}>
              {describeFit(
                { width: selected.naturalWidth, height: selected.naturalHeight },
                device,
              )}{" "}
              · {formatBytes(selected.byteSize)}
            </p>
            <label
              title="시안 폭을 기기 화면 폭에 맞춰요. 끄면 시안을 뽑은 배율(@2x · @3x)대로 실제 크기로 놓아요"
              style={{ display: "flex", alignItems: "center", gap: 6 }}
            >
              <input
                type="checkbox"
                checked={selected.align.fit === "width"}
                onChange={() =>
                  setAlign(toggleFit(selected.align, selected.naturalWidth, device.width))
                }
              />
              화면 폭에 맞추기
              {selected.align.fit === "none" && ratio ? (
                <span style={note}>
                  (@{Math.round(ratio.ratio * 1000) / 1000}x 로 보고 실제 크기)
                </span>
              ) : null}
            </label>
            <Row>
              <span
                title="시안 이미지 1px 이 지금 기기 화면에서 몇 px 로 그려지는지"
                style={{ ...note, width: "100%" }}
              >
                지금 크기: 시안 1px → 화면 {Math.round(effectiveScale * 10000) / 10000}px
              </span>
              <button
                type="button"
                title="시안을 1% 작게 해요 (Shift 를 누르고 누르면 10%)"
                aria-label="시안 작게"
                onClick={(event) =>
                  setAlign({ scale: selected.align.scale * (event.shiftKey ? 0.9 : 0.99) })
                }
                style={iconButton}
              >
                −
              </button>
              <NumberField
                label="크기"
                title={
                  selected.align.fit === "width"
                    ? "1 이면 시안 폭이 화면 폭과 꼭 같아요. 1.1 이면 10% 크게"
                    : "시안 1px 을 몇 px 로 그릴지 — @3x 시안의 실제 크기는 0.3333"
                }
                value={selected.align.scale}
                step={0.01}
                digits={4}
                onChange={(scale) => scale > 0 && setAlign({ scale })}
              />
              <button
                type="button"
                title="시안을 1% 크게 해요 (Shift 를 누르고 누르면 10%)"
                aria-label="시안 크게"
                onClick={(event) =>
                  setAlign({ scale: selected.align.scale * (event.shiftKey ? 1.1 : 1.01) })
                }
                style={iconButton}
              >
                +
              </button>
            </Row>
            <Row>
              <NumberField
                label="가로 위치"
                title="시안을 옆으로 옮긴 거리(기기 px) — 오른쪽이 +"
                value={selected.align.offsetX}
                step={1}
                digits={2}
                onChange={(offsetX) => setAlign({ offsetX })}
              />
              <NumberField
                label="세로 위치"
                title="시안을 위아래로 옮긴 거리(기기 px) — 아래가 +"
                value={selected.align.offsetY}
                step={1}
                digits={2}
                onChange={(offsetY) => setAlign({ offsetY })}
              />
            </Row>
            <Row gap={4}>
              {(
                [
                  ["←", "왼쪽", -1, 0],
                  ["↑", "위", 0, -1],
                  ["↓", "아래", 0, 1],
                  ["→", "오른쪽", 1, 0],
                ] as const
              ).map(([glyph, name, dx, dy]) => (
                <button
                  key={name}
                  type="button"
                  aria-label={`시안을 ${name}으로 1px 옮기기`}
                  title={`시안을 ${name}으로 1px 옮겨요 (Shift 10px) — 패널을 누른 뒤 화살표 키로도 돼요`}
                  onClick={(event) => {
                    const step = event.shiftKey ? 10 : 1;
                    nudge(dx * step, dy * step);
                  }}
                  style={iconButton}
                >
                  {glyph}
                </button>
              ))}
              <button
                type="button"
                title="화면 폭에 맞추고, 크기 1 · 위치 0 으로 되돌려요"
                onClick={() => setAlign({ ...DEFAULT_ALIGN })}
                style={{ ...button(), marginLeft: "auto" }}
              >
                처음 위치로 되돌리기
              </button>
            </Row>
            {statusBarGuess === "missing" ? (
              <button
                type="button"
                title={`상태바 없이 뽑은 시안은 앱 내용이 시작하는 높이(${device.insets.top}px)만큼 내려야 맞아요`}
                onClick={() => setAlign({ offsetY: device.insets.top })}
                style={{ ...button(), justifySelf: "start" }}
              >
                상태바 높이만큼 내리기 ({device.insets.top}px)
              </button>
            ) : null}
            <p style={note}>
              시안은 상태바까지 덮는 전체 화면으로 놓여요. 패널을 누른 뒤 화살표로 1px, Shift 와
              함께 10px 씩 옮겨요.
            </p>
          </Section>
        </>
      ) : null}

      <Section title="무엇을 어디서 고치나">
        <p style={note}>
          색 · 크기 · 간격처럼 공통 값으로 맞출 수 있는 차이는 디자인 편집에서 고쳐요. 배치 구조가
          다른 차이는 코드 작업이 필요해요.
        </p>
      </Section>
    </div>
  );
}

function Slider({
  label,
  title,
  value,
  onChange,
}: {
  label: string;
  title: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label title={title} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 48 }}>{label}</span>
      <input
        type="range"
        aria-label={label}
        min={0}
        max={100}
        step={1}
        value={Math.round(value * 100)}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
        style={{ flex: 1, minWidth: 0 }}
      />
      <span style={{ width: 36, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {Math.round(value * 100)}%
      </span>
    </label>
  );
}

function Thumb({ reference, store }: { reference: Reference; store: ReferenceStore }) {
  const url = store.getUrl(reference.id);
  return (
    <div
      style={{
        width: 36,
        height: 64,
        borderRadius: 5,
        overflow: "hidden",
        background: shellColor.stage,
        border: `1px solid ${shellColor.border}`,
      }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
        />
      ) : null}
    </div>
  );
}
