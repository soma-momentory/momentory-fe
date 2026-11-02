/**
 * 「AI에게 맡기기」 · 「새 화면 만들기」 · 키보드 올리기 · AI 수정 결과(B)의 셸 연결.
 *
 * ⚠ AI 를 실제로 돌리지 않는다 — `/__lab/agent/*` 는 이 파일이 가짜로 답한다(POST 는 전부 막는다).
 * 작업 공간 · 미리보기 서버도 가짜다: 「AI 수정 결과」 B 는 **같은 저장소로 띄운 두 번째 Lab**
 * (`LAB_PREVIEW_URL` · 기본 `http://127.0.0.1:<EXPO_LAB_PORT + 1>`)을 다른 출처로 띄워 메시지가 오가는지 본다.
 * 두 번째 Lab 이 떠 있지 않으면 그 검사는 건너뛴다:
 *
 *   (expo-lab) MOMENTORY_LAB_AGENT=off npx expo start --web --port 8103
 *   EXPO_LAB_PORT=8102 LAB_FRAMES=1 npx playwright test expo-lab/e2e/agent.spec.ts
 */
import { expect, test, type Page } from "@playwright/test";

const SHELL_PORT = Number(process.env.EXPO_LAB_PORT ?? 8085);
const PREVIEW_URL = (process.env.LAB_PREVIEW_URL ?? `http://127.0.0.1:${SHELL_PORT + 1}`).replace(
  /\/+$/,
  "",
);

const preview = (ready: boolean) => ({
  status: ready ? "ready" : "stopped",
  port: Number(new URL(PREVIEW_URL).port),
  url: ready ? PREVIEW_URL : null,
  ready,
  error: null,
});

const workspace = (patch: Record<string, unknown>) => ({
  id: "ws-home",
  kind: "edit",
  route: "/home",
  title: "홈 고치기",
  file: "app/(tabs)/home.tsx",
  specId: null,
  slug: null,
  section: null,
  branch: "lab/home-test",
  baseBranch: "main",
  path: "C:/lab-workspaces/home-test",
  createdAt: "2026-11-02T00:00:00.000Z",
  status: "edited",
  changedCount: 2,
  commitCount: 0,
  newRoutes: [],
  pr: null,
  broken: null,
  session: null,
  lastRun: null,
  check: null,
  preview: preview(true),
  ...patch,
});

const EDIT = workspace({});
const NEW_SCREEN = workspace({
  id: "ws-sleep",
  kind: "new-screen",
  route: null,
  title: "잠 기록",
  slug: "sleep-log",
  section: "rest",
  newRoutes: ["/rest/sleep-log"],
  status: "working",
  preview: preview(false),
});

/**
 * `/__lab/agent/*` 를 가짜로 — 읽기만 답하고, 실행 · 저장 같은 POST 는 막는다(409).
 * 막은 POST 가 무엇을 보냈는지는 돌려준다(셸이 보낸 지시를 본다)
 */
async function fakeAgentServer(page: Page, workspaces: Record<string, unknown>[]) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  await page.route("**/__lab/agent/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/__lab/agent", "");
    if (request.method() !== "GET") {
      calls.push({ method: request.method(), path, body: request.postDataJSON() ?? null });
      return route.fulfill({ status: 409, json: { error: "테스트에서는 실행하지 않아요" } });
    }
    if (path === "/status") {
      return route.fulfill({
        json: {
          available: { claude: true, codex: false, gh: false },
          versions: { claude: "test", codex: null, gh: null },
          git: { branch: "main", dirty: false, dirtyFiles: [] },
          baseBranch: "main",
          activeRun: null,
          workspaces,
        },
      });
    }
    if (path === "/workspaces") return route.fulfill({ json: { workspaces } });
    const id = /^\/workspaces\/([^/]+)$/.exec(path)?.[1];
    const found = workspaces.find((w) => w.id === id);
    if (found) {
      return route.fulfill({
        json: {
          workspace: found,
          changes: {
            files: [],
            fileCount: 0,
            diffStat: "",
            commits: [],
            newRoutes: [],
            newAssets: [],
          },
          run: null,
          history: [],
          blocks: { commitMessage: null, prBody: null },
          check: null,
          baseOptions: ["main"],
        },
      });
    }
    return route.fulfill({ status: 404, json: { error: "없는 경로예요" } });
  });
  return calls;
}

