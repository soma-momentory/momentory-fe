import { act, fireEvent, render, screen } from "@testing-library/react-native";
import type { ComponentProps } from "react";
import { BackHandler, type ViewToken } from "react-native";

import type { InboxNotification } from "../data/inboxApi";
import {
  formatInboxDate,
  INBOX_CRITICAL_LABEL,
  INBOX_EMPTY_MESSAGE,
  INBOX_FAILED_MESSAGE,
  InboxPopover,
} from "../ui/InboxPopover";

/**
 * 알림 팝오버 — 표시만 한다(계획 §5.4 · MF-1A · `RULES.md` 4).
 * 무엇을 읽음으로 보낼지는 store 몫이고, 여기서는 **무엇을 보였다고 말하는지**만 본다.
 */
const item = (id: string, overrides: Partial<InboxNotification> = {}): InboxNotification => ({
  id,
  type: "NOTICE",
  kind: "notice",
  title: `공지 ${id}`,
  body: `본문 ${id}`,
  createdAt: "2026-10-15T03:00:00Z",
  readAt: null,
  link: null,
  ...overrides,
});

type Props = ComponentProps<typeof InboxPopover>;

const setup = async (overrides: Partial<Props> = {}) => {
  const props: Props = {
    items: [item("1"), item("2", { readAt: "2026-10-15T04:00:00Z" })],
    status: "ready",
    unreadIds: ["1"],
    hasMore: false,
    top: 100,
    onDismiss: jest.fn(),
    onOpenSettings: jest.fn(),
    onPressItem: jest.fn(),
    onEndReached: jest.fn(),
    onSeen: jest.fn(),
    ...overrides,
  };
  await render(<InboxPopover {...props} />);
  return props;
};

type ListProps = {
  onViewableItemsChanged: (info: { viewableItems: ViewToken[]; changed: ViewToken[] }) => void;
  viewabilityConfig: { itemVisiblePercentThreshold: number; minimumViewTime: number };
};

/** FlatList 의 viewability 콜백을 흉내 낸다 — 네이티브 측정이 없는 테스트에서 「보였다」를 만든다 */
const showItems = async (tokens: { item: InboxNotification; isViewable: boolean }[]) => {
  const listProps = screen.getByTestId("inbox-popover-list").props as ListProps;
  const viewable = tokens.map((t, index) => ({
    item: t.item,
    key: t.item.id,
    index,
    isViewable: t.isViewable,
  }));
  await act(() => listProps.onViewableItemsChanged({ viewableItems: viewable, changed: viewable }));
  return listProps;
};

