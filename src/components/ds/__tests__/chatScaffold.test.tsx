import { act, fireEvent, render } from "@testing-library/react-native";
import { Keyboard, ScrollView } from "react-native";

import { ChatScaffold } from "../ChatScaffold";
import { Text } from "../Text";

/**
 * 대화가 **키보드 뒤로 숨지 않는지**.
 *
 * 키보드가 뜨면 회피 패딩이 스크롤 뷰의 뷰포트를 줄이는데 스크롤 위치는 그대로라,
 * 대화가 길어진 뒤에는 마지막 질문이 입력창 뒤로 들어간다. `onLayout` 만으로는
 * iOS 에서 한 번씩 놓쳐서(회피 패딩이 `LayoutAnimation` 으로 얹힌다) `keyboardDidShow`
 * 로 한 번 더 내린다 — 그 연결이 살아 있는지 본다.
 */
describe("ChatScaffold", () => {
  it("키보드가 올라오면 대화를 바닥으로 다시 내린다", async () => {
    const scrollToEnd = jest
      .spyOn(ScrollView.prototype, "scrollToEnd")
      .mockImplementation(() => {});
    // 다음 프레임의 재호출은 테스트가 끝난 뒤에 깨어나 헐린 환경을 건드린다 —
    // 여기서 보려는 것은 **구독이 걸려 있는지**라 한 번이면 충분하다
    const raf = jest.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 0);

    // 이 RN 버전의 `Keyboard` 에는 테스트용 `emit` 이 없다 — 등록된 콜백을 잡아 부른다
    let onShow: (() => void) | null = null;
    const addListener = jest.spyOn(Keyboard, "addListener").mockImplementation((event, handler) => {
      if (event === "keyboardDidShow") onShow = handler as () => void;
      return { remove: () => {} } as ReturnType<typeof Keyboard.addListener>;
    });

    // ⚠ **`render` 를 비동기 act 로 감싼다.** 이 조합(React 19 · RNTL)에서는 그냥
    // 부르면 effect 가 돌아온 뒤에 흘러나와 구독이 아직 안 걸린 상태를 보게 된다.
    // ⚠⚠ `render` 와 아래 `act` 를 **둘 다 기다린다.** 이 RNTL 은 `render` 가 Promise 라 기다리면
    // effect 까지 흘러나온다. 하나라도 안 기다리면 act 가 새어 나가 **같은 파일의 다음 테스트가
    // 빈 트리를 본다**(아래 companion 테스트를 붙이며 드러났다)
    await render(
      <ChatScaffold dock={<Text variant="body2">독</Text>}>
        <Text variant="body2">질문</Text>
      </ChatScaffold>,
    );

    expect(onShow).not.toBeNull();
    // 첫 렌더의 onLayout·onContentSizeChange 호출은 세지 않는다 — 보려는 것은
    // 「이미 그려진 뒤 키보드가 올라왔을 때」다
    scrollToEnd.mockClear();

    await act(async () => {
      onShow?.();
    });

    expect(scrollToEnd).toHaveBeenCalled();

    addListener.mockRestore();
    raf.mockRestore();
    scrollToEnd.mockRestore();
  });

  /**
   * 왼쪽 아래에 앉는 그림(`companion`) — 대화가 **그림의 머리 위에서 끝나는지**, 그리고 독이
   * 올라와 그림을 다 덮으면 **비킬 몫이 사라지는지**.
   *
   * 그림은 키보드 회피 층 밖에 고정이라 자리를 옮기지 않는다 — 바뀌는 것은 대화가 비키는 높이뿐이다.
   */
  describe("companion", () => {
    // 대화 층은 `KeyboardAvoidingView` 자신이라 layout 이벤트에 `persist` 를 부른다
    const layoutOf = (height: number, y = 0) => ({
      nativeEvent: { layout: { x: 0, y, width: 350, height } },
      persist: () => {},
    });

    const renderWithCompanion = () =>
      render(
        <ChatScaffold
          dock={<Text variant="body2">독</Text>}
          companion={<Text variant="body2">바바</Text>}
        >
          <Text variant="body2">질문</Text>
        </ChatScaffold>,
      );

    it("그림이 독 위로 솟은 만큼 대화 아래를 비운다", async () => {
      const r = await renderWithCompanion();

      // 대화 층 700 · 독은 바닥에서 52 · 그림 137 → 머리가 독 위로 85 솟았다
      await fireEvent(r.getByTestId("ds-chat-layer"), "layout", layoutOf(700));
      await fireEvent(r.getByTestId("ds-chat-dock"), "layout", layoutOf(52, 648));
      await fireEvent(r.getByTestId("ds-chat-companion"), "layout", layoutOf(137));

      expect(r.getByTestId("ds-chat-clearance")).toHaveStyle({ height: 85 });
    });

    it("그림을 띄워 앉히면 띄운 만큼 더 비우고, 그림도 그 높이에 앉는다", async () => {
      const r = await render(
        <ChatScaffold
          dock={<Text variant="body2">독</Text>}
          companion={<Text variant="body2">바바</Text>}
          companionLift={60}
        >
          <Text variant="body2">질문</Text>
        </ChatScaffold>,
      );

      await fireEvent(r.getByTestId("ds-chat-layer"), "layout", layoutOf(700));
      await fireEvent(r.getByTestId("ds-chat-dock"), "layout", layoutOf(52, 648));
      await fireEvent(r.getByTestId("ds-chat-companion"), "layout", layoutOf(137));

      // 60 + 137 - 52 = 145
      expect(r.getByTestId("ds-chat-clearance")).toHaveStyle({ height: 145 });
      expect(r.getByTestId("ds-chat-companion")).toHaveStyle({ bottom: 60 });
    });

    it("키보드나 선택지로 독이 그림을 다 덮으면 비우지 않는다", async () => {
      const r = await renderWithCompanion();

      await fireEvent(r.getByTestId("ds-chat-layer"), "layout", layoutOf(700));
      await fireEvent(r.getByTestId("ds-chat-companion"), "layout", layoutOf(137));
      // 키보드 회피 패딩이 얹혀 독이 바닥에서 352 올라왔다
      await fireEvent(r.getByTestId("ds-chat-dock"), "layout", layoutOf(52, 348));

      expect(r.queryByTestId("ds-chat-clearance")).toBeNull();
    });

    it("그림이 없으면 비울 것도 없다", async () => {
      const r = await render(
        <ChatScaffold dock={<Text variant="body2">독</Text>}>
          <Text variant="body2">질문</Text>
        </ChatScaffold>,
      );

      await fireEvent(r.getByTestId("ds-chat-layer"), "layout", layoutOf(700));
      await fireEvent(r.getByTestId("ds-chat-dock"), "layout", layoutOf(52, 648));

      expect(r.queryByTestId("ds-chat-companion")).toBeNull();
      expect(r.queryByTestId("ds-chat-clearance")).toBeNull();
    });
  });
});
