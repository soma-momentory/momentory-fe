/**
 * 왼쪽 라우트 목록 — 앱에서 만나는 순서(진입 → 소개 → 온보딩 → 탭 → … → 마이 세부)로 묶는다.
 * 프레임이 지금 서 있는 라우트에는 그 프레임 이름 배지를 단다(`lab:route`).
 */
import { useState } from "react";

import { frameBus, useFrameBus } from "./frameBus";
import { matchPathname, shellSections, type ShellRoute } from "./routes";
import { shellColor } from "./theme";

const frameLabel = (frameId: string) =>
  frameId === "solo" ? "●" : frameId.startsWith("m-") ? frameId.slice(2) : frameId;

export function RouteTree({
  current,
  frameIds,
  onSelect,
}: {
  current: string;
  /** 배지를 달 프레임(지금 레이아웃의 것) */
  frameIds: readonly string[];
  onSelect: (route: ShellRoute) => void;
}) {
  useFrameBus();
  const [query, setQuery] = useState("");
  const q = query.trim().toLocaleLowerCase();

  const onRoute = new Map<string, string[]>();
  for (const frameId of frameIds) {
    const pathname = frameBus.get(frameId).pathname;
    const route = pathname ? matchPathname(pathname) : undefined;
    if (!route) continue;
    onRoute.set(route.path, [...(onRoute.get(route.path) ?? []), frameId]);
  }

  return (
    <nav
      data-testid="route-tree"
      aria-label="화면 목록"
      style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}
    >
      <input
        type="search"
        aria-label="화면 검색"
        placeholder="화면 검색 (이름 · 주소)"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        style={{
          margin: 12,
          padding: "8px 10px",
          borderRadius: 8,
          border: `1px solid ${shellColor.border}`,
          fontSize: 13,
        }}
      />
      <div style={{ overflowY: "auto", padding: "0 8px 16px" }}>
        {shellSections.map((section) => {
          const routes = section.routes.filter(
            (route) =>
              !q ||
              `${route.title} ${route.path} ${route.specId ?? ""} ${section.title}`
                .toLocaleLowerCase()
                .includes(q),
          );
          if (!routes.length) return null;
          return (
            <section key={section.id} style={{ marginBottom: 10 }}>
              <h3
                style={{
                  margin: "8px 6px 4px",
                  fontSize: 11,
                  letterSpacing: 0.4,
                  color: shellColor.muted,
                }}
              >
                {section.title}
              </h3>
              {routes.map((route) => {
                const selected = route.path === current;
                const badges = onRoute.get(route.path) ?? [];
                return (
                  <button
                    key={route.path}
                    type="button"
                    aria-current={selected ? "page" : undefined}
                    data-route={route.path}
                    onClick={() => onSelect(route)}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 8px",
                      border: 0,
                      borderRadius: 7,
                      textAlign: "left",
                      cursor: "pointer",
                      background: selected ? shellColor.accentSoft : "transparent",
                      fontWeight: selected ? 700 : 400,
                      color: shellColor.ink,
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13 }}>{route.title}</span>
                      <span style={{ display: "block", fontSize: 11, color: shellColor.faint }}>
                        {route.path}
                        {route.specId ? ` · ${route.specId}` : ""}
                      </span>
                    </span>
                    {badges.map((frameId) => (
                      <span
                        key={frameId}
                        title={`프레임 ${frameId} 가 지금 이 화면`}
                        data-testid={`route-badge-${frameId}`}
                        style={{
                          fontSize: 10,
                          padding: "1px 5px",
                          borderRadius: 6,
                          color: shellColor.onAccent,
                          background: frameId === "B" ? shellColor.draft : shellColor.accent,
                        }}
                      >
                        {frameLabel(frameId)}
                      </span>
                    ))}
                  </button>
                );
              })}
            </section>
          );
        })}
      </div>
    </nav>
  );
}
