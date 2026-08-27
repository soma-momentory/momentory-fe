import { act, render } from "@testing-library/react-native";

import { ChatScaffold } from "../ChatScaffold";
import { Slider } from "../Slider";

/**
 * 슬라이더를 끄는 동안 **대화가 같이 밀리지 않는지**.
 *
 * `PanResponder` 는 JS 응답자라 네이티브 스크롤 뷰를 막지 못한다 — 대각선으로 끌면
 * 값이 바뀌면서 대화가 위아래로 함께 스크롤됐다(2026-08-28 실기기). 스크롤을 가진
 * 쪽(`ChatScaffold`)이 직접 꺼야 하고, 둘은 `scrollLock` 으로 물린다. 여기서 보는
 * 것은 **그 두 쪽이 실제로 물려 있는지**다.
 */

/** `PanResponder` 가 읽는 최소한의 터치 — 좌표는 안 본다(잠금만 확인한다) */
const touch = () => ({
  nativeEvent: {
    changedTouches: [],
    identifier: 1,
    locationX: 0,
    locationY: 0,
    pageX: 0,
    pageY: 0,
    target: 1,
    timestamp: 0,
    touches: [],
  },
  touchHistory: {
    touchBank: [],
    numberActiveTouches: 0,
    indexOfSingleActiveTouch: 0,
    mostRecentTimeStamp: 0,
  },
});

/** ⚠ 이 설정에서 `render` 는 **프로미스를 돌려준다** — 기다리지 않으면 질의가 없다 */
const renderInScaffold = async () => {
  const view = await render(
    <ChatScaffold>
      <Slider value={5} onChange={() => {}} min={0} max={10} accessibilityLabel="눈금" />
    </ChatScaffold>,
  );
  const track = view.getByLabelText("눈금");

  return {
    /**
     * ⚠ **`fireEvent` 로는 responder 이벤트가 안 붙었다**(이 RNTL 버전) — 트랙에 얹힌
     * `PanResponder` 핸들러를 직접 부른다. 부르는 것은 실제 그 핸들러다.
     * ⚠ **비동기 act 여야 한다** — 동기 act 로는 상태 변화가 화면까지 흘러오지 않는다.
     */
    touchTrack: (handler: "onResponderGrant" | "onResponderRelease" | "onResponderTerminate") =>
      act(async () => {
        (track.props[handler] as (e: ReturnType<typeof touch>) => void)(touch());
      }),
    // ⚠ **매번 다시 찾는다.** 한 번 잡아 둔 노드는 다시 그려지면 옛 props 를 든다
    scrollEnabled: () => view.getByTestId("ds-chat-scroll").props.scrollEnabled,
  };
};

describe("Slider ↔ ChatScaffold", () => {
  it("끄는 동안 대화 스크롤이 멈추고, 손을 떼면 다시 돈다", async () => {
    const { touchTrack, scrollEnabled } = await renderInScaffold();

    expect(scrollEnabled()).toBe(true);

    await touchTrack("onResponderGrant");
    expect(scrollEnabled()).toBe(false);

    await touchTrack("onResponderRelease");
    expect(scrollEnabled()).toBe(true);
  });

  it("제스처를 뺏겨도 스크롤이 죽은 채 남지 않는다", async () => {
    const { touchTrack, scrollEnabled } = await renderInScaffold();

    await touchTrack("onResponderGrant");
    expect(scrollEnabled()).toBe(false);

    await touchTrack("onResponderTerminate");
    expect(scrollEnabled()).toBe(true);
  });
});