const frameConfig = async (page: Page, frameId: string) => {
  const name = await page.getByTestId(`lab-frame-${frameId}`).getAttribute("name");
  return JSON.parse(name!.slice("momentory-lab:".length)) as Record<string, unknown>;
};

test("「AI에게 맡기기」 탭 — 함께 보내는 정보(화면 · 파일 · 기기 · 데이터)는 따로, 지시 칸은 비어 있다", async ({
  page,
}) => {
  const calls = await fakeAgentServer(page, []);
  await page.goto("/#/screens?route=/home");
  await page.getByRole("tab", { name: "AI에게 맡기기" }).click();
  await expect(page).toHaveURL(/panel=agent/);
  const context = page.getByTestId("agent-context");
  await expect(context).toContainText("AI에게 함께 보내는 정보");
  await expect(context).toContainText("[화면] 홈 (12 · 12-b) · /home");
  await expect(context).toContainText("[파일] app/(tabs)/home.tsx");
  await expect(context).toContainText("[환경] iPhone 16 (ios) · 데이터: 기록 보통");
  await expect(context).not.toContainText("[시안]");
  // 함께 보내는 정보는 고치는 칸이 아니다
  await expect(context.getByRole("textbox")).toHaveCount(0);
  const input = page.getByRole("textbox", { name: "무엇을 바꿀까요?" });
  await expect(input).toBeVisible();
  await expect(input).toHaveValue("");
  await expect(input).toHaveAttribute("placeholder", /^예: /);
  // 할 말이 없으면 못 보낸다 — 한 줄로 알린다
  const go = page.getByRole("button", { name: "AI에게 수정 맡기기" });
  await expect(go).toBeDisabled();
  await expect(page.getByTestId("agent-ask-hint")).toHaveText(
    "「무엇을 바꿀까요?」에 할 말을 적거나 그림을 붙여요",
  );
  // 다른 화면을 고르면 함께 보내는 정보가 따라간다
  await page.getByTestId("route-tree").locator('[data-route="/rest"]').click();
  await expect(context).toContainText("[화면] 쉼터 (R1) · /rest");
  // 다른 탭을 보고 와도 적던 지시가 남는다
  await input.fill("카드 간격 넓혀줘");
  await page.getByRole("tab", { name: "화면 조건" }).click();
  // 화면 상태를 바꾸면 함께 보내는 정보도 따라간다(적던 지시는 그대로)
  await page.getByTestId("screen-state").selectOption({ label: "기록 많음" });
  await page.getByRole("tab", { name: "AI에게 맡기기" }).click();
  await expect(input).toHaveValue("카드 간격 넓혀줘");
  await expect(context).toContainText("· 데이터: 기록 많음");
  await expect(page.getByTestId("agent-ask-hint")).toHaveCount(0);
  // 보내면 서버에는 함께 보내는 정보 + 적은 말이 한 덩어리 `instruction` 으로 간다
  await go.click();
  await expect.poll(() => calls.filter((c) => c.path === "/run").length).toBe(1);
  const sent = calls.find((c) => c.path === "/run")!.body as Record<string, unknown>;
  expect(sent.target).toMatchObject({ kind: "edit", route: "/rest" });
  expect(sent.instruction).toBe(
    [
      "[화면] 쉼터 (R1) · /rest",
      "[파일] app/(tabs)/rest.tsx",
      "[환경] iPhone 16 (ios) · 데이터: 기록 많음",
      "지시: 카드 간격 넓혀줘",
    ].join("\n"),
  );
  // 가짜 서버는 실행하지 않고(409) 한 줄로 알린다 — 적던 지시는 그대로 남는다
  await expect(page.getByText("테스트에서는 실행하지 않아요")).toBeVisible();
  await expect(input).toHaveValue("카드 간격 넓혀줘");
});

