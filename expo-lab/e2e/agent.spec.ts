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

/** `/__lab/agent/*` 를 가짜로 — 읽기만 답하고, 실행 · 저장 같은 POST 는 막는다 */
async function fakeAgentServer(page: Page, workspaces: Record<string, unknown>[]) {
  await page.route("**/__lab/agent/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace("/__lab/agent", "");
    if (request.method() !== "GET") {
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
}

const frameConfig = async (page: Page, frameId: string) => {
  const name = await page.getByTestId(`lab-frame-${frameId}`).getAttribute("name");
  return JSON.parse(name!.slice("momentory-lab:".length)) as Record<string, unknown>;
};

test("「AI에게 맡기기」 탭 — 지금 화면 · 파일 · 기기 · 데이터가 지시 칸에 미리 채워진다", async ({
  page,
}) => {
  await fakeAgentServer(page, []);
  await page.goto("/#/screens?route=/home");
  await page.getByRole("tab", { name: "AI에게 맡기기" }).click();
  await expect(page).toHaveURL(/panel=agent/);
  const input = page.getByRole("textbox", { name: "AI 에게 할 말" });
  await expect(input).toBeVisible();
  const text = await input.inputValue();
  expect(text).toContain("[화면] 홈 (12 · 12-b) · /home");
  expect(text).toContain("[파일] app/(tabs)/home.tsx");
  expect(text).toContain("[환경] iPhone 16 (ios) · 데이터 보통");
  expect(text).not.toContain("[시안]");
  expect(text.trimEnd().endsWith("지시:")).toBe(true);
  // 다른 화면을 고르면 머리말이 따라간다
  await page.getByTestId("route-tree").locator('[data-route="/rest"]').click();
  await expect(input).toHaveValue(/\[화면\] 쉼터 \(R1\) · \/rest/);
  // 다른 탭을 보고 와도 적던 지시가 남는다
  // (지시 칸은 포커스 때 커서를 「지시: 」 뒤로 옮긴다 — 끝에 이어 쓴다)
  await input.click();
  await input.press("End");
  await input.pressSequentially("카드 간격 넓혀줘");
  await expect(input).toHaveValue(/지시: 카드 간격 넓혀줘$/);
  await page.getByRole("tab", { name: "화면 조건" }).click();
  await page.getByRole("tab", { name: "AI에게 맡기기" }).click();
  await expect(input).toHaveValue(/지시: 카드 간격 넓혀줘$/);
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
  await expect(page.getByRole("textbox", { name: "영문 이름" })).toBeVisible();
  // 「새 화면 만들기」에 있는 동안 탭 줄은 「AI에게 맡기기」가 눌려 있다
  await expect(page.getByRole("tab", { name: "AI에게 맡기기" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "← 이 화면 고치기로" }).click();
  await expect(page.getByRole("textbox", { name: "AI 에게 할 말" })).toBeVisible();
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
