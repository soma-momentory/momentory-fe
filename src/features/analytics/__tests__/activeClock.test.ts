import { createActiveClock } from "../activeClock";

it("멈춘 동안의 시간은 흐르지 않는다 — 여러 번 멈췄다 돌아와도 전면 시간만 쌓인다", () => {
  let time = 1_000;
  const clock = createActiveClock(() => time);

  time += 3_000;
  clock.pause();
  time += 60_000;
  clock.pause();
  clock.resume();
  time += 2_000;
  clock.pause();
  time += 5_000;
  clock.resume();
  clock.resume();
  time += 1_000;

  expect(clock.now()).toBe(6_000);
});
