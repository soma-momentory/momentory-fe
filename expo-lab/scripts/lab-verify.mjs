/**
 * Lab 전·후 비교 — 바뀐 화면을 **기기 · 테스트 데이터 · 글씨 크기**마다 찍고, 고친 전(before)과
 * 고친 뒤(after)를 화소로 비교하고, 찍은 장마다 배치 문제를 검사한다. 스킬 `momentory-lab-verify` 의 몸통이다.
 *
 *   node expo-lab/scripts/lab-verify.mjs --after http://localhost:8100 --routes /home,/my
 *   node expo-lab/scripts/lab-verify.mjs --before http://localhost:8085 --after http://localhost:8100 --changed
 *   node expo-lab/scripts/lab-verify.mjs --after http://localhost:8096 --routes tabs --devices iphone-se-3,pixel-8
 *   node expo-lab/scripts/lab-verify.mjs --routes /home --dry-run          # 찍을 목록만(브라우저 없이)
 *
 * 옵션:
 *   --after <주소>       고친 코드를 띄운 Lab(작업 공간 미리보기 등). 필수(--dry-run 이면 생략 가능)
 *   --before <주소>      원래 코드(main)를 띄운 Lab. 없으면 「뒤」만 찍는다(비교 없음)
 *   --routes <목록>      쉼표 목록 — `/home` · `/diary/[id]` · `/diary/12` · `tabs` · `all`
 *   --changed            `git diff <base>...HEAD` + 커밋 안 한 변경에서 라우트를 고른다(--routes 대신)
 *   --base <ref>         --changed 의 기준(기본 main)
 *   --repo <폴더>        --changed 를 읽을 저장소 · 라우트/기기 표를 읽을 곳(기본 이 스크립트의 저장소)
 *   --devices <id,…>     기본: 가장 작은 iOS · iphone-16 · pixel-8 · (있으면) Galaxy 전부
 *   --datasets <id,…>    기본 empty,normal,many,long-copy — 로그인 전·온보딩 화면은 제 프리셋 세트 하나만
 *   --text-scales <…>    기본 1,1.3
 *   --now <ISO>          고정 시각(전·후가 같은 시각을 본다). 기본 오늘(KST) 21:30
 *   --out <폴더>         기본 <OS 임시>/momentory-lab-verify/<시각>
 *   --concurrency <n>    동시에 여는 창 수(기본 3)
 *   --dpr <n>            화소 배율(기본 1 · PR 용으로 선명하게 찍으려면 2)
 *   --max-routes <n>     --changed 가 고른 라우트 상한(기본 12 · 넘으면 탭 우선으로 자르고 보고서에 적는다)
 *   --timeout <ms>       한 장을 기다리는 상한(기본 45000)
 *   --dry-run            찍을 목록(JSON)만 출력한다
 *
 * 결과(--out): `report.html`(전 | 후 | 차이 · 문제 표시) · `report.json`(기계용) · `pr-screenshots.md`(PR 본문 조각)
 * · `before/` `after/` `diff/` PNG. **문제는 보고할 뿐 던지지 않는다** — 종료 코드는 스크립트가 깨졌을 때만 0 이 아니다.
 *
 * 프레임은 셸 없이 최상위 창으로 연다(`/<라우트>?labFrame=1&…` · `src/frame/launch.ts`). 설정 전부(글씨 배율 포함)는
 * 셸과 같게 `window.name`(`encodeFrameConfig`)에 싣는다 — 쿼리는 사람이 다시 열 수 있게 함께 붙인다(글씨 배율만 빠진다).
 * 두 단계로 여는 화면(`routeMeta.ts` 의 `openVia`)은 셸처럼 경유 화면을 열고 그 요청을 받은 뒤 `lab:navigate` 를 보낸다.
 */
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const REPORT_FORMAT = "momentory-lab-verify@1";
const scriptRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const DEFAULT_DATASETS = ["empty", "normal", "many", "long-copy"];
export const DEFAULT_TEXT_SCALES = [1, 1.3];
export const TAB_ROUTES = ["/home", "/rest", "/archive", "/report", "/my"];

/* ───────────────────────────── 인자 ───────────────────────────── */

const LIST_OPTIONS = new Set(["routes", "devices", "datasets", "text-scales"]);
const VALUE_OPTIONS = new Set([
  "after",
  "before",
  "base",
  "repo",
  "now",
  "out",
  "concurrency",
  "dpr",
  "max-routes",
  "timeout",
  ...LIST_OPTIONS,
]);
const FLAG_OPTIONS = new Set(["changed", "dry-run", "help"]);

const splitList = (value) =>
  String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const trimOrigin = (value) => String(value).replace(/\/+$/, "");

/** 인자 → 옵션. 틀린 인자는 던진다(스크립트가 돌 수 없는 경우라 종료 코드 2) */
export function parseArgs(argv) {
  const raw = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) throw new Error(`알 수 없는 인자: ${arg}`);
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
    if (FLAG_OPTIONS.has(name)) {
      raw[name] = true;
      continue;
    }
    if (!VALUE_OPTIONS.has(name)) throw new Error(`알 수 없는 옵션: --${name}`);
    const value = eq === -1 ? argv[(i += 1)] : arg.slice(eq + 1);
    if (value == null || (eq === -1 && value.startsWith("--"))) {
      throw new Error(`--${name} 에 값이 없다`);
    }
    raw[name] = value;
  }

  const positiveInt = (name, fallback) => {
    if (raw[name] == null) return fallback;
    const n = Number(raw[name]);
    if (!Number.isInteger(n) || n < 1) throw new Error(`--${name} 은 1 이상의 정수: ${raw[name]}`);
    return n;
  };

  const textScales =
    raw["text-scales"] == null
      ? DEFAULT_TEXT_SCALES
      : splitList(raw["text-scales"]).map((item) => {
          const n = Number(item);
          if (!Number.isFinite(n) || n <= 0) throw new Error(`글씨 배율이 이상하다: ${item}`);
          return n;
        });

  if (raw.now != null && Number.isNaN(Date.parse(raw.now))) {
    throw new Error(`--now 를 시각으로 읽을 수 없다: ${raw.now}`);
  }
  if (raw.changed && raw.routes) throw new Error("--routes 와 --changed 는 함께 쓰지 않는다");

  const options = {
    help: Boolean(raw.help),
    dryRun: Boolean(raw["dry-run"]),
    after: raw.after ? trimOrigin(raw.after) : null,
    before: raw.before ? trimOrigin(raw.before) : null,
    routes: raw.routes ? splitList(raw.routes) : null,
    changed: Boolean(raw.changed),
    base: raw.base ?? "main",
    repo: path.resolve(raw.repo ?? scriptRepo),
    devices: raw.devices ? splitList(raw.devices) : null,
    datasets: raw.datasets ? splitList(raw.datasets) : DEFAULT_DATASETS,
    textScales: [...new Set(textScales)],
    now: raw.now ?? null,
    out: raw.out ? path.resolve(raw.out) : null,
    concurrency: positiveInt("concurrency", 3),
    dpr: raw.dpr == null ? 1 : Number(raw.dpr),
    maxRoutes: positiveInt("max-routes", 12),
    timeoutMs: positiveInt("timeout", 45_000),
  };
  if (!Number.isFinite(options.dpr) || options.dpr <= 0) throw new Error(`--dpr 이 이상하다`);
  for (const key of ["after", "before"]) {
    if (options[key] && !/^https?:\/\//.test(options[key])) {
      throw new Error(`--${key} 는 http(s) 주소여야 한다: ${options[key]}`);
    }
  }
  if (!options.help && !options.dryRun && !options.after) {
    throw new Error("--after <Lab 주소> 가 필요하다 (목록만 보려면 --dry-run)");
  }
  return options;
}

/** 오늘(KST) 21:30 — 전·후가 같은 시각을 보게 고정한다 */
export function defaultNow(realMs = Date.now()) {
  const kst = new Date(realMs + 9 * 3600_000);
  const day = kst.toISOString().slice(0, 10);
  return `${day}T21:30:00+09:00`;
}

/* ─────────────────── Lab 표 읽기 (TS 를 그 자리에서 옮겨 부른다) ─────────────────── */

const SPECIFIER_RE = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"'\n]+)\2/g;
const RESOLVE_EXTS = [".ts", ".tsx", ".js", ".mjs", ".json"];

/** `./x` · `@/x` 를 실제 파일로. 못 찾으면 null(패키지 이름이다) */
export function resolveSourceSpecifier(fromFile, specifier, repoRoot, exists = existsSync) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(repoRoot, "src", specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;
  const candidates = [
    base,
    ...RESOLVE_EXTS.map((ext) => base + ext),
    ...RESOLVE_EXTS.map((ext) => path.join(base, `index${ext}`)),
  ];
  for (const candidate of candidates) {
    if (exists(candidate) && path.extname(candidate) !== "") return candidate;
  }
  return null;
}

/**
 * 셸이 쓰는 표(`routes.ts` · `lab-devices.ts` · 가짜 서버의 `sampleParams`)를 그대로 쓴다 — 손으로 베끼면
 * 라우트가 늘 때마다 어긋난다. TypeScript 로 옮겨 임시 폴더에 쓰고 import 한다.
 */
