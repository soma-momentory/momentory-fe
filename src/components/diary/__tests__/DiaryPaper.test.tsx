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
  [1, "joy"],
  [2, "calm"],
  [3, "proud"],
  [5, "sad"],
  [6, "anxious"],
  [7, "angry"],
  [10, "confused"],
  [12, "exhausted"],
] as const)("감정 %i는 사용자가 제공한 %s 사진에 연결한다", (emotion, key) => {
  const sources = {
    joy: require("../../../../assets/diary/photos/joy.jpg"),
    calm: require("../../../../assets/diary/photos/calm.jpg"),
    proud: require("../../../../assets/diary/photos/proud.jpg"),
    sad: require("../../../../assets/diary/photos/sad.jpg"),
    anxious: require("../../../../assets/diary/photos/anxious.jpg"),
    angry: require("../../../../assets/diary/photos/angry.jpg"),
    confused: require("../../../../assets/diary/photos/confused.jpg"),
    exhausted: require("../../../../assets/diary/photos/exhausted.jpg"),
  };
  expect(diaryPhotoOf([emotion])).toEqual({ emotion, source: sources[key] });
});

/** 12종으로 넘어오며 사진을 열두 장으로 맞췄다(2026-11-14) — 감정마다 자기 사진이 있다. */
it.each([
  [1, "기쁨"],
  [2, "평온"],
  [3, "뿌듯함"],
  [4, "애정"],
  [5, "슬픔"],
  [6, "불안"],
  [7, "분노"],
  [8, "실망"],
  [9, "부끄러움"],
  [10, "혼란"],
  [11, "미안함"],
  [12, "지침"],
] as const)("감정 %i(%s)는 자기 사진을 건다", async (emotion, name) => {
  expect(diaryPhotoOf([emotion])?.emotion).toBe(emotion);
  const r = await render(entry([emotion]));
  expect(r.getByLabelText(`${name}의 카피바라 사진`)).toBeTruthy();
});

it("열두 감정의 사진은 서로 다르다 — 한 그림을 두 감정이 같이 쓰지 않는다", () => {
  const sources = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const).map(
    (id) => diaryPhotoOf([id])?.source,
  );
  expect(new Set(sources).size).toBe(12);
});

it("사진은 일기에 기록된 첫 감정의 것이다 — 감정은 줄이지 않는다", async () => {
  expect(diaryPhotoOf([4, 5])?.emotion).toBe(4);
  const r = await render(entry([4, 5]));
  expect(r.getByLabelText("애정의 카피바라 사진")).toBeTruthy();
  expect(r.getAllByRole("button")).toHaveLength(2);
});

it("지침도 일기에 기록된 감정 순서대로 사진을 고르고 이름을 표시한다", async () => {
  expect(diaryPhotoOf([12, 5, 3])?.emotion).toBe(12);
  const r = await render(entry([12]));
  expect(r.getByLabelText("지침의 카피바라 사진")).toBeTruthy();
  await fireEvent.press(r.getByRole("button", { name: "지침 감정 스티커" }));
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("지침");
});

it("모든 감정을 스티커로 유지하며 선택한 이름만 사진 위에 표시한다", async () => {
  const r = await render(entry([3, 1, 2]));
  expect(r.getByText("2026. 10. 30 (금)")).toBeTruthy();
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("");
  expect(r.getAllByRole("button")).toHaveLength(3);
  const photo = r.getByTestId("diary-emotion-photo").props.source;
  await fireEvent.press(r.getByRole("button", { name: "뿌듯함 감정 스티커" }));
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("뿌듯함");
  await fireEvent.press(r.getByRole("button", { name: "기쁨 감정 스티커" }));
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("기쁨");
  expect(
    r.getByRole("button", { name: "뿌듯함 감정 스티커" }).props.accessibilityState.selected,
  ).toBe(false);
  // 이름을 확인하는 동작이 사진이나 기록된 감정을 바꾸지는 않는다.
  expect(r.getByTestId("diary-emotion-photo").props.source).toEqual(photo);
  await fireEvent.press(r.getByRole("button", { name: "기쁨 감정 스티커" }));
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("");
});

it("감정이 열두 개여도 모두 누를 수 있고 중복 태그는 한 장만 붙인다", async () => {
  const r = await render(entry([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1]));
  expect(r.getAllByRole("button")).toHaveLength(12);
  await fireEvent.press(r.getByRole("button", { name: "지침 감정 스티커" }));
  expect(r.getByTestId("diary-emotion-caption").props.children).toBe("지침");
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
