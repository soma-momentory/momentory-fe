import { fireEvent, render } from "@testing-library/react-native";

import { ChatBubble } from "../ChatBubble";
import { PreviewFontScaleContext } from "../Text";

const original = "뜻밖의 소리였네요. 오늘 하루 중 가장 기억에 남는 다른 순간은 언제인가요?";
const lines = [
  { text: "뜻밖의 소리였네요.\n", width: 100 },
  { text: "오늘 하루 중 가장 기억에 남는 다른 순간은 ", width: 220.2 },
  { text: "언제인가요?", width: 65 },
];

it("자동 줄바꿈 뒤 최대 폭이 남지 않고 가장 긴 글줄에 맞춰 줄어든다", async () => {
  const screen = await render(<ChatBubble appearance="diary">{original}</ChatBubble>);
  const bubble = () => screen.getByTestId("diary-chat-bubble");
  const message = () => screen.getByLabelText(`질문: ${original}`);

  await fireEvent(message(), "textLayout", { nativeEvent: { lines } });

  // 가장 긴 줄 220.2를 올림한 221 + 좌우 16씩 + 반올림 보정 1.
  expect(bubble()).toHaveStyle({ width: 254 });
  expect(message().props.children).toBe(
    "뜻밖의 소리였네요.\n오늘 하루 중 가장 기억에 남는 다른 순간은\n언제인가요?",
  );
  expect(message().props.onTextLayout).toBeUndefined();
});

it("답변이 바뀌면 지난 말풍선 너비를 버리고 새로 잰다", async () => {
  const screen = await render(<ChatBubble appearance="diary">{original}</ChatBubble>);
  await fireEvent(screen.getByLabelText(`질문: ${original}`), "textLayout", {
    nativeEvent: { lines },
  });

  await screen.rerender(<ChatBubble appearance="diary">짧은 답이에요.</ChatBubble>);
  expect(screen.getByTestId("diary-chat-bubble")).not.toHaveStyle({ width: 254 });
  await fireEvent(screen.getByLabelText("질문: 짧은 답이에요."), "textLayout", {
    nativeEvent: { lines: [{ text: "짧은 답이에요.", width: 80 }] },
  });
  expect(screen.getByTestId("diary-chat-bubble")).toHaveStyle({ width: 113 });
});

it("큰 글씨로 바꾸면 이전 폭을 그대로 쓰지 않는다", async () => {
  const scene = (scale: number) => (
    <PreviewFontScaleContext.Provider value={scale}>
      <ChatBubble appearance="diary" variant="answer">
        {original}
      </ChatBubble>
    </PreviewFontScaleContext.Provider>
  );
  const screen = await render(scene(1));
  await fireEvent(screen.getByLabelText(`내 답변: ${original}`), "textLayout", {
    nativeEvent: { lines },
  });
  expect(screen.getByTestId("diary-chat-bubble")).toHaveStyle({ width: 254 });

  await screen.rerender(scene(1.5));
  expect(screen.getByTestId("diary-chat-bubble")).not.toHaveStyle({ width: 254 });
});

it("부모 폭이 좁아지면 기존 측정 폭으로 넘치지 않고 다시 잰다", async () => {
  const screen = await render(<ChatBubble appearance="diary">{original}</ChatBubble>);
  await fireEvent(screen.getByLabelText(`질문: ${original}`), "textLayout", {
    nativeEvent: { lines },
  });

  await fireEvent(screen.getByTestId("diary-chat-bubble"), "layout", {
    nativeEvent: { layout: { x: 0, y: 0, width: 200, height: 100 } },
  });
  expect(screen.getByTestId("diary-chat-bubble")).not.toHaveStyle({ width: 254 });
  expect(screen.getByLabelText(`질문: ${original}`).props.onTextLayout).toBeDefined();
});