test("「＋ 새 화면 만들기」 — 오른쪽에 새 화면 칸을 열고, 작업 중인 새 화면이 목록 맨 위에 묶인다", async ({
  page,
}) => {
  await fakeAgentServer(page, [EDIT, NEW_SCREEN]);
  await page.goto("/#/screens?route=/home");
  const tree = page.getByTestId("route-tree");
  const group = tree.locator('[data-section="new-screens"]');
  await expect(group).toContainText("새 화면 (작업 중)");
  await expect(group.locator('[data-workspace="ws-sleep"]')).toContainText("잠 기록");
  await expect(group.locator('[data-workspace="ws-sleep"]')).toContainText("AI가 고치는 중");
  // 화면 수정 작업은 이 묶음에 없다(그 화면의 「AI에게 맡기기」에 있다)
  await expect(group.locator('[data-workspace="ws-home"]')).toHaveCount(0);

  await page.getByTestId("new-screen-button").click();
  await expect(page).toHaveURL(/panel=new-screen/);
  await expect(page.getByTestId("side-panel-new-screen")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "화면 이름" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "주소에 쓸 영문 이름" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "주소에 쓸 영문 이름" })).toHaveAttribute(
    "placeholder",
    "예: sleep-log",
  );
  // 「새 화면 만들기」에 있는 동안 탭 줄은 「AI에게 맡기기」가 눌려 있다
  await expect(page.getByRole("tab", { name: "AI에게 맡기기" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "← 이 화면 고치기로" }).click();
  await expect(page.getByRole("textbox", { name: "무엇을 바꿀까요?" })).toBeVisible();
});