export async function loadLabModules(repoRoot) {
  const ts = (await import("typescript")).default;
  const outDir = await mkdtemp(path.join(os.tmpdir(), "momentory-lab-verify-ts-"));
  const requireFromRepo = createRequire(path.join(repoRoot, "package.json"));
  const compiled = new Map();

  async function compile(file) {
    if (compiled.has(file)) return compiled.get(file);
    const rel = path.relative(repoRoot, file).replace(/\.(tsx?|jsx?|mjs|json)$/, "");
    const out = path.join(outDir, `${rel}.mjs`);
    compiled.set(file, out);
    const source = await readFile(file, "utf8");
    let code;
    if (file.endsWith(".json")) {
      code = `export default ${source};\n`;
    } else {
      code = ts.transpileModule(source, {
        fileName: file,
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          isolatedModules: true,
        },
      }).outputText;
      const replacements = new Map();
      for (const [, , , specifier] of code.matchAll(SPECIFIER_RE)) {
        if (replacements.has(specifier)) continue;
        const local = resolveSourceSpecifier(file, specifier, repoRoot);
        if (local) replacements.set(specifier, pathToFileURL(await compile(local)).href);
        else {
          try {
            replacements.set(specifier, pathToFileURL(requireFromRepo.resolve(specifier)).href);
          } catch {
            replacements.set(specifier, specifier);
          }
        }
      }
      code = code.replace(
        SPECIFIER_RE,
        (all, head, quote, specifier) => `${head}${quote}${replacements.get(specifier)}${quote}`,
      );
    }
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, code);
    return out;
  }

  const load = async (rel) => import(pathToFileURL(await compile(path.join(repoRoot, rel))).href);
  try {
    const [routes, devices, fakeServer, contract] = await Promise.all([
      load("expo-lab/src/shell/routes.ts"),
      load("expo-lab/src/lab-devices.ts"),
      load("expo-lab/src/fake-server/index.ts"),
      load("expo-lab/src/lab-contract.ts"),
    ]);
    return {
      shellRoutes: routes.shellRoutes,
      resolveHref: routes.resolveHref,
      labDevices: devices.labDevices,
      defaultDeviceId: devices.DEFAULT_DEVICE_ID,
      sampleParams: fakeServer.sampleParams,
      datasetIds: contract.DATASET_IDS,
      encodeFrameConfig: contract.encodeFrameConfig,
    };
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
}

/* ───────────────────────────── 라우트 고르기 ───────────────────────────── */

/** `/diary/12` → `/diary/[id]` 패턴. 셸의 `matchPathname` 과 같은 규칙 */
export function matchRoute(routes, pathname) {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const exact = routes.find((route) => route.path === clean);
  if (exact) return exact;
  const parts = clean.split("/");
  return routes.find((route) => {
    const pattern = route.path.split("/");
    return (
      pattern.length === parts.length &&
      pattern.every((seg, i) => (/^\[.+\]$/.test(seg) ? parts[i] !== "" : seg === parts[i]))
    );
  });
}

/**
 * Windows Git Bash 는 `/home` 같은 인자를 `C:/Program Files/Git/home` 으로 바꿔 넘긴다
 * (`MSYS_NO_PATHCONV=1` 로 끌 수 있다). 그 모양이면 되돌린다.
 */
export function unmangleMsysPath(item) {
  const match = /^[A-Za-z]:[\\/](?:.*[\\/])?Git([\\/].*)?$/.exec(item);
  if (!match) return item;
  return (match[1] ?? "/").replace(/\\/g, "/");
}

/** `--routes` 목록 → 셸 라우트. `tabs` · `all` 은 묶음 이름. 구체 주소(`/diary/12`)는 그 주소로 연다 */
export function selectRoutes(routes, requested) {
  const picked = [];
  const unknown = [];
  const add = (route, href = null) => {
    if (!picked.some((item) => item.route.path === route.path && item.href === href)) {
      picked.push({ route, href });
    }
  };
  for (const rawItem of requested) {
    const item = unmangleMsysPath(rawItem);
    if (item === "all") routes.forEach((route) => add(route));
    else if (item === "tabs") {
      TAB_ROUTES.forEach((p) => {
        const route = routes.find((r) => r.path === p);
        if (route) add(route);
      });
    } else {
      const route = matchRoute(routes, item);
      if (!route) unknown.push(item);
      else add(route, route.path === item.split("?")[0] ? null : item);
    }
  }
  return { picked, unknown };
}

/** `a, b as c, type T` → 실제 값 이름들(`type` 은 뺀다). `as` 의 앞(원래 이름)과 뒤(새 이름)를 함께 준다 */
function parseSpecifierList(list) {
  return list
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item !== "" && !item.startsWith("type "))
    .map((item) => {
      const [from, as] = item.split(/\s+as\s+/).map((part) => part.trim());
      return { from, as: as ?? from };
    });
}

/**
 * 모듈 하나의 import · 다시 내보내기 · 제 export 이름. 정규식으로 읽는 **최선 추정**이다 —
 * 모르는 모양은 「전부(`*`)」로 본다(놓치는 것보다 더 보는 쪽이 낫다). `import type` 은 화면을 바꾸지 않으므로 뺀다.
 */
export function parseModule(content) {
  const imports = [];
  const reexports = [];
  const exports = new Set();
  const code = content.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  for (const m of code.matchAll(/\bimport\s+(type\s+)?([^"';]*?)\s+from\s*["']([^"'\n]+)["']/g)) {
    if (m[1]) continue;
    const clause = m[2].trim();
    let names = [];
    if (/\*\s+as\s+\w+/.test(clause)) names = "*";
    else {
      const braces = /\{([^}]*)\}/.exec(clause);
      if (braces) names.push(...parseSpecifierList(braces[1]).map((item) => item.from));
      const head = clause
        .replace(/\{[^}]*\}/, "")
        .replace(/,/g, " ")
        .trim();
      if (head) names.push("default");
      if (names.length === 0 && braces) continue; // `import { type A } from` — 값이 없다
    }
    imports.push({ specifier: m[3], names });
  }
  for (const m of code.matchAll(/\bimport\s*["']([^"'\n]+)["']/g)) {
    imports.push({ specifier: m[1], names: "*" });
  }
  for (const m of code.matchAll(/\b(?:import|require)\s*\(\s*["']([^"'\n]+)["']\s*\)/g)) {
    imports.push({ specifier: m[1], names: "*" });
  }
  for (const m of code.matchAll(/\bexport\s+(type\s+)?\{([^}]*)\}\s*from\s*["']([^"'\n]+)["']/g)) {
    if (m[1]) continue;
    const names = parseSpecifierList(m[2]);
    if (names.length > 0) reexports.push({ specifier: m[3], names });
    names.forEach((item) => exports.add(item.as));
  }
  for (const m of code.matchAll(/\bexport\s+\*\s+(?:as\s+(\w+)\s+)?from\s*["']([^"'\n]+)["']/g)) {
    if (m[1]) {
      exports.add(m[1]);
      imports.push({ specifier: m[2], names: "*" });
    } else reexports.push({ specifier: m[2], names: "*" });
  }
  for (const m of code.matchAll(
    /\bexport\s+(?:declare\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|enum)\s+(\w+)/g,
  )) {
    exports.add(m[1]);
  }
  if (/\bexport\s+default\b/.test(code)) exports.add("default");
  for (const m of code.matchAll(/\bexport\s+\{([^}]*)\}(?!\s*from)/g)) {
    parseSpecifierList(m[1]).forEach((item) => exports.add(item.as));
  }
  return { imports, reexports, exports };
}

/**
 * 소스 파일 → 그 파일이 부르는 저장소 안 파일(이름까지). 파일 내용은 `files` 지도로 받는다(순수).
 * 모양: `Map<파일, { edges: [{ target, kind: "import" | "reexport", names }], exports: Set }>`
 */
export function buildImportGraph(files, repoRoot) {
  const known = new Set(files.keys());
  const exists = (candidate) => known.has(candidate);
  const graph = new Map();
  for (const [file, content] of files) {
    const parsed = parseModule(content);
    const edges = [];
    for (const { specifier, names } of parsed.imports) {
      const target = resolveSourceSpecifier(file, specifier, repoRoot, exists);
      if (target) edges.push({ target, kind: "import", names });
    }
    for (const { specifier, names } of parsed.reexports) {
      const target = resolveSourceSpecifier(file, specifier, repoRoot, exists);
      if (target) edges.push({ target, kind: "reexport", names });
    }
    graph.set(file, { edges, exports: parsed.exports });
  }
  return graph;
}

const ALL = "*";
const mergeNames = (current, incoming) => {
  if (current === ALL || incoming === ALL) return current === ALL ? current : ALL;
  const merged = new Set(current ?? []);
  incoming.forEach((name) => merged.add(name));
  return merged;
};
const sizeOf = (names) => (names === ALL ? Infinity : (names?.size ?? 0));

/**
 * 바뀐 파일에서 거슬러 올라가며 「영향받는 export 이름」을 퍼뜨린다. 묶음 파일(`components/ds/index.ts`)을
 * 지날 때 이름을 따지므로, `EmotionPebble` 하나가 바뀌었다고 `Text` 만 쓰는 화면까지 끌려오지 않는다.
 * 돌려주는 값: 영향받은 파일 → 처음 원인(바뀐 파일).
 */
