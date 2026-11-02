/**
 * 「전체 화면」 — 라우트마다 작은 실제 앱 프레임 하나. 50개 남짓이 한꺼번에 부팅하지 않게
 * 1) 화면 근처에 온 칸만 붙이고(IntersectionObserver), 멀어지면 뗀다
 * 2) 동시에 부팅하는 프레임을 `MAX_BOOTING` 개로 묶는다 — 준비(`lab:ready`)되거나
 *    `BOOT_TIMEOUT_MS` 가 지나면 다음 칸이 부팅한다.
 * 칸을 누르면 그 화면을 「한 화면」으로 연다.
 */
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { encodeFrameConfig } from "../lab-contract";
import { useSkinAvailable } from "./device/DeviceFrame";
import { chromeGeometry } from "./device/geometry";
import { frameBus } from "./frameBus";
import type { FrameSpec } from "./frameSpecs";
import { LabFrame } from "./LabFrame";
import { shellColor } from "./theme";

const MAX_BOOTING = 4;
const MIN_LABEL_WIDTH = 110;
const ellipsis = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as const;
const BOOT_TIMEOUT_MS = 6000;

class BootQueue {
  private waiting: string[] = [];
  private booting = new Map<string, ReturnType<typeof setTimeout>>();
  private granted = new Set<string>();
  private listeners = new Set<() => void>();
  version = 0;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  isGranted = (id: string) => this.granted.has(id);

  request(id: string) {
    if (this.granted.has(id) || this.waiting.includes(id)) return;
    this.waiting.push(id);
    this.pump();
  }

  release(id: string) {
    this.waiting = this.waiting.filter((item) => item !== id);
    this.finish(id);
    this.granted.delete(id);
    this.emit();
  }

  /** 부팅이 끝났다(준비 · 시간 초과) — 자리를 비운다. 붙은 채로 남는다 */
  finish(id: string) {
    const timer = this.booting.get(id);
    if (timer) clearTimeout(timer);
    if (this.booting.delete(id)) this.pump();
  }

  private pump() {
    while (this.booting.size < MAX_BOOTING && this.waiting.length) {
      const id = this.waiting.shift()!;
      this.granted.add(id);
      this.booting.set(
        id,
        setTimeout(() => this.finish(id), BOOT_TIMEOUT_MS),
      );
    }
    this.emit();
  }
}

const queue = new BootQueue();

function GridCell({
  spec,
  scale,
  realMs,
  configKey,
  onOpen,
}: {
  spec: FrameSpec;
  scale: number;
  realMs: number;
  configKey: string;
  onOpen: (path: string) => void;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  useSyncExternalStore(
    queue.subscribe,
    () => queue.version,
    () => queue.version,
  );
  const granted = near && queue.isGranted(spec.frameId);

  useEffect(() => {
    const element = holder.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => setNear(entries.some((entry) => entry.isIntersecting)),
      { rootMargin: "600px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (near) queue.request(spec.frameId);
    else queue.release(spec.frameId);
  }, [near, spec.frameId]);
  useEffect(() => () => queue.release(spec.frameId), [spec.frameId]);

  // 프레임이 준비되면 부팅 자리를 비운다
  useEffect(
    () =>
      frameBus.subscribe(() => {
        if (frameBus.get(spec.frameId).ready) queue.finish(spec.frameId);
      }),
    [spec.frameId],
  );

  const g = chromeGeometry(spec.device, useSkinAvailable(spec.device));
  return (
    <div
      data-testid={`grid-cell-${spec.route.path}`}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        alignItems: "center",
        flex: "none",
      }}
    >
      <div
        ref={holder}
        style={{
          position: "relative",
          width: g.outerWidth * scale,
          height: g.outerHeight * scale,
        }}
      >
        {granted ? (
          <LabFrame key={configKey} spec={spec} scale={scale} realMs={realMs} />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: (spec.device.cornerRadius + 15) * scale,
              background: shellColor.border,
            }}
          />
        )}
        <button
          type="button"
          aria-label={`${spec.route.title} 한 화면으로 열기`}
          onClick={() => onOpen(spec.route.path)}
          style={{
            position: "absolute",
            inset: 0,
            background: "transparent",
            border: 0,
            cursor: "zoom-in",
          }}
        />
      </div>
      {/* 이름은 칸 폭 안에서 말줄임 — 글자마다 줄바꿈되지 않게 칸에 최소 폭을 둔다 */}
      {/* 이름을 눌러도 연다(2026-11-02 Codex QA — 폰만 눌리고 이름은 반응이 없었다) */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden
        title={`${spec.route.title} — ${spec.route.path} · 눌러서 한 화면으로 열기`}
        onClick={() => onOpen(spec.route.path)}
        style={{
          fontSize: 12,
          color: shellColor.ink,
          textAlign: "center",
          width: Math.max(g.outerWidth * scale, MIN_LABEL_WIDTH),
          background: "transparent",
          border: 0,
          padding: 0,
          fontFamily: "inherit",
          cursor: "zoom-in",
        }}
      >
        <div style={ellipsis}>{spec.route.title}</div>
        <div style={{ ...ellipsis, color: shellColor.faint, fontSize: 11 }}>{spec.route.path}</div>
      </button>
    </div>
  );
}

export function GridView({
  specs,
  scale,
  realMs,
  nonces,
  onOpen,
}: {
  specs: FrameSpec[];
  scale: number;
  realMs: number;
  /** 프레임별 다시 불러오기 횟수 — 바뀌면 그 칸이 새로 뜬다 */
  nonces: Readonly<Record<string, number>>;
  onOpen: (path: string) => void;
}) {
  const sections = specs.reduce<{ title: string; specs: FrameSpec[] }[]>((acc, spec) => {
    const last = acc.at(-1);
    if (last && last.title === spec.route.sectionTitle) last.specs.push(spec);
    else acc.push({ title: spec.route.sectionTitle, specs: [spec] });
    return acc;
  }, []);
  return (
    <div data-testid="grid-view" style={{ padding: 20, display: "grid", gap: 28 }}>
      {sections.map((section) => (
        <section key={section.title}>
          <h3 style={{ margin: "0 0 12px", fontSize: 14, color: shellColor.muted }}>
            {section.title} · {section.specs.length}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18 }}>
            {section.specs.map((spec) => (
              <GridCell
                key={spec.frameId}
                spec={spec}
                scale={scale}
                realMs={realMs}
                configKey={`${encodeFrameConfig(spec.config)}#${nonces[spec.frameId] ?? 0}`}
                onOpen={onOpen}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
