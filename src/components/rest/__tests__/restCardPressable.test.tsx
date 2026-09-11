import { act, fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { RestCardPressable } from "../RestCardPressable";

import { cardRipple } from "@/design/ds";

/**
 * 쉼터 카드의 누름 — **누른 자리에서 물결이 번지고, 다 채워진 뒤에 이동한다**(2026-09-11 · 사용자 요청).
 *
 * 여기서 고정하는 것: 물결은 손끝 자리에서 시작한다(글자를 눌러도 카드 기준이다) ·
 * 카드의 가장 먼 모서리까지 닿는다 · 이동은 다 덮은 뒤다 · 그 전에 여러 번 눌러도 한 번만 간다 ·
 * 스크롤로 빠지면 가지 않는다 · 이동한 뒤 물결은 옅어져 지워진다.
 */
const HIDDEN = { includeHiddenElements: true } as const;
const CARD = { width: 180, height: 120 };

type Q = Awaited<ReturnType<typeof render>>;

const setup = async () => {
  const onPress = jest.fn();
  const r = await render(
    <RestCardPressable accessibilityLabel="감각연못 열기" onPress={onPress}>
      <Text>감각연못</Text>
    </RestCardPressable>,
  );
  await fireEvent(r.getByTestId("rest-card-surface", HIDDEN), "layout", {
    nativeEvent: { layout: CARD },
  });
  return { r, onPress };
};

const button = (r: Q) => r.getByRole("button");
const pressIn = (r: Q, x: number, y: number) =>
  fireEvent(button(r), "pressIn", { nativeEvent: { locationX: x, locationY: y } });
const pressOut = (r: Q) => fireEvent(button(r), "pressOut");
const press = (r: Q) => fireEvent.press(button(r));
/** 손가락으로 톡 — 누름 · 뗌 · 누름 순서로 온다(Pressable 과 같다) */
const tap = async (r: Q, x = 90, y = 60) => {
  await pressIn(r, x, y);
  await pressOut(r);
  await press(r);
};

const ripples = (r: Q) => r.queryAllByTestId("rest-card-ripple", HIDDEN);
const styleOf = (r: Q) => Object.assign({}, ...[ripples(r)[0]!.props.style].flat(Infinity));
const wait = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

describe("쉼터 카드 · 누른 자리 물결", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("누른 자리를 가운데로 물결 하나가 번진다 — 가장 먼 모서리까지 닿는 크기다", async () => {
    const { r } = await setup();
    expect(ripples(r)).toHaveLength(0);

    await pressIn(r, 30, 20);
    const style = styleOf(r);
    // 가장 먼 모서리(180, 120)까지의 거리가 반지름이다
    expect(style.width).toBeCloseTo(Math.hypot(150, 100) * 2);
    expect(style.left + style.width / 2).toBeCloseTo(30);
    expect(style.top + style.height / 2).toBeCloseTo(20);
  });

  it("다 채워진 뒤에 이동하고, 그 뒤 물결이 옅어져 지워진다", async () => {
    const { r, onPress } = await setup();

    await tap(r);
    expect(onPress).not.toHaveBeenCalled();

    await wait(cardRipple.duration - 20);
    expect(onPress).not.toHaveBeenCalled();
    expect(ripples(r)).toHaveLength(1);

    await wait(40);
    expect(onPress).toHaveBeenCalledTimes(1);
    // 이동하는 순간에도 아직 있다 — 옅어지는 중이다
    expect(ripples(r)).toHaveLength(1);

    await wait(cardRipple.fade + 20);
    expect(ripples(r)).toHaveLength(0);
  });

  it("다 채워지기 전에 여러 번 눌러도 한 번만 간다", async () => {
    const { r, onPress } = await setup();

    await tap(r);
    await wait(100);
    await tap(r, 20, 100);
    // 가는 중의 손짓은 새 물결도 만들지 않는다
    expect(ripples(r)).toHaveLength(1);

    await wait(cardRipple.duration + cardRipple.fade + 50);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("누르다 스크롤로 빠지면(누름 없이 뗌) 가지 않고, 다 번진 뒤 사라진다", async () => {
    const { r, onPress } = await setup();

    await pressIn(r, 90, 60);
    await pressOut(r);
    // 다 번진 시각에 옅어지기 시작하고(그때 사라지는 시계가 선다), 그만큼 뒤에 지워진다
    await wait(cardRipple.duration + 10);
    await wait(cardRipple.fade + 10);

    expect(onPress).not.toHaveBeenCalled();
    expect(ripples(r)).toHaveLength(0);
  });

  it("오래 누르고 있다 떼면 이미 다 찼으니 곧바로 간다", async () => {
    const { r, onPress } = await setup();

    await pressIn(r, 90, 60);
    await wait(cardRipple.duration + 300);
    // 누르고 있는 동안에는 덮은 채 머문다
    expect(ripples(r)).toHaveLength(1);

    await pressOut(r);
    await press(r);
    await wait(0);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("좌표 없는 활성화(낭독기)는 카드 가운데에서 채우고 같은 시간 뒤에 간다", async () => {
    const { r, onPress } = await setup();

    await press(r);
    expect(styleOf(r).left + styleOf(r).width / 2).toBeCloseTo(CARD.width / 2);
    expect(onPress).not.toHaveBeenCalled();

    await wait(cardRipple.duration + 10);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