export function propagateChanges(graph, seeds) {
  const reverse = new Map();
  for (const [file, { edges }] of graph) {
    for (const edge of edges) {
      if (!reverse.has(edge.target)) reverse.set(edge.target, []);
      reverse.get(edge.target).push({ importer: file, edge });
    }
  }
  const affected = new Map(); // 파일 → 영향받은 export 이름(Set | "*")
  const origin = new Map();
  const queue = [];
  for (const seed of seeds) {
    affected.set(seed, ALL);
    origin.set(seed, seed);
    queue.push(seed);
  }
  while (queue.length > 0) {
    const file = queue.shift();
    const names = affected.get(file);
    for (const { importer, edge } of reverse.get(file) ?? []) {
      let incoming = null;
      if (edge.kind === "import") {
        const hit =
          names === ALL || edge.names === ALL || edge.names.some((name) => names.has(name));
        if (hit) incoming = ALL;
      } else if (edge.names === ALL) {
        // export * — 바뀐 이름을 그대로 넘긴다. 전부면 그 파일의 export 이름들로 좁힌다
        if (names !== ALL) incoming = names;
        else {
          const own = graph.get(file)?.exports;
          incoming = own && own.size > 0 ? new Set([...own].filter((n) => n !== "default")) : ALL;
        }
      } else {
        const passed = edge.names
          .filter((item) => names === ALL || names.has(item.from))
          .map((item) => item.as);
        if (passed.length > 0) incoming = new Set(passed);
      }
      if (incoming == null || (incoming !== ALL && incoming.size === 0)) continue;
      const before = affected.get(importer);
      const merged = mergeNames(before, incoming);
      if (sizeOf(merged) > sizeOf(before)) {
        affected.set(importer, merged);
        if (!origin.has(importer)) origin.set(importer, origin.get(file));
        queue.push(importer);
      }
    }
  }
  return origin;
}

/**
 * 바뀐 파일 → 다시 볼 라우트. 순서:
 * 1. `app/**` 라우트 파일 → 그 라우트. `_layout` → 그 폴더 아래 라우트 전부
 * 2. `src/**` 등 코드 → 그 파일을 (거슬러, 이름을 따져) 부르는 라우트 파일
 * 3. 코드가 아닌 파일(그림 · json) → 이름을 부르는 소스를 바뀐 것으로 보고 2
 * 아무것도 못 찾으면 탭 다섯(대체)이다. 돌려주는 `notes` 를 보고서에 적는다.
 */
export function routesForChangedFiles({ changedFiles, routes, files, graph, repoRoot, maxRoutes }) {
  const notes = [];
  const toAbs = (rel) => path.join(repoRoot, rel);
  const toRel = (abs) => path.relative(repoRoot, abs).replace(/\\/g, "/");
  const routeByFile = new Map(routes.map((route) => [toAbs(route.file), route]));
  const hits = new Map(); // path → 이유
  const hit = (route, why) => {
    if (!hits.has(route.path)) hits.set(route.path, why);
  };

  const seeds = new Set();
  let labChanges = 0;
  for (const rel of changedFiles) {
    const norm = rel.replace(/\\/g, "/");
    const abs = toAbs(norm);
    if (norm.startsWith("expo-lab/")) {
      labChanges += 1;
      continue;
    }
    if (norm.startsWith("app/") && path.posix.basename(norm).startsWith("_layout.")) {
      const dir = path.posix.dirname(norm);
      routes
        .filter((route) => route.file.startsWith(`${dir}/`))
        .forEach((route) => hit(route, `레이아웃 ${norm}`));
      continue;
    }
    if (routeByFile.has(abs)) {
      hit(routeByFile.get(abs), `라우트 파일 ${norm}`);
      seeds.add(abs);
      continue;
    }
    if (files.has(abs)) {
      seeds.add(abs);
      continue;
    }
    if (!/^(src|app|assets)\//.test(norm)) continue;
    // 코드가 아닌 파일 — 이름을 부르는 소스를 찾는다
    const base = path.posix.basename(norm);
    const stem = base.replace(/(@\dx)?\.[^.]+$/, "");
    let found = 0;
    for (const [file, content] of files) {
      if (content.includes(base) || (stem.length > 3 && content.includes(`/${stem}.`))) {
        seeds.add(file);
        found += 1;
      }
    }
    if (found === 0) notes.push(`부르는 소스를 못 찾았다: ${norm}`);
  }
  if (labChanges > 0)
    notes.push(`Lab 쪽 변경 ${labChanges}개는 앱 화면으로 옮기지 않았다(expo-lab/**)`);

  for (const [file, from] of propagateChanges(graph, seeds)) {
    const route = routeByFile.get(file);
    if (route)
      hit(route, file === from ? `라우트 파일 ${toRel(from)}` : `${toRel(from)} 를 부른다`);
  }

  let picked = routes.filter((route) => hits.has(route.path));
  let fallback = false;
  if (picked.length === 0) {
    fallback = true;
    picked = routes.filter((route) => TAB_ROUTES.includes(route.path));
    notes.push("바뀐 파일에서 라우트를 찾지 못해 탭 다섯을 본다");
  }
  if (picked.length > maxRoutes) {
    const tabsFirst = [
      ...picked.filter((route) => TAB_ROUTES.includes(route.path)),
      ...picked.filter((route) => !TAB_ROUTES.includes(route.path)),
    ];
    const dropped = tabsFirst.slice(maxRoutes).map((route) => route.path);
    picked = tabsFirst.slice(0, maxRoutes);
    notes.push(
      `라우트 ${picked.length + dropped.length}개 중 ${maxRoutes}개만 본다(--max-routes) — 뺀 것: ${dropped.join(", ")}`,
    );
  }
  return {
    routes: picked,
    reasons: Object.fromEntries(
      picked.map((route) => [route.path, hits.get(route.path) ?? "대체"]),
    ),
    fallback,
    notes,
  };
}

function git(repo, args) {
  const result = spawnSync("git", ["-C", repo, ...args], { encoding: "utf8" });
  if (result.status !== 0) return null;
  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** `<base>...HEAD` + 커밋 안 한 변경 + 추적 안 하는 새 파일 */
export function changedFilesFromGit(repo, base) {
  const notes = [];
  let committed = git(repo, ["diff", "--name-only", `${base}...HEAD`]);
  if (committed == null) {
    committed = git(repo, ["diff", "--name-only", `origin/${base}...HEAD`]);
    if (committed == null) notes.push(`기준 ${base} 를 찾지 못해 커밋 안 한 변경만 본다`);
    else notes.push(`기준으로 origin/${base} 를 썼다`);
  }
  const working = git(repo, ["diff", "--name-only", "HEAD"]) ?? [];
  const untracked = git(repo, ["ls-files", "--others", "--exclude-standard"]) ?? [];
  return { files: [...new Set([...(committed ?? []), ...working, ...untracked])], notes };
}

async function walk(dir, out = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      await walk(full, out);
    } else if (/\.(tsx?|jsx?|json)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

export async function readSourceFiles(repoRoot) {
  const list = [
    ...(await walk(path.join(repoRoot, "app"))),
    ...(await walk(path.join(repoRoot, "src"))),
  ];
  const files = new Map();
  await Promise.all(list.map(async (file) => files.set(file, await readFile(file, "utf8"))));
  return files;
}

/* ───────────────────────────── 기기 · 찍을 목록 ───────────────────────────── */

/** 기본 기기 — 가장 작은 iOS · 중간 iOS(iphone-16) · 기본 Android(pixel-8) · Galaxy 전부 */
export function defaultDevices(labDevices, defaultDeviceId = {}) {
  const ios = labDevices.filter((d) => d.platform === "ios");
  const android = labDevices.filter((d) => d.platform === "android");
  const area = (d) => d.width * d.height;
  const smallest = [...ios].sort((a, b) => area(a) - area(b))[0];
  const mid =
    ios.find((d) => d.id === (defaultDeviceId.ios ?? "iphone-16")) ??
    [...ios].sort((a, b) => area(a) - area(b))[Math.floor(ios.length / 2)];
  const pixel = android.find((d) => d.id === (defaultDeviceId.android ?? "pixel-8")) ?? android[0];
  const galaxies = labDevices.filter((d) => /galaxy/i.test(d.id));
  const picked = [smallest, mid, pixel, ...galaxies].filter(Boolean);
  return picked.filter((d, i) => picked.findIndex((x) => x.id === d.id) === i);
}

const shortHash = (text) => createHash("sha1").update(text).digest("hex").slice(0, 8);

const slug = (text) =>
  String(text)
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "_")
    .replace(/^_+|_+$/g, "") || "root";

/**
 * 찍을 목록 — 라우트 × 기기 × 데이터 세트 × 글씨 배율. 로그인 전·온보딩은 제 프리셋 세트 하나만.
 * `sample(datasetId)` 는 동적 라우트 id(가짜 서버 `sampleParams`), `resolveHref` 는 셸의 것.
 */
export function planShots({ selections, devices, datasets, textScales, now, sample, resolveHref }) {
  const shots = [];
  for (const { route, href: fixedHref } of selections) {
    const routeDatasets = route.preset?.dataset ? [route.preset.dataset] : datasets;
    for (const device of devices) {
      for (const datasetId of routeDatasets) {
        for (const textScale of textScales) {
          const href =
            fixedHref ?? resolveHref(route, sample(datasetId, now), now, Date.parse(now));
          const id = [
            slug(href.split("?")[0]),
            device.id,
            datasetId,
            `x${String(textScale).replace(".", "_")}`,
          ].join("__");
          const config = {
            frameId: `verify-${shortHash(id)}`,
            datasetId,
            platform: device.platform,
            deviceId: device.id,
            now,
            signedIn: route.preset?.signedIn ?? true,
            latencyMs: 0,
            failPaths: [...(route.preset?.failPaths ?? [])],
            repeatToday: true,
            ...(textScale !== 1 ? { textScale } : {}),
          };
          shots.push({
            id,
            route: route.path,
            title: route.title,
            section: route.sectionTitle ?? route.section ?? null,
            hint: route.hint ?? null,
            href,
            via: route.openVia ? { ...route.openVia } : null,
            device: {
              id: device.id,
              label: device.label,
              platform: device.platform,
              width: device.width,
              height: device.height,
              insets: device.insets,
            },
            datasetId,
            textScale,
            config,
          });
        }
      }
    }
  }
  return shots;
}

/** 프레임을 최상위 창으로 여는 주소. `openVia` 면 경유 화면 주소다(목적지는 `lab:navigate` 로) */
export function buildFrameUrl(origin, shot) {
  const target = shot.via ? shot.via.path : shot.href;
  const [pathname, search = ""] = target.split("?");
  const params = new URLSearchParams(search);
  const { config } = shot;
  params.set("labFrame", "1");
  params.set("frameId", config.frameId);
  params.set("dataset", config.datasetId);
  params.set("os", config.platform);
  params.set("device", config.deviceId);
  params.set("signedIn", config.signedIn ? "1" : "0");
  if (config.now) params.set("now", config.now);
  if (config.failPaths?.length) params.set("fail", config.failPaths.join(","));
  return `${origin}${pathname}?${params.toString()}`;
}

/* ───────────────────────────── 브라우저 안 검사 ───────────────────────────── */

/** 메시지 받아 적기 — 직접 연 창은 `window.parent === window` 라 프레임이 제게 보낸다(`messages.ts`) */
function recordLabMessages() {
  const store = { messages: [] };
  Object.defineProperty(window, "__labVerify", { value: store, configurable: true });
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (data && typeof data.type === "string" && data.type.startsWith("lab:")) {
      store.messages.push({ ...data, t: performance.now() });
    }
  });
}

