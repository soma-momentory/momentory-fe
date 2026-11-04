import { sanitizeEvent } from "../events";
import { createSensePondTracker } from "../sensePond";

/** 손으로 돌리는 시계 — 전면 시계가 멈춘 동안에도 이 시각은 흐른다 */
function setup() {
  let time = 1_000;
  const track = jest.fn();
  const pond = createSensePondTracker(track, () => time);
  const pass = (ms: number) => {
    time += ms;
  };
  return { pond, track, pass };
}

it("단계마다 걸린 시간과 가장 오래 멈춘 간격을 싣고, 마지막 단계에서 완료를 보낸다", () => {
  const { pond, track, pass } = setup();
  pond.show("see");
  pass(4_000);
  pond.find(3, false);
  pass(20_000);
  pond.find(3, false);
  pass(6_000);
  pond.find(3, false);

  pass(700);
  pond.show("hear");
  pass(5_000);
  pond.find(2, false);
  pass(5_000);
  pond.find(2, false);

  pass(700);
  pond.show("feel");
  pass(8_000);
  pond.find(1, true);

  expect(track.mock.calls).toEqual([
    [
      "sense_pond_step_completed",
      { step: "see", duration_ms: 30_000, longest_gap_ms: 20_000, hold_cancels: 0 },
    ],
    [
      "sense_pond_step_completed",
      { step: "hear", duration_ms: 10_000, longest_gap_ms: 5_000, hold_cancels: 0 },
    ],
    [
      "sense_pond_step_completed",
      { step: "feel", duration_ms: 8_000, longest_gap_ms: 8_000, hold_cancels: 0 },
    ],
    ["sense_pond_finished", { duration_ms: 49_400 }],
  ]);
});

it("화면이 잠긴 동안의 시간은 세지 않는다", () => {
  const { pond, track, pass } = setup();
  pond.show("see");
  pass(3_000);
  pond.pause();
  pass(60_000);
  pond.resume();
  pass(2_000);
  pond.find(1, true);

  expect(track).toHaveBeenCalledWith("sense_pond_step_completed", {
    step: "see",
    duration_ms: 5_000,
    longest_gap_ms: 5_000,
    hold_cancels: 0,
  });
  expect(track).toHaveBeenLastCalledWith("sense_pond_finished", { duration_ms: 5_000 });
});

it("목표를 넘긴 손짓은 세지 않는다", () => {
  const { pond, track } = setup();
  pond.show("see");
  pond.find(1, false);
  pond.find(1, false);
  pond.find(1, false);

  expect(track).toHaveBeenCalledTimes(1);
});

it("끝내지 않고 떠나면 그 단계와 찾은 개수를 한 번만 보낸다", () => {
  const { pond, track, pass } = setup();
  pond.show("see");
  pass(2_000);
  pond.find(3, false);
  pass(9_000);
  pond.leave();
  pond.leave();
  pond.find(3, false);

  expect(track.mock.calls).toEqual([
    ["sense_pond_exited", { step: "see", found: 1, hold_cancels: 0, duration_ms: 11_000 }],
  ]);
});

it("첫 단계가 서기 전에 떠나면 보내지 않고, 그때까지의 시간은 전체 시간에 넣지 않는다", () => {
  const unstarted = setup();
  unstarted.pass(9_000);
  unstarted.pond.leave();
  expect(unstarted.track).not.toHaveBeenCalled();

  const { pond, track, pass } = setup();
  pass(60_000);
  pond.show("feel");
  pass(2_000);
  pond.find(1, true);
  expect(track).toHaveBeenLastCalledWith("sense_pond_finished", { duration_ms: 2_000 });
});

it("꾹 누르기를 일찍 뗀 횟수는 그 단계에만 쌓여 완료와 이탈에 실린다", () => {
  const { pond, track } = setup();
  pond.show("hear");
  pond.holdCancel();
  pond.find(1, false);
  pond.show("feel");
  pond.holdCancel();
  pond.holdCancel();
  pond.find(1, true);

  expect(track.mock.calls.map(([, props]) => props.hold_cancels)).toEqual([1, 2, undefined]);

  const left = setup();
  left.pond.show("feel");
  left.pond.holdCancel();
  left.pond.leave();
  expect(left.track).toHaveBeenCalledWith("sense_pond_exited", {
    step: "feel",
    found: 0,
    hold_cancels: 1,
    duration_ms: 0,
  });
});

it("끝까지 간 판은 떠날 때 아무것도 보내지 않는다", () => {
  const { pond, track } = setup();
  pond.show("feel");
  pond.find(1, true);
  track.mockClear();
  pond.leave();

  expect(track).not.toHaveBeenCalled();
});

it("보내는 속성이 이벤트 사전의 검증을 통과한다", () => {
  const { pond, track, pass } = setup();
  pond.show("see");
  pass(1_234.6);
  pond.find(1, true);
  pond.leave();
  const fresh = setup();
  fresh.pond.show("hear");
  fresh.pond.leave();

  for (const [name, properties] of [...track.mock.calls, ...fresh.track.mock.calls]) {
    expect(sanitizeEvent(name, properties)).not.toBeNull();
  }
  expect(sanitizeEvent("sense_pond_finished", { duration_ms: 1_234.6 })).toEqual({
    duration_ms: 1_235,
  });
  expect(sanitizeEvent("sense_pond_finished", { duration_ms: -1 })).toBeNull();
});
