import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

import {
  REPORT_FORMAT,
  buildFrameUrl,
  buildImportGraph,
  buildReport,
  compareIssues,
  defaultDevices,
  defaultNow,
  diffPng,
  issuesFromObservation,
  loadLabModules,
  main,
  parseArgs,
  parseModule,
  pickPrShots,
  planShots,
  renderHtml,
  renderPrMarkdown,
  routesForChangedFiles,
  selectRoutes,
  unmangleMsysPath,
} from "./lab-verify.mjs";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));

/* ── 인자 ── */

test("인자 — 기본값 · 쉼표 목록 · = 형태", () => {
  const options = parseArgs([
    "--after",
    "http://localhost:8100/",
    "--routes=/home,/my",
    "--devices",
    "iphone-se-3,pixel-8",
  ]);
  assert.equal(options.after, "http://localhost:8100");
  assert.equal(options.before, null);
  assert.deepEqual(options.routes, ["/home", "/my"]);
  assert.deepEqual(options.devices, ["iphone-se-3", "pixel-8"]);
  assert.deepEqual(options.datasets, ["empty", "normal", "many", "long-copy"]);
  assert.deepEqual(options.textScales, [1, 1.3]);
  assert.equal(options.concurrency, 3);
  assert.equal(options.changed, false);
});

test("인자 — 틀리면 던진다", () => {
  assert.throws(() => parseArgs(["--routes", "/home"]), /--after/);
  assert.throws(() => parseArgs(["--after", "localhost:8100"]), /http/);
  assert.throws(() => parseArgs(["--after", "http://x", "--nope", "1"]), /알 수 없는 옵션/);
  assert.throws(() => parseArgs(["--after", "http://x", "--routes", "/home", "--changed"]), /함께/);
  assert.throws(() => parseArgs(["--after", "http://x", "--text-scales", "1,abc"]), /글씨 배율/);
  assert.throws(() => parseArgs(["--after", "http://x", "--now", "어제"]), /--now/);
  assert.throws(() => parseArgs(["--after"]), /값이 없다/);
  // --dry-run 이면 --after 없이도 된다
  assert.equal(parseArgs(["--dry-run", "--changed"]).dryRun, true);
});

test("main — 인자가 틀리면 종료 코드 2", async () => {
  const original = console.error;
  console.error = () => {};
  try {
    assert.equal(await main(["--nope"]), 2);
  } finally {
    console.error = original;
  }
});

test("고정 시각 기본값 — 그날(KST) 21:30", () => {
  // 2026-11-02 16:00 UTC = 11-03 01:00 KST
  assert.equal(defaultNow(Date.parse("2026-11-02T16:00:00Z")), "2026-11-03T21:30:00+09:00");
});

test("Git Bash 가 바꾼 경로를 되돌린다", () => {
  assert.equal(unmangleMsysPath("C:/Program Files/Git/home"), "/home");
  assert.equal(unmangleMsysPath("C:/Program Files/Git/my/nickname"), "/my/nickname");
  assert.equal(unmangleMsysPath("C:/Program Files/Git/"), "/");
  assert.equal(unmangleMsysPath("/home"), "/home");
});

/* ── 라우트 ── */

const ROUTES = [
  {
    path: "/",
    file: "app/index.tsx",
    title: "스플래시",
    preset: { signedIn: true, dataset: "new-user", failPaths: ["/api/v1/users/me"] },
  },
  {
    path: "/intro/start",
    file: "app/intro/start.tsx",
    title: "시작",
    preset: { signedIn: false, dataset: "new-user" },
  },
  {
    path: "/home",
    file: "app/(tabs)/home.tsx",
    title: "홈",
    preset: { signedIn: true, dataset: null },
  },
  {
    path: "/rest",
    file: "app/(tabs)/rest.tsx",
    title: "쉼터",
    preset: { signedIn: true, dataset: null },
  },
  {
    path: "/archive",
    file: "app/(tabs)/archive.tsx",
    title: "보관함",
    preset: { signedIn: true, dataset: null },
  },
  {
    path: "/report",
    file: "app/(tabs)/report.tsx",
    title: "리포트",
    preset: { signedIn: true, dataset: null },
  },
  {
    path: "/my",
    file: "app/(tabs)/my.tsx",
    title: "마이",
    preset: { signedIn: true, dataset: null },
  },
  {
    path: "/diary/[id]",
    file: "app/diary/[id]/index.tsx",
    title: "일기 상세",
    preset: { signedIn: true, dataset: null },
    openVia: { path: "/archive", afterRequest: "/api/v1/diaries" },
  },
];

