/**
 * 왼쪽 라우트 목록 — 앱에서 만나는 순서(진입 → 소개 → 온보딩 → 탭 → … → 마이 세부)로 묶는다.
 * 프레임이 지금 서 있는 라우트에는 그 프레임 이름 배지를 단다(`lab:route`).
 *
 * 묶음은 **접혀 있다**(머리 줄만 · 「＋」 로 펼친다). 여러 묶음을 함께 펼칠 수 있고, 펼친 묶음은
 * localStorage 에 남는다(해시에는 넣지 않는다). 지금 화면의 묶음은 저절로 펼친다.
 * 검색어가 있으면 접힘을 무시하고 일치하는 화면이 있는 묶음만 펼쳐 보인다.
 */
import { useState, type ReactNode } from "react";

import { datasetLabel } from "./frameSpecs";
import { frameBus, useFrameBus } from "./frameBus";
import { findRoute, isOnScreenOf, matchPathname, shellSections, type ShellRoute } from "./routes";
import { shellColor } from "./theme";

const frameLabel = (frameId: string) =>
  frameId === "solo"
    ? "●"
    : frameId.startsWith("m-")
      ? frameId.slice(2)
      : frameId === "V0"
        ? "기존"
        : /^V\d+$/.test(frameId)
          ? `시안${frameId.slice(1)}`
          : frameId;

/** 배지 이름 — 기기별은 데이터 이름, 시안 비교는 「기존」 · 「시안 k」(`frameSpecs.variantSpecs` 의 V0 · Vk) */
const frameTitle = (frameId: string) =>
  frameId.startsWith("m-")
    ? datasetLabel(frameId.slice(2))
    : frameId === "V0"
      ? "기존"
      : /^V\d+$/.test(frameId)
        ? `시안${frameId.slice(1)}`
        : frameId;

export const ROUTE_SECTIONS_STORAGE_KEY = "momentory.lab.shell.openSections";

const readOpen = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(ROUTE_SECTIONS_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
};

