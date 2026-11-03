import { describe, expect, it } from "@jest/globals";

import type { WorkspaceSummary } from "../../agent/types";
import {
  groupProgress,
  pickGroup,
  shouldStartPreview,
  slotState,
  variantGroups,
} from "../../agent/variants";
import { framesFor, variantSpecs } from "../frameSpecs";
import { DEFAULT_STATE, LAYOUTS, parseHash, serializeHash } from "../hashState";
import { fitScale } from "../stageFit";

const REAL = Date.parse("2026-11-02T14:05:00+09:00");
const noSample = () => ({});
const SHELL = "http://127.0.0.1:8085";

const ws = (patch: Partial<WorkspaceSummary> = {}): WorkspaceSummary => ({
  id: "home-s1",
  kind: "edit",
  route: "/home",
  title: "홈 · 시안 1",
  file: "app/(tabs)/home.tsx",
  specId: null,
  slug: null,
  section: null,
  branch: "lab/home-s1",
  baseBranch: "main",
  path: "C:/ws/home-s1",
  createdAt: "2026-11-02T12:00:00.000Z",
  status: "edited",
  changedCount: 1,
  commitCount: 0,
  newRoutes: [],
  pr: null,
  broken: null,
  session: null,
  lastRun: { status: "done", agent: "claude", error: null },
  check: null,
  preview: { status: "ready", port: 8101, url: "http://localhost:8101", ready: true, error: null },
  group: { id: "g1", index: 1, total: 3, createdAt: "2026-11-02T12:00:00.000Z" },
  summaryLine: "방향: 정석",
  ...patch,
});

const member = (index: number, patch: Partial<WorkspaceSummary> = {}) =>
  ws({
    id: `home-s${index}`,
    title: `홈 · 시안 ${index}`,
    group: { id: "g1", index, total: 3, createdAt: "2026-11-02T12:00:00.000Z" },
    preview: {
      status: "ready",
      port: 8100 + index,
      url: `http://localhost:${8100 + index}`,
      ready: true,
      error: null,
    },
    ...patch,
  });

describe("시안 비교 — 해시", () => {
  it("layout=variants · group 이 해시를 한 바퀴 돈다", () => {
    const state = { ...DEFAULT_STATE, layout: "variants" as const, group: "gmhabc12" };
    const hash = serializeHash(state);
    expect(hash).toContain("layout=variants");
    expect(hash).toContain("group=gmhabc12");
    expect(parseHash(hash)).toEqual(state);
  });

  it("묶음이 없으면 적지 않고, 이상한 묶음 id 는 버린다", () => {
    expect(serializeHash({ ...DEFAULT_STATE, layout: "variants" })).not.toContain("group=");
    expect(parseHash("#/screens?route=/home&layout=variants&group=a/b<c").group).toBeNull();
  });

  it("위 탭에 「시안 비교」가 있다", () => {
    expect(LAYOUTS.find((l) => l.id === "variants")?.label).toBe("시안 비교");
  });
});

