import { render, fireEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";

import My from "../my";
import Report from "../report";

import { text as textColor } from "@/design/tokens.mvp";
import { useDiary } from "@/features/diary/model/diary";
import { useProfile, useSettings } from "@/features/my/model/settings";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
}));

beforeEach(() => {
  useDiary.getState().reset();
  useSettings.getState().reset();
  useProfile.getState().reset();
  jest.clearAllMocks();
});

describe("W1 · 주간 리포트 — 평가가 아니라 관찰이다", () => {
  it("문구를 기간에 매지 않는다 — 「이번 주」라고 쓰지 않는다", async () => {
    // 지난 주차를 넘겨볼 때도 같은 말이 맞아야 한다 (W1.md)
    const r = await render(<Report />);

    expect(r.getByText("한 주 요약")).toBeTruthy();
    expect(r.getByText("한 주의 흐름")).toBeTruthy();
    expect(r.getByText("이어갈 한 가지")).toBeTruthy();
    expect(r.queryByText(/이번 주/)).toBeNull();
  });

  it("그 주 회고 횟수와 감정 기록 수를 센다", async () => {
    // 7/20~26 — 일기 5편 · 감정 기록 10개
    const r = await render(<Report />);

    expect(r.getByText("5회")).toBeTruthy();
    expect(r.getByText("회고 5회 · 감정 기록 10개를 바탕으로 바바가 정리했어요")).toBeTruthy();
  });

  it("그 주 가장 많이 기록한 감정은 평온함이다 — 보관함·마이와 기간이 다르다", async () => {
    // 「평온함」은 요일 칸에도 나온다 — 지표는 「3번 기록」이 함께 붙은 쪽이다
    const r = await render(<Report />);

    expect(r.getByText("가장 많이 기록한 감정")).toBeTruthy();
    expect(r.getByText("3번 기록")).toBeTruthy();
    // 그 주 평온함은 21·24·26 세 번이다
    expect(r.getAllByText("평온함").length).toBeGreaterThanOrEqual(3);
  });

  it("흐름 라벨이 상태를 단정하지 않는다 — 「회복」을 쓰지 않는다", async () => {
    const r = await render(<Report />);

    expect(r.getByText("다시 균형 찾기")).toBeTruthy();
    expect(r.queryByText("회복")).toBeNull();
  });

  it("비교는 기준을 밝혀 쓴다", async () => {
    const r = await render(<Report />);

    expect(r.getByText("이전 주보다 완만했어요")).toBeTruthy();
    expect(r.getByText("이전 주 4회")).toBeTruthy();
  });

  it("요일 일곱 칸을 두고 기록 없는 날은 「기록 없음」이다", async () => {
    // 7/23 목 · 7/25 토는 일기가 없다
    const r = await render(<Report />);

    for (const d of ["월", "화", "수", "목", "금", "토", "일"]) {
      expect(r.getByLabelText(`${d}요일`)).toBeTruthy();
    }
    expect(r.getAllByText("기록 없음")).toHaveLength(2);
  });

  it("감정을 이름과 함께 적는다 — 색만으로 판단하게 하지 않는다", async () => {
    const r = await render(<Report />);
    const thursday = within(r.getByLabelText("목요일"));
    const monday = within(r.getByLabelText("월요일"));

    expect(thursday.getByText("기록 없음")).toBeTruthy();
    expect(monday.getByText("피곤함")).toBeTruthy();
    expect(monday.getByText("뿌듯함")).toBeTruthy();
  });

  it("행동은 만든 수와 해본 수만 적는다 — 실행률·연속을 세지 않는다", async () => {
    const r = await render(<Report />);

    expect(r.getByText("3번 만들었고 · 2번 해봤어요")).toBeTruthy();
    expect(r.queryByText(/실행률|%|연속|최고 기록/)).toBeNull();
  });

  it("점수·등급·배지를 쓰지 않는다", async () => {
    const r = await render(<Report />);

    expect(r.queryByText(/점수|등급|배지|\d+점/)).toBeNull();
  });

  it("일기 7편 미만이면 잠긴 화면 대신 한 줄로 예고한다", async () => {
    // 잠긴 문을 보여주면 못 연 것이 사용자 탓이 된다 (W1.md)
    useDiary.setState({ diaries: useDiary.getState().diaries.slice(0, 3) });
    const r = await render(<Report />);

    expect(r.getByText("일기 7편이 모이면 한 주를 정리해 드릴게요")).toBeTruthy();
    expect(r.getByText("지금까지 3편 · 천천히 모아도 괜찮아요")).toBeTruthy();
    expect(r.queryByText(/잠김|잠겨|열리지 않/)).toBeNull();
  });
});

describe("M1 · 마이 홈", () => {
  it("같은 값을 두 칸에 넣지 않는다 — 세는 대상이 다르다", async () => {
    const r = await render(<My />);

    expect(r.getByText("12회")).toBeTruthy();
    expect(r.getByText("총 회고")).toBeTruthy();
    expect(r.getByText("12일")).toBeTruthy();
    expect(r.getByText("함께한 날")).toBeTruthy();
  });

  it("가장 많이 기록한 감정은 전체 기간 기준이다 — 보관함·리포트와 다르다", async () => {
    const r = await render(<My />);

    expect(r.getByText("화남/답답")).toBeTruthy();
  });

  it("연속 일수·점수·배지를 쓰지 않는다 — 「일기 12편」이다", async () => {
    const r = await render(<My />);

    expect(r.getByText("밤 9:30 회고 · 일기 12편")).toBeTruthy();
    expect(r.queryByText(/일째|연속|점수|배지/)).toBeNull();
  });

  it("온보딩 여섯 질문의 편집 경로가 빠짐없이 있다", async () => {
    const r = await render(<My />);

    for (const label of ["회고 프로필", "기본 정보", "알림 설정", "연결 관리"]) {
      expect(r.getByText(label)).toBeTruthy();
    }
  });

  it("앱 잠금·내보내기 줄을 두지 않는다 — 갈 곳 없는 줄을 만들지 않는다", async () => {
    const r = await render(<My />);

    expect(r.queryByText(/앱 잠금|나만의 공간|내보내기/)).toBeNull();
  });

  it("캘린더는 [연결 관리] 한 곳뿐이다", async () => {
    const r = await render(<My />);

    expect(r.getAllByText("캘린더")).toHaveLength(1);
  });

  it("회원 탈퇴는 로그아웃과 줄을 나누고 dangerInk 글자를 쓴다", async () => {
    const r = await render(<My />);
    const style = [r.getByText("회원 탈퇴").props.style].flat(Infinity).filter(Boolean);

    expect(r.getByText("로그아웃")).toBeTruthy();
    expect(Object.assign({}, ...style).color).toBe(textColor.danger);
  });

  it("회고 프로필로 갈 수 있다", async () => {
    const r = await render(<My />);
    await fireEvent.press(r.getByText("회고 프로필"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/my/profile");
  });

  it("알림을 끄면 설정 줄이 「꺼짐」이 된다", async () => {
    useSettings.getState().toggle("retro");
    const r = await render(<My />);

    expect(r.getByText("꺼짐")).toBeTruthy();
  });
});

describe("하단 탭 — 네 칸이 전부 이어진다", () => {
  it("리포트에서 다른 탭으로 옮겨갈 수 있다", async () => {
    const r = await render(<Report />);
    const tabs = r.getAllByRole("tab");
    const my = tabs.find((t) => within(t).queryByText("마이") != null);

    await fireEvent.press(my!);

    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/my");
  });
});