test.describe("프레임과 말하기 (실제 앱 프레임)", () => {
  test.skip(!process.env.LAB_FRAMES, "LAB_FRAMES=1 일 때만 — 프레임 안에 실제 앱이 떠야 한다");

  test("「키보드 올리기」 — 입력칸 없이 키보드를 올리고, 프레임이 알린 상태로 눌림이 바뀐다", async ({
    page,
  }) => {
    await page.goto("/#/screens?route=/home");
    const toggle = page.getByTestId("keyboard-toggle");
    await expect(toggle).toBeEnabled({ timeout: 90_000 });
    await expect(toggle).toHaveText("키보드 올리기");
    await expect(toggle).toHaveAttribute("title", /입력칸을 누르면 저절로 올라와요/);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(toggle).toHaveText("키보드 내리기");
    const layer = page
      .frameLocator('[data-testid="lab-frame-solo"]')
      .locator("#momentory-lab-keyboard");
    await expect(layer).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  test("AI 수정 결과(B) — 다른 출처의 Lab 에서 띄우고 ready · route · request · 키보드가 오간다", async ({
    page,
    request,
  }) => {
    const up = await request
      .get(`${PREVIEW_URL}/status`, { timeout: 5000 })
      .then((res) => res.ok())
      .catch(() => false);
    test.skip(!up, `두 번째 Lab(${PREVIEW_URL})이 떠 있지 않다 — 머리말의 명령으로 띄운다`);

    await fakeAgentServer(page, [EDIT]);
    await page.goto("/#/screens?route=/home&layout=ab&panel=agent");
    await page.getByRole("button", { name: "수정 결과 보기" }).click();

    await expect(page.getByTestId("frame-label-B")).toHaveAttribute(
      "title",
      "B · AI 수정 결과 (홈 고치기)",
    );
    const frame = page.getByTestId("lab-frame-B");
    await expect(frame).toHaveAttribute("src", `${PREVIEW_URL}/home`);
    expect(await frameConfig(page, "B")).toMatchObject({
      frameId: "B",
      shellOrigin: new URL(page.url()).origin,
    });
    await expect(page.getByTestId("cross-origin-note")).toHaveText(
      "AI 수정 결과 화면은 다른 서버라 돋보기를 쓸 수 없어요",
    );

    // 프레임 → 셸: lab:ready — 다른 출처 프레임이 셸에 말했다(배지만으로는 모른다 — 셸이 붙일 때 주소를 적는다)
    await expect(frame).toHaveAttribute("data-ready", "1", { timeout: 90_000 });
    const tree = page.getByTestId("route-tree");
    await expect(tree.locator('[data-route="/home"] [data-testid="route-badge-B"]')).toBeVisible({
      timeout: 90_000,
    });
    // 요청 기록을 비우고 나서 옮긴다 — 아래 B 의 요청은 다른 출처 프레임이 보낸 것이다
    await page.getByRole("tab", { name: "화면 조건" }).click();
    await page.getByTestId("request-log-section").locator("summary").click();
    await page.getByRole("button", { name: "기록 지우기" }).click();
    // 셸 → 프레임: lab:navigate — 목록에서 고르면 B 도 옮겨 가고 다시 알린다(리포트는 홈이 받아 두지 않은 데이터를 부른다)
    await tree.locator('[data-route="/report"]').click();
    await expect(tree.locator('[data-route="/report"] [data-testid="route-badge-B"]')).toBeVisible({
      timeout: 30_000,
    });
    await expect(frame).toHaveAttribute("src", `${PREVIEW_URL}/home`); // 다시 붙지 않고 옮겼다
    // 프레임 → 셸: lab:request — 서버 요청 기록에 B 의 요청
    const rows = page.getByTestId("request-log").locator("tr");
    await expect(
      rows.filter({ has: page.locator("td:nth-child(2)", { hasText: /^B$/ }) }).first(),
    ).toBeVisible();
    // 키보드도 두 폰 함께 — B 는 다른 출처로 보낸다
    const toggle = page.getByTestId("keyboard-toggle");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.frameLocator('[data-testid="lab-frame-B"]').locator("#momentory-lab-keyboard"),
    ).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");

    // 돌아가기 — B 가 이 서버의 앱으로
    await page.getByTestId("preview-close").click();
    await expect(page.getByTestId("lab-frame-B")).toHaveAttribute("src", "/report");
    await expect(page.getByTestId("frame-label-B")).toHaveAttribute("title", "B · 지금 앱");
  });
});

// ── 시안 여러 개 → 시안 비교 → 최종 A/B → 확정 ─────────────────────────────
// 시안의 수정 결과 화면은 같은 Lab 을 **다른 출처**(localhost ↔ 127.0.0.1)로 띄운다 — 두 번째 Lab 없이도 실제 앱이 뜬다.
const VARIANT_URL = `http://localhost:${SHELL_PORT}`;

type Recorded = { method: string; path: string; body: unknown };

const member = (index: number, patch: Record<string, unknown> = {}) =>
  workspace({
    id: `home-s${index}`,
    title: `홈 · 시안 ${index}`,
    branch: `lab/home-s${index}-test`,
    changedCount: 1,
    status: "edited",
    lastRun: { status: "done", agent: "claude", error: null },
    group: { id: "g1", index, total: 3, createdAt: "2026-11-02T12:00:00.000Z" },
    queued: false,
    summaryLine: `방향: 시안 ${index} 의 방향`,
    preview: { status: "ready", port: 8100 + index, url: VARIANT_URL, ready: true, error: null },
    ...patch,
  });

/**
 * 시안 묶음을 가진 가짜 서버 — 읽기에 더해 시안 · 미리보기 켜기 · 검사 · 저장 · 검토 요청 · 나머지 버리기를 **기록만** 하고 답한다.
 * AI 도 git 도 돌지 않는다. 미리보기 켜기를 받으면 그 시안의 화면을 준비된 것으로 바꾼다.
 */
async function fakeVariantServer(
  page: Page,
  initial: Record<string, unknown>[],
  extra: { queue?: unknown[]; activeRun?: unknown } = {},
) {
  const calls: Recorded[] = [];
  let list = initial.map((w) => ({ ...w }));
  const find = (id: string) => list.find((w) => w.id === id);
  await page.route("**/__lab/agent/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = `${url.pathname.replace("/__lab/agent", "")}${url.search}`;
    const method = request.method();
    if (method !== "GET") calls.push({ method, path, body: request.postDataJSON() ?? null });
    const status = {
      available: { claude: true, codex: false, gh: true },
      versions: { claude: "test", codex: null, gh: "test" },
      git: { branch: "main", dirty: false, dirtyFiles: [] },
      baseBranch: "main",
      activeRun: extra.activeRun ?? null,
      queue: extra.queue ?? [],
      maxVariants: 3,
      maxPreviews: 4,
      workspaces: list,
    };
    if (method === "GET" && path === "/status") return route.fulfill({ json: status });
    if (method === "GET" && path === "/workspaces")
      return route.fulfill({ json: { workspaces: list } });
    if (method === "POST" && path === "/variants")
      return route.fulfill({
        status: 202,
        json: { group: { id: "g9", total: 3, route: "/home" }, workspaces: [] },
      });
    const m = /^\/workspaces\/([^/?]+)(?:\/([a-z]+))?/.exec(path);
    const ws = m ? find(m[1]!) : undefined;
    if (method === "POST" && ws && m?.[2] === "preview") {
      Object.assign(ws, {
        preview: { status: "ready", port: 8109, url: VARIANT_URL, ready: true, error: null },
      });
      return route.fulfill({ json: ws.preview });
    }
    if (method === "POST" && ws && m?.[2] === "check")
      return route.fulfill({
        status: 202,
        json: {
          check: { status: "pass", message: "PASS", findings: null, startedAt: 0, endedAt: 1 },
        },
      });
    if (method === "POST" && ws && m?.[2] === "commit") {
      Object.assign(ws, { status: "committed", changedCount: 0, commitCount: 1 });
      return route.fulfill({
        json: { commit: { sha: "abc1234", subject: "feat: 홈 시안 1" }, workspace: ws },
      });
    }
    if (method === "POST" && ws && m?.[2] === "pr") {
      Object.assign(ws, {
        status: "pr",
        pr: { number: 77, url: "https://github.com/x/y/pull/77" },
      });
      return route.fulfill({ json: { pr: ws.pr, pushedOnly: false, workspace: ws } });
    }
    if (method === "DELETE" && path.startsWith("/variants/g1?keep=")) {
      const keep = url.searchParams.get("keep");
      const removed = list.filter((w) => w.id !== keep && w.group).map((w) => String(w.id));
      list = list.filter((w) => !removed.includes(String(w.id)));
      return route.fulfill({ json: { kept: keep, removed } });
    }
    if (method === "GET" && ws && !m?.[2])
      return route.fulfill({
        json: {
          workspace: ws,
          changes: {
            files: [{ status: "M", path: "app/(tabs)/home.tsx" }],
            fileCount: Number(ws.changedCount ?? 0),
            diffStat: "",
            commits: [],
            newRoutes: [],
            newAssets: [],
          },
          run: null,
          history: [],
          blocks: {
            commitMessage: "feat: 홈 카드를 시안 1 로 고친다",
            prBody: "## 변경 목적\n시안 1",
          },
          check: null,
          baseOptions: ["main"],
        },
      });
    if (method !== "GET")
      return route.fulfill({ status: 409, json: { error: "테스트에서는 실행하지 않아요" } });
    return route.fulfill({ status: 404, json: { error: "없는 경로예요" } });
  });
  // 브라우저 대화 상자(confirm · alert)는 쓰지 않는다 — 뜨면 실패
  page.on("dialog", (dialog) => {
    throw new Error(`브라우저 대화 상자가 떴다: ${dialog.message()}`);
  });
  return calls;
}

