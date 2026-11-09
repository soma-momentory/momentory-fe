import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import AgeEdit from "../age";
import GenderEdit from "../gender";
import NicknameEdit from "../nickname";
import BasicInfoList from "../profile";

import { useProfile, useSettings } from "@/features/my/model/settings";
import { completeOnboarding } from "@/features/onboarding/data/completeOnboardingApi";
import { seedProfile } from "@/testing/fixtures";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

/**
 * 저장은 서버까지 간다 — **어댑터 아래는 `completeOnboardingApi.test`** 가 본다.
 * 여기서 보는 것은 「성공해야 목록으로 돌아간다 · 실패하면 한 줄」이라는 화면의 규칙이다.
 */
jest.mock("@/features/onboarding/data/completeOnboardingApi", () => ({
  completeOnboarding: jest.fn(),
}));

const submit = jest.mocked(completeOnboarding);

beforeEach(() => {
  seedProfile();
  useSettings.getState().reset();
  jest.clearAllMocks();
  submit.mockResolvedValue({ ok: true, data: { onboardingRequired: false } });
});

/**
 * 「잠긴다」를 **동작으로** 본다 — 옛 테스트가 보던 `opacity 0.36` 은 디자인이
 * 바뀌면 같이 깨지는 단언이었다. 새 DS 의 비활성은 `accessibilityState.disabled` 다
 * (온보딩 테스트와 같은 손잡이).
 */
const disabled = (labelNode: { parent: unknown }) => {
  const pressable = labelNode.parent as { props?: { accessibilityState?: { disabled?: boolean } } };
  return pressable?.props?.accessibilityState?.disabled === true;
};

const save = (r: Awaited<ReturnType<typeof render>>) => r.getByText("저장");

describe("M3 · 기본 정보 수정 목록", () => {
  it("지금 값을 한 줄로 보여준다", async () => {
    const r = await render(<BasicInfoList />);

    expect(r.getByText("지현")).toBeTruthy();
    expect(r.getByText("25세")).toBeTruthy();
    expect(r.getByText("여성")).toBeTruthy();
    // 온보딩이 묻지 않는 둘은 목록에서 뺐다(2026-11-08)
    expect(r.queryByText("관심 분야")).toBeNull();
    expect(r.queryByText("쉬는 방법")).toBeNull();
  });

  it("항목을 누르면 그 항목만 고치는 화면으로 간다", async () => {
    // 새 디자인은 한 화면 일괄 편집이 아니라 목록 → 항목 하나다 (design.md 「마이」)
    const r = await render(<BasicInfoList />);
    const routes = [
      ["닉네임", "/my/nickname"],
      ["나이", "/my/age"],
      ["성별", "/my/gender"],
    ] as const;

    for (const [label, href] of routes) {
      await fireEvent.press(r.getByText(label));
      expect(jest.mocked(router.push)).toHaveBeenCalledWith(href);
    }
  });

  it("목록에는 저장이 없다 — 고치는 자리가 아니다", async () => {
    const r = await render(<BasicInfoList />);

    expect(r.queryByText("저장")).toBeNull();
  });

  it("비어 있는 답도 빈칸으로 두지 않는다", async () => {
    useProfile.getState().set({ age: "", gender: null });
    const r = await render(<BasicInfoList />);

    expect(r.getAllByText("선택 안 함")).toHaveLength(2);
  });
});

