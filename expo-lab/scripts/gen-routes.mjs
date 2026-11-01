/**
 * 앱 라우트 목록을 `app/` 에서 만들어 `expo-lab/src/shell/routes.generated.ts` 에 쓴다.
 *
 *   node expo-lab/scripts/gen-routes.mjs           # 다시 쓴다 (npm run lab:routes)
 *   node expo-lab/scripts/gen-routes.mjs --check   # 어긋나면 1 로 끝난다 (jest 가 부른다)
 *
 * expo-router 규칙만 따른다 — `_layout` · `__tests__` · `+` 로 시작하는 파일은 화면이 아니고,
 * `(그룹)` 은 주소에서 빠지고, `index` 는 부모 주소가 되고, `[id]` 는 동적 조각이다.
 * 제목·순서·프리셋은 손으로 적는 `src/shell/routeMeta.ts` 에 있다 — 새 라우트가 생기면
 * 이 목록이 먼저 바뀌고, 제목이 없으면 `routes.test.ts` 가 깨진다.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const appDir = path.join(root, "app");
const outFile = path.join(root, "expo-lab/src/shell/routes.generated.ts");

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "__tests__" || entry.name.startsWith("+")) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!/\.tsx?$/.test(entry.name) || entry.name.startsWith("_layout.")) return [];
    return [full];
  });
}

export function scanRoutes() {
  return walk(appDir)
    .map((full) => {
      const file = path.relative(root, full).split(path.sep).join("/");
      const segments = file
        .slice("app/".length)
        .replace(/\.tsx?$/, "")
        .split("/");
      const params = segments.filter((s) => /^\[.+\]$/.test(s)).map((s) => s.slice(1, -1));
      const visible = segments.filter((s) => !/^\(.+\)$/.test(s));
      if (visible.at(-1) === "index") visible.pop();
      const group = segments.find((s) => /^\(.+\)$/.test(s)) ?? null;
      return { path: `/${visible.join("/")}`, file, group, params };
    })
    .sort((a, b) => a.file.localeCompare(b.file));
}

export async function renderRoutes(routes = scanRoutes()) {
  const body = [
    "/**",
    " * 자동 생성 — `npm run lab:routes`(`expo-lab/scripts/gen-routes.mjs`)가 `app/` 에서 만든다.",
    " * 직접 고치지 않는다. 제목·순서·프리셋은 `routeMeta.ts` 에 손으로 적는다.",
    " */",
    "export type GeneratedRoute = {",
    "  /** expo-router 주소 — 그룹 `(…)` 은 빠지고 `index` 는 부모가 된다 */",
    "  path: string;",
    "  file: string;",
    "  /** 라우트 그룹 이름(예: `(tabs)`) — 없으면 null */",
    "  group: string | null;",
    "  /** 동적 조각 이름(`[id]` → `id`) */",
    "  params: readonly string[];",
    "};",
    "",
    `export const generatedRoutes: readonly GeneratedRoute[] = ${JSON.stringify(routes)};`,
    "",
  ].join("\n");
  const prettier = await import("prettier");
  const options = (await prettier.resolveConfig(outFile)) ?? {};
  return prettier.format(body, { ...options, filepath: outFile });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const next = await renderRoutes();
  if (process.argv.includes("--check")) {
    let current = "";
    try {
      current = readFileSync(outFile, "utf8");
    } catch {
      // 없으면 어긋난 것이다
    }
    if (current.replace(/\r\n/g, "\n") !== next) {
      console.error(
        "expo-lab/src/shell/routes.generated.ts 가 app/ 과 어긋났다 — `npm run lab:routes` 로 다시 만든다.",
      );
      process.exit(1);
    }
    console.log(`routes.generated.ts 최신 (${scanRoutes().length}개)`);
  } else {
    writeFileSync(outFile, next);
    console.log(`routes.generated.ts 를 썼다 (${scanRoutes().length}개)`);
  }
}