describe("InboxPopover", () => {
  it("보이는 항목만 onSeen 으로 넘긴다 — 문턱은 50% · 0.5초", async () => {
    const a = item("a");
    const b = item("b");
    const props = await setup({ items: [a, b, item("c")] });

    const listProps = await showItems([
      { item: a, isViewable: true },
      { item: b, isViewable: false },
    ]);

    expect(props.onSeen).toHaveBeenCalledTimes(1);
    expect(props.onSeen).toHaveBeenCalledWith(["a"]);
    expect(listProps.viewabilityConfig).toEqual({
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 500,
    });
  });

  it("보인 것이 없으면 onSeen 을 부르지 않는다", async () => {
    const props = await setup();
    await showItems([{ item: item("1"), isViewable: false }]);
    expect(props.onSeen).not.toHaveBeenCalled();
  });

  it("빈 목록은 한 줄이고 재시도 버튼이 없다", async () => {
    await setup({ items: [] });
    expect(screen.getByText(INBOX_EMPTY_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(/다시/)).toBeNull();
    expect(screen.getAllByRole("button").map((b) => b.props.accessibilityLabel)).toEqual([
      "알림 닫기",
      "알림 설정",
    ]);
  });

  it("실패는 한 줄이고 재시도 버튼 · 경고 아이콘이 없다", async () => {
    await setup({ status: "failed", items: [] });
    expect(screen.getByText(INBOX_FAILED_MESSAGE)).toBeTruthy();
    expect(screen.queryByText(/다시/)).toBeNull();
    expect(screen.getAllByRole("button")).toHaveLength(2);
    expect(screen.queryByTestId("inbox-popover-list")).toBeNull();
  });

  it("로딩은 Spinner", async () => {
    await setup({ status: "loading", items: [] });
    const state = screen.getByTestId("inbox-popover-loading");
    // `Spinner` 는 OS 의 ActivityIndicator 하나다 — 그 밖에 아무것도 없다(진행률 · 문구 없음)
    expect(state.children.map((c) => (typeof c === "string" ? c : c.type))).toEqual([
      "ActivityIndicator",
    ]);
    expect(screen.queryByText(INBOX_EMPTY_MESSAGE)).toBeNull();
    expect(screen.queryByText(INBOX_FAILED_MESSAGE)).toBeNull();
  });

  it("읽지 않음은 점 + 낭독 이름이다(색만이 아니다)", async () => {
    await setup();
    expect(screen.getByTestId("inbox-unread-dot-1")).toBeTruthy();
    expect(screen.queryByTestId("inbox-unread-dot-2")).toBeNull();
    expect(screen.getByTestId("inbox-item-1").props.accessibilityLabel).toMatch(
      /^읽지 않음, 공지 1/,
    );
    expect(screen.getByTestId("inbox-item-2").props.accessibilityLabel).not.toMatch(/읽지 않음/);
  });

  it("CRITICAL_NOTICE 에 이름표", async () => {
    await setup({ items: [item("9", { type: "CRITICAL_NOTICE", kind: "critical" })] });
    expect(screen.getByText(INBOX_CRITICAL_LABEL)).toBeTruthy();
    expect(screen.getByTestId("inbox-item-9").props.accessibilityLabel).toContain("중요");
  });

  it("날짜는 「10월 15일」", () => {
    expect(formatInboxDate("2026-10-15T03:00:00Z")).toBe("10월 15일");
    expect(formatInboxDate("어제")).toBe("");
  });

  it("바깥을 누르면 onDismiss · Android 뒤로도 닫기", async () => {
    type BackListener = Parameters<typeof BackHandler.addEventListener>[1];
    const listeners: BackListener[] = [];
    const spy = jest.spyOn(BackHandler, "addEventListener").mockImplementation((_, handler) => {
      listeners.push(handler);
      return { remove: jest.fn() };
    });
    const props = await setup();

    await fireEvent.press(screen.getByLabelText("알림 닫기"));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);

    expect(listeners.at(-1)?.({} as Parameters<BackListener>[0])).toBe(true);
    expect(props.onDismiss).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it("설정 아이콘 → onOpenSettings", async () => {
    const props = await setup();
    await fireEvent.press(screen.getByLabelText("알림 설정"));
    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("link 있는 항목 → onPressItem · 없는 항목은 펼친다(그리고 알린다)", async () => {
    const linked = item("L", { link: "/(tabs)/report" });
    const plain = item("P", { body: "아주 긴 본문" });
    const props = await setup({ items: [linked, plain], unreadIds: [] });

    await fireEvent.press(screen.getByTestId("inbox-item-L"));
    expect(props.onPressItem).toHaveBeenLastCalledWith(linked);
    expect(screen.getByTestId("inbox-item-L").props.accessibilityRole).toBe("link");

    expect(screen.getByText("아주 긴 본문").props.numberOfLines).toBe(2);
    await fireEvent.press(screen.getByTestId("inbox-item-P"));
    expect(props.onPressItem).toHaveBeenLastCalledWith(plain);
    expect(screen.getByText("아주 긴 본문").props.numberOfLines).toBeUndefined();
    expect(screen.getByTestId("inbox-item-P").props.accessibilityState).toMatchObject({
      expanded: true,
    });
  });

  it("낭독기 — 펼치면 본문을 이름으로 읽는다 · 링크 행은 늘 읽는다", async () => {
    const linked = item("L", { link: "/(tabs)/report", body: "링크 본문" });
    const plain = item("P", { body: "펼칠 본문" });
    await setup({ items: [linked, plain], unreadIds: [] });

    expect(screen.getByTestId("inbox-item-L").props.accessibilityLabel).toContain("링크 본문");
    expect(screen.getByTestId("inbox-item-P").props.accessibilityLabel).not.toContain("펼칠 본문");

    await fireEvent.press(screen.getByTestId("inbox-item-P"));
    expect(screen.getByTestId("inbox-item-P").props.accessibilityLabel).toContain("펼칠 본문");
    expect(screen.getByLabelText(/펼칠 본문/)).toBeTruthy();

    await fireEvent.press(screen.getByTestId("inbox-item-P"));
    expect(screen.getByTestId("inbox-item-P").props.accessibilityLabel).not.toContain("펼칠 본문");
  });

  it("끝에 닿으면 onEndReached — 다음 쪽이 없으면 넘기지 않는다", async () => {
    const props = await setup({ hasMore: true });
    await fireEvent(screen.getByTestId("inbox-popover-list"), "onEndReached");
    expect(props.onEndReached).toHaveBeenCalledTimes(1);

    await render(<InboxPopover {...props} hasMore={false} />);
    expect(screen.getByTestId("inbox-popover-list").props.onEndReached).toBeUndefined();
  });

  it("숫자를 그리지 않는다 — 개수 · 배지 없음", async () => {
    const many = Array.from({ length: 12 }, (_, i) =>
      item(String(i), { title: "새 소식", body: "" }),
    );
    await setup({ items: many, unreadIds: many.map((n) => n.id) });
    // 날짜(「10월 15일」) 말고는 숫자가 없다
    const numeric = screen
      .queryAllByText(/\d/)
      .map((node) => String(node.props.children))
      .filter((text) => !/^\d+월 \d+일$/.test(text));
    expect(numeric).toEqual([]);
  });

  it("카드는 호출자가 준 top 에 서고 폭은 최대 360 이다", async () => {
    await setup({ top: 123 });
    const style = Object.assign(
      {},
      ...[screen.getByTestId("inbox-popover-panel").props.style].flat(Infinity).filter(Boolean),
    ) as { top: number; width: number; maxHeight: number };
    expect(style.top).toBe(123);
    expect(style.width).toBeLessThanOrEqual(360);
    expect(style.maxHeight).toBeGreaterThan(0);
  });
});
