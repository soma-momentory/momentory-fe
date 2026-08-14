import { render, fireEvent, within } from "@testing-library/react-native";
import { router } from "expo-router";

import My from "../my";
import Report from "../report";

import { paperColors } from "@/design/paper";
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
    // 「이전 주 3회」는 앞 주(7/13~19)의 실제 장수에서 계산한 값이다
    const r = await render(<Report />);

    expect(r.getByText("이전 주보다 완만했어요")).toBeTruthy();
    expect(r.getByText("이전 주 3회")).toBeTruthy();
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
    // `%` 는 도넛의 감정 **비율**에만 쓴다(`app-flow.md` §2.6) — 실행률·달성률이 아니다
    expect(r.queryByText(/실행률|달성률|연속|최고 기록/)).toBeNull();
  });

  it("감정 도넛은 비율과 이름을 함께 말한다 — 색만으로 판단하게 하지 않는다", async () => {
    // 7/20 주 — 평온함 3 · 그 밖 7 (감정 기록 10개). 가운데는 최다 감정으로 연다
    const r = await render(<Report />);

    expect(r.getByLabelText(/주간 감정 비율/)).toBeTruthy();
    expect(r.getByText("30%")).toBeTruthy();
    // 범례 칩 — 고른 칩은 면·테두리·굵기가 함께 바뀐다
    expect(r.getByLabelText("평온함 30%").props.accessibilityState.selected).toBe(true);
  });

  it("범례를 누르면 도넛 가운데가 그 감정으로 바뀐다", async () => {
    const r = await render(<Report />);
    const second = r.getByLabelText("뿌듯함 20%");

    await fireEvent.press(second);

    expect(second.props.accessibilityState.selected).toBe(true);
    expect(r.getByText("20%")).toBeTruthy();
  });

  it("초록 통계 패널이 근거 수치를 모아 말한다", async () => {
    const r = await render(<Report />);

    expect(r.getByText("이 주의 기록 보러가기")).toBeTruthy();
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
  it("프로필은 닉네임과 회고 수 한 줄이다 — 통계 3칸은 새 디자인에서 빠졌다", async () => {
    const r = await render(<My />);

    expect(r.getByText("지현")).toBeTruthy();
    expect(r.getByText("총 회고 12회")).toBeTruthy();
  });

  it("연속 일수·점수·배지를 쓰지 않는다 — 「총 회고 12회」다", async () => {
    const r = await render(<My />);

    expect(r.queryByText(/일째|연속|점수|배지/)).toBeNull();
  });

  it("설정을 세 무리로 묶는다 — 앱 설정 · 지원 · 계정", async () => {
    const r = await render(<My />);

    for (const label of ["앱 설정", "지원", "계정"]) {
      expect(r.getByText(label)).toBeTruthy();
    }
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

    expect(r.getByText("연결 관리")).toBeTruthy();
    expect(r.getAllByText(/캘린더/)).toHaveLength(1);
  });

  it("눌러도 아무 일도 없는 줄을 두지 않는다", async () => {
    // 갈 곳이 없는 줄은 표식(›)도 두지 않고 눌리지도 않는다 (M3.md 와 같은 이유)
    const r = await render(<My />);
    const rowOf = (label: string) => r.getByText(label).parent;

    // 갈 곳이 있는 줄 — 눌린다
    for (const label of ["회고 프로필", "기본 정보", "알림 설정", "로그아웃"]) {
      expect(rowOf(label)?.parent?.props.accessibilityRole).toBe("button");
    }
    // 아직 갈 곳이 없는 줄 — 눌리지 않는다
    for (const label of ["연결 관리", "약관 및 정책", "문의하기"]) {
      expect(rowOf(label)?.parent?.props.accessibilityRole).not.toBe("button");
    }
  });

  it("회원 탈퇴는 확인 화면이 없어 아직 실행되지 않는다", async () => {
    // 되돌릴 수 없는 동작을 확인 없이 실행하지 않는다 (my.pendingStates).
    // 시안의 바닥 밑줄 텍스트 자리에 있지만 **아직 눌리지 않고**, 왜 그런지를
    // 바로 아래 한 줄이 말한다
    const r = await render(<My />);

    expect(r.getByText("회원 탈퇴")).toBeTruthy();
    expect(r.getByText("회원 탈퇴").parent?.parent?.props.accessibilityRole).not.toBe("button");
    expect(r.getAllByText("준비 중").length).toBeGreaterThanOrEqual(1);
  });

  it("기본 정보도 편집 화면으로 이어진다", async () => {
    const r = await render(<My />);
    await fireEvent.press(r.getByText("기본 정보"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/my/profile");
  });

  it("회원 탈퇴는 계정 카드 밖에 홀로 있다 — 로그아웃과 같은 무게로 보이지 않게", async () => {
    // 시안의 위험 동작은 면을 채우지 않고 바닥의 한 줄이다.
    // 언덕(#C7D3C0) 위라 글자는 greenStrong 이다 — danger 계열은 이 면에서 AA 미달
    const r = await render(<My />);
    const style = [r.getByText("회원 탈퇴").props.style].flat(Infinity).filter(Boolean);

    expect(r.getByText("로그아웃")).toBeTruthy();
    expect(Object.assign({}, ...style).color).toBe(paperColors.text.greenStrong);
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

describe("W1 · 주차 이동 — 수치와 해석이 함께 바뀐다", () => {
  const prev = async (r: Awaited<ReturnType<typeof render>>) =>
    fireEvent.press(r.getByLabelText("이전 주"));

  it("① 이전 주로 이동하면 날짜 범위가 바뀐다", async () => {
    const r = await render(<Report />);
    expect(r.getByText("7월 20일 ~ 7월 26일")).toBeTruthy();

    await prev(r);

    expect(r.getByText("7월 13일 ~ 7월 19일")).toBeTruthy();
  });

  it("② 회고·감정 수치가 바뀐다", async () => {
    const r = await render(<Report />);
    // 7/20 주 — 일기 5편 · 감정 10개
    expect(r.getByText("회고 5회 · 감정 기록 10개를 바탕으로 바바가 정리했어요")).toBeTruthy();

    await prev(r);

    // 7/13 주 — 13 · 15 · 17 세 편 · 감정 6개
    expect(r.getByText("회고 3회 · 감정 기록 6개를 바탕으로 바바가 정리했어요")).toBeTruthy();
    expect(r.getByText("3회")).toBeTruthy();
  });

  it("③ 한 주 요약과 흐름 문장도 그 주 값이다", async () => {
    // 서로 다른 한 주에 같은 문장을 보여주지 않는다
    const r = await render(<Report />);
    expect(
      r.getByText("흔들렸지만, 스스로를 다독이며 다시 균형을 찾아간 한 주였어요."),
    ).toBeTruthy();
    expect(r.getByText("다시 균형 찾기")).toBeTruthy();
    expect(r.getByText("무거운 몸으로 시작해 평온함으로 닫은 주였어요.")).toBeTruthy();

    await prev(r);

    expect(
      r.getByText("말수가 줄어든 주였지만, 그런 날도 있다고 스스로 넘겨준 한 주였어요."),
    ).toBeTruthy();
    expect(r.getByText("한 박자 쉬어가기")).toBeTruthy();
    expect(r.getByText("답답함으로 열었지만 끝에는 힘을 뺀 주였어요.")).toBeTruthy();
    // 앞 주의 문장이 남아 있으면 안 된다
    expect(r.queryByText("다시 균형 찾기")).toBeNull();
  });

  it("④ 이어갈 한 가지와 행동 수치도 그 주 값이다", async () => {
    const r = await render(<Report />);
    // 7/20 주 — 20 · 22 · 26 세 장을 만들고 20 · 22 를 해봤다
    expect(r.getByText("답이 막히면 핵심 한 가지부터 다시 말하기")).toBeTruthy();
    expect(r.getByText("3번 만들었고 · 2번 해봤어요")).toBeTruthy();

    await prev(r);

    // 7/13 주 — 13 · 17 두 장을 만들고 13 을 해봤다
    expect(r.getByText("답장이 밀리면 한 줄만 먼저 보내기")).toBeTruthy();
    expect(r.getByText("2번 만들었고 · 1번 해봤어요")).toBeTruthy();
  });

  it("⑤ 다시 다음 주로 가면 원래 데이터로 돌아온다", async () => {
    const r = await render(<Report />);
    await prev(r);

    await fireEvent.press(r.getByLabelText("다음 주"));

    expect(r.getByText("7월 20일 ~ 7월 26일")).toBeTruthy();
    expect(r.getByText("다시 균형 찾기")).toBeTruthy();
    expect(r.getByText("3번 만들었고 · 2번 해봤어요")).toBeTruthy();
  });

  it("⑥ 이동 범위의 끝에서는 화살표가 눌리지 않는다", async () => {
    // 해석이 준비된 주만 본다 — 없는 주로는 넘어가지 않는다
    const r = await render(<Report />);

    // 최신 주 — 다음이 없다
    expect(r.getByLabelText("다음 주").props.accessibilityState.disabled).toBe(true);
    expect(r.getByLabelText("이전 주").props.accessibilityState.disabled).toBe(false);

    await prev(r);

    // 가장 이른 주 — 이전이 없다
    expect(r.getByLabelText("이전 주").props.accessibilityState.disabled).toBe(true);
    expect(r.getByLabelText("다음 주").props.accessibilityState.disabled).toBe(false);

    await prev(r); // 눌러도 그대로다
    expect(r.getByText("7월 13일 ~ 7월 19일")).toBeTruthy();
  });

  it("「이전 주 N회」도 계산한다 — 앞 주가 없으면 비교하지 않는다", async () => {
    const r = await render(<Report />);
    expect(r.getByText("이전 주 3회")).toBeTruthy();

    await prev(r);

    expect(r.queryByText(/이전 주 \d+회/)).toBeNull();
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
