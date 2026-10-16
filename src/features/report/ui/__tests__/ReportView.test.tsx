import { fireEvent, render } from "@testing-library/react-native";

import type { WeeklyReport } from "@/features/report/model/weeklyReport";
import { ReportView } from "@/features/report/ui/ReportView";

const REPORT: WeeklyReport = {
  startDate: "2026-10-11",
  endDate: "2026-10-17",
  days: Array.from({ length: 7 }, (_, i) => ({
    date: `2026-10-${11 + i}`,
    emotion: null,
    emotions: [],
  })),
  dominantEmotion: null,
  moodMessage: "아직 기록된 마음이 없어요.",
  scheduleTotal: 0,
  scheduleCompleted: 0,
  actionCardCreated: 0,
  actionCardCompleted: 0,
  needs: [],
  practicedWishes: [],
  diaryCount: 0,
};

const props = {
  range: "10월 11일 ~ 10월 17일",
  report: REPORT,
  status: "ready" as const,
  thisWeek: true,
  writtenDates: new Set<string>(),
  onOpenWeekPicker: jest.fn(),
  onOpenArchive: jest.fn(),
};

describe("ReportView", () => {
  beforeEach(() => jest.clearAllMocks());

  it("기록 없는 한 주도 운영 카드와 0건 정책으로 표시한다", async () => {
    const screen = await render(<ReportView {...props} />);

    expect(screen.getByText("아직 기록된 마음이 없어요.")).toBeTruthy();
    expect(screen.getByText("이번 주 감정들")).toBeTruthy();
    expect(screen.getByText("이번 주에 찾은 바람이 아직 없어요")).toBeTruthy();
    expect(screen.getByText("이번 주 기록")).toBeTruthy();
    expect(screen.getAllByText("없음")).toHaveLength(2);
  });

  it("주 선택과 보관함 이동은 콜백만 호출한다", async () => {
    const screen = await render(<ReportView {...props} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "10월 11일 ~ 10월 17일 · 주 고르기" }),
    );
    await fireEvent.press(screen.getByText("이번 주 기록 보기"));

    expect(props.onOpenWeekPicker).toHaveBeenCalledTimes(1);
    expect(props.onOpenArchive).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["loading", "한 주를 모으고 있어요"],
    ["failed", "리포트를 불러오지 못했어요 · 잠시 뒤에 다시 열어 주세요"],
  ] as const)("%s 상태는 기존 안내를 표시한다", async (status, message) => {
    const screen = await render(<ReportView {...props} report={null} status={status} />);

    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText("이번 주 기록")).toBeNull();
  });

  it("지난 주의 긴 문구도 전달받은 그대로 표시한다", async () => {
    const message = "이 주에는 여러 마음이 찾아와서 하루마다 남은 이야기가 길어졌어요.";
    const screen = await render(
      <ReportView {...props} thisWeek={false} report={{ ...REPORT, moodMessage: message }} />,
    );

    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.getByText("이 주 감정들")).toBeTruthy();
    expect(screen.getByText("이 주의 기록 보기")).toBeTruthy();
  });
});
