import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import Inquiry from "../inquiry";

import { sendInquiry } from "@/features/my/data/inquiryApi";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

jest.mock("@/features/my/data/inquiryApi", () => ({
  ...jest.requireActual("@/features/my/data/inquiryApi"),
  sendInquiry: jest.fn(),
}));

const send = jest.mocked(sendInquiry);

const disabled = (labelNode: { parent: unknown }) => {
  const pressable = labelNode.parent as { props?: { accessibilityState?: { disabled?: boolean } } };
  return pressable?.props?.accessibilityState?.disabled === true;
};

beforeEach(() => {
  jest.clearAllMocks();
  send.mockResolvedValue(true);
});

describe("마이 · 문의하기", () => {
  it("종류와 내용이 있어야 보낼 수 있고, 이메일은 비워도 된다", async () => {
    const r = await render(<Inquiry />);

    expect(disabled(r.getByText("보내기"))).toBe(true);
    await fireEvent.press(r.getByText("오류 신고"));
    expect(disabled(r.getByText("보내기"))).toBe(true);
    await fireEvent.changeText(r.getByLabelText("문의 내용"), "  저장하면 꺼져요  ");
    expect(disabled(r.getByText("보내기"))).toBe(false);

    await fireEvent.press(r.getByText("보내기"));

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(send).toHaveBeenCalledWith({
      category: "BUG",
      content: "  저장하면 꺼져요  ",
      replyEmail: "",
    });
  });

  it("이메일 형식이 틀리면 한 줄로 알리고 잠근다", async () => {
    const r = await render(<Inquiry />);
    await fireEvent.press(r.getByText("기타"));
    await fireEvent.changeText(r.getByLabelText("문의 내용"), "내용");

    await fireEvent.changeText(r.getByLabelText("답변 받을 이메일"), "not-email");

    expect(r.getByText("이메일 주소를 다시 확인해 주세요.")).toBeTruthy();
    expect(disabled(r.getByText("보내기"))).toBe(true);
  });

  it("못 보내면 화면에 남아 한 줄로 알린다 — 쓴 글을 잃지 않는다", async () => {
    send.mockResolvedValue(false);
    const r = await render(<Inquiry />);
    await fireEvent.press(r.getByText("기능 제안"));
    await fireEvent.changeText(r.getByLabelText("문의 내용"), "다크 모드");

    await fireEvent.press(r.getByText("보내기"));

    await waitFor(() => expect(r.getByText(/문의를 보내지 못했어요/)).toBeTruthy());
    expect(router.back).not.toHaveBeenCalled();
    expect(r.getByDisplayValue("다크 모드")).toBeTruthy();
  });
});
