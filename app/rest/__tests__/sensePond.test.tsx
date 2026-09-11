import { act, fireEvent, render } from "@testing-library/react-native";
import { router } from "expo-router";

import SensePondScreen from "../sense-pond";

import { pondMotion, surfaceRippleMs } from "@/design/ds";

/**
 * 감각연못 — **표시를 찾아 누르는 미니게임이 아니라, 연못을 건드리면 조용히
 * 반응하는 쉼터**다 (2026-09-06 개편).
 *
 * 연못 위에 눈·음표·손 표시가 떠 있고 그것을 찾아 누르던 구조는 사라졌다. 손짓마다
 * 연잎이 하나씩 떠오르던 것도 지웠다 — 모으는 화면이 되면 쉼이 수집이 된다.
 * 지금은 셋 다 같은 방식이다: 현실에서 감각 하나를 찾고 **연못의 물 아무 데나**
 * 건드리면 그 자리에서 물결이 퍼지고 셈이 하나 오른다(감각 단계만 잠시 누르기).
 *
 * 여기서 고정하는 것: 연못에 새로 생기는 것이 없다 · 물인 자리만 센다(글·카피바라는
 * 아니다) · 건드린 자리에서 물결이 퍼진다 · 아래 판은 **첫 손짓 전에는 없고**, 찾을
 * 때마다 그 단계의 칸이 가운데에 뜨고 차오른다(2026-09-11) · 다 채우면 「다 채웠어요」 ·
 * 감각 단계는 「꾸욱」을 두 번 말한다.
 */
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
  Redirect: jest.fn(() => null),
}));

/** 연못 위의 그림은 낭독기에서 숨긴다 — 세려면 숨긴 것까지 봐야 한다 */
const HIDDEN = { includeHiddenElements: true } as const;

beforeEach(() => {
  jest.clearAllMocks();
});

type Q = Awaited<ReturnType<typeof render>>;

/**
 * 연못이 크기를 재야 장면·카피바라가 그려진다 — 테스트에서는 직접 준다.
 * 손에 들리는 화면과 비슷한 비율이어야 한다(수면 판정이 비율을 본다).
 */
const SCENE = { width: 360, height: 640 };

// RNTL 14 의 fireEvent 는 비동기다 — 기다리지 않으면 뒤따르는 테스트의 트리가 비어 버린다
const layout = (r: Q) =>
  fireEvent(r.getByLabelText("연못"), "layout", { nativeEvent: { layout: SCENE } });

/** 열린 수면 한가운데 — 여기를 건드리면 언제나 세어진다 */
const WATER = { x: 0.55, y: 0.62 };

const surface = (r: Q) => r.getByTestId("pond-surface", HIDDEN);

/** 손끝이 닿은 자리를 담은 손짓 — 좌표가 없으면(낭독기 활성화) 빈 채로 온다 */
const touch = (spot?: { x: number; y: number }) => ({
  nativeEvent:
    spot == null ? {} : { locationX: spot.x * SCENE.width, locationY: spot.y * SCENE.height },
});

/** 연못의 한 자리를 톡 건드린다(보기·듣기) */
const tapPond = (r: Q, spot?: { x: number; y: number }) => fireEvent.press(surface(r), touch(spot));

/** 연못의 한 자리에 손을 얹는다(감각) */
const holdPond = (r: Q, spot?: { x: number; y: number }) =>
  fireEvent(surface(r), "pressIn", touch(spot));

const releasePond = (r: Q) => fireEvent(surface(r), "pressOut");

/**
 * 시계를 돌린다. 타이머 안의 상태 갱신은 **비동기 act** 여야 화면에 반영된다
 * (React 19 · RNTL 14) — 동기 `act` 로 감싸면 콜백은 불리는데 트리는 그대로다.
 */
const wait = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

/** 그 단계의 물결이 다 퍼질 때까지 */
const settle = (step: "see" | "hear" | "feel") => wait(surfaceRippleMs(step) + 50);

