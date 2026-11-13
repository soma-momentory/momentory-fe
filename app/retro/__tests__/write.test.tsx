import { act, fireEvent, render, within } from "@testing-library/react-native";
import { Redirect, router } from "expo-router";

import RetroWrite from "../write";

import { useDiary } from "@/features/diary/model/diary";
import { useDay } from "@/features/home/model/day";
import { useSettings } from "@/features/my/model/settings";
import { useRetro } from "@/features/retro/model/retro";
import { authedRequest } from "@/lib/http";
import { testSchedules } from "@/testing/fixtures";

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), replace: jest.fn() },
  Redirect: jest.fn(() => null),
}));
jest.mock("@/lib/http", () => ({ authedRequest: jest.fn() }));

const request = jest.mocked(authedRequest);
const body = "오랜만에 산책했다.\n마음이 한결 가벼워졌다.";
const saved = { id: 81, original: body, emotions: [], createdAt: "2026-07-27T12:00:00Z" };

beforeEach(() => {
  jest.clearAllMocks();
  request.mockReset();
  useDiary.getState().reset();
  useRetro.getState().reset();
  useSettings.getState().reset();
  useDay.setState({ schedules: testSchedules() });
});

it("일정과 빈 입력칸을 보여주고 채팅을 시작하지 않는다", async () => {
  const screen = await render(<RetroWrite />);
  expect(screen.getByLabelText("일기 본문").props.value).toBe("");
  expect(screen.getByText("팀 회의")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "일기 저장하기" }).props.accessibilityState.disabled,
  ).toBe(true);
  expect(request).not.toHaveBeenCalled();
  expect(useRetro.getState().sessionId).toBeNull();
});

it("서버 저장을 기다리고 연속 누름을 막은 뒤 쉼터로 이동한다", async () => {
  let resolve!: (result: Awaited<ReturnType<typeof authedRequest>>) => void;
  request.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const screen = await render(<RetroWrite />);
  await fireEvent.changeText(screen.getByLabelText("일기 본문"), body);
  await fireEvent.press(screen.getByRole("button", { name: "일기 저장하기" }));
  expect(router.replace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByRole("button", { name: "저장 중…" }));
  expect(request).toHaveBeenCalledTimes(1);
  await act(async () => {
    resolve({ ok: true, data: saved });
  });
  expect(router.replace).toHaveBeenCalledWith("/(tabs)/rest?afterDiary=1");
  expect(useDiary.getState().diaries[0]?.body).toBe(body);
});

it("저장 실패 시 쓴 글을 유지하고 다시 저장할 수 있다", async () => {
  request.mockResolvedValueOnce({ ok: false, error: { code: "network" } });
  const screen = await render(<RetroWrite />);
  await fireEvent.changeText(screen.getByLabelText("일기 본문"), body);
  await fireEvent.press(screen.getByRole("button", { name: "일기 저장하기" }));
  expect(screen.getByText(/일기를 저장하지 못했어요/)).toBeTruthy();
  expect(screen.getByLabelText("일기 본문").props.value).toBe(body);
  expect(router.replace).not.toHaveBeenCalled();
  request.mockResolvedValueOnce({ ok: true, data: saved });
  await fireEvent.press(screen.getByRole("button", { name: "일기 저장하기" }));
  expect(router.replace).toHaveBeenCalledWith("/(tabs)/rest?afterDiary=1");
});

it("처음 편지 시각을 고르는 경우에도 저장 후 목적지는 쉼터다", async () => {
  useSettings.setState({ letterChosen: false });
  request.mockResolvedValueOnce({ ok: true, data: saved });
  const screen = await render(<RetroWrite />);
  await fireEvent.changeText(screen.getByLabelText("일기 본문"), body);
  await fireEvent.press(screen.getByRole("button", { name: "일기 저장하기" }));
  expect(router.replace).toHaveBeenCalledWith("/letter/time?next=rest");
});

