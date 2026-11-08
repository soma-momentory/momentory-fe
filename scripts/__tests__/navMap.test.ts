import { describe, expect, it } from "@jest/globals";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/**
 * NAV.md(코드를 읽는 목차)가 코드와 어긋나면 깨진다 — 새 폴더 · 새 단일 통로 ·
 * 라우트 수가 바뀌었는데 문서를 안 고친 경우다. **고칠 곳은 이 테스트가 아니라 NAV.md 다.**
 * 이름이 적혀 있는지만 본다 — 설명이 맞는지는 Codex 리뷰(.claude/hooks/codex-review-prompt.md) 몫.
 */
const root = path.resolve(__dirname, "../..");
const nav = readFileSync(path.join(root, "NAV.md"), "utf8");

const entries = (rel: string) => readdirSync(path.join(root, rel), { withFileTypes: true });
const dirs = (rel: string) =>
  entries(rel)
    .filter((e) => e.isDirectory() && e.name !== "__tests__")
    .map((e) => `${rel}/${e.name}/`);
const missing = (paths: string[]) => paths.filter((p) => !nav.includes(p));

/** expo-lab/scripts/gen-routes.mjs 의 scanRoutes 와 같은 규칙 */
function countRoutes(rel: string): number {
  return entries(rel).reduce((n, e) => {
    if (e.name === "__tests__" || e.name.startsWith("+")) return n;
    if (e.isDirectory()) return n + countRoutes(`${rel}/${e.name}`);
    return /\.tsx?$/.test(e.name) && !e.name.startsWith("_layout.") ? n + 1 : n;
  }, 0);
}

describe("NAV.md — 빠진 것이 있으면 NAV.md 에 한 줄 더한다", () => {
  it("src/lib 의 단일 통로가 전부 적혀 있다", () => {
    const files = entries("src/lib")
      .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
      .map((e) => `src/lib/${e.name}`);
    expect(missing(files)).toEqual([]);
  });

  it("src/features 도메인이 전부 적혀 있다", () => {
    expect(missing(dirs("src/features"))).toEqual([]);
  });

  it("src/components 폴더가 전부 적혀 있다", () => {
    expect(missing(dirs("src/components"))).toEqual([]);
  });

  it("「라우트 N개」가 app/ 의 화면 수와 같다", () => {
    const stated = [...nav.matchAll(/라우트\s*\*{0,2}\s*(\d+)개/g)].map((m) => Number(m[1]));
    expect(stated.length).toBeGreaterThan(0);
    expect([...new Set(stated)]).toEqual([countRoutes("app")]);
  });
});