/**
 * 한 장의 배치 검사 — 스크린샷을 찍은 **뒤에** 부른다(스크롤을 끝까지 내린다).
 * 판정 근거(좌표 · 글자)를 같이 돌려준다. 숫자 상한을 둬 보고서가 넘치지 않게 한다.
 */
async function inspectLayout({ insets, limit }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const body = document.body;
  const LIMIT = limit;
  const out = {
    overflowX: Math.max(
      body.scrollWidth - body.clientWidth,
      document.documentElement.scrollWidth - vw,
    ),
    offscreenText: [],
    clipped: [],
    truncated: [],
    underTopInset: [],
    underTabBar: [],
    covered: [],
    underBottomInset: [],
    belowScreen: [],
  };
  const push = (list, item) => {
    if (list.length < LIMIT) list.push(item);
  };
  const visible = (el) =>
    typeof el.checkVisibility === "function"
      ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
      : true;
  const words = (el) =>
    (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  const labelOf = (el) =>
    words(el) ||
    el.getAttribute("aria-label") ||
    el.getAttribute("data-testid") ||
    el.tagName.toLowerCase();
  const box = (r) => ({
    x: Math.round(r.left),
    y: Math.round(r.top),
    w: Math.round(r.width),
    h: Math.round(r.height),
  });
  const textRect = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (rects.length === 0) return null;
    return {
      left: Math.min(...rects.map((r) => r.left)),
      right: Math.max(...rects.map((r) => r.right)),
      top: Math.min(...rects.map((r) => r.top)),
      bottom: Math.max(...rects.map((r) => r.bottom)),
      get width() {
        return this.right - this.left;
      },
      get height() {
        return this.bottom - this.top;
      },
    };
  };
  const scrolls = (value) => value === "auto" || value === "scroll";
  const clips = (value) => value === "hidden" || value === "clip";

  const all = [...body.querySelectorAll("*")];
  const texts = all.filter(
    (el) =>
      !["SCRIPT", "STYLE", "NOSCRIPT"].includes(el.tagName) &&
      [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== "") &&
      visible(el),
  );
  const tablist = [...document.querySelectorAll('[role="tablist"]')].find(visible) ?? null;
  const inTabBar = (node) => Boolean(tablist && tablist.contains(node));
  const INTERACTIVE =
    'button,a[href],input,textarea,select,[role="button"],[role="link"],[role="switch"],[role="checkbox"],[role="radio"],[role="tab"],[role="slider"]';
  const interactive = [...document.querySelectorAll(INTERACTIVE)].filter(
    (el) => visible(el) && !(tablist && tablist.contains(el)),
  );

  // 1) 글자 — 잘림 · 말줄임 · 화면 밖
  for (const el of texts) {
    const r = textRect(el);
    if (!r) continue;
    const s = getComputedStyle(el);
    const clamp = s.getPropertyValue("-webkit-line-clamp");
    const selfOver = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    if ((clips(s.overflowX) || clips(s.overflowY)) && selfOver) {
      const item = { text: words(el), box: box(el.getBoundingClientRect()) };
      if (s.textOverflow === "ellipsis" || (clamp && clamp !== "none")) push(out.truncated, item);
      else push(out.clipped, { ...item, by: "self" });
      continue;
    }
    let insideScrollX = false;
    let hiddenOnPurpose = false;
    for (let a = el.parentElement; a && a !== body; a = a.parentElement) {
      const as = getComputedStyle(a);
      if (scrolls(as.overflowX)) insideScrollX = true;
      if (scrolls(as.overflowX) || scrolls(as.overflowY)) break;
      if (!clips(as.overflowX) && !clips(as.overflowY)) continue;
      const ar = a.getBoundingClientRect();
      const outside =
        r.right <= ar.left + 1 ||
        r.left >= ar.right - 1 ||
        r.bottom <= ar.top + 1 ||
        r.top >= ar.bottom - 1;
      if (outside) {
        // 통째로 바깥 — 넘김 화면의 다른 장 · 닫힌 시트처럼 일부러 숨긴 것
        hiddenOnPurpose = true;
        break;
      }
      const overX = clips(as.overflowX) && (r.left < ar.left - 1 || r.right > ar.right + 1);
      const overY = clips(as.overflowY) && (r.top < ar.top - 1 || r.bottom > ar.bottom + 1);
      if (overX || overY) {
        push(out.clipped, {
          text: words(el),
          box: box(r),
          by: "ancestor",
          clipBox: box(ar),
        });
        hiddenOnPurpose = true;
        break;
      }
    }
    if (!hiddenOnPurpose && !insideScrollX && (r.right > vw + 2 || r.left < -2)) {
      push(out.offscreenText, { text: words(el), box: box(r) });
    }
  }

  // 2) 상단 안전 영역(상태바 · 노치) — 스크롤 전 상태에서. 글자는 글자 상자(행간 제외)로 잰다
  if (insets.top > 0) {
    for (const el of [...interactive, ...texts]) {
      const r = texts.includes(el) ? textRect(el) : el.getBoundingClientRect();
      if (!r || r.width === 0 || r.height === 0 || r.bottom <= 0 || r.top >= vh) continue;
      if (r.width * r.height > 0.5 * vw * vh) continue;
      // 글자 상자는 글꼴의 위 여백을 품는다 — 높이의 1/4 까지는 봐준다
      const slack = texts.includes(el) ? Math.max(2, r.height / 4) : 2;
      if (r.top < insets.top - slack && r.bottom > slack) {
        push(out.underTopInset, { text: labelOf(el), box: box(r) });
      }
    }
  }

  // 덮개 찾기 — 그 점의 요소 더미에서 el 보다 위에 있고, 실제로 칠해진(배경 · 그림 · 글자) 것.
  // el 이 더미에 없으면(pointer-events: none 등) 판정하지 않는다
  const painted = (node) => {
    if (!(node instanceof Element)) return false;
    if (["IMG", "CANVAS", "VIDEO", "svg"].includes(node.tagName)) return true;
    const s = getComputedStyle(node);
    if (s.backgroundImage && s.backgroundImage !== "none") return true;
    const bg = s.backgroundColor.match(/[\d.]+/g);
    if (bg && (bg.length < 4 || Number(bg[3]) > 0.05)) return true;
    return [...node.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== "");
  };
  // 화면 절반 넘게 덮는 칠해진 층 — 모달 · 시트 · 배경막. 그 밑에 깔린 것은 일부러 가린 것이다
  const isLarge = (r) => r.width * r.height > 0.5 * vw * vh;
  const inModalLayer = (cover, el) => {
    for (let n = cover; n && n !== body && !n.contains(el); n = n.parentElement) {
      if (painted(n) && isLarge(n.getBoundingClientRect())) return true;
    }
    return false;
  };
  const coverOf = (el, r) => {
    const points = [
      [r.left + r.width / 2, r.top + r.height / 2],
      [r.left + Math.min(12, r.width / 4), r.top + r.height / 2],
    ];
    for (const [x, y] of points) {
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      const stack = document.elementsFromPoint(x, y);
      const index = stack.findIndex((node) => node === el || el.contains(node));
      if (index <= 0) continue;
      const above = stack
        .slice(0, index)
        .filter((node) => !node.contains(el) && !el.contains(node));
      // 위에 화면 절반 넘는 층(투명한 배경막 누름 영역 포함)이 있으면 모달 · 시트 아래 — 일부러 가린 것이다
      if (above.some((node) => !inTabBar(node) && isLarge(node.getBoundingClientRect()))) {
        return null;
      }
      const cover = above.find(painted);
      if (cover && (inTabBar(cover) || !inModalLayer(cover, el))) return cover;
    }
    return null;
  };
  const scrollerOf = (el, list) => list.find((s) => s !== el && s.contains(el)) ?? null;
  const candidates = () => {
    const seen = new Set();
    return [...interactive, ...texts].filter((el) => {
      if (tablist && tablist.contains(el)) return false;
      // 누를 수 있는 것 안의 글자는 그 요소 하나로 센다
      if (interactive.some((x) => x !== el && x.contains(el))) return false;
      if (seen.has(el)) return false;
      seen.add(el);
      // 화면 전체를 덮는 누름 층(시트 배경막 · 전면 터치 영역)은 배치 검사 대상이 아니다
      return !isLarge(el.getBoundingClientRect());
    });
  };
  const coverLabel = (cover) =>
    inTabBar(cover)
      ? "탭바"
      : cover.getAttribute("aria-label") || words(cover) || cover.tagName.toLowerCase();

  const scrollers = all.filter((el) => {
    const s = getComputedStyle(el);
    return scrolls(s.overflowY) && el.scrollHeight > el.clientHeight + 1;
  });

  // 3) 스크롤 전 — 스크롤 영역 밖(고정 배치)인데 다른 것에 덮인 것
  for (const el of candidates()) {
    if (scrollerOf(el, scrollers)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0 || r.bottom <= 0 || r.top >= vh) continue;
    const cover = coverOf(el, r);
    if (cover) {
      push(inTabBar(cover) ? out.underTabBar : out.covered, {
        text: labelOf(el),
        box: box(r),
        cover: coverLabel(cover),
      });
    }
  }

  // 4) 끝까지 내린 뒤 — 아래쪽에서 덮인 것(더 내릴 수 없다) · 하단 안전 영역 · 화면 아래로 잘려 닿을 수 없는 것
  scrollers.forEach((el) => {
    el.scrollTop = el.scrollHeight;
  });
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const insetTop = vh - insets.bottom;
  for (const el of candidates()) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.right <= 0 || r.left >= vw) continue;
    if (r.top >= vh - 1) {
      push(out.belowScreen, { text: labelOf(el), box: box(r) });
      continue;
    }
    if (r.bottom <= 0) continue;
    if (scrollerOf(el, scrollers) && r.top + r.height / 2 > vh / 2) {
      const cover = coverOf(el, r);
      if (cover) {
        push(inTabBar(cover) ? out.underTabBar : out.covered, {
          text: labelOf(el),
          box: box(r),
          cover: coverLabel(cover),
          scrolledToEnd: true,
        });
        continue;
      }
    }
    if (!tablist && insets.bottom > 0 && r.bottom > insetTop + 2 && r.top < vh) {
      push(out.underBottomInset, { text: labelOf(el), box: box(r), zoneTop: Math.round(insetTop) });
    }
  }
  out.scrolled = scrollers.length;
  return out;
}

