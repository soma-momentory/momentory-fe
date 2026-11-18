import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DiaryEmotionEditor } from "../DiaryEmotionEditor";

const initial = {
  events: [
    { eventId: 1, label: "친구와 만남", summary: "친구와 저녁을 먹었다", emotions: [1] as const },
    { eventId: 2, label: "출근", summary: "출근길이 길었다", emotions: [] },
  ].map((event) => ({ ...event, emotions: [...event.emotions] })),
  unlinkedEmotions: [],
};
const show = async (onSave = jest.fn().mockResolvedValue(true), onDismiss = jest.fn()) => {
  await render(
    <SafeAreaProvider>
      <DiaryEmotionEditor selection={initial} onSave={onSave} onDismiss={onDismiss} />
    </SafeAreaProvider>,
  );
  return { onSave, onDismiss };
};

it("사건에 감정을 추가하고 사건 없는 감정도 함께 저장한다", async () => {
  const { onSave, onDismiss } = await show();
  await fireEvent.press(screen.getByText("슬픔"));
  await fireEvent.press(screen.getByText("사건 없이 느낀 감정"));
  await fireEvent.press(screen.getByText("불안"));
  await act(async () => fireEvent.press(screen.getByText("감정 저장하기")));
  expect(onSave).toHaveBeenCalledWith({
    ...initial,
    events: [{ ...initial.events[0], emotions: [1, 5] }, initial.events[1]],
    unlinkedEmotions: [6],
  });
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it("저장 실패 시 선택을 유지하고 취소는 저장하지 않는다", async () => {
  const { onSave, onDismiss } = await show(jest.fn().mockResolvedValue(false));
  await fireEvent.press(screen.getByText("기쁨"));
  await act(async () => fireEvent.press(screen.getByText("감정 저장하기")));
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(onDismiss).not.toHaveBeenCalled();
  expect(onSave.mock.calls[0][0].events[0].emotions).toEqual([]);
  await fireEvent.press(screen.getByText("취소"));
  expect(onSave).toHaveBeenCalledTimes(1);
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

it("사건이 없는 일기도 감정을 선택할 수 있다", async () => {
  const onSave = jest.fn().mockResolvedValue(true);
  await render(
    <SafeAreaProvider>
      <DiaryEmotionEditor
        selection={{ events: [], unlinkedEmotions: [] }}
        onSave={onSave}
        onDismiss={jest.fn()}
      />
    </SafeAreaProvider>,
  );
  await fireEvent.press(screen.getByText("기쁨"));
  await act(async () => fireEvent.press(screen.getByText("감정 저장하기")));
  expect(onSave).toHaveBeenCalledWith({ events: [], unlinkedEmotions: [1] });
});

it("저장 중에는 채팅 모양의 사건·감정 선지를 바꾸지 못한다", async () => {
  let finish!: (saved: boolean) => void;
  const onSave = jest.fn(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      }),
  );
  await show(onSave);
  expect(screen.getByRole("button", { name: "기쁨" }).props.accessibilityHint).toBe(
    "행복함, 고마움, 신남, 설렘, 감동",
  );
  await fireEvent.press(screen.getByText("감정 저장하기"));
  expect(screen.getByRole("button", { name: "평온", disabled: true })).toBeTruthy();
  expect(screen.getByRole("button", { name: "사건 없이 느낀 감정", disabled: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "평온" }));
  await act(async () => finish(false));
  expect(screen.getByRole("button", { name: "기쁨", selected: true })).toBeTruthy();
  expect(screen.getByRole("button", { name: "평온", selected: false })).toBeTruthy();
  expect(onSave).toHaveBeenCalledWith(initial);
});

it("사건 없는 감정은 선택 즉시 이름을 표시하고 다른 사건에 다녀와도 유지한다", async () => {
  const { onSave } = await show();
  await fireEvent.press(screen.getByRole("button", { name: "사건 없이 느낀 감정" }));
  await fireEvent.press(screen.getByRole("button", { name: "평온" }));
  await fireEvent.press(screen.getByRole("button", { name: "불안" }));
  const name = "사건 없이 느낀 감정 - 평온, 불안";
  expect(screen.getByRole("button", { name, selected: true })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "친구와 만남 - 기쁨" }));
  await fireEvent.press(screen.getByRole("button", { name }));
  expect(screen.getByRole("button", { name: "평온", selected: true })).toBeTruthy();
  expect(screen.getByRole("button", { name: "불안", selected: true })).toBeTruthy();
  await fireEvent.press(screen.getByText("감정 저장하기"));
  expect(onSave).toHaveBeenCalledWith({ ...initial, unlinkedEmotions: [2, 6] });
});
