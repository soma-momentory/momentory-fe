/* eslint-disable @typescript-eslint/no-require-imports -- jest.isolateModules 안에서 새 모듈을 부른다 */
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { useState } from "react";

import { TabPaperBackground } from "../../../../src/components/ds/TabPaperBackground";
import { tabBackgroundAssets, tabBackgroundByTab } from "../../../../src/design/tabBackgrounds";
import {
  DEFAULT_FRAME_CONFIG,
  DESIGN_DRAFTS_STORAGE_KEY,
  type DesignDraft,
} from "../../lab-contract";
import { applyDraftToTargets } from "../applyDraft";
import { DesignEditorPanel, DRAFT_CHANGE_DEBOUNCE_MS } from "../DesignEditorPanel";
import { buildHandoff, emptyNotes } from "../handoff";
import {
  loadTabBackgroundTargets,
  setTabBackgrounds,
  TAB_BACKGROUND_TABS,
  tabBackgroundLabel,
  tabBackgroundName,
  tabBackgroundValueError,
  tabForRoute,
} from "../tabBackgrounds";

const draft = (studio: DesignDraft["studio"]): DesignDraft => ({
  id: "d1",
  name: "탭 배경",
  tokens: {},
  studio,
  updatedAt: "2026-11-02T00:00:00.000Z",
});

/** 새 모듈 레지스트리 — 프레임 하나의 새 JS 문맥과 같다 */
function freshFrame(studio: DesignDraft["studio"]) {
  let result!: {
    report: import("../applyDraft").DesignApplyReport;
    byTab: Record<string, string>;
  };
  jest.isolateModules(() => {
    const { applyDesignDraft } = require("../applyDraft") as typeof import("../applyDraft");
    const raw = JSON.stringify([draft(studio)]);
    const report = applyDesignDraft(
      { ...DEFAULT_FRAME_CONFIG, designDraftId: "d1" },
      { getItem: (key: string) => (key === DESIGN_DRAFTS_STORAGE_KEY ? raw : null) },
    );
    result = {
      report,
      byTab: require("../../../../src/design/tabBackgrounds").tabBackgroundByTab,
    };
  });
  return result;
}

const textureOf = async (tab: "홈" | "쉼터") => {
  const view = await render(<TabPaperBackground tab={tab} />);
  const id = view.getByTestId(/^tab-paper-texture-/, { includeHiddenElements: true }).props
    .testID as string;
  await view.unmount();
  return id;
};

describe("탭 배경 — 시안 적용", () => {
  const original = { ...tabBackgroundByTab };
  afterEach(() => {
    Object.assign(tabBackgroundByTab, original);
  });

  it("앱 객체는 얼어 있지 않고, 등록표의 탭이 앱의 탭과 같다", () => {
    expect(Object.isFrozen(tabBackgroundByTab)).toBe(false);
    expect(TAB_BACKGROUND_TABS.map((item) => item.tab).sort()).toEqual(
      Object.keys(tabBackgroundByTab).sort(),
    );
  });

  it("applyDesignDraft 가 tabBackground.<탭> 을 tabBackgroundByTab 에 제자리에서 넣는다", () => {
    const frame = freshFrame({
      "tabBackground.쉼터": "warm-ivory",
      "tabBackground.홈": "soft-olive",
      "home.hero.borderRadius": 24,
    });
    expect(frame.report.skipped).toEqual([]);
    expect(frame.report.applied).toEqual(
      expect.arrayContaining(["tabBackground.쉼터", "tabBackground.홈", "home.hero.borderRadius"]),
    );
    expect(frame.byTab).toMatchObject({
      쉼터: "warm-ivory",
      홈: "soft-olive",
      보관함: "warm-ivory",
    });
    // 이 테스트 파일의 문맥(= 셸)은 그대로 승인값
    expect(tabBackgroundByTab.쉼터).toBe("soft-olive");
  });

  it("앱(TabPaperBackground)은 모듈이 올라온 뒤에 바꿔도 그릴 때 그 값을 읽는다", async () => {
    expect(await textureOf("쉼터")).toBe("tab-paper-texture-soft-olive");
    const report = applyDraftToTargets(draft({ "tabBackground.쉼터": "warm-ivory" }), {
      modules: {},
      studioApproved: {},
      tabBackgrounds: loadTabBackgroundTargets(),
    });
    expect(report.applied).toEqual(["tabBackground.쉼터"]);
    expect(await textureOf("쉼터")).toBe("tab-paper-texture-warm-ivory");
  });

  it("모르는 배경 id · 모르는 탭은 이유와 함께 건너뛴다", () => {
    const frame = freshFrame({
      "tabBackground.쉼터": "night-sky",
      "tabBackground.설정": "warm-ivory",
    });
    expect(frame.report.applied).toEqual([]);
    expect(frame.report.skipped).toEqual([
      { kind: "studio", key: "tabBackground.쉼터", reason: expect.stringMatching(/없는 배경/) },
      { kind: "studio", key: "tabBackground.설정", reason: expect.stringMatching(/모르는 탭/) },
    ]);
    expect(frame.byTab.쉼터).toBe("soft-olive");
  });
});

