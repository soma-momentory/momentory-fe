/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, type ReactNode } from "react";

import {
  AgentPanel,
  buildInstructionHeader,
  instructionBody,
  type AgentScreen,
} from "../AgentPanel";
import type { AgentClient, RunEvents } from "../client";
import { NewScreenForm } from "../NewScreenForm";
import type {
  AgentStatus,
  CheckState,
  RunSnapshot,
  WorkspaceDetail,
  WorkspaceSummary,
} from "../types";

type Root = { render(node: ReactNode): void; unmount(): void };
// react-dom 은 타입 패키지(@types/react-dom)가 없다 — 테스트에서 쓰는 모양만 적는다
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createRoot } = require("react-dom/client") as { createRoot: (el: Element) => Root };

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const screenInfo: AgentScreen = {
  route: "/(tabs)/home",
  title: "홈",
  file: "app/(tabs)/home.tsx",
  specId: "12",
  device: { label: "iPhone 16", platform: "ios" },
  datasetLabel: "보통",
};

const baseStatus = (patch: Partial<AgentStatus> = {}): AgentStatus => ({
  available: { claude: true, codex: false, gh: true },
  versions: { claude: "2.1.316 (Claude Code)", codex: null, gh: "gh 2.97.0" },
  git: { branch: "main", dirty: false, dirtyFiles: [] },
  baseBranch: "main",
  activeRun: null,
  workspaces: [],
  ...patch,
});

const ws = (patch: Partial<WorkspaceSummary> = {}): WorkspaceSummary => ({
  id: "tabs-home",
  kind: "edit",
  route: "/(tabs)/home",
  title: "홈",
  file: "app/(tabs)/home.tsx",
  specId: "12",
  slug: null,
  section: null,
  branch: "lab/tabs-home-20261102-2130",
  baseBranch: "main",
  path: "C:\\ws\\tabs-home",
  createdAt: "2026-11-02T12:30:00.000Z",
  status: "edited",
  changedCount: 1,
  commitCount: 0,
  newRoutes: [],
  pr: null,
  broken: null,
  session: { agent: "claude" },
  lastRun: { status: "done", agent: "claude", error: null },
  check: null,
  preview: { status: "ready", port: 8100, url: "http://localhost:8100", ready: true, error: null },
  ...patch,
});

const doneRun: RunSnapshot = {
  id: "r1",
  workspaceId: "tabs-home",
  agent: "claude",
  resumed: false,
  status: "done",
  startedAt: 0,
  endedAt: 1000,
  exitCode: 0,
  summary: "카드 간격을 넓혔어요.",
  error: null,
  sessionId: "sess-1",
  blocks: { commitMessage: "feat: 홈 카드 간격을 넓힌다", prBody: "## 변경 목적" },
  logPath: "x.log",
  lastSeq: 2,
  result: {
    summary: "카드 간격을 넓혔어요.",
    changedScreens: ["/(tabs)/home"],
    commitMessage: "feat: 홈 카드 간격을 넓힌다",
    prBody: "## 변경 목적",
    neededImages: [{ what: "바바 손 흔들기", size: "120×120", where: "홈 카드 오른쪽 위" }],
    neededApis: [],
    skipped: [{ request: "탭바 모양 바꾸기", reason: "DESIGN.md 와 부딪힌다" }],
  },
};

const detailOf = (
  summary: WorkspaceSummary,
  run: RunSnapshot | null = doneRun,
): WorkspaceDetail => ({
  workspace: summary,
  changes: {
    files: [{ status: "M", path: "app/(tabs)/home.tsx" }],
    fileCount: 1,
    diffStat: " app/(tabs)/home.tsx | 2 +-",
    commits: [],
    newRoutes: [],
    newAssets: ["assets/images/baba.png"],
  },
  run,
  history: run ? [run] : [],
  blocks: { commitMessage: "feat: 홈 카드 간격을 넓힌다", prBody: "## 변경 목적" },
  check: null,
  baseOptions: ["main"],
});

const ok = <T,>(data: T) => Promise.resolve({ ok: true as const, data });