describe("M4 · 닉네임 — 저장의 세 상태", () => {
  it("그대로면 잠기고 · 바꾸면 열리고 · 되돌리면 다시 잠긴다", async () => {
    // 「건드렸는가」가 아니라 「값이 다른가」로 판단한다 (design.md 「마이」)
    const r = await render(<NicknameEdit />);
    expect(disabled(save(r))).toBe(true);

    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");
    expect(disabled(save(r))).toBe(false);

    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현");
    expect(disabled(save(r))).toBe(true);
  });

  it("앞뒤 공백만 더한 것은 같은 답이다", async () => {
    const r = await render(<NicknameEdit />);

    await fireEvent.changeText(r.getByLabelText("닉네임"), " 지현 ");

    expect(disabled(save(r))).toBe(true);
  });

  it("비우면 저장할 수 없다", async () => {
    const r = await render(<NicknameEdit />);

    await fireEvent.changeText(r.getByLabelText("닉네임"), "");

    expect(disabled(save(r))).toBe(true);
  });

  it("금지어는 한 줄로 말하고 저장을 잠근다 — 모달을 띄우지 않는다", async () => {
    const r = await render(<NicknameEdit />);

    await fireEvent.changeText(r.getByLabelText("닉네임"), "바바");

    expect(
      r.getByText("바바와 모멘토리는 이미 있는 이름이에요. 다른 이름을 알려주세요."),
    ).toBeTruthy();
    expect(disabled(save(r))).toBe(true);
  });

  it("저장하면 서버로 가고 목록으로 돌아간다", async () => {
    const r = await render(<NicknameEdit />);
    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");

    await fireEvent.press(save(r));

    await waitFor(() => expect(useProfile.getState().nickname).toBe("지현이"));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ nickname: "지현이" }));
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("고치지 않은 값도 지금 값 그대로 함께 보낸다", async () => {
    // 서버가 통째로 덮어쓰는 엔드포인트다 — 빼고 보내면 다른 답이 지워진다
    const r = await render(<NicknameEdit />);
    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");

    await fireEvent.press(save(r));

    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith(
        expect.objectContaining({
          age: "25",
          gender: "FEMALE",
          interests: ["RELATIONSHIP", "SELF"],
          retroTime: "21:30",
          notifyRetro: true,
          calendarLinked: true,
        }),
      ),
    );
  });

  it("보내지 못하면 화면을 닫지 않고 한 줄로 말한다", async () => {
    submit.mockResolvedValue({ ok: false, code: "network" });
    const r = await render(<NicknameEdit />);
    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");

    await fireEvent.press(save(r));

    await waitFor(() =>
      expect(r.getByText("지금 연결이 불안정해요. 잠시 뒤 다시 시도해 주세요.")).toBeTruthy(),
    );
    expect(jest.mocked(router.back)).not.toHaveBeenCalled();
    // 서버가 받지 못한 값은 기기에도 남지 않는다
    expect(useProfile.getState().nickname).toBe("지현");
    expect(r.queryByText(/다시 시도하기|재시도/)).toBeNull();
  });
});

describe("M5 · 나이", () => {
  it("숫자만 들어오고 되돌리면 다시 잠긴다", async () => {
    const r = await render(<AgeEdit />);
    expect(disabled(save(r))).toBe(true);

    await fireEvent.changeText(r.getByLabelText("나이"), "26살");
    expect(disabled(save(r))).toBe(false);

    await fireEvent.changeText(r.getByLabelText("나이"), "25");
    expect(disabled(save(r))).toBe(true);
  });

  it("비우는 것도 하나의 답이다 — 선택 항목이라 되돌릴 길이 있다", async () => {
    const r = await render(<AgeEdit />);

    await fireEvent.press(r.getByLabelText("나이 지우기"));
    await fireEvent.press(save(r));

    await waitFor(() => expect(useProfile.getState().age).toBe(""));
    expect(submit).toHaveBeenCalledWith(expect.objectContaining({ age: "" }));
  });
});

describe("M6 · 성별", () => {
  it("다시 누르면 미선택으로 돌아간다 — 선택 항목이다", async () => {
    const r = await render(<GenderEdit />);

    await fireEvent.press(r.getByText("여성")); // 이미 골라져 있던 것
    expect(disabled(save(r))).toBe(false);

    await fireEvent.press(save(r));

    await waitFor(() => expect(useProfile.getState().gender).toBeNull());
  });

  it("골라 둔 것을 다시 고르면 저장이 잠긴다", async () => {
    const r = await render(<GenderEdit />);

    await fireEvent.press(r.getByText("남성"));
    await fireEvent.press(r.getByText("여성"));

    expect(disabled(save(r))).toBe(true);
  });
});