test("「시안 개수」 — 3 을 고르면 같은 지시를 시안 3개로(POST /variants · count 3)", async ({
  page,
}) => {
  const calls = await fakeVariantServer(page, []);
  await page.goto("/#/screens?route=/home&panel=agent");
  const counts = page.getByRole("group", { name: "시안 개수" });
  await expect(counts).toContainText("시안 개수");
  await expect(counts.getByRole("button", { name: "1개" })).toHaveAttribute("aria-pressed", "true");
  await counts.getByRole("button", { name: "3개" }).click();
  await expect(page.getByText("같은 지시로 방향이 다른 시안 3개를 따로 만들어요")).toBeVisible();
  const go = page.getByRole("button", { name: "시안 3개 만들기 맡기기" });
  // 시안도 할 말이 없으면 못 보낸다
  await expect(go).toBeDisabled();
  await expect(page.getByTestId("agent-ask-hint")).toBeVisible();
  await page.getByRole("textbox", { name: "무엇을 바꿀까요?" }).fill("카드를 더 눈에 띄게");
  await go.click();
  await expect.poll(() => calls.filter((c) => c.path === "/variants").length).toBe(1);
  const sent = calls.find((c) => c.path === "/variants")!.body as Record<string, unknown>;
  expect(sent.count).toBe(3);
  expect(sent.target).toMatchObject({ kind: "edit", route: "/home" });
  expect(String(sent.instruction)).toMatch(
    /^\[화면\] 홈 \(12 · 12-b\) · \/home\n\[파일\] app\/\(tabs\)\/home\.tsx\n\[환경\] .+\n지시: 카드를 더 눈에 띄게$/,
  );
  expect(calls.some((c) => c.path === "/run")).toBe(false);
});

