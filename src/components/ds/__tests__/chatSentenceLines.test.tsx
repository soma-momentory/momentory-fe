import { fireEvent, render } from "@testing-library/react-native";

import { ChatBubble } from "../ChatBubble";

describe("회고 채팅은 원문의 문단을 유지한다", () => {
  it.each([
    "친구를 만났어요. 반가웠어요.",
    "반가웠어요.또 만나고 싶어요.",
    "정말요?! 그랬군요… 다음은요?",
    "‘잘했어.’ 그 말을 들었어요.",
    "3.5km를 걸었어요. https://example.com/a 를 봤어요.",
    "기뻤어요.\n\n  다시 만나고 싶어요.",
    "오늘은 편안했어요",
  ])("사용자 메시지는 문장 부호나 직접 입력한 줄바꿈을 바꾸지 않는다: %s", async (original) => {
    const screen = await render(
      <ChatBubble appearance="diary" variant="answer">
        {original}
      </ChatBubble>,
    );
    expect(screen.getByLabelText(`내 답변: ${original}`).props.children).toBe(original);
  });

  it("바바의 같은 맥락 문장은 이어 쓰고 맥락 전환 줄바꿈은 유지한다", async () => {
    const original =
      "친구가 생일을 챙겨줬군요. 기억해 준 마음이 고마우셨겠어요.\n오늘 다른 기억에 남는 일도 있었나요?";
    const screen = await render(<ChatBubble appearance="diary">{original}</ChatBubble>);
    expect(screen.getByLabelText(`질문: ${original}`).props.children).toBe(original);
  });

  it.each(["question", "answer"] as const)(
    "%s 말풍선 폭을 맞춘 뒤에도 화면의 자동 접힘을 강제 줄바꿈으로 저장하지 않는다",
    async (variant) => {
      const original = "첫 문장이에요. 다음 문장이에요.\n직접 나눈 문단이에요.";
      const screen = await render(
        <ChatBubble appearance="diary" variant={variant}>
          {original}
        </ChatBubble>,
      );
      const message = () =>
        screen.getByLabelText(`${variant === "question" ? "질문" : "내 답변"}: ${original}`);
      await fireEvent(message(), "textLayout", {
        nativeEvent: {
          lines: [
            { text: "첫 문장이에요. ", width: 90 },
            { text: "다음 문장이에요.\n", width: 100 },
            { text: "직접 나눈 문단이에요.", width: 130 },
          ],
        },
      });
      expect(message().props.children).toBe(original);
      expect(screen.getByTestId("diary-chat-bubble")).toHaveStyle({ width: 163 });
    },
  );

  it("기본 대화 말풍선의 문단도 바꾸지 않는다", async () => {
    const original = "첫 문장이에요. 다음 문장이에요.";
    const screen = await render(<ChatBubble>{original}</ChatBubble>);
    expect(screen.getByText(original)).toBeTruthy();
  });
});