describe("시안 비교 — 프레임", () => {
  const state = { ...DEFAULT_STATE, layout: "variants" as const, group: "g1" };

  it("묶음이 없으면 기존(지금 앱) 하나", () => {
    const specs = variantSpecs(state, null, SHELL, noSample, REAL);
    expect(specs.map((s) => [s.frameId, s.label])).toEqual([["V0", "기존 · 지금 앱"]]);
    expect(framesFor(state, noSample, REAL).map((s) => s.frameId)).toEqual(["V0"]);
  });

  it("기존 + 시안마다 한 대 — 같은 라우트 · 같은 상태, 시안은 그 미리보기 서버(다른 출처)에서", () => {
    const group = variantGroups([member(1), member(2), member(3)])[0]!;
    const specs = variantSpecs(
      { ...state, dataset: "many", latencyMs: 1000 },
      group,
      SHELL,
      noSample,
      REAL,
    );
    expect(specs.map((s) => s.frameId)).toEqual(["V0", "V1", "V2", "V3"]);
    expect(specs.map((s) => s.label)).toEqual(["기존 · 지금 앱", "시안 1", "시안 2", "시안 3"]);
    expect(specs[0]!.origin).toBeUndefined();
    expect(specs[2]!.origin).toBe("http://localhost:8102");
    expect(specs[2]!.config).toMatchObject({
      frameId: "V2",
      datasetId: "many",
      latencyMs: 1000,
      shellOrigin: SHELL,
    });
    expect(specs[2]!.preview).toMatchObject({
      workspaceId: "home-s2",
      route: null,
      variant: { groupId: "g1", index: 2, total: 3 },
    });
    expect(specs[2]!.variant).toMatchObject({
      index: 2,
      label: "준비됨",
      summaryLine: "방향: 정석",
    });
    expect(new Set(specs.map((s) => s.route.path))).toEqual(new Set(["/home"]));
  });

  it("화면을 띄울 수 없는 시안은 iframe 대신 한 줄 — 만드는 중 · 시작하는 중 · 켜는 중 · 실패", () => {
    const group = variantGroups([
      member(1, { status: "working", preview: null }),
      member(2, { status: "starting", lastRun: null, preview: null }),
      member(3, {
        preview: { status: "starting", port: 8103, url: null, ready: false, error: null },
      }),
    ])[0]!;
    const [, a, b, c] = variantSpecs(state, group, SHELL, noSample, REAL);
    expect([a!.placeholder, b!.placeholder, c!.placeholder]).toEqual([
      "AI가 이 시안을 만드는 중이에요",
      "곧 만들기 시작해요",
      "수정 결과 화면을 켜는 중…",
    ]);
    expect([a!.variant!.label, b!.variant!.label, c!.variant!.label]).toEqual([
      "만드는 중",
      "시작하는 중",
      "준비 중",
    ]);
    expect(a!.origin).toBeUndefined();
  });

  it("시안 비교는 A/B 처럼 한 줄로 맞춘다 — 네 대가 무대 폭에 들어간다", () => {
    const phone = { width: 420, height: 880 };
    const scale = fitScale("variants", { width: 850, height: 800 }, 200, [
      phone,
      phone,
      phone,
      phone,
    ]);
    expect(scale * phone.width * 4 + 32 * 3).toBeLessThanOrEqual(850 - 48);
  });
});

describe("시안 묶음", () => {
  it("묶음별로 모으고 자리 순서 · 새 묶음 먼저 · 깨진 것과 시안 아닌 것은 뺀다", () => {
    const older = member(1, {
      id: "my-s1",
      route: "/my",
      group: { id: "g0", index: 1, total: 2, createdAt: "2026-11-01T00:00:00.000Z" },
    });
    const groups = variantGroups([
      member(3),
      older,
      member(1),
      ws({ id: "plain", group: null }),
      member(2, { broken: "고장" }),
    ]);
    expect(groups.map((g) => g.id)).toEqual(["g1", "g0"]);
    expect(groups[0]!.members.map((m) => m.id)).toEqual(["home-s1", "home-s3"]);
    expect(pickGroup(groups, null, "/my")?.id).toBe("g0");
    expect(pickGroup(groups, "g1", "/my")?.id).toBe("g1");
    expect(pickGroup(groups, "gone", "/home")?.id).toBe("g1");
    expect(pickGroup(groups, null, "/report")).toBeNull();
  });

  it("진행 한 줄 — 다 만듦 · 만드는 중 · 시작하는 중 · 멈춤 · 실패", () => {
    const group = {
      members: [
        member(1),
        member(2, { status: "working" }),
        member(3, { status: "starting", lastRun: null }),
      ],
    };
    expect(groupProgress(group)).toBe("시안 1 다 만듦 · 시안 2 만드는 중 · 시안 3 시작하는 중");
    expect(
      groupProgress({
        members: [
          member(1, {
            lastRun: { status: "failed", agent: null, error: "멈춰서 만들지 않았어요" },
          }),
          member(2, { lastRun: { status: "failed", agent: "claude", error: "x" } }),
        ],
      }),
    ).toBe("시안 1 멈춤 · 시안 2 실패");
  });

  it("시안 비교가 켜는 수정 결과 화면 — 실행이 끝났고 꺼져 있는 것만(실패한 화면은 「다시 켜기」로)", () => {
    const off = { status: "stopped" as const, port: null, url: null, ready: false, error: null };
    expect(shouldStartPreview(member(1, { preview: off }))).toBe(true);
    expect(shouldStartPreview(member(1, { preview: null }))).toBe(true);
    expect(shouldStartPreview(member(1))).toBe(false);
    expect(shouldStartPreview(member(1, { status: "working", preview: null }))).toBe(false);
    expect(shouldStartPreview(member(1, { status: "starting", preview: null }))).toBe(false);
    const failed = member(1, { preview: { ...off, status: "failed", error: "포트 없음" } });
    expect(shouldStartPreview(failed)).toBe(false);
    expect(slotState(failed)).toMatchObject({ label: "실패", note: "포트 없음", canStart: true });
  });
});
