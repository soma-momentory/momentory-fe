import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import About from "../about";
import CalendarLink from "../calendar";
import Name from "../name";
import Notify from "../notify";
import Now from "../now";

import { IntroScreen } from "@/components/onboarding/IntroScreen";
import { QuestionScreen } from "@/components/onboarding/QuestionScreen";
import { useAuth } from "@/features/auth/model/auth";
import { useProfile, useSettings } from "@/features/my/model/settings";
import { completeOnboardingV2 } from "@/features/onboarding/data/completeOnboardingApi";
import { useOnboardingCompletion } from "@/features/onboarding/model/completion";
import { useDraft } from "@/features/onboarding/model/draft";

/**
 * 온보딩 v2 화면의 갈래(2026-10-25). 저장 계약은 `completeOnboardingApi.test` 가,
 * 순서 · 문구 규칙은 `flow.test` 가 본다. 여기서는 **누르면 어디로 가는가**만 본다.
 */
jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));
jest.mock("@/features/onboarding/data/completeOnboardingApi", () => ({
  ...jest.requireActual("@/features/onboarding/data/completeOnboardingApi"),
  completeOnboardingV2: jest.fn(),
}));

const push = jest.mocked(router.push);
const replace = jest.mocked(router.replace);
const submit = jest.mocked(completeOnboardingV2);

beforeEach(() => {
  jest.clearAllMocks();
  useDraft.getState().reset();
  useProfile.getState().reset();
  useSettings.getState().reset();
  useOnboardingCompletion.getState().reset();
  useAuth.setState({ status: "anonymous" });
});

describe("소개", () => {
  it("마지막 장 다음은 로그인이다", async () => {
    const { getByText } = await render(<IntroScreen id="report" />);
    await fireEvent.press(getByText("다음"));
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("이미 로그인한 사람(다시 온보딩)은 로그인을 건너뛰고, 지금 값을 미리 채워 질문으로 간다", async () => {
    useAuth.setState({ status: "authenticated" });
    useProfile.getState().set({ nickname: "모리", age: "30", gender: "MALE" });
    const { getByText } = await render(<IntroScreen id="report" />);

    await fireEvent.press(getByText("다음"));

    expect(push).toHaveBeenCalledWith("/mood");
    expect(useDraft.getState()).toMatchObject({ nickname: "모리", age: "30", reonboarding: true });
  });

  it("문제 장의 건너뛰기는 소개 첫 장으로 간다", async () => {
    const { getByText } = await render(<IntroScreen id="blur" />);
    await fireEvent.press(getByText("건너뛰기"));
    expect(push).toHaveBeenCalledWith("/intro/talk");
  });
});

describe("질문", () => {
  it("고르면 답을 담고 다음 질문으로 간다", async () => {
    const { getByText } = await render(<QuestionScreen questionKey="dayEnd" />);

    await fireEvent.press(getByText("지쳐서 바로 자요"));

    expect(useDraft.getState().answers.dayEnd).toBe("TIRED_SLEEP");
    expect(push).toHaveBeenCalledWith("/diary-history");
  });

  it("넷째 질문 다음은 목표다", async () => {
    const { getByText } = await render(<QuestionScreen questionKey="diaryHistory" />);
    await fireEvent.press(getByText("꾸준히 써요"));
    expect(push).toHaveBeenCalledWith("/goal");
  });

  it("건너뛰기는 답을 비우고 이름으로 간다", async () => {
    useDraft.getState().answer("moodChange", "RARELY");
    const { getByText } = await render(<QuestionScreen questionKey="moodChange" />);

    await fireEvent.press(getByText("건너뛰기"));

    expect(useDraft.getState().answers.moodChange).toBeNull();
    expect(push).toHaveBeenCalledWith("/name");
  });
});

describe("이름 · 나이 성별", () => {
  it("나이 · 성별은 이름을 불러 먼저 양해를 구하고, 쓰임을 좁혀 말한다", async () => {
    useDraft.getState().set("nickname", " 하늘 ");
    const { getByText } = await render(<About />);
    expect(getByText("하늘님, 나이랑 성별도 물어봐도 될까요?")).toBeTruthy();
    expect(getByText("바바가 말을 건넬 때만 참고할게요")).toBeTruthy();
  });

  it("이름 화면에는 뒤로 가기가 없다", async () => {
    const { queryByLabelText } = await render(<Name />);
    expect(queryByLabelText("뒤로")).toBeNull();
  });

  it.each([
    ["나이 · 성별", About],
    ["캘린더", CalendarLink],
    ["알림", Notify],
  ])("%s 화면에는 뒤로 가기가 있다", async (_, Screen) => {
    const { getByLabelText } = await render(<Screen />);
    await fireEvent.press(getByLabelText("뒤로"));
    expect(jest.mocked(router.back)).toHaveBeenCalledTimes(1);
  });
});

describe("알림", () => {
  it("질문 3 에서 「지쳐서 바로 자요」를 골랐으면 9시가 먼저 골라져 있다", async () => {
    useDraft.getState().answer("dayEnd", "TIRED_SLEEP");
    const { getByText } = await render(<Notify />);
    expect(getByText("밤 9:00")).toBeTruthy();
  });

  it("다시 온보딩하는 사람은 지금 시각이 먼저 골라져 있다", async () => {
    useDraft.getState().set("retroTime", "07:30");
    const { getAllByText } = await render(<Notify />);
    // 잠금화면 시각과 「직접 고를게요」 칩 두 곳에 같은 시각이 보인다
    expect(getAllByText("아침 7:30")).toHaveLength(2);
  });

  it("「나중에」는 알림만 끄고 시각은 남긴다", async () => {
    const { getByText } = await render(<Notify />);
    await fireEvent.press(getByText("나중에"));
    expect(useDraft.getState()).toMatchObject({ notifyRetro: false, retroTime: "22:30" });
    expect(push).toHaveBeenCalledWith("/research");
  });
});

describe("지금 첫 회고", () => {
  const fill = () => {
    useDraft.getState().set("nickname", "하늘");
    useDraft.getState().answer("dayEnd", "TIRED_SLEEP");
  };

  it("「지금 이야기하기」 — 답을 보내고 홈 위에 회고를 연다", async () => {
    fill();
    submit.mockResolvedValue({ ok: true, data: { onboardingRequired: false } });
    const { getByText } = await render(<Now />);

    await fireEvent.press(getByText("지금 이야기하기"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
    expect(push).toHaveBeenCalledWith("/retro/confirm");
    expect(submit).toHaveBeenCalledWith(
      expect.objectContaining({ nickname: "하늘", retroTime: "21:00" }),
    );
    expect(useOnboardingCompletion.getState().completed).toBe(true);
    expect(useDraft.getState().nickname).toBe("");
    expect(useProfile.getState().nickname).toBe("하늘");
  });

  it("알림을 안 켰으면 「다음에 할게요」 — 누르면 홈으로만 간다", async () => {
    fill();
    submit.mockResolvedValue({ ok: true, data: { onboardingRequired: false } });
    const { getByText } = await render(<Now />);

    await fireEvent.press(getByText("다음에 할게요"));

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/home"));
    expect(push).not.toHaveBeenCalled();
  });

  it("저장에 실패하면 한 줄만 띄우고 머문다", async () => {
    fill();
    submit.mockResolvedValue({ ok: false, code: "network" });
    const { getByText, findByText } = await render(<Now />);

    await fireEvent.press(getByText("지금 이야기하기"));

    expect(await findByText("지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    expect(useOnboardingCompletion.getState().completed).toBeNull();
  });
});