/** 제목·설명이 갈리는 한 박자 — 셈은 바로 바뀌지만 머리글은 이만큼 늦다 */
const swap = () => wait(pondMotion.headingSwap.out + 20);

/** 연못 위에 처음부터 떠 있는 것 — 수련 꽃 하나뿐이다(배경 속 연잎·연꽃은 그림이다) */
const decor = (r: Q) => r.queryAllByTestId("pond-decor-flower", HIDDEN);

/** 손짓의 반응 — 건드린 자리의 물결과 누르고 있는 동안의 빛 */
const waves = (r: Q) => r.queryAllByTestId("pond-surface-ripple", HIDDEN);
const glows = (r: Q) => r.queryAllByTestId("pond-hold-glow", HIDDEN);

/** 아래 판 — 첫 손짓 전에는 없다 */
const panel = (r: Q) => r.queryByTestId("pond-panel", HIDDEN);
/** 그중 떠오른 칸 — 그 단계의 첫 손짓에 하나씩 */
const cells = (r: Q) => r.queryAllByTestId("pond-panel-cell", HIDDEN);
/** 칸 하나가 낭독기에 읽히는 말 — 「보이는 것 · 1 / 3」 */
const count = (r: Q, text: string) => r.getByLabelText(text);

/** 보기 셋 · 듣기 둘을 다 채우고 감각 단계까지 간다 */
const reachFeel = async (r: Q) => {
  for (let i = 0; i < 3; i++) {
    await tapPond(r, WATER);
    await settle("see");
  }
  await wait(pondMotion.stepHold + 50);
  for (let i = 0; i < 2; i++) {
    await tapPond(r, WATER);
    await settle("hear");
  }
  await wait(pondMotion.stepHold + 50);
};

describe("감각연못 · 들어온 직후", () => {
  it("위에는 소개 둘만 선다 — 단계 제목·설명을 함께 쌓지 않는다", async () => {
    const r = await render(<SensePondScreen />);

    expect(r.getByText("감각연못")).toBeTruthy();
    expect(r.getByText("연못처럼 잔잔하게, 지금 이 순간을 찾아봐요")).toBeTruthy();

    // 소개가 서 있는 동안 단계 문구는 위에 없다(2026-09-06)
    expect(r.queryByText("보이는 것 3개")).toBeNull();
    expect(r.queryByText(/처음/)).toBeNull();
  });

  it("연못에는 새로 생기는 것이 없다 — 배경 속 연잎·연꽃은 그림이다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    // 우리가 얹는 것은 수련 꽃 하나뿐이고, 손짓의 결과물은 하나도 없다
    expect(decor(r)).toHaveLength(1);
    expect(waves(r)).toHaveLength(0);
    expect(glows(r)).toHaveLength(0);
  });

  it("누를 표시가 없다 — 손짓을 받는 것은 수면 하나다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    expect(surface(r)).toBeTruthy();
    // 옛 눈·음표·손 표시는 연못 위에 없다
    expect(r.queryAllByTestId("pond-point-eye", HIDDEN)).toHaveLength(0);
    expect(r.queryAllByTestId("pond-point-sound", HIDDEN)).toHaveLength(0);
    expect(r.queryAllByTestId("pond-point-hand", HIDDEN)).toHaveLength(0);
  });

  it("눌리는 것은 뒤로와 수면뿐이다 — 숨은그림찾기를 시키지 않는다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    const labels = r
      .getAllByRole("button")
      .map((b) => b.props.accessibilityLabel)
      .sort();
    expect(labels).toEqual(["뒤로", "보이는 것 하나 찾기"].sort());
  });

  it("들어온 직후에는 아래 판이 없다 — 빈 칸도 동그라미도 없다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    expect(panel(r)).toBeNull();
    expect(cells(r)).toHaveLength(0);
    expect(r.queryByText("다 채웠어요")).toBeNull();
    expect(r.queryByText("보이는 것")).toBeNull();
    expect(r.queryByText("0 / 3")).toBeNull();
    expect(r.queryByText("닿는 감각")).toBeNull();
  });

  it("글이 앉는 위쪽에만 옅은 빛 한 겹이 깔린다 — 흰 카드를 두지 않는다", async () => {
    const r = await render(<SensePondScreen />);

    expect(r.getByTestId("pond-top-veil", HIDDEN)).toBeTruthy();
  });

  it("움직이는 수면이 정지 배경 위에 겹친다 — 둘 다 장면에 있다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    expect(r.getByTestId("pond-ambient", HIDDEN)).toBeTruthy();
    expect(r.getByTestId("pond-backdrop", HIDDEN)).toBeTruthy();
  });

  it("뒤로는 한 단계 돌아간다", async () => {
    const r = await render(<SensePondScreen />);

    await fireEvent.press(r.getByLabelText("뒤로"));
    expect(jest.mocked(router.back)).toHaveBeenCalled();
    expect(jest.mocked(router.push)).not.toHaveBeenCalled();
  });
});