test("라우트 고르기 — tabs · all · 구체 주소 · 모르는 것", () => {
  const tabs = selectRoutes(ROUTES, ["tabs"]);
  assert.deepEqual(
    tabs.picked.map((item) => item.route.path),
    ["/home", "/rest", "/archive", "/report", "/my"],
  );
  assert.equal(selectRoutes(ROUTES, ["all"]).picked.length, ROUTES.length);
  const concrete = selectRoutes(ROUTES, ["/diary/12", "/diary/[id]"]);
  assert.deepEqual(
    concrete.picked.map((item) => [item.route.path, item.href]),
    [
      ["/diary/[id]", "/diary/12"],
      ["/diary/[id]", null],
    ],
  );
  assert.deepEqual(selectRoutes(ROUTES, ["/nope"]).unknown, ["/nope"]);
});

/* ── 바뀐 파일 → 라우트 ── */

const abs = (rel) => path.join(repoRoot, rel);

function sampleFiles() {
  return new Map(
    Object.entries({
      "app/(tabs)/home.tsx": `import { Text } from "@/components/ds";\nimport { Hero } from "@/features/home/Hero";\nexport default function Home() {}`,
      "app/(tabs)/my.tsx": `import { EmotionPebble, Text } from "@/components/ds";\nexport default function My() {}`,
      "app/(tabs)/rest.tsx": `import type { Props } from "@/components/ds/Card";\nexport default function Rest() {}`,
      "app/(tabs)/archive.tsx": `export default function Archive() {}`,
      "app/(tabs)/report.tsx": `import * as ds from "@/components/ds";\nexport default function Report() {}`,
      "app/(tabs)/_layout.tsx": `export default function Layout() {}`,
      "app/index.tsx": `export default function Splash() {}`,
      "app/intro/start.tsx": `export default function Start() {}`,
      "app/diary/[id]/index.tsx": `export default function Diary() {}`,
      "src/components/ds/index.ts": `/** 묶음 */\nexport { Text } from "./Text";\nexport * from "./EmotionPebble";\nexport { Card } from "./Card";`,
      "src/components/ds/Text.tsx": `export function Text() {}`,
      "src/components/ds/EmotionPebble.tsx": `export function EmotionPebble() {}\nexport const PEBBLE_SIZE = 3;`,
      "src/components/ds/Card.tsx": `export type Props = {};\nexport function Card() {}`,
      "src/features/home/Hero.tsx": `const art = require("../../../assets/home/hero.webp");\nexport function Hero() {}`,
    }).map(([rel, content]) => [abs(rel), content]),
  );
}

function changed(changedFiles, maxRoutes = 12) {
  const files = sampleFiles();
  const result = routesForChangedFiles({
    changedFiles,
    routes: ROUTES,
    files,
    graph: buildImportGraph(files, repoRoot),
    repoRoot,
    maxRoutes,
  });
  return { ...result, paths: result.routes.map((route) => route.path) };
}

test("모듈 읽기 — import 이름 · 다시 내보내기 · type 은 뺀다", () => {
  const parsed = parseModule(
    `import A, { b, c as d, type T } from "./x";\nimport type { U } from "./u";\nimport "./side";\nexport { e } from "./e";\nexport * from "./all";\nexport const f = 1;\nconst g = require("./g");`,
  );
  assert.deepEqual(parsed.imports.find((i) => i.specifier === "./x").names, ["b", "c", "default"]);
  assert.equal(
    parsed.imports.some((i) => i.specifier === "./u"),
    false,
  );
  assert.equal(parsed.imports.find((i) => i.specifier === "./side").names, "*");
  assert.equal(parsed.imports.find((i) => i.specifier === "./g").names, "*");
  assert.deepEqual(parsed.reexports.find((r) => r.specifier === "./e").names, [
    { from: "e", as: "e" },
  ]);
  assert.equal(parsed.reexports.find((r) => r.specifier === "./all").names, "*");
  assert.deepEqual([...parsed.exports].sort(), ["e", "f"]);
});