/* ───────────────────────────── 화소 비교 ───────────────────────────── */

/**
 * 두 PNG 의 화소 차이. 채널 차이의 최댓값이 `threshold` 를 넘는 화소를 「바뀜」으로 센다(글자 가장자리
 * 반올림 흔들림은 넘지 않는다). 차이 그림 = 뒤 그림을 흐리게 깔고 바뀐 화소를 빨강으로.
 */
export function diffPng(beforeBuffer, afterBuffer, PNG, { threshold = 24 } = {}) {
  const a = PNG.sync.read(beforeBuffer);
  const b = PNG.sync.read(afterBuffer);
  const width = Math.max(a.width, b.width);
  const height = Math.max(a.height, b.height);
  const out = new PNG({ width, height });
  let changed = 0;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const o = (y * width + x) * 4;
      const inA = x < a.width && y < a.height;
      const inB = x < b.width && y < b.height;
      const ia = (y * a.width + x) * 4;
      const ib = (y * b.width + x) * 4;
      let delta = 255;
      if (inA && inB) {
        delta = Math.max(
          Math.abs(a.data[ia] - b.data[ib]),
          Math.abs(a.data[ia + 1] - b.data[ib + 1]),
          Math.abs(a.data[ia + 2] - b.data[ib + 2]),
          Math.abs(a.data[ia + 3] - b.data[ib + 3]),
        );
      }
      if (delta > threshold) {
        changed += 1;
        out.data[o] = 230;
        out.data[o + 1] = 30;
        out.data[o + 2] = 60;
        out.data[o + 3] = 255;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      } else {
        const src = inB ? b.data : a.data;
        const i = inB ? ib : ia;
        const gray = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
        const faded = Math.round(255 - (255 - gray) * 0.25);
        out.data[o] = faded;
        out.data[o + 1] = faded;
        out.data[o + 2] = faded;
        out.data[o + 3] = 255;
      }
    }
  }
  const total = width * height;
  return {
    image: PNG.sync.write(out),
    changedPixels: changed,
    totalPixels: total,
    percent: total === 0 ? 0 : Math.round((changed / total) * 100_000) / 1000,
    bounds: maxX < 0 ? null : { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 },
    sizeMismatch: a.width !== b.width || a.height !== b.height,
  };
}

/* ───────────────────────────── 문제 판정 ───────────────────────────── */

export const SEVERITY_ORDER = { error: 0, warn: 1, info: 2 };

export const ISSUE_LABELS = {
  "load-failed": "화면이 뜨지 않음",
  "horizontal-overflow": "가로 넘침",
  "offscreen-text": "화면 밖 글자",
  "text-clipped": "글자 잘림",
  "text-truncated": "말줄임",
  "under-top-inset": "상단 안전 영역 침범",
  "under-tab-bar": "탭바에 가림",
  covered: "다른 요소에 가림",
  "under-bottom-inset": "하단 안전 영역에 가림",
  "below-screen": "화면 아래로 잘림(스크롤 없음)",
  "console-error": "콘솔 오류",
  "console-web-warning": "웹 전용 경고",
  "request-failed": "가짜 서버 요청 실패",
  "asset-failed": "자산 요청 실패",
  redirected: "다른 화면으로 넘어감",
  unstable: "화면이 멈추지 않음(움직임)",
};

/**
 * 웹에서만 나는 React 경고 — 네이티브 전용 속성(`accessibilityElementsHidden` 등)을 react-native-web 이
 * DOM 에 넘겨서 난다. 앱 결함이 아니므로 참고(info)로만 남긴다
 */
export const WEB_ONLY_WARNINGS = [
  /React does not recognize the `%s` prop on a DOM element/,
  /React does not recognize the `\w+` prop on a DOM element/,
  /Unknown event handler property/,
  /for a non-boolean attribute/,
  /Invalid DOM property/,
  /is using incorrect casing/,
];

const issue = (kind, severity, message, detail) => ({
  kind,
  severity,
  label: ISSUE_LABELS[kind] ?? kind,
  message,
  ...(detail ? { detail } : {}),
});

/** 한 쪽(전 또는 후)의 관측 → 문제 목록 */
export function issuesFromObservation(obs, shot) {
  const issues = [];
  if (obs.loadError) {
    issues.push(issue("load-failed", "error", obs.loadError));
    return issues;
  }
  const layout = obs.layout;
  if (layout) {
    if (layout.overflowX > 2) {
      issues.push(issue("horizontal-overflow", "error", `가로로 ${layout.overflowX}px 넘친다`));
    }
    const each = (list, kind, severity, describe) =>
      list?.forEach((item) => issues.push(issue(kind, severity, describe(item), item)));
    each(layout.offscreenText, "offscreen-text", "warn", (i) => `「${i.text}」`);
    each(layout.clipped, "text-clipped", "warn", (i) => `「${i.text}」`);
    each(layout.truncated, "text-truncated", "info", (i) => `「${i.text}」`);
    each(layout.underTopInset, "under-top-inset", "warn", (i) => `「${i.text}」`);
    each(layout.underTabBar, "under-tab-bar", "warn", (i) => `「${i.text}」`);
    each(layout.covered, "covered", "warn", (i) => `「${i.text}」 ← ${i.cover}`);
    each(layout.underBottomInset, "under-bottom-inset", "warn", (i) => `「${i.text}」`);
    each(layout.belowScreen, "below-screen", "warn", (i) => `「${i.text}」`);
  }
  // 프리셋이 일부러 실패시킨 요청(가짜 서버가 접두사로 맞춰 500 을 준다)은 문제가 아니다
  const expectedFail = shot.config.failPaths ?? [];
  const failed = (obs.requests ?? []).filter(
    (r) =>
      r.status >= 400 &&
      !(r.status === 500 && expectedFail.some((prefix) => r.path.startsWith(prefix))),
  );
  const uniqueFailed = [
    ...new Map(failed.map((r) => [`${r.method} ${r.path} ${r.status}`, r])).values(),
  ];
  uniqueFailed.forEach((r) =>
    issues.push(issue("request-failed", "warn", `${r.method} ${r.path} → ${r.status}`)),
  );
  [...new Set(obs.consoleErrors ?? [])].forEach((text) => {
    const webOnly = WEB_ONLY_WARNINGS.some((re) => re.test(text));
    issues.push(
      webOnly
        ? issue("console-web-warning", "info", text.slice(0, 200))
        : issue("console-error", "warn", text.slice(0, 300)),
    );
  });
  [...new Set(obs.assetErrors ?? [])].forEach((text) =>
    issues.push(issue("asset-failed", "warn", text)),
  );
  const wanted = shot.href.split("?")[0];
  if (obs.finalPathname && matchesPattern(shot.route, obs.finalPathname) === false) {
    issues.push(
      issue("redirected", "info", `${wanted} 를 열었는데 ${obs.finalPathname} 에 있다`, {
        hint: shot.hint,
      }),
    );
  }
  if (obs.stable === false) issues.push(issue("unstable", "info", "연속 두 장이 같아지지 않았다"));
  return issues;
}