const writeOpen = (ids: readonly string[]) => {
  try {
    window.localStorage.setItem(ROUTE_SECTIONS_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // 저장이 막혀도 목록은 그대로 쓴다
  }
};

const ellipsis = {
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

export function RouteTree({
  current,
  frameIds,
  onSelect,
  top,
}: {
  /** 목록 맨 위(검색 아래)에 얹는 것 — 「＋ 새 화면 만들기」 · 「새 화면 (작업 중)」 */
  top?: ReactNode;
  current: string;
  /** 배지를 달 프레임(지금 레이아웃의 것) */
  frameIds: readonly string[];
  onSelect: (route: ShellRoute) => void;
}) {
  useFrameBus();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string[]>(readOpen);
  const q = query.trim().toLocaleLowerCase();

  const update = (next: string[]) => {
    setOpen(next);
    writeOpen(next);
  };

  // 지금 화면의 묶음은 저절로 펼친다 — 화면이 바뀔 때 한 번(그 뒤에 접는 것은 사용자 몫)
  const currentSection = findRoute(current)?.section;
  const [seenSection, setSeenSection] = useState<string | undefined>(undefined);
  if (currentSection !== seenSection) {
    setSeenSection(currentSection);
    if (currentSection && !open.includes(currentSection)) setOpen([...open, currentSection]);
  }

  const onRoute = new Map<string, string[]>();
  for (const frameId of frameIds) {
    const pathname = frameBus.get(frameId).pathname;
    const route = pathname ? matchPathname(pathname) : undefined;
    if (!route) continue;
    // 시트 줄(`screenOf`)을 고른 동안에는 그 줄에 배지를 단다
    const row = isOnScreenOf(current, pathname!) ? current : route.path;
    onRoute.set(row, [...(onRoute.get(row) ?? []), frameId]);
  }

  const allOpen = shellSections.every((section) => open.includes(section.id));

  return (
    <nav
      data-testid="route-tree"
      aria-label="화면 목록"
      style={{ display: "flex", flexDirection: "column", minHeight: 0, height: "100%" }}
    >
      <div style={{ display: "flex", gap: 6, alignItems: "center", margin: 12 }}>
        <input
          type="search"
          aria-label="화면 검색"
          placeholder="화면 검색 (이름 · 주소)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "8px 10px",
            borderRadius: 8,
            border: `1px solid ${shellColor.border}`,
            fontSize: 13,
          }}
        />
        <button
          type="button"
          onClick={() => update(allOpen ? [] : shellSections.map((section) => section.id))}
          title={allOpen ? "묶음을 모두 접어요" : "묶음을 모두 펼쳐요"}
          style={{
            flex: "none",
            padding: "6px 8px",
            borderRadius: 7,
            border: `1px solid ${shellColor.border}`,
            background: shellColor.panel,
            color: shellColor.ink,
            fontSize: 11,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {allOpen ? "모두 접기" : "모두 펼치기"}
        </button>
      </div>
      <div style={{ overflowY: "auto", padding: "0 8px 16px" }}>
        {top}
        {shellSections.map((section) => {
          const routes = section.routes.filter(
            (route) =>
              !q ||
              `${route.title} ${route.path} ${route.specId ?? ""} ${section.title}`
                .toLocaleLowerCase()
                .includes(q),
          );
          if (!routes.length) return null;
          const expanded = q ? true : open.includes(section.id);
          const hasCurrent = section.routes.some((route) => route.path === current);
          const toggle = () =>
            update(
              open.includes(section.id)
                ? open.filter((id) => id !== section.id)
                : [...open, section.id],
            );
          return (
            <section key={section.id} data-section={section.id} style={{ marginBottom: 2 }}>
              <h3 style={{ margin: 0 }}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`route-section-${section.id}`}
                  data-testid={`route-section-${section.id}`}
                  disabled={Boolean(q)}
                  onClick={toggle}
                  style={{
                    display: "flex",
                    width: "100%",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 8px",
                    border: 0,
                    borderRadius: 7,
                    background: "transparent",
                    cursor: q ? "default" : "pointer",
                    textAlign: "left",
                    color: shellColor.ink,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      flex: "none",
                      width: 18,
                      height: 18,
                      lineHeight: "16px",
                      textAlign: "center",
                      borderRadius: 5,
                      border: `1px solid ${shellColor.border}`,
                      fontSize: 13,
                      fontWeight: 700,
                      color: shellColor.muted,
                    }}
                  >
                    {expanded ? "－" : "＋"}
                  </span>
                  <span
                    data-section-title
                    style={{
                      ...ellipsis,
                      flex: 1,
                      minWidth: 0,
                      fontSize: 13,
                      fontWeight: hasCurrent ? 700 : 600,
                    }}
                  >
                    {section.title}
                  </span>
                  <span style={{ flex: "none", fontSize: 11, color: shellColor.faint }}>
                    {q ? `${routes.length}/${section.routes.length}` : section.routes.length}
                  </span>
                </button>
              </h3>
              {expanded ? (
                <div
                  id={`route-section-${section.id}`}
                  style={{ padding: "0 0 6px 14px", display: "grid", gap: 1 }}
                >
                  {routes.map((route) => {
                    const selected = route.path === current;
                    const all = onRoute.get(route.path) ?? [];
                    // 폰이 셋 이상(시안 비교 · 기기별)이면 첫 배지와 「+N」 하나로 — 줄이 넘치지 않게
                    const badges = all.length > 2 ? all.slice(0, 1) : all;
                    const rest = all.slice(badges.length);
                    return (
                      <button
                        key={route.path}
                        type="button"
                        aria-current={selected ? "page" : undefined}
                        data-route={route.path}
                        title={`${route.title} — ${route.path}`}
                        onClick={() => onSelect(route)}
                        style={{
                          display: "flex",
                          width: "100%",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 8px",
                          border: 0,
                          borderLeft: `2px solid ${selected ? shellColor.accent : shellColor.border}`,
                          borderRadius: "0 7px 7px 0",
                          textAlign: "left",
                          cursor: "pointer",
                          background: selected ? shellColor.accentSoft : "transparent",
                          fontWeight: selected ? 700 : 400,
                          color: shellColor.ink,
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ ...ellipsis, fontSize: 13 }}>{route.title}</span>
                          <span style={{ ...ellipsis, fontSize: 11, color: shellColor.faint }}>
                            {route.path}
                            {route.specId ? ` · ${route.specId}` : ""}
                          </span>
                        </span>
                        {badges.map((frameId) => (
                          <span
                            key={frameId}
                            title={`폰 화면 ${frameTitle(frameId)} 이(가) 지금 이 화면이에요`}
                            data-testid={`route-badge-${frameId}`}
                            style={{
                              flex: "none",
                              maxWidth: 64,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              fontSize: 10,
                              padding: "1px 5px",
                              borderRadius: 6,
                              color: shellColor.onAccent,
                              background:
                                frameId === "B" || /^V[1-9]/.test(frameId)
                                  ? shellColor.notice
                                  : shellColor.accent,
                            }}
                          >
                            {frameLabel(frameId)}
                          </span>
                        ))}
                        {rest.length > 0 ? (
                          <span
                            data-testid="route-badge-more"
                            title={`폰 화면 ${rest.map(frameTitle).join(" · ")} 도 지금 이 화면이에요`}
                            style={{
                              flex: "none",
                              fontSize: 10,
                              padding: "1px 5px",
                              borderRadius: 6,
                              color: shellColor.onAccent,
                              background: shellColor.notice,
                              whiteSpace: "nowrap",
                            }}
                          >
                            +{rest.length}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </nav>
  );
}
