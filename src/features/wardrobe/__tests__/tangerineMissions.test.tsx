import { fireEvent, render } from "@testing-library/react-native";

import { toWardrobe } from "../data/wardrobeApi";
import { AttendanceGrid } from "../ui/AttendanceGrid";
import { TangerineBurst } from "../ui/TangerineBurst";
import { TangerineMissionSheet } from "../ui/TangerineMissionSheet";

const REWARDS = [10, 10, 20, 20, 30, 40, 50];

it("오늘 받은 미션만 「오늘 받았어요」로 읽고, 남은 개수는 말하지 않는다", async () => {
  const r = await render(
    <TangerineMissionSheet
      todayRewards={["CHECK_IN", "REST"]}
      attendanceDay={2}
      attendanceRewards={REWARDS}
      onDismiss={() => {}}
    />,
  );
  expect(r.getByLabelText("쉼터 한 곳 끝까지 다녀오기, 귤 10개, 오늘 받았어요")).toBeTruthy();
  expect(r.getByLabelText("일기 쓰기, 귤 30개")).toBeTruthy();
  expect(r.getByLabelText("오늘, 출석했어요")).toBeTruthy();
  expect(r.queryByText(/더 하면|남은/)).toBeNull();
});

it("출석 칸은 지난 칸을 체크하고, 앞 칸은 받을 귤을 보인다", async () => {
  const r = await render(<AttendanceGrid day={3} rewards={REWARDS} checkedToday={false} />);
  expect(r.getByLabelText("1일째, 출석했어요")).toBeTruthy();
  expect(r.getByLabelText("오늘, 귤 20개")).toBeTruthy();
  expect(r.getByLabelText("7일째, 귤 50개")).toBeTruthy();
});

it("서버가 칸을 일곱 개로 주지 않으면 출석 칸을 그리지 않는다", async () => {
  const r = await render(<AttendanceGrid day={1} rewards={[10]} checkedToday={false} />);
  expect(r.queryByTestId("attendance-grid")).toBeNull();
});

it("새 칸이 없던 옛 서버 응답도 옷장을 열고, 첫 선물은 받은 것으로 둔다", () => {
  const w = toWardrobe({
    tangerines: 10,
    outfit: { hat: null, eyes: null, clothes: null },
    items: [],
  });
  expect(w).toMatchObject({
    todayRewards: [],
    attendanceDay: 1,
    attendanceRewards: [],
    welcomed: true,
  });
  expect(
    toWardrobe({
      tangerines: 10,
      outfit: { hat: null, eyes: null, clothes: null },
      items: [],
      todayRewards: ["DIARY", "NEW_THING"],
      attendanceDay: 9,
      welcomed: false,
    }),
  ).toMatchObject({ todayRewards: ["DIARY"], attendanceDay: 1, welcomed: false });
});

it("미션 귤 카드는 옷장 팝업과 같은 창이고, 이유 · 받은 귤 · 확인으로 닫힌다", async () => {
  const onDone = jest.fn();
  const r = await render(
    <TangerineBurst title="오늘 일정을 다 끝냈어요" amount={10} onDone={onDone} />,
  );
  expect(r.getByText("오늘 일정을 다 끝냈어요")).toBeTruthy();
  expect(r.getByText("귤 10개를 받았어요")).toBeTruthy();
  fireEvent.press(r.getByRole("button", { name: "확인" }));
  expect(onDone).toHaveBeenCalledTimes(1);
});

it("방금 출석한 시트에서는 오늘 칸의 체크가 도장처럼 찍힌다", async () => {
  const r = await render(<AttendanceGrid day={2} rewards={REWARDS} checkedToday stamp />);
  expect(r.getByTestId("attendance-stamp")).toBeTruthy();
});

it("홈에서 연 시트에만 「바바 꾸미러 가기」가 있다", async () => {
  const onGoWardrobe = jest.fn();
  const props = {
    todayRewards: [],
    attendanceDay: 1,
    attendanceRewards: REWARDS,
    onDismiss: () => {},
  };
  const inWardrobe = await render(<TangerineMissionSheet {...props} />);
  expect(inWardrobe.queryByRole("button", { name: "바바 꾸미러 가기" })).toBeNull();
  inWardrobe.unmount();
  const fromHome = await render(<TangerineMissionSheet {...props} onGoWardrobe={onGoWardrobe} />);
  fireEvent.press(fromHome.getByRole("button", { name: "바바 꾸미러 가기" }));
  expect(onGoWardrobe).toHaveBeenCalledTimes(1);
});