function matchesPattern(pattern, pathname) {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  const a = pattern.split("/");
  const b = clean.split("/");
  return a.length === b.length && a.every((seg, i) => /^\[.+\]$/.test(seg) || seg === b[i]);
}

const issueKey = (item) => `${item.kind}|${item.message}`;

/** 전·후 문제 합치기 — 뒤의 문제에 `existing`(전에도 있었다)을 단다 */
export function compareIssues(beforeIssues, afterIssues) {
  if (beforeIssues == null) return afterIssues.map((item) => ({ ...item, side: "after" }));
  const beforeKeys = new Set(beforeIssues.map(issueKey));
  const afterKeys = new Set(afterIssues.map(issueKey));
  return [
    ...afterIssues.map((item) => ({
      ...item,
      side: "after",
      existing: beforeKeys.has(issueKey(item)),
    })),
    ...beforeIssues
      .filter((item) => !afterKeys.has(issueKey(item)))
      .map((item) => ({ ...item, side: "before", resolved: true })),
  ];
}

/* ───────────────────────────── 보고서 ───────────────────────────── */

export function summarize(shots) {
  const byKind = {};
  let withNewIssues = 0;
  let changed = 0;
  for (const shot of shots) {
    const current = shot.issues.filter((item) => item.side === "after");
    current.forEach((item) => {
      byKind[item.kind] = (byKind[item.kind] ?? 0) + 1;
    });
    if (current.some((item) => !item.existing && item.severity !== "info")) withNewIssues += 1;
    if (shot.diff && shot.diff.changedPixels > 0) changed += 1;
  }
  return {
    shots: shots.length,
    routes: new Set(shots.map((shot) => shot.route)).size,
    changedShots: changed,
    shotsWithNewIssues: withNewIssues,
    issuesByKind: byKind,
  };
}

export function buildReport({ options, routeInfo, shots, startedAt, finishedAt }) {
  return {
    format: REPORT_FORMAT,
    createdAt: finishedAt,
    startedAt,
    before: options.before,
    after: options.after,
    now: options.now,
    devices: [...new Set(shots.map((shot) => shot.device.id))],
    datasets: [...new Set(shots.map((shot) => shot.datasetId))],
    textScales: [...new Set(shots.map((shot) => shot.textScale))],
    routeSource: routeInfo,
    summary: summarize(shots),
    shots: shots.map((shot) => ({
      id: shot.id,
      route: shot.route,
      title: shot.title,
      href: shot.href,
      via: shot.via,
      device: shot.device.id,
      platform: shot.device.platform,
      dataset: shot.datasetId,
      textScale: shot.textScale,
      urls: shot.urls,
      images: shot.images,
      finalPathname: shot.finalPathname,
      diff: shot.diff,
      issues: shot.issues,
    })),
  };
}

const escapeHtml = (text) =>
  String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const badgeClass = (item) =>
  item.resolved ? "resolved" : item.existing ? "existing" : `sev-${item.severity}`;

function issueBadges(issues) {
  if (issues.length === 0) return '<span class="badge ok">문제 없음</span>';
  const grouped = new Map();
  for (const item of issues) {
    const key = `${item.kind}|${badgeClass(item)}`;
    if (!grouped.has(key)) grouped.set(key, { item, messages: [] });
    grouped.get(key).messages.push(item.message);
  }
  return [...grouped.values()]
    .sort((a, b) => SEVERITY_ORDER[a.item.severity] - SEVERITY_ORDER[b.item.severity])
    .map(({ item, messages }) => {
      const tag = item.resolved ? " · 해결됨" : item.existing ? " · 전에도" : "";
      return `<details class="badge ${badgeClass(item)}"><summary>${escapeHtml(item.label)} ${messages.length}${tag}</summary><ul>${messages
        .slice(0, 12)
        .map((m) => `<li>${escapeHtml(m)}</li>`)
        .join("")}</ul></details>`;
    })
    .join("");
}