test("바뀐 파일 → 라우트 — 묶음 파일을 지날 때 이름을 따진다", () => {
  // EmotionPebble 은 export * 로 묶음에 들어간다 → 그것을 부르는 /my 와 묶음 전체를 부르는 /report 만
  assert.deepEqual(changed(["src/components/ds/EmotionPebble.tsx"]).paths, ["/report", "/my"]);
  // Text 는 홈 · 마이 · 리포트가 부른다
  assert.deepEqual(changed(["src/components/ds/Text.tsx"]).paths, ["/home", "/report", "/my"]);
  // type 만 부르는 /rest 는 끌려오지 않는다
  assert.deepEqual(changed(["src/components/ds/Card.tsx"]).paths, ["/report"]);
});

test("바뀐 파일 → 라우트 — 라우트 파일 · 레이아웃 · 그림", () => {
  const direct = changed(["app/diary/[id]/index.tsx"]);
  assert.deepEqual(direct.paths, ["/diary/[id]"]);
  assert.match(direct.reasons["/diary/[id]"], /라우트 파일/);
  assert.deepEqual(changed(["app/(tabs)/_layout.tsx"]).paths, [
    "/home",
    "/rest",
    "/archive",
    "/report",
    "/my",
  ]);
  const asset = changed(["assets/home/hero.webp"]);
  assert.deepEqual(asset.paths, ["/home"]);
  assert.match(asset.reasons["/home"], /Hero\.tsx 를 부른다/);
});

test("바뀐 파일 → 라우트 — 못 찾으면 탭 다섯 · Lab 변경은 세기만 · 상한", () => {
  const fallback = changed(["expo-lab/src/shell/ShellApp.tsx", "docs/DESIGN.md"]);
  assert.equal(fallback.fallback, true);
  assert.deepEqual(fallback.paths, ["/home", "/rest", "/archive", "/report", "/my"]);
  assert.ok(fallback.notes.some((note) => /Lab 쪽 변경 1개/.test(note)));
  const capped = changed(["app/(tabs)/_layout.tsx", "app/index.tsx"], 3);
  assert.equal(capped.routes.length, 3);
  assert.ok(capped.notes.some((note) => /--max-routes/.test(note)));
});

/* ── 기기 · 찍을 목록 · 주소 ── */

const DEVICES = [
  { id: "iphone-se-3", platform: "ios", width: 375, height: 667, insets: { top: 20, bottom: 0 } },
  {
    id: "iphone-13-mini",
    platform: "ios",
    width: 375,
    height: 812,
    insets: { top: 50, bottom: 34 },
  },
  { id: "iphone-16", platform: "ios", width: 393, height: 852, insets: { top: 59, bottom: 34 } },
  {
    id: "iphone-16-plus",
    platform: "ios",
    width: 430,
    height: 932,
    insets: { top: 59, bottom: 34 },
  },
  { id: "pixel-8", platform: "android", width: 412, height: 915, insets: { top: 50, bottom: 24 } },
  {
    id: "galaxy-s24",
    platform: "android",
    width: 360,
    height: 780,
    insets: { top: 40, bottom: 24 },
  },
];

test("기본 기기 — 가장 작은 iOS · iphone-16 · pixel-8 · Galaxy", () => {
  assert.deepEqual(
    defaultDevices(DEVICES, { ios: "iphone-16", android: "pixel-8" }).map((d) => d.id),
    ["iphone-se-3", "iphone-16", "pixel-8", "galaxy-s24"],
  );
});