describe("탭 배경 — 도움 함수", () => {
  it("라우트 → 탭 · 이름 · 검사", () => {
    expect(tabForRoute("/(tabs)/rest")).toBe("쉼터");
    expect(tabForRoute("/home?x=1")).toBe("홈");
    expect(tabForRoute("/rest/sense-pond")).toBeNull();
    expect(tabBackgroundLabel("tabBackground.리포트")).toBe("리포트 탭 배경");
    expect(tabBackgroundLabel("home.hero.borderRadius")).toBeNull();
    expect(tabBackgroundName("warm-ivory")).toBe("따뜻한 아이보리");
    expect(tabBackgroundValueError("tabBackground.마이", "soft-olive")).toBeNull();
    expect(tabBackgroundValueError("tabBackground.마이", "nope")).toMatch(/없는 배경/);
  });

  it("승인값과 같으면 덮어쓰기를 지운다 — 「모든 탭에 같은 배경」", () => {
    const all = TAB_BACKGROUND_TABS.map((item) => item.tab);
    expect(setTabBackgrounds({ "home.hero.borderRadius": 24 }, all, "soft-olive")).toEqual({
      "home.hero.borderRadius": 24,
      "tabBackground.홈": "soft-olive",
      "tabBackground.보관함": "soft-olive",
      "tabBackground.리포트": "soft-olive",
      "tabBackground.마이": "soft-olive",
    });
    expect(
      setTabBackgrounds({ "tabBackground.쉼터": "warm-ivory" }, ["쉼터"], "soft-olive"),
    ).toEqual({});
  });

  it("AI에게 넘기기 — studio 목록에 「쉼터 탭 배경」 전후로 실린다", async () => {
    const handoff = await buildHandoff({
      draft: draft({ "tabBackground.쉼터": "warm-ivory" }),
      notes: emptyNotes(),
      catalog: { byKey: new Map() },
      approvedStudio: {},
      lab: { platform: "ios", deviceId: "iphone-16", datasetId: "normal" },
      now: new Date("2026-11-02T12:30:00Z"),
    });
    expect(handoff.studio).toEqual([
      {
        key: "tabBackground.쉼터",
        label: "쉼터 탭 배경",
        before: "soft-olive",
        after: "warm-ivory",
      },
    ]);
    expect(Object.keys(tabBackgroundAssets)).toContain(handoff.studio[0]!.after);
  });
});

function Harness({
  onDraftChanged,
  route,
}: {
  onDraftChanged: (id: string) => void;
  route: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <DesignEditorPanel
      activeDraftId={active}
      onActiveDraftChange={setActive}
      onDraftChanged={onDraftChanged}
      frames={[]}
      currentRoute={route}
    />
  );
}

describe("탭 배경 — 패널", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("탭 화면이면 「이 화면에 쓰인 값」에 지금 탭 줄이 있고, 고르면 B 를 다시 부른다 · 모든 탭에 같은 배경", async () => {
    const onDraftChanged = jest.fn<(id: string) => void>();
    await render(<Harness onDraftChanged={onDraftChanged} route="/(tabs)/rest" />);
    await fireEvent.press(screen.getByRole("button", { name: "탭 배경 바꿔 보기" }));
    // 시안이 생기고 다섯 탭 보기가 열린다
    expect(screen.getByTestId("design-editor-tab-bg")).toBeTruthy();
    expect(screen.getByText("쉼터 탭 배경 · 지금 화면")).toBeTruthy();
    expect(screen.getByText("A 부드러운 올리브 → B 부드러운 올리브 (같음)")).toBeTruthy();

    await fireEvent.press(screen.getByRole("button", { name: "쉼터 탭 배경 따뜻한 아이보리" }));
    expect(screen.getByText("A 부드러운 올리브 → B 따뜻한 아이보리")).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(DRAFT_CHANGE_DEBOUNCE_MS + 10);
    });
    expect(onDraftChanged).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByRole("button", { name: "모든 탭 배경 부드러운 올리브" }));
    await fireEvent.press(screen.getByRole("button", { name: "바꾼 값 4" }));
    expect(screen.getByText("탭 배경 · 홈 탭 배경")).toBeTruthy();
    expect(screen.queryByText("탭 배경 · 쉼터 탭 배경")).toBeNull(); // 쉼터는 승인값으로 돌아갔다

    await fireEvent.press(screen.getByRole("button", { name: "이 화면에 쓰인 값" }));
    expect(screen.getByTestId("design-editor-screen-tab-bg")).toBeTruthy();
    expect(screen.getByTestId("design-tab-bg-new-hint")).toHaveTextContent(/앱에 넣기/);
    await fireEvent.press(screen.getByRole("button", { name: "탭 배경 모두 A로" }));
    expect(screen.getByRole("button", { name: "바꾼 값 0" })).toBeTruthy();
  });

  it("탭 화면이 아니면 「이 화면에 쓰인 값」에 탭 배경 칸이 없다", async () => {
    await render(<Harness onDraftChanged={() => undefined} route="/letter" />);
    await fireEvent.press(screen.getByRole("button", { name: "새 시안 만들기" }));
    expect(screen.queryByTestId("design-editor-screen-tab-bg")).toBeNull();
    expect(screen.getByRole("button", { name: /탭 배경 바꿔 보기/ })).toBeTruthy();
  });
});