function makeClient(status: AgentStatus, detail?: WorkspaceDetail) {
  const subs: RunEvents[] = [];
  const client = {
    status: jest.fn(() => ok(status)),
    workspace: jest.fn(() =>
      detail ? ok(detail) : Promise.resolve({ ok: false as const, error: "없음", status: 404 }),
    ),
    run: jest.fn(() =>
      ok({ workspace: ws({ status: "working" }), run: { ...doneRun, status: "running" as const } }),
    ),
    continueRun: jest.fn(() =>
      ok({ workspace: ws({ status: "working" }), run: { ...doneRun, status: "running" as const } }),
    ),
    stop: jest.fn(() => ok({ run: null })),
    startCheck: jest.fn(() =>
      ok({
        check: {
          status: "pass",
          message: "PASS",
          findings: null,
          startedAt: 0,
          endedAt: 1,
        } as CheckState,
      }),
    ),
    check: jest.fn(() => ok({ check: null })),
    stopCheck: jest.fn(() => ok({ check: null })),
    commit: jest.fn(() =>
      ok({
        commit: { sha: "abc1234", subject: "feat: 홈 카드 간격을 넓힌다" },
        workspace: ws({ status: "committed" }),
      }),
    ),
    pr: jest.fn(() =>
      ok({
        pr: { number: 42, url: "https://github.com/x/y/pull/42" },
        pushedOnly: false,
        workspace: ws({ status: "pr" }),
      }),
    ),
    startPreview: jest.fn(() =>
      ok({
        status: "starting",
        port: 8100,
        url: "http://localhost:8100",
        ready: false,
        error: null,
      } as const),
    ),
    remove: jest.fn(() => ok({ ok: true as const })),
    imageUrl: (id: string, p: string) => `/__lab/agent/workspaces/${id}/image?path=${p}`,
    subscribe: jest.fn((_id: string, _since: number, events: RunEvents) => {
      subs.push(events);
      return () => {};
    }),
  };
  return { client: client as unknown as AgentClient & typeof client, subs };
}

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  jest.useFakeTimers();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  jest.useRealTimers();
});

/** 효과 · 약속이 다 돌게 한다 */
async function settle() {
  for (let i = 0; i < 4; i += 1) {
    await act(async () => {
      jest.advanceTimersByTime(10);
      await Promise.resolve();
    });
  }
}

const buttons = () => [...container.querySelectorAll("button")];
const button = (name: string) => {
  const found = buttons().find((b) => b.textContent?.trim() === name);
  if (!found)
    throw new Error(
      `버튼 「${name}」 없음 — ${buttons()
        .map((b) => b.textContent)
        .join(" | ")}`,
    );
  return found;
};
const text = () => container.textContent ?? "";

