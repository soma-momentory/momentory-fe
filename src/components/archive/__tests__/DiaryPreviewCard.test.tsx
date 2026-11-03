import { render } from "@testing-library/react-native";

import { DiaryPreviewCard } from "../DiaryPreviewCard";

import type { Diary } from "@/features/diary/model/diary";
import type { EmotionId } from "@/features/emotion/model/emotion";

/** 기기 글씨 배율을 고른다 */
const mockWindow = jest.fn(() => ({ fontScale: 1, width: 360, height: 800, scale: 3 }));
jest.mock("react-native/Libraries/Utilities/useWindowDimensions", () => ({
  __esModule: true,
  default: () => mockWindow(),
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

const TITLE = "12월 31일의 일기";
const ONE: EmotionId[] = [1];
const TWO: EmotionId[] = [1, 7];
const THREE: EmotionId[] = [1, 6, 7];

const renderCard = (emotions: EmotionId[], embedded: boolean, fontScale: number) => {
  mockWindow.mockReturnValue({ fontScale, width: 360, height: 800, scale: 3 });
  const diary = { id: "d-1", date: "2026-12-31", body: "오늘의 기록", emotions } as Diary;
  return render(
    <DiaryPreviewCard
      diary={diary}
      onOpen={jest.fn()}
      embedded={embedded}
      showOpenLink={embedded}
    />,
  );
};

/** 제목과 감정이 놓이는 방향 — `column` 이면 감정이 제목 아래 줄이다 */
const headDirection = (r: Awaited<ReturnType<typeof renderCard>>) =>
  flatten(r.getByText(TITLE).parent?.props.style).flexDirection;

describe("달력 보기 카드", () => {
  it.each([
    ["감정 하나 · 글씨 1배", ONE, 1],
    ["감정 둘 · 글씨 1배", TWO, 1],
    ["감정 셋 · 글씨 1배", THREE, 1],
    ["감정 셋 · 글씨 1.3배", THREE, 1.3],
  ])("%s — 제목은 한 줄이고 감정은 그 아래 줄이다", async (_name, emotions, fontScale) => {
    const r = await renderCard(emotions, true, fontScale);

    expect(r.getByText(TITLE).props.numberOfLines).toBe(1);
    expect(headDirection(r)).toBe("column");
  });
});

describe("목록 보기 카드", () => {
  it.each([
    ["감정 하나", ONE],
    ["감정 둘", TWO],
  ])("%s · 글씨 1배 — 제목과 감정이 한 줄이다", async (_name, emotions) => {
    const r = await renderCard(emotions, false, 1);

    expect(r.getByText(TITLE).props.numberOfLines).toBe(1);
    expect(headDirection(r)).toBe("row");
  });

  it.each([
    ["감정 셋 · 글씨 1배", THREE, 1],
    ["감정 둘 · 글씨 1.3배", TWO, 1.3],
  ])("%s — 제목이 잘리지 않게 감정만 아래 줄로 내린다", async (_name, emotions, fontScale) => {
    const r = await renderCard(emotions, false, fontScale);

    expect(r.getByText(TITLE).props.numberOfLines).toBe(1);
    expect(headDirection(r)).toBe("column");
  });
});
