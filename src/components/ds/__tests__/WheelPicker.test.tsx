import { fireEvent, render } from "@testing-library/react-native";
import { useState } from "react";
import { ScrollView } from "react-native";

import { size } from "@/design/ds";

import { WheelPicker } from "../WheelPicker";

const ROW = size.sheet.wheelRow;
const HOURS = ["1", "2", "3", "4", "5", "6"];

function Hours() {
  const [hour, setHour] = useState("2");
  return (
    <WheelPicker
      columns={[{ key: "h", label: "시", items: HOURS, value: hour, onChange: setHour, width: 80 }]}
    />
  );
}

it("굴려서 정한 값에는 휠을 옮기지 않고(관성을 끊지 않는다), 눌러 고른 값에는 따라간다", async () => {
  const scrollTo = jest.spyOn(ScrollView.prototype, "scrollTo");
  const r = await render(<Hours />);
  scrollTo.mockClear();

  // 손을 뗀 순간 — 관성은 아직 돈다
  await fireEvent(r.getByLabelText("시"), "scrollEndDrag", {
    nativeEvent: { contentOffset: { x: 0, y: ROW * 4 } },
  });
  expect(r.getByRole("button", { name: "5", selected: true })).toBeTruthy();
  expect(scrollTo).not.toHaveBeenCalled();

  await fireEvent.press(r.getByRole("button", { name: "1" }));
  expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
});