export function renderHtml(report) {
  const hasBefore = Boolean(report.before);
  const byRoute = new Map();
  for (const shot of report.shots) {
    if (!byRoute.has(shot.route)) byRoute.set(shot.route, []);
    byRoute.get(shot.route).push(shot);
  }
  const routeRows = [...byRoute.entries()]
    .map(([route, shots]) => {
      const maxDiff = Math.max(0, ...shots.map((s) => s.diff?.percent ?? 0));
      const current = shots.flatMap((s) =>
        s.issues.filter((i) => i.side === "after" && i.severity !== "info"),
      );
      const fresh = current.filter((i) => !i.existing).length;
      return `<tr><td><a href="#${escapeHtml(slug(route))}">${escapeHtml(route)}</a></td><td>${escapeHtml(
        shots[0].title,
      )}</td><td>${shots.length}</td>${
        hasBefore ? `<td>${maxDiff.toFixed(3)}%</td>` : ""
      }<td>${fresh}</td><td>${current.length}</td></tr>`;
    })
    .join("");
  const kinds = Object.entries(report.summary.issuesByKind)
    .map(([kind, n]) => `<li>${escapeHtml(ISSUE_LABELS[kind] ?? kind)} ${n}</li>`)
    .join("");
  const notes = (report.routeSource?.notes ?? [])
    .map((note) => `<li>${escapeHtml(note)}</li>`)
    .join("");
  const sections = [...byRoute.entries()]
    .map(([route, shots]) => {
      const cards = shots
        .map((shot) => {
          const img = (src, alt) =>
            src
              ? `<a href="${escapeHtml(src)}"><img loading="lazy" src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"></a>`
              : '<div class="missing">없음</div>';
          const cols = hasBefore
            ? `<figure>${img(shot.images.before, "전")}<figcaption>전</figcaption></figure><figure>${img(
                shot.images.after,
                "후",
              )}<figcaption>후</figcaption></figure><figure>${img(shot.images.diff, "차이")}<figcaption>차이 ${
                shot.diff ? `${shot.diff.percent}%` : "—"
              }${
                shot.diff?.bounds
                  ? ` · (${shot.diff.bounds.x},${shot.diff.bounds.y}) ${shot.diff.bounds.w}×${shot.diff.bounds.h}`
                  : ""
              }</figcaption></figure>`
            : `<figure>${img(shot.images.after, "후")}<figcaption>후</figcaption></figure>`;
          const changedClass = shot.diff?.changedPixels > 0 ? " changed" : "";
          const issuesClass = shot.issues.some(
            (i) => i.side === "after" && !i.existing && i.severity !== "info",
          )
            ? " has-issues"
            : "";
          const extra = shot.images.afterEnd
            ? `<p class="meta">끝까지 내린 모습: <a href="${escapeHtml(shot.images.afterEnd)}">${escapeHtml(
                shot.images.afterEnd,
              )}</a></p>`
            : "";
          return `<article class="shot${changedClass}${issuesClass}" id="${escapeHtml(shot.id)}"><header><b>${escapeHtml(
            shot.device,
          )}</b> · ${escapeHtml(shot.dataset)} · 글씨 ${shot.textScale}×${
            shot.finalPathname ? ` · <code>${escapeHtml(shot.finalPathname)}</code>` : ""
          }</header><div class="cols">${cols}</div><div class="badges">${issueBadges(shot.issues)}</div>${extra}<p class="meta"><a href="${escapeHtml(
            shot.urls.after,
          )}">후 주소</a>${shot.urls.before ? ` · <a href="${escapeHtml(shot.urls.before)}">전 주소</a>` : ""}</p></article>`;
        })
        .join("");
      return `<section id="${escapeHtml(slug(route))}"><h2>${escapeHtml(route)} <small>${escapeHtml(
        shots[0].title,
      )}</small></h2><div class="grid">${cards}</div></section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lab 전·후 비교 — ${escapeHtml(report.createdAt)}</title>
<style>
:root{--ink:#222;--muted:#666;--line:#ddd;--err:#b3261e;--warn:#8a5a00;--info:#4a5568;--ok:#2f6b3a}
*{box-sizing:border-box}body{margin:0;padding:24px;font:14px/1.5 system-ui,-apple-system,"Segoe UI","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:var(--ink);background:#f6f6f4}
h1{font-size:20px;margin:0 0 4px}h2{font-size:17px;margin:32px 0 12px}h2 small{color:var(--muted);font-weight:400}
.meta{color:var(--muted);font-size:12px;margin:4px 0}table{border-collapse:collapse;background:#fff;margin:12px 0}td,th{border:1px solid var(--line);padding:4px 10px;text-align:left}
.grid{display:flex;flex-wrap:wrap;gap:16px}.shot{background:#fff;border:1px solid var(--line);border-radius:8px;padding:10px;max-width:100%}
.shot.has-issues{border-color:var(--warn)}.cols{display:flex;gap:8px;align-items:flex-start}figure{margin:0}figure img{display:block;width:180px;height:auto;border:1px solid var(--line)}
figcaption{font-size:12px;color:var(--muted);text-align:center}.missing{width:180px;height:120px;display:grid;place-items:center;color:var(--muted);border:1px dashed var(--line)}
.badges{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;max-width:600px}.badge{font-size:12px;border-radius:6px;padding:2px 8px;border:1px solid currentColor}
.badge summary{cursor:pointer}.badge ul{margin:4px 0 0;padding-left:16px;color:var(--ink)}.sev-error{color:var(--err)}.sev-warn{color:var(--warn)}.sev-info,.existing{color:var(--info)}.resolved,.ok{color:var(--ok)}
.filters{margin:12px 0}body.only-changed .shot:not(.changed):not(.has-issues){display:none}
</style></head><body>
<h1>Lab 전·후 비교</h1>
<p class="meta">${escapeHtml(report.createdAt)} · 고정 시각 ${escapeHtml(report.now)} · 전 ${escapeHtml(report.before ?? "없음(후만 찍음)")} · 후 ${escapeHtml(report.after)}</p>
<p class="meta">기기 ${escapeHtml(report.devices.join(", "))} · 데이터 ${escapeHtml(report.datasets.join(", "))} · 글씨 ${escapeHtml(report.textScales.join(", "))}×</p>
<p>장 ${report.summary.shots} · 라우트 ${report.summary.routes}${hasBefore ? ` · 바뀐 장 ${report.summary.changedShots}` : ""} · 새 문제가 있는 장 ${report.summary.shotsWithNewIssues}</p>
${kinds ? `<ul class="meta">${kinds}</ul>` : ""}
${notes ? `<details><summary>라우트를 고른 근거</summary><ul class="meta">${notes}</ul></details>` : ""}
<table><thead><tr><th>라우트</th><th>화면</th><th>장</th>${hasBefore ? "<th>최대 차이</th>" : ""}<th>새 문제</th><th>문제(전에도 있던 것 포함)</th></tr></thead><tbody>${routeRows}</tbody></table>
<label class="filters"><input type="checkbox" onchange="document.body.classList.toggle('only-changed',this.checked)"> 바뀌었거나 문제가 있는 장만</label>
<p class="meta">표시: 빨강 = 오류 · 갈색 = 주의 · 회색 = 참고 또는 「전에도」 있던 것 · 초록 = 해결됨. 검사는 웹(react-native-web) 배치 기준이다 — 실기기 판정이 아니다.</p>
${sections}
</body></html>
`;
}

/** PR 본문 조각 — 라우트마다 가장 많이 바뀐 장 하나 + 새 문제가 있는 장 몇 개 */
export function pickPrShots(report, { max = 8 } = {}) {
  const picked = [];
  const add = (shot, why) => {
    if (picked.length < max && !picked.some((item) => item.shot.id === shot.id))
      picked.push({ shot, why });
  };
  const byRoute = new Map();
  report.shots.forEach((shot) => {
    if (!byRoute.has(shot.route)) byRoute.set(shot.route, []);
    byRoute.get(shot.route).push(shot);
  });
  const representative = (shots) =>
    shots.find((s) => s.dataset === "normal" && s.textScale === 1 && s.device === "iphone-16") ??
    shots.find((s) => s.textScale === 1) ??
    shots[0];
  for (const shots of byRoute.values()) {
    const top = [...shots].sort((a, b) => (b.diff?.percent ?? 0) - (a.diff?.percent ?? 0))[0];
    if (top.diff?.changedPixels > 0) add(top, `가장 많이 바뀜(${top.diff.percent}%)`);
    else add(representative(shots), report.before ? "바뀐 화소 없음" : "대표");
  }
  report.shots
    .filter((shot) =>
      shot.issues.some((i) => i.side === "after" && !i.existing && i.severity !== "info"),
    )
    .forEach((shot) => {
      const kinds = [
        ...new Set(
          shot.issues.filter((i) => i.side === "after" && !i.existing).map((i) => i.label),
        ),
      ];
      add(shot, `새 문제: ${kinds.join(", ")}`);
    });
  return picked;
}

export function renderPrMarkdown(report) {
  const picked = pickPrShots(report);
  const lines = [
    "<!-- momentory-lab-verify 가 만든 조각. 그림은 아직 로컬 경로다 — GitHub 에 올려야 보인다:",
    "     PR 본문 편집창에 그림 파일을 끌어 넣어 받은 주소로 바꾸거나, 경로를 그대로 두고 「로컬 보고서」라고 적는다. -->",
    "",
    "### 스크린샷",
    "",
    `Lab 고정 시각 \`${report.now}\` · 전 \`${report.before ?? "—"}\` · 후 \`${report.after}\``,
    "",
  ];
  if (report.before) {
    lines.push("| 화면 | 전 | 후 |", "| --- | --- | --- |");
    for (const { shot, why } of picked) {
      lines.push(
        `| \`${shot.route}\` · ${shot.device} · ${shot.dataset} · ${shot.textScale}× — ${why} | ![전](${shot.images.before}) | ![후](${shot.images.after}) |`,
      );
    }
  } else {
    lines.push("| 화면 | 후 |", "| --- | --- |");
    for (const { shot, why } of picked) {
      lines.push(
        `| \`${shot.route}\` · ${shot.device} · ${shot.dataset} · ${shot.textScale}× — ${why} | ![후](${shot.images.after}) |`,
      );
    }
  }
  const s = report.summary;
  lines.push(
    "",
    `검사: ${s.shots}장 · 라우트 ${s.routes}${report.before ? ` · 바뀐 장 ${s.changedShots}` : ""} · 새 문제가 있는 장 ${s.shotsWithNewIssues} (웹 배치 기준 · 실기기 판정 아님)`,
    "",
  );
  return lines.join("\n");
}

/* ───────────────────────────── 찍기 ───────────────────────────── */

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function labMessages(page) {
  return page.evaluate(() => window.__labVerify?.messages ?? []).catch(() => []);
}

async function waitFor(page, predicate, { timeoutMs, intervalMs = 100 }) {
  const started = Date.now();
  for (;;) {
    const messages = await labMessages(page);
    const found = predicate(messages);
    if (found) return found;
    if (Date.now() - started > timeoutMs) return null;
    await sleep(intervalMs);
  }
}

/** 요청이 잠잠해질 때까지 — 마지막 `lab:request` 뒤 `quietMs` */
async function waitQuiet(page, { quietMs = 450, maxMs = 8000 } = {}) {
  const started = Date.now();
  for (;;) {
    const state = await page
      .evaluate(() => {
        const list = window.__labVerify?.messages ?? [];
        const last = list.filter((m) => m.type === "lab:request").at(-1);
        return { now: performance.now(), last: last?.t ?? 0 };
      })
      .catch(() => ({ now: 0, last: 0 }));
    if (state.now - state.last >= quietMs) return;
    if (Date.now() - started > maxMs) return;
    await sleep(120);
  }
}

/** 연속 두 장이 같아질 때까지 찍는다 — 움직이는 화면은 `stable: false` */
async function stableScreenshot(page, { attempts = 6, gapMs = 300 } = {}) {
  let previous = await page.screenshot({ animations: "disabled", caret: "hide" });
  for (let i = 1; i < attempts; i += 1) {
    await sleep(gapMs);
    const next = await page.screenshot({ animations: "disabled", caret: "hide" });
    if (Buffer.compare(previous, next) === 0) return { buffer: next, stable: true };
    previous = next;
  }
  return { buffer: previous, stable: false };
}

async function observe(context, origin, shot, lab, { timeoutMs, outFile, endFile }) {
  const page = await context.newPage();
  const consoleErrors = [];
  const assetErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on("response", (response) => {
    const url = response.url();
    if (response.status() >= 400 && url.startsWith(origin) && !url.includes("favicon")) {
      assetErrors.push(`${response.status()} ${url.slice(origin.length)}`);
    }
  });
  const url = buildFrameUrl(origin, shot);
  const result = { url, consoleErrors, assetErrors };
  try {
    await page.setViewportSize({ width: shot.device.width, height: shot.device.height });
    await page.addInitScript(recordLabMessages);
    await page.addInitScript((name) => {
      window.name = name;
    }, lab.encodeFrameConfig(shot.config));
    await page.goto(url, { waitUntil: "load", timeout: timeoutMs });
    const ready = await waitFor(page, (list) => list.find((m) => m.type === "lab:ready"), {
      timeoutMs,
    });
    if (!ready) throw new Error(`${Math.round(timeoutMs / 1000)}초 안에 lab:ready 가 오지 않았다`);

    if (shot.via) {
      // 셸(`frameBus`)과 같다 — 경유 화면이 그 데이터를 받은 뒤 150ms, 못 받으면 2.5초 뒤 옮긴다
      await waitFor(
        page,
        (list) =>
          list.find((m) => m.type === "lab:request" && m.path.startsWith(shot.via.afterRequest)),
        { timeoutMs: 2500 + (shot.config.latencyMs ?? 0) },
      );
      await sleep(150);
      const target = shot.href;
      await page.evaluate((pathname) => {
        window.postMessage(
          { type: "lab:navigate", pathname, mode: "push" },
          window.location.origin,
        );
      }, target);
      await waitFor(
        page,
        (list) => list.find((m) => m.type === "lab:route" && m.pathname === target.split("?")[0]),
        { timeoutMs: 5000 },
      );
    }

    await waitQuiet(page);
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    await sleep(250);
    const shotResult = await stableScreenshot(page);
    await writeFile(outFile, shotResult.buffer);
    result.stable = shotResult.stable;

    const messages = await labMessages(page);
    result.requests = messages
      .filter((m) => m.type === "lab:request")
      .map(({ method, path: p, status }) => ({ method, path: p, status }));
    result.finalPathname =
      messages.filter((m) => m.type === "lab:route" || m.type === "lab:ready").at(-1)?.pathname ??
      null;
    result.layout = await page.evaluate(inspectLayout, {
      insets: shot.device.insets ?? { top: 0, bottom: 0 },
      limit: 20,
    });
    const bottomTrouble =
      result.layout.underTabBar.length +
      result.layout.covered.filter((item) => item.scrolledToEnd).length +
      result.layout.underBottomInset.length +
      result.layout.belowScreen.length;
    if (endFile && bottomTrouble > 0 && result.layout.scrolled > 0) {
      await sleep(200);
      await writeFile(endFile, await page.screenshot({ animations: "disabled", caret: "hide" }));
      result.endShot = true;
    }
  } catch (error) {
    result.loadError = error instanceof Error ? error.message.split("\n")[0] : String(error);
  } finally {
    await page.close().catch(() => {});
  }
  return result;
}

async function runShots(shots, options, lab) {
  const { chromium } = await import("playwright");
  const { PNG } = (await import("pngjs")).default ?? (await import("pngjs"));
  const browser = await chromium.launch({ headless: true });
  const dirs = { before: "before", after: "after", diff: "diff" };
  for (const dir of Object.values(dirs))
    await mkdir(path.join(options.out, dir), { recursive: true });

  const results = [];
  let next = 0;
  let done = 0;
  const worker = async () => {
    const contexts = {
      after: await browser.newContext({
        deviceScaleFactor: options.dpr,
        locale: "ko-KR",
        timezoneId: "Asia/Seoul",
      }),
      before: options.before
        ? await browser.newContext({
            deviceScaleFactor: options.dpr,
            locale: "ko-KR",
            timezoneId: "Asia/Seoul",
          })
        : null,
    };
    try {
      while (next < shots.length) {
        const shot = shots[next];
        next += 1;
        const file = `${shot.id}.png`;
        const images = { after: `after/${file}` };
        const urls = {};
        let beforeObs = null;
        if (options.before) {
          images.before = `before/${file}`;
          beforeObs = await observe(contexts.before, options.before, shot, lab, {
            timeoutMs: options.timeoutMs,
            outFile: path.join(options.out, images.before),
          });
          urls.before = beforeObs.url;
          if (beforeObs.loadError) delete images.before;
        }
        const afterObs = await observe(contexts.after, options.after, shot, lab, {
          timeoutMs: options.timeoutMs,
          outFile: path.join(options.out, images.after),
          endFile: path.join(options.out, "after", `${shot.id}.end.png`),
        });
        urls.after = afterObs.url;
        if (afterObs.loadError) delete images.after;
        if (afterObs.endShot) images.afterEnd = `after/${shot.id}.end.png`;

        let diff = null;
        if (images.before && images.after) {
          const computed = diffPng(
            await readFile(path.join(options.out, images.before)),
            await readFile(path.join(options.out, images.after)),
            PNG,
          );
          images.diff = `diff/${file}`;
          await writeFile(path.join(options.out, images.diff), computed.image);
          const { image, ...rest } = computed;
          diff = rest;
        }
        const issues = compareIssues(
          beforeObs ? issuesFromObservation(beforeObs, shot) : null,
          issuesFromObservation(afterObs, shot),
        );
        results.push({
          ...shot,
          urls,
          images,
          diff,
          issues,
          finalPathname: afterObs.finalPathname ?? null,
        });
        done += 1;
        const fresh = issues.filter(
          (i) => i.side === "after" && !i.existing && i.severity !== "info",
        ).length;
        process.stdout.write(
          `[${done}/${shots.length}] ${shot.id}${diff ? ` · 차이 ${diff.percent}%` : ""}${fresh ? ` · 새 문제 ${fresh}` : ""}\n`,
        );
      }
    } finally {
      await contexts.after.close().catch(() => {});
      await contexts.before?.close().catch(() => {});
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(options.concurrency, shots.length) }, worker));
  } finally {
    await browser.close();
  }
  const order = new Map(shots.map((shot, i) => [shot.id, i]));
  return results.sort((a, b) => order.get(a.id) - order.get(b.id));
}