it("오늘 일기가 있으면 직접 쓰기 딥링크에서도 하루 한 장을 지킨다", async () => {
  useDiary
    .getState()
    .save({ id: "81", date: "2026-07-27", body, babaView: null, emotions: [], edited: true });
  await render(<RetroWrite />);
  expect(jest.mocked(Redirect).mock.calls[0]?.[0]).toEqual({ href: "/retro/talk" });
  expect(request).not.toHaveBeenCalled();
});

it("저장 응답 전에 화면이 닫히면 뒤늦게 다른 화면으로 이동하지 않는다", async () => {
  let resolve!: (result: Awaited<ReturnType<typeof authedRequest>>) => void;
  request.mockReturnValueOnce(
    new Promise((done) => {
      resolve = done;
    }),
  );
  const screen = await render(<RetroWrite />);
  await fireEvent.changeText(screen.getByLabelText("일기 본문"), body);
  await fireEvent.press(screen.getByRole("button", { name: "일기 저장하기" }));
  await screen.unmount();
  await act(async () => {
    resolve({ ok: true, data: saved });
  });
  expect(router.replace).not.toHaveBeenCalled();
});

it("점선 사진 자리를 눌러 감정을 고르고 사진을 다시 눌러 바꿀 수 있다", async () => {
  const screen = await render(<RetroWrite />);
  expect(screen.queryByTestId("diary-emotion-photo")).toBeNull();
  await fireEvent.changeText(screen.getByLabelText("일기 본문"), body);
  await fireEvent.press(screen.getByRole("button", { name: "감정 선택" }));
  expect(screen.getByText("오늘 어떤 감정이었나요?")).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "기쁨" }));
  expect(screen.getByLabelText("기쁨의 카피바라 사진")).toBeTruthy();
  expect(screen.queryByText("오늘 어떤 감정이었나요?")).toBeNull();
  expect(screen.getByLabelText("일기 본문").props.value).toBe(body);
  await fireEvent.press(screen.getByRole("button", { name: "감정 바꾸기, 기쁨" }));
  await fireEvent.press(screen.getByRole("button", { name: "지침" }));
  expect(screen.getByLabelText("지침의 카피바라 사진")).toBeTruthy();
  request.mockResolvedValueOnce({
    ok: true,
    data: { ...saved, primaryEmotion: "exhausted", emotions: ["exhausted"] },
  });
  await fireEvent.press(screen.getByRole("button", { name: "일기 저장하기" }));
  expect(request).toHaveBeenCalledWith(
    "POST",
    "/api/v1/diaries",
    { original: body, emotion: "exhausted" },
    expect.any(Object),
  );
  expect(useDiary.getState().diaries[0]?.emotions).toEqual([12]);
});

it("선택창을 닫으면 점선 안내를 유지하고 선택 안 함은 무감정 사진을 저장한다", async () => {
  const screen = await render(<RetroWrite />);
  await fireEvent.press(screen.getByRole("button", { name: "감정 선택" }));
  await fireEvent.press(
    within(screen.getByTestId("ds-bottom-sheet")).getByRole("button", { name: "닫기" }),
  );
  expect(screen.getByRole("button", { name: "감정 선택" })).toBeTruthy();
  await fireEvent.press(screen.getByRole("button", { name: "감정 선택" }));
  await fireEvent.press(screen.getByRole("button", { name: "뿌듯함" }));
  await fireEvent.press(screen.getByRole("button", { name: "감정 바꾸기, 뿌듯함" }));
  await fireEvent.press(screen.getByRole("button", { name: "선택 안 함" }));
  expect(screen.getByRole("button", { name: "감정 바꾸기, 무감정" })).toBeTruthy();
  expect(screen.getByLabelText("무감정의 카피바라 사진")).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText("일기 본문"), body);
  request.mockResolvedValueOnce({ ok: true, data: saved });
  await fireEvent.press(screen.getByRole("button", { name: "일기 저장하기" }));
  expect(request).toHaveBeenCalledWith(
    "POST",
    "/api/v1/diaries",
    { original: body },
    expect.any(Object),
  );
  expect(useDiary.getState().diaries[0]?.emotions).toEqual([]);
});