function plan(selections, textScales = [1, 1.3]) {
  return planShots({
    selections,
    devices: [DEVICES[0], DEVICES[4]],
    datasets: ["empty", "normal"],
    textScales,
    now: "2026-11-02T21:30:00+09:00",
    sample: (datasetId) => (datasetId === "normal" ? { diaryId: 81 } : {}),
    resolveHref: (route, sample) => route.path.replace("[id]", String(sample.diaryId ?? 1)),
  });
}

test("찍을 목록 — 라우트 × 기기 × 데이터 × 글씨, 프리셋 화면은 세트 하나", () => {
  const shots = plan([
    { route: ROUTES[2], href: null },
    { route: ROUTES[1], href: null },
  ]);
  assert.equal(shots.filter((s) => s.route === "/home").length, 2 * 2 * 2);
  const intro = shots.filter((s) => s.route === "/intro/start");
  assert.equal(intro.length, 2 * 1 * 2);
  assert.ok(intro.every((s) => s.datasetId === "new-user" && s.config.signedIn === false));
  const scaled = shots.find((s) => s.textScale === 1.3);
  assert.equal(scaled.config.textScale, 1.3);
  assert.equal("textScale" in shots.find((s) => s.textScale === 1).config, false);
  assert.equal(new Set(shots.map((s) => s.id)).size, shots.length);
  assert.equal(new Set(shots.map((s) => s.config.frameId)).size, shots.length);
});

test("프레임 주소 — os= · 프리셋 실패 주소 · 두 단계 열기는 경유 화면부터", () => {
  const [splash] = plan([{ route: ROUTES[0], href: null }], [1]);
  const url = new URL(buildFrameUrl("http://localhost:8096", splash));
  assert.equal(url.pathname, "/");
  assert.equal(url.searchParams.get("labFrame"), "1");
  assert.equal(url.searchParams.get("os"), "ios");
  assert.equal(url.searchParams.has("platform"), false);
  assert.equal(url.searchParams.get("device"), "iphone-se-3");
  assert.equal(url.searchParams.get("dataset"), "new-user");
  assert.equal(url.searchParams.get("signedIn"), "1");
  assert.equal(url.searchParams.get("fail"), "/api/v1/users/me");
  assert.equal(url.searchParams.get("now"), "2026-11-02T21:30:00+09:00");

  const diary = plan([{ route: ROUTES[7], href: null }], [1]).find((s) => s.datasetId === "normal");
  assert.equal(diary.href, "/diary/81");
  assert.deepEqual(diary.via, { path: "/archive", afterRequest: "/api/v1/diaries" });
  assert.equal(new URL(buildFrameUrl("http://localhost:8096", diary)).pathname, "/archive");

  const withQuery = { ...diary, via: null, href: "/rest/records?content=sense_pond" };
  const recordsUrl = new URL(buildFrameUrl("http://x", withQuery));
  assert.equal(recordsUrl.pathname, "/rest/records");
  assert.equal(recordsUrl.searchParams.get("content"), "sense_pond");
});

/* ── 화소 비교 ── */

function png(width, height, paint) {
  const image = new PNG({ width, height });
  for (let i = 0; i < width * height; i += 1) {
    image.data[i * 4] = 250;
    image.data[i * 4 + 1] = 248;
    image.data[i * 4 + 2] = 240;
    image.data[i * 4 + 3] = 255;
  }
  paint?.(image);
  return PNG.sync.write(image);
}

test("화소 비교 — 바뀐 화소 수 · 비율 · 범위 · 미세한 흔들림은 넘긴다", () => {
  const before = png(10, 10);
  const after = png(10, 10, (image) => {
    const at = (x, y) => (y * 10 + x) * 4;
    image.data[at(2, 3)] = 0; // 바뀜
    image.data[at(7, 8) + 1] = 0; // 바뀜
    image.data[at(5, 5)] = 240; // 10 차이 — 문턱(24) 아래
  });
  const result = diffPng(before, after, PNG);
  assert.equal(result.changedPixels, 2);
  assert.equal(result.totalPixels, 100);
  assert.equal(result.percent, 2);
  assert.deepEqual(result.bounds, { x: 2, y: 3, w: 6, h: 6 });
  assert.equal(result.sizeMismatch, false);
  const decoded = PNG.sync.read(result.image);
  assert.equal(decoded.data[(3 * 10 + 2) * 4], 230); // 빨강

  const same = diffPng(before, png(10, 10), PNG);
  assert.equal(same.changedPixels, 0);
  assert.equal(same.bounds, null);
  assert.equal(diffPng(before, png(10, 12), PNG).sizeMismatch, true);
});

