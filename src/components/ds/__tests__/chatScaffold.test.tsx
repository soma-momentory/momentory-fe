import { act, render } from "@testing-library/react-native";
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
    await act(async () => {
      render(
        <ChatScaffold dock={<Text variant="body2">독</Text>}>
          <Text variant="body2">질문</Text>
        </ChatScaffold>,
      );
    });

    expect(onShow).not.toBeNull();
    // 첫 렌더의 onLayout·onContentSizeChange 호출은 세지 않는다 — 보려는 것은
    // 「이미 그려진 뒤 키보드가 올라왔을 때」다
    scrollToEnd.mockClear();

    act(() => {
      onShow?.();
    });

    expect(scrollToEnd).toHaveBeenCalled();

    addListener.mockRestore();
    raf.mockRestore();
    scrollToEnd.mockRestore();
  });
});
