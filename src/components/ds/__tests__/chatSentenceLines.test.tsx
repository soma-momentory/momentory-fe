import { render } from "@testing-library/react-native";

import { ChatBubble } from "../ChatBubble";
import { chatSentenceLines } from "../chatSentenceLines";

describe("회고 채팅 문장 줄바꿈", () => {
  it.each([
    [
      "반가웠겠어요. 어떤 순간이 좋았어요? 더 들려주세요!",
      "반가웠겠어요.\n어떤 순간이 좋았어요?\n더 들려주세요!",
    ],
    ["반가웠어요.또 만나고 싶어요.", "반가웠어요.\n또 만나고 싶어요."],
    ["정말요?! 그랬군요… 다음은요?", "정말요?!\n그랬군요…\n다음은요?"],
    ["‘잘했어.’ 그 말을 들었어요.", "‘잘했어.’\n그 말을 들었어요."],
    [
      "3.5km를 걸었어요. https://example.com/a 를 봤어요.",
      "3.5km를 걸었어요.\nhttps://example.com/a 를 봤어요.",
    ],
    ["기뻤어요.\n\n  다시 만나고 싶어요.", "기뻤어요.\n다시 만나고 싶어요."],
    ["오늘은 편안했어요", "오늘은 편안했어요"],
  ])("%s", (original, expected) => {
    expect(chatSentenceLines(original)).toBe(expected);
  });

  it.each(["question", "answer"] as const)(
    "%s 말풍선은 표시만 나누고 원문 낭독 이름은 유지한다",
    async (variant) => {
      const original = "친구를 만났어요. 반가웠어요.";
      const screen = await render(
        <ChatBubble appearance="diary" variant={variant}>
          {original}
        </ChatBubble>,
      );

      expect(screen.getByText("친구를 만났어요.\n반가웠어요.")).toBeTruthy();
      expect(
        screen.getByLabelText(`${variant === "question" ? "질문" : "내 답변"}: ${original}`),
      ).toBeTruthy();
    },
  );

  it("기본 대화 말풍선의 문단은 바꾸지 않는다", async () => {
    const original = "첫 문장이에요. 다음 문장이에요.";
    const screen = await render(<ChatBubble>{original}</ChatBubble>);
    expect(screen.getByText(original)).toBeTruthy();
  });
});