/* ── 문제 · 보고서 ── */

const SHOT = {
  id: "home__iphone-se-3__normal__x1",
  route: "/home",
  title: "홈",
  href: "/home",
  hint: null,
  via: null,
  device: DEVICES[0],
  datasetId: "normal",
  textScale: 1,
  config: { failPaths: ["/api/v1/users/me"] },
};

test("문제 판정 — 배치 · 요청 · 콘솔(웹 전용 경고는 참고) · 넘어감", () => {
  const issues = issuesFromObservation(
    {
      layout: {
        overflowX: 4,
        offscreenText: [],
        clipped: [{ text: "긴 제목", box: {} }],
        truncated: [{ text: "말줄임", box: {} }],
        underTopInset: [],
        underTabBar: [{ text: "마지막 줄", box: {} }],
        covered: [],
        underBottomInset: [],
        belowScreen: [],
      },
      requests: [
        { method: "GET", path: "/api/v1/users/me", status: 500 },
        { method: "PUT", path: "/api/v1/users/me/onboarding", status: 400 },
        { method: "PUT", path: "/api/v1/users/me/onboarding", status: 400 },
      ],
      consoleErrors: [
        "React does not recognize the `%s` prop on a DOM element. accessibilityElementsHidden",
        "TypeError: x is undefined",
      ],
      finalPathname: "/retro/talk",
      stable: false,
    },
    SHOT,
  );
  const kinds = issues.map((i) => `${i.kind}:${i.severity}`);
  assert.deepEqual(kinds, [
    "horizontal-overflow:error",
    "text-clipped:warn",
    "text-truncated:info",
    "under-tab-bar:warn",
    "request-failed:warn", // 프리셋으로 일부러 실패시킨 /users/me 는 빠지고 중복은 하나로
    "console-web-warning:info",
    "console-error:warn",
    "redirected:info",
    "unstable:info",
  ]);
  assert.deepEqual(
    issuesFromObservation({ loadError: "시간 초과" }, SHOT).map((i) => i.kind),
    ["load-failed"],
  );
  // 패턴 라우트는 구체 주소와 맞는다
  assert.equal(
    issuesFromObservation(
      { finalPathname: "/diary/81" },
      { ...SHOT, route: "/diary/[id]", href: "/diary/81" },
    ).length,
    0,
  );
});

test("전·후 문제 합치기 — 전에도 · 해결됨", () => {
  const a = { kind: "text-clipped", severity: "warn", message: "「A」" };
  const b = { kind: "text-clipped", severity: "warn", message: "「B」" };
  const c = { kind: "horizontal-overflow", severity: "error", message: "가로로 4px 넘친다" };
  const merged = compareIssues([a, c], [a, b]);
  assert.deepEqual(
    merged.map((i) => [i.message, i.side, Boolean(i.existing), Boolean(i.resolved)]),
    [
      ["「A」", "after", true, false],
      ["「B」", "after", false, false],
      ["가로로 4px 넘친다", "before", false, true],
    ],
  );
  assert.ok(compareIssues(null, [a]).every((i) => i.side === "after" && i.existing === undefined));
});