function typeInto(el: HTMLTextAreaElement | HTMLInputElement, value: string) {
  const proto =
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value")?.set?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

async function click(el: HTMLElement) {
  await act(async () => {
    el.click();
  });
  await settle();
}

describe("머리말", () => {
  it("화면 · 파일 · 환경 · 시안을 채우고 「지시: 」 로 끝난다", () => {
    const header = buildInstructionHeader(
      screenInfo,
      { name: "버튼 둥글게", changeCount: 3 },
      true,
    );
    expect(header).toBe(
      [
        "[화면] 홈 (12) · /(tabs)/home",
        "[파일] app/(tabs)/home.tsx",
        "[환경] iPhone 16 (ios) · 데이터 보통",
        "[시안] 「버튼 둥글게」 바꾼 값 3개 · 참고 시안 이미지 있음",
        "지시: ",
      ].join("\n"),
    );
    expect(instructionBody(`${header}카드 간격 넓혀줘`)).toBe("카드 간격 넓혀줘");
    expect(instructionBody(header)).toBe("");
  });
});

describe("AgentPanel", () => {
  it("작업 공간이 없으면 한 줄 안내 · 할 말이 없으면 못 누른다 · 보내면 run(화면 · 지시 · 시안)", async () => {
    const { client } = makeClient(baseStatus());
    const buildHandoff = jest.fn(() => Promise.resolve({ format: "momentory-lab-handoff@1" }));
    await act(async () => {
      root.render(
        <AgentPanel
          screen={screenInfo}
          draft={{ name: "버튼", changeCount: 2 }}
          hasReference={false}
          buildHandoff={buildHandoff}
          client={client}
        />,
      );
    });
    await settle();
    expect(text()).toContain("지시를 보내면 이 화면용 작업 공간을 만들어요");
    expect(text()).toContain("이 PC 에 로그인된 Claude Code · Codex 로 실행해요");
    const textarea = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="AI 에게 할 말"]',
    );
    expect(textarea?.value.endsWith("지시: ")).toBe(true);
    expect(textarea?.value).toContain("[시안] 「버튼」 바꾼 값 2개");
    // Codex 는 이 PC 에 없다 → 고를 수 없다
    expect(button("Codex").disabled).toBe(true);
    // 시안이 있으면 지시 없이도 보낼 수 있다
    expect(button("AI에게 수정 맡기기").disabled).toBe(false);

    await act(async () => typeInto(textarea!, `${textarea!.value}카드 간격을 넓혀줘`));
    await click(button("AI에게 수정 맡기기"));
    expect(buildHandoff).toHaveBeenCalled();
    expect(client.run).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: "claude",
        target: expect.objectContaining({ kind: "edit", route: "/(tabs)/home", specId: "12" }),
        instruction: expect.stringContaining("지시: 카드 간격을 넓혀줘"),
        handoff: { format: "momentory-lab-handoff@1" },
        attachments: [],
      }),
    );
  });

  it("시안도 할 말도 없으면 「AI에게 수정 맡기기」를 누를 수 없다", async () => {
    const { client } = makeClient(baseStatus());
    await act(async () =>
      root.render(
        <AgentPanel screen={screenInfo} draft={null} hasReference={false} client={client} />,
      ),
    );
    await settle();
    expect(button("AI에게 수정 맡기기").disabled).toBe(true);
  });

  it("다른 화면에서 AI 가 돌면 막고 「그 작업 보기」", async () => {
    const other = ws({
      id: "new-sleep-log",
      kind: "new-screen",
      route: null,
      title: "잠 기록",
      status: "working",
    });
    const { client } = makeClient(
      baseStatus({
        activeRun: {
          workspaceId: "new-sleep-log",
          title: "잠 기록",
          agent: "claude",
          startedAt: 0,
        },
        workspaces: [other],
      }),
      detailOf(other, { ...doneRun, status: "running", workspaceId: "new-sleep-log" }),
    );
    const onOpenWorkspace = jest.fn();
    await act(async () =>
      root.render(
        <AgentPanel
          screen={screenInfo}
          draft={{ name: "x", changeCount: 1 }}
          hasReference={false}
          client={client}
          onOpenWorkspace={onOpenWorkspace}
        />,
      ),
    );
    await settle();
    expect(text()).toContain("다른 화면(잠 기록)에서 AI가 작업 중이에요");
    expect(button("AI에게 수정 맡기기").disabled).toBe(true);
    await click(button("그 작업 보기"));
    expect(onOpenWorkspace).toHaveBeenCalledWith(other);
    expect(text()).toContain("다른 작업 1개");
  });

  it("작업 공간 카드 — 결과 · 하지 않은 것 · 더 필요한 그림 · 바뀐 파일 · 새 그림 · 수정 결과 보기", async () => {
    const summary = ws();
    const { client } = makeClient(baseStatus({ workspaces: [summary] }), detailOf(summary));
    await act(async () =>
      root.render(
        <AgentPanel screen={screenInfo} draft={null} hasReference={false} client={client} />,
      ),
    );
    await settle();
    expect(button("이어서 맡기기")).toBeTruthy();
    expect(text()).toContain("수정됨 · 저장 전");
    expect(text()).toContain("작업 이름 lab/tabs-home-20261102-2130");
    expect(text()).toContain("카드 간격을 넓혔어요.");
    expect(text()).toContain("하지 않은 것");
    expect(text()).toContain("탭바 모양 바꾸기");
    expect(text()).toContain("더 필요한 그림");
    expect(text()).toContain("바뀐 파일 1개");
    expect(
      container.querySelector('img[alt="assets/images/baba.png"]')?.getAttribute("src"),
    ).toContain("/image?path=assets/images/baba.png");
    expect(button("수정 결과 보기")).toBeTruthy();
    expect(button("이 작업 버리기")).toBeTruthy();
  });

  it("수정 저장(커밋) — 검사가 통과하면 바로 저장한다", async () => {
    const summary = ws();
    const { client } = makeClient(baseStatus({ workspaces: [summary] }), detailOf(summary));
    await act(async () =>
      root.render(
        <AgentPanel screen={screenInfo} draft={null} hasReference={false} client={client} />,
      ),
    );
    await settle();
    const message = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="저장 메시지"]',
    );
    expect(message?.value).toBe("feat: 홈 카드 간격을 넓힌다");
    await click(button("수정 저장(커밋)"));
    expect(client.startCheck).toHaveBeenCalledWith("tabs-home");
    expect(client.commit).toHaveBeenCalledWith("tabs-home", "feat: 홈 카드 간격을 넓힌다");
    expect(text()).toContain("저장했어요 — abc1234");
  });

  it("수정 저장(커밋) — 지적이 나오면 목록 · 「AI에게 고치게 하기」는 지적을 붙여 이어서 맡긴다", async () => {
    const summary = ws();
    const { client } = makeClient(baseStatus({ workspaces: [summary] }), detailOf(summary));
    client.startCheck.mockImplementation(() =>
      ok({
        check: {
          status: "findings",
          message: "고칠 것",
          findings: "1. [P1] app/(tabs)/home.tsx\n   문제: 하드코딩",
          startedAt: 0,
          endedAt: 1,
        } as CheckState,
      }),
    );
    await act(async () =>
      root.render(
        <AgentPanel screen={screenInfo} draft={null} hasReference={false} client={client} />,
      ),
    );
    await settle();
    await click(button("수정 저장(커밋)"));
    expect(client.commit).not.toHaveBeenCalled();
    expect(text()).toContain("저장 전 검사에서 고칠 것이 나왔어요");
    expect(text()).toContain("[P1] app/(tabs)/home.tsx");
    expect(button("그래도 저장")).toBeTruthy();
    expect(button("취소")).toBeTruthy();
    await click(button("AI에게 고치게 하기"));
    expect(client.continueRun).toHaveBeenCalledWith(
      "tabs-home",
      expect.objectContaining({
        agent: "claude",
        instruction: expect.stringContaining("[P1] app/(tabs)/home.tsx"),
      }),
    );
  });

  it("실행이 끝나면 알린다 — 알림이 없으면 탭 제목에 ✓", async () => {
    const summary = ws({ status: "working" });
    const running = { ...doneRun, status: "running" as const };
    const { client, subs } = makeClient(
      baseStatus({ workspaces: [summary] }),
      detailOf(summary, running),
    );
    document.title = "Momentory Lab";
    await act(async () =>
      root.render(
        <AgentPanel screen={screenInfo} draft={null} hasReference={false} client={client} />,
      ),
    );
    await settle();
    expect(button("AI 멈추기")).toBeTruthy();
    await act(async () => {
      subs.at(-1)?.onLine({ seq: 1, t: 0, kind: "tool", text: "$ npm run typecheck" });
      subs.at(-1)?.onLine({ seq: 2, t: 0, kind: "text", text: "고치는 중이에요" });
      subs.at(-1)?.onRun(running);
    });
    expect(text()).toContain("고치는 중이에요");
    expect(text()).toContain("한 일 1개");
    await act(async () => subs.at(-1)?.onRun(doneRun));
    await settle();
    expect(document.title).toBe("✓ Momentory Lab");
  });
});

