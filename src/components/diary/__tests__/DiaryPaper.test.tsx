import { fireEvent, render } from "@testing-library/react-native";

import { Text } from "@/components/ds";
import { DiaryPaperEntry } from "../DiaryPaper";
import { diaryPhotoOf } from "../diaryPhotos";
import type { EmotionId } from "@/features/emotion/model/emotion";

const entry = (emotions: EmotionId[]) => (
  <DiaryPaperEntry date="2026-10-30" emotions={emotions}>
    <Text>오늘 남긴 문장.</Text>
  </DiaryPaperEntry>
);

it.each([
  [1, "happy"],
  [2, "proud"],
  [3, "calm"],
  [4, "tired"],
  [5, "stuck"],
  [6, "lethargic"],
  [7, "anxious"],
  [8, "depressed"],
  [9, "angry"],
  [10, "frustrated"],
] as const)("감정 %i는 사용자가 제공한 %s 사진에 연결한다", (emotion, key) => {
  const sources = {
    happy: require("../../../../assets/diary/photos/happy.jpg"),
    proud: require("../../../../assets/diary/photos/proud.jpg"),
    calm: require("../../../../assets/diary/photos/calm.jpg"),
    tired: require("../../../../assets/diary/photos/tired.jpg"),
    stuck: require("../../../../assets/diary/photos/stuck.jpg"),
    lethargic: require("../../../../assets/diary/photos/lethargic.jpg"),
    anxious: require("../../../../assets/diary/photos/anxious.jpg"),
    depressed: require("../../../../assets/diary/photos/depressed.jpg"),
    angry: require("../../../../assets/diary/photos/angry.jpg"),
    frustrated: require("../../../../assets/diary/photos/frustrated.jpg"),
  };
  expect(diaryPhotoOf([emotion])).toEqual({ emotion, source: sources[key] });
});

it("답답함도 일기에 기록된 감정 순서대로 사진을 고르고 이름을 표시한다", async () => {
  expect(diaryPhotoOf([10, 8, 2])?.emotion).toBe(10);
  const r = await render(entry([10]));
  expect(r.getByLabelText("답답함의 카피바라 사진")).toBeTruthy();
  await fireEvent.press(r.getByRole("button", { name: "답답함 감정 스티커" }));
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("답답함");
});

it("모든 감정을 스티커로 유지하며 선택한 이름만 사진 위에 표시한다", async () => {
  const r = await render(entry([2, 1, 3]));
  expect(r.getByText("2026. 10. 30 (금)")).toBeTruthy();
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("");
  expect(r.getAllByRole("button")).toHaveLength(3);
  const photo = r.getByTestId("diary-emotion-photo").props.source;
  await fireEvent.press(r.getByRole("button", { name: "뿌듯함 감정 스티커" }));
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("뿌듯함");
  await fireEvent.press(r.getByRole("button", { name: "행복함 감정 스티커" }));
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("행복함");
  expect(
    r.getByRole("button", { name: "뿌듯함 감정 스티커" }).props.accessibilityState.selected,
  ).toBe(false);
  // 이름을 확인하는 동작이 사진이나 기록된 감정을 바꾸지는 않는다.
  expect(r.getByTestId("diary-emotion-photo").props.source).toEqual(photo);
  await fireEvent.press(r.getByRole("button", { name: "행복함 감정 스티커" }));
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("");
});

it("감정이 열 개여도 모두 누를 수 있고 중복 태그는 한 장만 붙인다", async () => {
  const r = await render(entry([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 1]));
  expect(r.getAllByRole("button")).toHaveLength(10);
  await fireEvent.press(r.getByRole("button", { name: "답답함 감정 스티커" }));
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("답답함");
});

it("감정 없는 날은 무감정 사진을 표시하고 감정 스티커를 만들지 않는다", async () => {
  const r = await render(entry([]));
  const source = require("../../../../assets/diary/photos/neutral.jpg");
  expect(diaryPhotoOf([])).toEqual({ emotion: null, source });
  expect(r.getByLabelText("무감정의 카피바라 사진").props.source).toEqual(source);
  expect(r.queryByTestId("diary-emotion-caption")).toBeNull();
  expect(r.queryAllByRole("button")).toHaveLength(0);
  expect(r.getByText("오늘 남긴 문장.")).toBeTruthy();
});