// 가짜 시계를 쓰므로 **마지막** describe 에 둔다(`ds.test.tsx` 와 같은 이유)
describe("감각연못 · 찾아 가기", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("소개는 한 호흡만 머문다 — 그 뒤에는 지금 할 일 하나만 위에 남는다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    await wait(pondMotion.introHold + 20);
    await swap();

    expect(r.getByText("보이는 것 3개")).toBeTruthy();
    expect(
      r.getByText("주변을 천천히 둘러봐요. 하나 찾았다면 연못을 가볍게 건드려보세요."),
    ).toBeTruthy();
    expect(r.queryByText("감각연못")).toBeNull();
  });

  it("수면을 건드리면 1 / 3 · 그 자리에서 물결 하나 · 연못에 남는 것은 없다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    await tapPond(r, WATER);
    expect(count(r, "보이는 것 · 1 / 3")).toBeTruthy();
    expect(waves(r).length).toBeGreaterThan(0);

    // 물결은 다 퍼지면 지워진다 — 연잎도 꽃도 새로 생기지 않는다
    await settle("see");
    expect(waves(r)).toHaveLength(0);
    expect(decor(r)).toHaveLength(1);
  });

  it("잇달아 건드려도 앞선 물결은 제 수명대로 사라진다 — 새 물결이 그것을 되살리지 않는다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);
    const life = surfaceRippleMs("see");

    await tapPond(r, WATER);
    const rings = waves(r).length;
    // 반쯤 퍼졌을 때 한 번 더 — 부모가 다시 그려도 앞선 물결의 시계는 그대로다
    await wait(life / 2);
    await tapPond(r, { x: 0.45, y: 0.6 });
    expect(waves(r)).toHaveLength(rings * 2);

    // 첫 물결의 수명이 끝나면 그것만 사라진다(둘째는 아직 퍼지는 중이다)
    await wait(life / 2 + 60);
    expect(waves(r)).toHaveLength(rings);
  });

  it("물이 아닌 곳은 세지 않는다 — 글·카피바라를 눌러도 아무 일이 없다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    await tapPond(r, { x: 0.5, y: 0.12 }); // 위쪽 글이 앉는 자리
    await tapPond(r, { x: 0.15, y: 0.7 }); // 카피바라가 앉은 왼쪽 물가
    await tapPond(r, { x: 0.5, y: 0.92 }); // 아래 판 언저리

    expect(panel(r)).toBeNull();
    expect(waves(r)).toHaveLength(0);
  });

  it("낭독기의 활성화에는 좌표가 없다 — 그때도 수면 한가운데에서 하나가 세어진다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    await tapPond(r);

    expect(count(r, "보이는 것 · 1 / 3")).toBeTruthy();
  });

  it("첫 손짓에 판이 올라와 가운데에 칸 하나가 뜬다 — 다음 단계의 첫 손짓에 하나가 더 뜬다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    // 보기의 첫 손짓 — 판이 올라오고 눈 칸 하나만 뜬다
    await tapPond(r, WATER);
    expect(panel(r)).toBeTruthy();
    expect(cells(r)).toHaveLength(1);
    expect(r.getByTestId("pond-panel-eye", HIDDEN)).toBeTruthy();
    expect(r.getByText("1 / 3")).toBeTruthy();

    // 같은 단계의 손짓은 칸을 늘리지 않고 그 칸을 채운다
    await settle("see");
    await tapPond(r, WATER);
    expect(cells(r)).toHaveLength(1);
    expect(r.getByText("2 / 3")).toBeTruthy();

    await settle("see");
    await tapPond(r, WATER);
    await wait(pondMotion.stepHold + 50);
    // 듣기로 넘어가도 둘째 칸은 아직 비어 있다 — 첫 소리를 찾아야 떠오른다
    expect(cells(r)).toHaveLength(1);

    await tapPond(r, WATER);
    expect(cells(r)).toHaveLength(2);
    expect(r.getByTestId("pond-panel-sound", HIDDEN)).toBeTruthy();
    expect(count(r, "보이는 것 · 3 / 3")).toBeTruthy();
    expect(count(r, "들리는 소리 · 1 / 2")).toBeTruthy();
    expect(r.queryByTestId("pond-panel-hand", HIDDEN)).toBeNull();
  });

  it("셋을 다 찾으면 잠시 머문 뒤 같은 화면에서 「들리는 소리」로 넘어간다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    for (let i = 0; i < 2; i++) {
      await tapPond(r, WATER);
      await settle("see");
    }
    // 마지막 하나는 셈이 오른 것을 눈으로 볼 시간(`stepHold`)이 지나기 전에 본다
    await tapPond(r, WATER);
    expect(count(r, "보이는 것 · 3 / 3")).toBeTruthy();

    await wait(pondMotion.stepHold + 50);
    await swap();
    expect(r.getByText("들리는 소리 2개")).toBeTruthy();
    expect(
      r.getByText("잠시 귀를 기울여봐요. 하나 들렸다면 연못을 가볍게 건드려보세요."),
    ).toBeTruthy();
    // 지나온 칸은 가득 찬 채 남고, 소리 칸은 첫 소리를 찾기 전까지 뜨지 않는다
    expect(cells(r)).toHaveLength(1);
    expect(r.queryByText("다 채웠어요")).toBeNull();
  });

  it("듣기도 같은 손짓이다 — 표시를 찾지 않고 수면을 건드린다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);
    for (let i = 0; i < 3; i++) {
      await tapPond(r, WATER);
      await settle("see");
    }
    await wait(pondMotion.stepHold + 50);

    expect(surface(r).props.accessibilityLabel).toBe("들리는 소리 하나 찾기");
    await tapPond(r, WATER);
    expect(count(r, "들리는 소리 · 1 / 2")).toBeTruthy();
  });

  it("감각은 톡이 아니라 꾸욱 누르기다 — 짧은 누름은 세지 않고 「조금 더 오래」를 말한다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);
    await reachFeel(r);
    await swap();

    expect(r.getByText("몸에 닿는 감각 1개")).toBeTruthy();
    expect(
      r.getByText("몸에 닿는 감각 하나를 느껴봐요. 느껴졌다면 연못을 꾸욱 눌러보세요."),
    ).toBeTruthy();
    // 설명 끝에 묻어 두지 않고 알약으로 한 번 더 말한다
    expect(r.getByTestId("pond-hold-hint")).toBeTruthy();
    expect(r.getByText("손을 떼지 말고 꾸욱, 오래 눌러요")).toBeTruthy();

    await holdPond(r, WATER);
    expect(glows(r).length).toBeGreaterThan(0);
    await wait(pondMotion.hold - 200);
    await releasePond(r);

    expect(r.queryByLabelText("몸에 닿는 감각 · 1 / 1")).toBeNull();
    expect(cells(r)).toHaveLength(2);
    expect(waves(r)).toHaveLength(0);

    // 일찍 뗐다 — 알약이 다시 말하고, 잠시 뒤 원래 말로 돌아온다
    expect(r.getByText("조금 더 오래 눌러요")).toBeTruthy();
    await wait(pondMotion.holdHint.nudge + 20);
    expect(r.getByText("손을 떼지 말고 꾸욱, 오래 눌러요")).toBeTruthy();
  });

  it("「꾸욱」 알약은 감각 단계에만 선다 — 톡 단계와 완료에는 없다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);
    await wait(pondMotion.introHold + 20);
    await swap();
    expect(r.queryByTestId("pond-hold-hint")).toBeNull();

    await reachFeel(r);
    await swap();
    expect(r.getByTestId("pond-hold-hint")).toBeTruthy();

    await holdPond(r, WATER);
    await wait(pondMotion.hold + 20);
    await wait(pondMotion.doneHold + 100);
    await swap();
    expect(r.queryByTestId("pond-hold-hint")).toBeNull();
  });

  it("잠시 누르고 있으면 가장 큰 물결 한 번 뒤 완료가 같은 자리에 선다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);
    await reachFeel(r);

    await holdPond(r, WATER);
    await wait(pondMotion.hold + 20);
    expect(count(r, "몸에 닿는 감각 · 1 / 1")).toBeTruthy();
    expect(waves(r).length).toBeGreaterThan(0);

    // 물결이 다 퍼진 **뒤에** 완료가 온다 — 마지막 반응이 잘리지 않는다
    await wait(pondMotion.doneHold + 100);
    await swap();
    expect(r.getByText("잘 찾았어요")).toBeTruthy();
    expect(r.getByText("잠시 지금 이 순간에 머물렀어요.")).toBeTruthy();

    // 차오른 칸 셋은 그대로이고, 「다 채웠어요」와 돌아가는 길이 붙는다
    expect(r.getByText("다 채웠어요")).toBeTruthy();
    expect(cells(r)).toHaveLength(3);
    expect(r.getByText("3 / 3")).toBeTruthy();
    expect(r.getByText("2 / 2")).toBeTruthy();
    expect(r.getByText("1 / 1")).toBeTruthy();
    expect(r.getByText("쉼터로 돌아가기")).toBeTruthy();

    // 완료된 연못은 손짓을 받지 않는다 — 보는 시간이다
    expect(r.queryByTestId("pond-surface", HIDDEN)).toBeNull();
    expect(decor(r)).toHaveLength(1);

    // 돌아가기 — 회고 완료와 같은 replace 로 쉼터 탭에 선다
    await fireEvent.press(r.getByText("쉼터로 돌아가기"));
    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/(tabs)/rest");
  });

  it("낭독기·스위치 제어의 활성화 하나가 잠시 누르기를 대신한다 — 손가락 없이도 완료까지 간다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);
    await reachFeel(r);
    expect(r.queryByLabelText("몸에 닿는 감각 · 1 / 1")).toBeNull();

    await fireEvent(surface(r), "accessibilityAction", {
      nativeEvent: { actionName: "activate" },
    });
    expect(count(r, "몸에 닿는 감각 · 1 / 1")).toBeTruthy();

    await wait(pondMotion.doneHold + 100);
    await swap();
    expect(r.getByText("잘 찾았어요")).toBeTruthy();
  });

  it("톡 단계에는 활성화를 따로 받지 않는다 — `onPress` 가 이미 받아 두 번 세게 된다", async () => {
    const r = await render(<SensePondScreen />);
    await layout(r);

    expect(surface(r).props.accessibilityActions).toBeUndefined();
  });
});