/* ───────────────────────────── 진입 ───────────────────────────── */

async function resolveRoutes(options, lab) {
  if (options.changed) {
    const { files: changed, notes: gitNotes } = changedFilesFromGit(options.repo, options.base);
    const files = await readSourceFiles(options.repo);
    const graph = buildImportGraph(files, options.repo);
    const result = routesForChangedFiles({
      changedFiles: changed,
      routes: lab.shellRoutes,
      files,
      graph,
      repoRoot: options.repo,
      maxRoutes: options.maxRoutes,
    });
    return {
      selections: result.routes.map((route) => ({ route, href: null })),
      info: {
        mode: "changed",
        base: options.base,
        changedFiles: changed,
        reasons: result.reasons,
        fallback: result.fallback,
        notes: [...gitNotes, ...result.notes],
      },
    };
  }
  const requested = options.routes ?? ["tabs"];
  const { picked, unknown } = selectRoutes(lab.shellRoutes, requested);
  if (unknown.length > 0) {
    throw new Error(
      `모르는 라우트: ${unknown.join(", ")} — 있는 것: ${lab.shellRoutes.map((r) => r.path).join(" ")}`,
    );
  }
  return {
    selections: picked,
    info: { mode: options.routes ? "list" : "default-tabs", requested, notes: [] },
  };
}

function pickDevices(options, lab) {
  if (!options.devices) return defaultDevices(lab.labDevices, lab.defaultDeviceId);
  return options.devices.map((id) => {
    const device = lab.labDevices.find((d) => d.id === id);
    if (!device) {
      throw new Error(
        `모르는 기기: ${id} — 있는 것: ${lab.labDevices.map((d) => d.id).join(", ")}`,
      );
    }
    return device;
  });
}

function timestamp(date = new Date()) {
  const kst = new Date(date.getTime() + 9 * 3600_000).toISOString();
  return `${kst.slice(0, 10).replace(/-/g, "")}-${kst.slice(11, 19).replace(/:/g, "")}`;
}

export async function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  if (options.help) {
    const head = (await readFile(fileURLToPath(import.meta.url), "utf8")).split("*/")[0];
    console.log(head.replace(/^\/\*\*\n?/, "").replace(/^ \* ?/gm, ""));
    return 0;
  }
  const metaRoot = existsSync(path.join(options.repo, "expo-lab/src/shell/routes.ts"))
    ? options.repo
    : scriptRepo;
  const lab = await loadLabModules(metaRoot);
  options.now ??= defaultNow();

  let routes;
  let devices;
  try {
    routes = await resolveRoutes(options, lab);
    devices = pickDevices(options, lab);
    const unknownSets = options.datasets.filter((id) => !lab.datasetIds.includes(id));
    if (unknownSets.length) {
      throw new Error(
        `모르는 데이터 세트: ${unknownSets.join(", ")} — 있는 것: ${lab.datasetIds.join(", ")}`,
      );
    }
  } catch (error) {
    console.error(error.message);
    return 2;
  }
  const shots = planShots({
    selections: routes.selections,
    devices,
    datasets: options.datasets,
    textScales: options.textScales,
    now: options.now,
    sample: lab.sampleParams,
    resolveHref: lab.resolveHref,
  });

  if (options.dryRun) {
    const origin = options.after ?? "http://localhost:8085";
    console.log(
      JSON.stringify(
        {
          now: options.now,
          routeSource: routes.info,
          shots: shots.map((shot) => ({
            id: shot.id,
            href: shot.href,
            via: shot.via,
            url: buildFrameUrl(origin, shot),
          })),
        },
        null,
        2,
      ),
    );
    return 0;
  }

  options.out ??= path.join(os.tmpdir(), "momentory-lab-verify", timestamp());
  await mkdir(options.out, { recursive: true });
  const startedAt = new Date().toISOString();
  console.log(
    `${shots.length}장 — 라우트 ${routes.selections.length} × 기기 ${devices.length} × 데이터 ${options.datasets.length}(프리셋 화면은 1) × 글씨 ${options.textScales.length}${options.before ? " · 전·후" : " · 후만"} → ${options.out}`,
  );
  const results = await runShots(shots, options, lab);
  const report = buildReport({
    options,
    routeInfo: routes.info,
    shots: results,
    startedAt,
    finishedAt: new Date().toISOString(),
  });
  await writeFile(path.join(options.out, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(path.join(options.out, "report.html"), renderHtml(report));
  await writeFile(path.join(options.out, "pr-screenshots.md"), renderPrMarkdown(report));
  const s = report.summary;
  console.log(
    `\n끝 — ${s.shots}장${options.before ? ` · 바뀐 장 ${s.changedShots}` : ""} · 새 문제가 있는 장 ${s.shotsWithNewIssues}`,
  );
  console.log(`보고서: ${path.join(options.out, "report.html")}`);
  console.log(`기계용: ${path.join(options.out, "report.json")}`);
  console.log(`PR 조각: ${path.join(options.out, "pr-screenshots.md")}`);
  return 0;
}

const invokedDirectly =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}
