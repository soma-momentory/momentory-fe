import { render, fireEvent, act } from "@testing-library/react-native";
import { router } from "expo-router";

import NotifySettings from "../notify";
import ProfileEdit from "../profile";

import { useProfile, useSettings } from "@/features/my/model/settings";

/** `beforeRemove` 가 받는 이벤트 — 실제 타입의 필요한 부분만 */
type LeaveEvent = { preventDefault: jest.Mock; data: { action: { type: string } } };

const mockNavDispatch = jest.fn();
const mockNavListeners: Record<string, (e: LeaveEvent) => void> = {};

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  // 화면이 라우트 수준 이탈 보호(beforeRemove)를 걸 수 있어야 한다
  useNavigation: () => ({
    addListener: (type: string, cb: (e: LeaveEvent) => void) => {
      mockNavListeners[type] = cb;
      return () => {};
    },
    dispatch: mockNavDispatch,
  }),
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

beforeEach(() => {
  useProfile.getState().reset();
  useSettings.getState().reset();
  jest.clearAllMocks();
});

describe("M2 · 저장은 바꾼 것이 있을 때만", () => {
  it("바꾼 것이 없으면 저장이 잠긴다", async () => {
    // 누를 수 있는 저장 버튼은 「뭔가 바뀌었다」는 신호다 (M2.md)
    const r = await render(<ProfileEdit />);

    expect(flatten(r.getByText("저장하기").parent?.props.style).opacity).toBe(0.36);
  });

  it("고치면 열리고 저장하면 남는다", async () => {
    const r = await render(<ProfileEdit />);
    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");

    expect(flatten(r.getByText("저장하기").parent?.props.style).opacity).toBeUndefined();

    await fireEvent.press(r.getByText("저장하기"));

    expect(useProfile.getState().nickname).toBe("지현이");
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("바꾼 것이 없으면 뒤로가기가 바로 나간다", async () => {
    const r = await render(<ProfileEdit />);

    await fireEvent.press(r.getByLabelText("뒤로"));

    expect(jest.mocked(router.back)).toHaveBeenCalled();
    expect(r.queryByText("고친 내용을 저장하지 않고 나갈까요?")).toBeNull();
  });

  it("고치고 나가려 하면 확인을 묻는다", async () => {
    // 나가기 버튼을 따로 두지 않고 상단 뒤로가기로 통일한다 (my.invariants)
    const r = await render(<ProfileEdit />);
    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");

    await fireEvent.press(r.getByLabelText("뒤로"));

    expect(r.getByText("고친 내용을 저장하지 않고 나갈까요?")).toBeTruthy();
    expect(jest.mocked(router.back)).not.toHaveBeenCalled();
  });

  it("확인에서 계속 고치기를 누르면 남는다", async () => {
    const r = await render(<ProfileEdit />);
    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");
    await fireEvent.press(r.getByLabelText("뒤로"));

    await fireEvent.press(r.getByText("계속 고치기"));

    expect(r.queryByText("고친 내용을 저장하지 않고 나갈까요?")).toBeNull();
    expect(jest.mocked(router.back)).not.toHaveBeenCalled();
  });

  it("나가기를 누르면 고친 값이 저장되지 않는다", async () => {
    const r = await render(<ProfileEdit />);
    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");
    await fireEvent.press(r.getByLabelText("뒤로"));

    await fireEvent.press(r.getByText("나가기"));

    expect(useProfile.getState().nickname).toBe("지현");
    expect(jest.mocked(router.back)).toHaveBeenCalled();
  });

  it("[변경하지 않고 나가기] 버튼을 두지 않는다", async () => {
    const r = await render(<ProfileEdit />);

    expect(r.queryByText(/변경하지 않고/)).toBeNull();
  });
});

describe("M2 · 이탈 보호는 라우트 수준이다 — Android back·스와이프도 같은 정책", () => {
  // OS 뒤로가기(하드웨어 back·스와이프)가 라우트를 벗어나려는 순간을 흉내 낸다
  const osBack = async (): Promise<LeaveEvent> => {
    const e: LeaveEvent = { preventDefault: jest.fn(), data: { action: { type: "GO_BACK" } } };
    await act(async () => mockNavListeners.beforeRemove?.(e));
    return e;
  };

  it("바꾼 것이 없으면 OS 뒤로가기를 막지 않는다", async () => {
    const r = await render(<ProfileEdit />);

    const e = await osBack();

    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(r.queryByText("고친 내용을 저장하지 않고 나갈까요?")).toBeNull();
  });

  it("고친 채 OS 뒤로가기를 하면 막고 상단 뒤로가기와 같은 확인을 묻는다", async () => {
    const r = await render(<ProfileEdit />);
    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");

    const e = await osBack();

    expect(e.preventDefault).toHaveBeenCalled();
    expect(r.getByText("고친 내용을 저장하지 않고 나갈까요?")).toBeTruthy();
  });

  it("확인의 [나가기]는 막아 둔 네비게이션을 이어서 실행하고 값은 버려진다", async () => {
    const r = await render(<ProfileEdit />);
    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");
    await osBack();

    await fireEvent.press(r.getByText("나가기"));

    expect(mockNavDispatch).toHaveBeenCalledWith({ type: "GO_BACK" });
    expect(useProfile.getState().nickname).toBe("지현");
  });

  it("[계속 고치기]를 누르면 화면에 남고 아무것도 실행되지 않는다", async () => {
    const r = await render(<ProfileEdit />);
    await fireEvent.changeText(r.getByLabelText("닉네임"), "지현이");
    await osBack();

    await fireEvent.press(r.getByText("계속 고치기"));

    expect(r.queryByText("고친 내용을 저장하지 않고 나갈까요?")).toBeNull();
    expect(mockNavDispatch).not.toHaveBeenCalled();
    expect(jest.mocked(router.back)).not.toHaveBeenCalled();
  });
});

describe("M2 · 선택 표시와 상한", () => {
  it("고른 칩에 체크가 붙는다 — 색·굵기만으로 표시하지 않는다", async () => {
    const r = await render(<ProfileEdit />);

    // 「인간관계」는 이미 골라져 있고 「가족」은 아니다
    expect(r.getByText("인간관계").parent?.props.accessibilityState.selected).toBe(true);
    expect(r.getByTestId("chip-check-RELATIONSHIP")).toBeTruthy();
    expect(r.queryByTestId("chip-check-FAMILY")).toBeNull();

    await fireEvent.press(r.getByText("가족"));

    expect(r.getByTestId("chip-check-FAMILY")).toBeTruthy();
  });

  it("쉬는 방법과 성별 칩에도 체크가 붙는다", async () => {
    const r = await render(<ProfileEdit />);

    expect(r.getByTestId("chip-check-🎵 음악 듣기")).toBeTruthy();
    expect(r.getByTestId("chip-check-FEMALE")).toBeTruthy();
  });

  it("관심 분야는 최대 3개 — 넷째는 눌러도 켜지지 않는다", async () => {
    const r = await render(<ProfileEdit />);
    // 시작이 둘(인간관계·나 자신)이라 하나 더하면 셋이다
    await fireEvent.press(r.getByText("가족"));
    expect(r.getByText("최대 3개 · 3개 선택")).toBeTruthy();

    await fireEvent.press(r.getByText("건강"));

    expect(r.getByText("최대 3개 · 3개 선택")).toBeTruthy();
    expect(r.getByText("건강").parent?.props.accessibilityState.selected).toBe(false);
  });

  it("쉬는 방법은 접혀 있고 [＋ 더 고르기] 로 편다", async () => {
    const r = await render(<ProfileEdit />);
    expect(r.queryByText("🎮 게임하기")).toBeNull();

    await fireEvent.press(r.getByText("＋ 더 고르기"));

    expect(r.getByText("🎮 게임하기")).toBeTruthy();
    expect(r.queryByText("＋ 더 고르기")).toBeNull();
  });
});

describe("M2 · 기본 정보 — 온보딩 05-b 의 편집 경로", () => {
  it("나이와 성별을 고쳐 저장한다", async () => {
    const r = await render(<ProfileEdit />);

    await fireEvent.changeText(r.getByLabelText("나이"), "26");
    await fireEvent.press(r.getByText("남성"));
    await fireEvent.press(r.getByText("저장하기"));

    expect(useProfile.getState().age).toBe("26");
    expect(useProfile.getState().gender).toBe("MALE");
  });

  it("성별은 다시 누르면 미선택으로 돌아간다 — 선택 항목이다", async () => {
    const r = await render(<ProfileEdit />);

    await fireEvent.press(r.getByText("여성")); // 이미 골라져 있던 것
    await fireEvent.press(r.getByText("저장하기"));

    expect(useProfile.getState().gender).toBeNull();
  });

  it("개인정보 문구는 실제 처리와 같은 말을 쓴다", async () => {
    const r = await render(<ProfileEdit />);

    expect(
      r.getByText("답변은 질문을 조금 더 잘 맞추는 데만 사용하며, 다른 사람에게 공개되지 않아요."),
    ).toBeTruthy();
  });
});

describe("M3 · 알림 설정", () => {
  it("한 행이 시각과 켜짐을 함께 담는다", async () => {
    // 하나의 설정을 두 줄로 나누지 않는다 (M3.md)
    const r = await render(<NotifySettings />);

    expect(r.getByText("회고 시간 알림")).toBeTruthy();
    expect(r.getByText("매일 밤 9:30")).toBeTruthy();
    expect(r.getByLabelText("회고 시간 알림")).toBeTruthy(); // 스위치
  });

  it("스위치는 켜고 끄기만 한다 — 시각을 건드리지 않는다", async () => {
    const r = await render(<NotifySettings />);

    await fireEvent.press(r.getByLabelText("회고 시간 알림"));

    expect(useSettings.getState().notify.retro.enabled).toBe(false);
    // 껐다고 값을 지우면 다시 켜는 일이 다시 설정하는 일이 된다
    expect(useSettings.getState().notify.retro.time).toBe("21:30");
    expect(r.getByText("매일 밤 9:30")).toBeTruthy();
  });

  it("꺼도 설정한 시각은 남는다 — 다시 켜면 그 시각 그대로", async () => {
    const r = await render(<NotifySettings />);
    const sw = r.getByLabelText("주간 돌아보기");

    await fireEvent.press(sw); // 끔
    await fireEvent.press(sw); // 다시 켬

    expect(useSettings.getState().notify.weekly).toMatchObject({
      enabled: true,
      time: "21:00",
    });
  });

  it("행을 누르면 시각을 고친다", async () => {
    const r = await render(<NotifySettings />);

    await fireEvent.press(r.getByText("회고 시간 알림"));

    // 피커가 열리고, 고른 값이 store 에 남는다
    await act(async () => {
      useSettings.getState().setTime("retro", "22:00");
    });

    expect(useSettings.getState().notify.retro.time).toBe("22:00");
    expect(r.getByText("매일 밤 10:00")).toBeTruthy();
  });

  it("시각이 없는 [새로운 소식] 은 눌리지 않는다", async () => {
    // 누를 곳이 없는 표식을 만들지 않는다 (M3.md)
    const r = await render(<NotifySettings />);
    const row = r.getByText("새로운 소식").parent;

    expect(row?.parent?.props.accessibilityRole).not.toBe("button");
    // 스위치는 있다 — 켜고 끄기는 된다
    expect(r.getByLabelText("새로운 소식")).toBeTruthy();
  });

  it("캘린더를 이 화면에 두지 않는다", async () => {
    const r = await render(<NotifySettings />);

    expect(r.queryByText(/캘린더/)).toBeNull();
  });

  it("앱 잠금·축하 토글을 두지 않는다", async () => {
    const r = await render(<NotifySettings />);

    expect(r.queryByText(/앱 잠금|나만의 공간|축하/)).toBeNull();
  });

  it("보호 안내는 확정된 범위만 말한다", async () => {
    const r = await render(<NotifySettings />);

    expect(r.getByText("기록 보호 방식은 개인정보 처리방침에서 확인할 수 있어요")).toBeTruthy();
    expect(r.queryByText(/나만 볼 수 있|암호화/)).toBeNull();
  });
});
