import { fireEvent, render } from "@testing-library/react-native";

import { MyMainView } from "@/features/my/ui/MyMainView";

const callbacks = () => ({
  onOpenNotificationSettings: jest.fn(),
  onOpenCalendarLink: jest.fn(),
  onOpenProfile: jest.fn(),
  onOpenInquiry: jest.fn(),
  onOpenTerms: jest.fn(),
  onOpenPrivacy: jest.fn(),
  onSignOut: jest.fn(),
  onOpenWithdraw: jest.fn(),
});

describe("MyMainView", () => {
  it("운영 마이 본문의 프로필·설정·지원·계정을 표시한다", async () => {
    const screen = await render(
      <MyMainView
        nickname="모멘토리"
        recordedDays={12}
        notifyValue="매일 오후 9:30"
        calendarOn
        withdrawing={false}
        withdrawError={null}
        {...callbacks()}
      />,
    );

    for (const text of [
      "모멘토리",
      "모멘토리와 함께한 기록",
      "일기 쓴 날",
      "12일",
      "알림 설정",
      "캘린더 연동",
      "연결됨",
      "기본 정보 수정",
      "문의하기",
      "이용약관",
      "개인정보 처리방침",
      "로그아웃",
      "회원 탈퇴",
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
    expect(screen.queryByText("마이")).toBeNull();
    expect(screen.getByTestId("my-profile-card")).toBeTruthy();
    // 장식용 바바는 화면에 그리되 낭독기 탐색에서는 숨긴다.
    expect(screen.queryByTestId("home-v2-baba")).toBeNull();
    // HTML의 쉼/바람카드 예시 수치는 운영 데이터가 전달되지 않아 표시하지 않는다.
    expect(screen.queryByText("쉼 5번")).toBeNull();
    expect(screen.queryByText("바람카드 3장 모았어요")).toBeNull();
  });

  it("행 누름은 제공된 콜백으로 전달하고 연결된 캘린더는 누르지 못한다", async () => {
    const actions = callbacks();
    const screen = await render(
      <MyMainView
        nickname="모멘토리"
        recordedDays={0}
        notifyValue="꺼짐"
        calendarOn
        withdrawing={false}
        withdrawError={null}
        {...actions}
      />,
    );

    for (const [label, callback] of [
      ["알림 설정", actions.onOpenNotificationSettings],
      ["기본 정보 수정", actions.onOpenProfile],
      ["문의하기", actions.onOpenInquiry],
      ["이용약관", actions.onOpenTerms],
      ["개인정보 처리방침", actions.onOpenPrivacy],
      ["로그아웃", actions.onSignOut],
      ["회원 탈퇴", actions.onOpenWithdraw],
    ] as const) {
      await fireEvent.press(screen.getByText(label));
      expect(callback).toHaveBeenCalledTimes(1);
    }
    expect(actions.onOpenCalendarLink).not.toHaveBeenCalled();
  });

  it("미연결·오류·긴 닉네임·탈퇴 중 상태를 표시한다", async () => {
    const actions = callbacks();
    const nickname = "아주길고긴닉네임으로줄임표를확인해요";
    const screen = await render(
      <MyMainView
        nickname={nickname}
        recordedDays={0}
        notifyValue="꺼짐"
        settingsNote="설정을 저장하지 못했어요."
        calendarOn={false}
        withdrawing
        withdrawError="탈퇴하지 못했어요."
        {...actions}
      />,
    );

    expect(screen.getByText(nickname)).toBeTruthy();
    expect(screen.getByText("0일")).toBeTruthy();
    expect(screen.getByText("설정을 저장하지 못했어요.")).toBeTruthy();
    expect(screen.getByText("탈퇴하지 못했어요.")).toBeTruthy();
    await fireEvent.press(screen.getByText("캘린더 연동"));
    expect(actions.onOpenCalendarLink).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "회원 탈퇴" }).props.accessibilityState).toEqual({
      disabled: true,
    });
  });
});