function sampleReport(withBefore = true) {
  const shots = [
    {
      ...SHOT,
      urls: {
        after: "http://a/home?labFrame=1",
        ...(withBefore ? { before: "http://b/home?labFrame=1" } : {}),
      },
      images: {
        after: `after/${SHOT.id}.png`,
        ...(withBefore ? { before: `before/${SHOT.id}.png`, diff: `diff/${SHOT.id}.png` } : {}),
      },
      diff: withBefore
        ? {
            changedPixels: 120,
            totalPixels: 250125,
            percent: 0.048,
            bounds: { x: 1, y: 2, w: 3, h: 4 },
            sizeMismatch: false,
          }
        : null,
      issues: compareIssues(withBefore ? [] : null, [
        { kind: "text-clipped", severity: "warn", label: "글자 잘림", message: "「<b>」" },
      ]),
      finalPathname: "/home",
    },
  ];
  return buildReport({
    options: {
      before: withBefore ? "http://b" : null,
      after: "http://a",
      now: "2026-11-02T21:30:00+09:00",
    },
    routeInfo: { mode: "list", requested: ["/home"], notes: ["메모"] },
    shots,
    startedAt: "2026-11-02T12:00:00.000Z",
    finishedAt: "2026-11-02T12:01:00.000Z",
  });
}

test("보고서 JSON 모양", () => {
  const report = sampleReport();
  assert.equal(report.format, REPORT_FORMAT);
  assert.deepEqual(Object.keys(report.summary).sort(), [
    "changedShots",
    "issuesByKind",
    "routes",
    "shots",
    "shotsWithNewIssues",
  ]);
  assert.deepEqual(report.summary, {
    shots: 1,
    routes: 1,
    changedShots: 1,
    shotsWithNewIssues: 1,
    issuesByKind: { "text-clipped": 1 },
  });
  const [shot] = report.shots;
  for (const key of [
    "id",
    "route",
    "title",
    "href",
    "device",
    "platform",
    "dataset",
    "textScale",
    "urls",
    "images",
    "diff",
    "issues",
  ]) {
    assert.ok(key in shot, key);
  }
  assert.equal(shot.device, "iphone-se-3");
  assert.equal(shot.platform, "ios");
  assert.deepEqual(report.devices, ["iphone-se-3"]);
  assert.deepEqual(JSON.parse(JSON.stringify(report)), report);
});

test("보고서 HTML · PR 조각 — 상대 경로 · 이스케이프 · 후만 찍은 경우", () => {
  const report = sampleReport();
  const html = renderHtml(report);
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /before\/home__iphone-se-3__normal__x1\.png/);
  assert.match(html, /diff\/home__iphone-se-3__normal__x1\.png/);
  assert.match(html, /「&lt;b&gt;」/);
  assert.doesNotMatch(html, /「<b>」/);
  const md = renderPrMarkdown(report);
  assert.match(md, /\| 화면 \| 전 \| 후 \|/);
  assert.match(md, /!\[전\]\(before\/home__iphone-se-3__normal__x1\.png\)/);
  assert.match(md, /GitHub 에 올려야/);
  assert.match(pickPrShots(report)[0].why, /가장 많이 바뀜/);

  const afterOnly = sampleReport(false);
  assert.doesNotMatch(renderHtml(afterOnly), /diff\//);
  assert.match(renderPrMarkdown(afterOnly), /\| 화면 \| 후 \|/);
});

/* ── 저장소의 실제 Lab 표 ── */

test("Lab 표를 TS 그대로 읽는다 — 라우트 · 기기 · 동적 id", async () => {
  const lab = await loadLabModules(repoRoot);
  const paths = lab.shellRoutes.map((route) => route.path);
  for (const p of ["/home", "/my/nickname", "/diary/[id]", "/home/schedule/[id]"])
    assert.ok(paths.includes(p), p);
  const diary = lab.shellRoutes.find((route) => route.path === "/diary/[id]");
  assert.ok(diary.openVia?.afterRequest);
  assert.ok(lab.labDevices.some((d) => d.id === "iphone-se-3"));
  assert.ok(lab.datasetIds.includes("long-copy"));
  const sample = lab.sampleParams("normal", "2026-11-02T21:30:00+09:00");
  assert.equal(typeof sample.diaryId, "number");
  const href = lab.resolveHref(diary, sample, "2026-11-02T21:30:00+09:00", Date.now());
  assert.equal(href, `/diary/${sample.diaryId}`);
  assert.match(lab.encodeFrameConfig({ frameId: "x", datasetId: "normal" }), /^momentory-lab:/);
});