describe("NewScreenForm", () => {
  it("이름 · 영문 이름 · 설명을 채워야 보낼 수 있고, 보내면 new-screen 으로 run", async () => {
    const { client } = makeClient(baseStatus());
    client.run.mockImplementation(() =>
      ok({
        workspace: ws({ id: "new-sleep-log", kind: "new-screen", route: null, title: "잠 기록" }),
        run: { ...doneRun, status: "running" as const },
      }),
    );
    await act(async () => root.render(<NewScreenForm client={client} />));
    await settle();
    const go = () => button("AI에게 새 화면 만들기 맡기기");
    expect(go().disabled).toBe(true);
    await act(async () => {
      typeInto(
        container.querySelector<HTMLInputElement>('input[aria-label="화면 이름"]')!,
        "잠 기록",
      );
      typeInto(
        container.querySelector<HTMLInputElement>('input[aria-label="영문 이름"]')!,
        "Sleep Log",
      );
      typeInto(
        container.querySelector<HTMLTextAreaElement>('textarea[aria-label="어떤 화면인지"]')!,
        "잠든 시각을 적는다",
      );
    });
    expect(text()).toContain("이렇게 쓰여요: sleep-log");
    await click(button("쉼터"));
    expect(go().disabled).toBe(false);
    await click(go());
    expect(client.run).toHaveBeenCalledWith(
      expect.objectContaining({
        target: {
          kind: "new-screen",
          slug: "sleep-log",
          title: "잠 기록",
          parentSection: "rest",
          description: "잠든 시각을 적는다",
        },
      }),
    );
  });
});
