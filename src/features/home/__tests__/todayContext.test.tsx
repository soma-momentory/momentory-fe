import { act, render } from "@testing-library/react-native";
import { Text } from "react-native";

import { markDayChanged, useTodayContext } from "@/features/home/model/day";
import { fixedClock, SampleClock, setClock } from "@/lib/clock";

/** 날짜를 말하는 화면(홈 `12` · 회고 `C2`·`C6`)이 하는 것과 같다 */
function Today() {
  const { date } = useTodayContext();
  return <Text>{date}</Text>;
}

afterEach(() => setClock(SampleClock));

describe("useTodayContext — 04:00 을 넘기면 따라간다", () => {
  it("날이 바뀐 것을 알리면 다시 그린다", async () => {
    setClock(fixedClock("2026-08-14T23:00:00"));
    const { getByText } = await render(<Today />);
    expect(getByText("2026-08-14")).toBeTruthy();

    // 새벽 4:00 — `dayRollover` 가 알린다
    setClock(fixedClock("2026-08-15T04:00:30"));
    await act(async () => markDayChanged());

    expect(getByText("2026-08-15")).toBeTruthy();
  });

  it("알리지 않으면 그대로다 — 화면이 스스로 시계를 보지 않는다", async () => {
    setClock(fixedClock("2026-08-14T23:00:00"));
    const { getByText } = await render(<Today />);

    setClock(fixedClock("2026-08-15T04:00:30"));

    // 이 어긋남을 없애는 것이 `markDayChanged` 의 존재 이유다
    expect(getByText("2026-08-14")).toBeTruthy();
  });
});