test("시안 비교 — 기존 + 시안 3대 · 이름 · 상태 · 꺼진 화면은 켠다 · 「이 시안 고르기」 → 최종 A/B · 다른 시안 다시 보기", async ({
  page,
}) => {
  const calls = await fakeVariantServer(page, [
    member(1),
    member(2, { preview: { status: "stopped", port: null, url: null, ready: false, error: null } }),
    member(3, {
      status: "working",
      lastRun: { status: "running", agent: "claude", error: null },
      summaryLine: null,
      preview: null,
    }),
  ]);
  await page.goto("/#/screens?route=/home&layout=variants&group=g1");
  await expect(page.getByRole("tab", { name: "시안 비교" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByTestId("frame-label-V0")).toHaveAttribute("title", "기존 · 지금 앱");
  for (const i of [1, 2, 3])
    await expect(page.getByTestId(`frame-label-V${i}`)).toHaveAttribute("title", `시안 ${i}`);
  await expect(page.getByTestId("frame-state-V0")).toHaveText("화면 상태: 기록 보통");
  await expect(page.getByTestId("frame-state-V1")).toHaveText("준비됨 · 방향: 시안 1 의 방향");
  await expect(page.getByTestId("frame-state-V3")).toHaveText("만드는 중");
  await expect(page.getByTestId("variant-placeholder-V3")).toHaveText(
    "AI가 이 시안을 만드는 중이에요",
  );
  await expect(page.getByTestId("variants-progress")).toHaveText(
    "시안 1 다 만듦 · 시안 2 다 만듦 · 시안 3 만드는 중",
  );
  await expect(page.getByTestId("cross-origin-note")).toHaveText(
    "시안 화면은 다른 서버라 돋보기는 「기존」에만 써요",
  );
  // 기존은 이 서버, 시안은 그 작업 공간의 수정 결과 화면(다른 출처) — 같은 화면 · 같은 상태
  await expect(page.getByTestId("lab-frame-V0")).toHaveAttribute("src", "/home");
  await expect(page.getByTestId("lab-frame-V1")).toHaveAttribute("src", `${VARIANT_URL}/home`);
  expect(await frameConfig(page, "V1")).toMatchObject({
    datasetId: "normal",
    shellOrigin: new URL(page.url()).origin,
  });
  // 꺼져 있던 시안 2 는 열자마자 켠다 → 준비되면 폰이 붙는다
  await expect
    .poll(() => calls.some((c) => c.method === "POST" && c.path === "/workspaces/home-s2/preview"))
    .toBe(true);
  expect(calls.some((c) => c.path === "/workspaces/home-s1/preview")).toBe(false);
  await expect(page.getByTestId("lab-frame-V2")).toHaveAttribute("src", `${VARIANT_URL}/home`, {
    timeout: 15_000,
  });
  await expect(page.getByTestId("variant-pick-3")).toBeDisabled();
  await expect(page.getByText("모두 함께 이동")).toBeVisible();

  await page.getByTestId("variant-pick-1").click();
  await expect(page).toHaveURL(/layout=ab/);
  await expect(page).toHaveURL(/group=g1/);
  await expect(page.getByTestId("frame-label-B")).toHaveAttribute(
    "title",
    "B · 시안 1 (AI 수정 결과)",
  );
  await expect(page.getByTestId("lab-frame-B")).toHaveAttribute("src", `${VARIANT_URL}/home`);
  await expect(page.getByTestId("ab-banner-text")).toContainText("고른 「시안 1」(시안 3개 중)");
  await page.getByRole("button", { name: "← 다른 시안 다시 보기" }).click();
  await expect(page).toHaveURL(/layout=variants/);
  await expect(page.getByTestId("frame-label-V3")).toBeVisible();
});

test("최종 A/B — 「이 시안으로 확정」이 검사 · 저장 · 검토 요청을 차례로 · 「나머지 시안 버리기」는 줄 안 확인 뒤에만", async ({
  page,
}) => {
  const calls = await fakeVariantServer(page, [member(1), member(2), member(3)]);
  await page.goto("/#/screens?route=/home&layout=variants&group=g1");
  await page.getByTestId("variant-pick-1").click();
  await expect(page.getByTestId("variant-decision")).toBeVisible();
  // 확정 전에는 나머지를 버릴 수 없다
  await expect(page.getByRole("button", { name: "나머지 시안 버리기" })).toHaveCount(0);
  await page.getByRole("button", { name: "이 시안으로 확정" }).click();
  await expect(page.getByRole("textbox", { name: "저장 메시지" })).toHaveValue(
    "feat: 홈 카드를 시안 1 로 고친다",
  );
  await expect(page.getByRole("textbox", { name: "검토 요청 제목" })).toHaveValue(
    "feat: 홈 카드를 시안 1 로 고친다",
  );
  await page.getByRole("button", { name: "저장하고 검토 요청 올리기" }).click();
  await expect(page.getByTestId("variant-confirmed")).toContainText("확정했어요 — 시안 1");
  await expect(page.getByTestId("variant-confirmed")).toContainText("검토 요청 #77 열기");
  const steps = calls.filter((c) => c.method === "POST").map((c) => c.path);
  expect(steps).toEqual([
    "/workspaces/home-s1/check",
    "/workspaces/home-s1/commit",
    "/workspaces/home-s1/pr",
  ]);
  expect(calls.find((c) => c.path.endsWith("/commit"))!.body).toEqual({
    message: "feat: 홈 카드를 시안 1 로 고친다",
  });
  expect(calls.find((c) => c.path.endsWith("/pr"))!.body).toMatchObject({
    title: "feat: 홈 카드를 시안 1 로 고친다",
    base: "main",
  });
  expect(calls.some((c) => c.path.includes("merge"))).toBe(false);

  await page.getByRole("button", { name: "나머지 시안 버리기" }).click();
  const confirm = page.getByTestId("variant-discard-confirm");
  await expect(confirm).toContainText("시안 2 · 시안 3의 작업 공간과 수정 결과 화면이 사라져요");
  expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  await confirm.getByRole("button", { name: "그만두기" }).click();
  expect(calls.some((c) => c.method === "DELETE")).toBe(false);
  await page.getByRole("button", { name: "나머지 시안 버리기" }).click();
  await page.getByTestId("variant-discard-confirm").getByRole("button", { name: "버리기" }).click();
  await expect(page.getByText("나머지 시안을 버렸어요")).toBeVisible();
  const deletes = calls.filter((c) => c.method === "DELETE");
  expect(deletes.map((c) => c.path)).toEqual(["/variants/g1?keep=home-s1"]);
});

test.describe("시안 비교 (실제 앱 프레임)", () => {
  test.skip(!process.env.LAB_FRAMES, "LAB_FRAMES=1 일 때만 — 프레임 안에 실제 앱이 떠야 한다");

  test("다른 출처의 시안 폰도 셸에 말한다 — 준비 · 모두 함께 이동(목록 배지)", async ({ page }) => {
    await fakeVariantServer(page, [member(1), member(2)]);
    await page.goto("/#/screens?route=/home&layout=variants&group=g1");
    for (const id of ["V0", "V1", "V2"])
      await expect(page.getByTestId(`lab-frame-${id}`)).toHaveAttribute("data-ready", "1", {
        timeout: 90_000,
      });
    const tree = page.getByTestId("route-tree");
    await tree.locator('[data-route="/report"]').click();
    const row = tree.locator('[data-route="/report"]');
    await expect(row.getByTestId("route-badge-V0")).toHaveText("기존", { timeout: 30_000 });
    // data-ready = 다른 출처 시안 폰의 lab:ready 가 셸에 닿았다. 목록에서 고르면 셋 다 /report 로 —
    // 폰이 셋이면 배지는 첫 하나 + 「+2」
    await expect(row.getByTestId("route-badge-more")).toHaveText("+2", { timeout: 30_000 });
    await expect(row.getByTestId("route-badge-more")).toHaveAttribute("title", /시안1 · 시안2/);
    await expect(page.getByTestId("lab-frame-V1")).toHaveAttribute("src", `${VARIANT_URL}/home`);
  });
});
