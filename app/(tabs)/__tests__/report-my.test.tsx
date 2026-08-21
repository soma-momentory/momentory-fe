import { render, fireEvent, waitFor, within } from "@testing-library/react-native";
import { router } from "expo-router";

import My from "../my";
import Report from "../report";

import { useDiary } from "@/features/diary/model/diary";
import { useProfile, useSettings } from "@/features/my/model/settings";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
  Stack: jest.fn(() => null),
}));

// 앱 안 브라우저도 네이티브다 — 「지원」 세 줄이 무엇을 여는지만 본다
jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(() => Promise.resolve()) }));
const browser = jest.requireMock("expo-web-browser") as { openBrowserAsync: jest.Mock };

/** `M2` 시트가 보는 OS 권한. 기본은 허용이고, 각 테스트가 거부로 바꾼다 */
const notifications = jest.requireMock("expo-notifications") as {
  getPermissionsAsync: jest.Mock;
  requestPermissionsAsync: jest.Mock;
};

beforeEach(() => {
  useDiary.getState().reset();
  useSettings.getState().reset();
  useProfile.getState().reset();
  jest.clearAllMocks();
  notifications.getPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
  notifications.requestPermissionsAsync.mockResolvedValue({ granted: true, canAskAgain: false });
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

  it("도넛·비율·범례를 쓰지 않는다 — 감정은 7일 흐름으로만 말한다", async () => {
    // design.md 「리포트」 — 「도넛·비율·범례 없이 7일 감정 흐름 + 요약 2줄」.
    // 완료율·%·분석 같은 표현도 쓰지 않는다
    const r = await render(<Report />);

    expect(r.queryByText(/%/)).toBeNull();
    expect(r.queryByLabelText(/비율/)).toBeNull();
    expect(r.queryByText(/완료율|실행률|분석|평균/)).toBeNull();
  });

  it("지표는 값 하나로 말한다 — 분모를 붙이지 않는다", async () => {
    // 「5회 / 7일 중」이 되는 순간 비율이 읽히고, 비율은 평가가 된다
    const r = await render(<Report />);

    expect(r.getByText("한 주 한눈에")).toBeTruthy();
    expect(r.getByText("5회")).toBeTruthy();
    expect(r.queryByText(/중 \d+|\/\s*\d+/)).toBeNull();
  });

  it("보조 행동으로 그 주의 기록을 보러 간다", async () => {
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

describe("M1 · 마이 기본", () => {
  it("프로필은 이니셜 · 닉네임 · 기록 일수 한 줄이다", async () => {
    // 「총 회고 12회」는 내부 용어였다 — 새 디자인은 「일기 12일 기록」이다
    const r = await render(<My />);

    expect(r.getByText("지현")).toBeTruthy();
    expect(r.getByText("일기 12일 기록")).toBeTruthy();
    expect(r.queryByText(/회고 \d+회/)).toBeNull();
  });

  it("연속 일수·점수·배지를 쓰지 않는다", async () => {
    const r = await render(<My />);

    expect(r.queryByText(/일째|연속|점수|배지/)).toBeNull();
  });

  it("설정을 세 무리로 묶는다 — 앱 설정 · 지원 · 계정", async () => {
    const r = await render(<My />);

    for (const label of ["앱 설정", "지원", "계정"]) {
      expect(r.getByText(label)).toBeTruthy();
    }
  });

  it("앱 잠금·내보내기 줄을 두지 않는다 — 갈 곳 없는 줄을 만들지 않는다", async () => {
    const r = await render(<My />);

    expect(r.queryByText(/앱 잠금|나만의 공간|내보내기/)).toBeNull();
  });

  it("눌러도 아무 일도 없는 줄을 두지 않는다", async () => {
    // 갈 곳이 없는 줄은 표식(›)도 두지 않고 눌리지도 않는다 (M3.md 와 같은 이유)
    const r = await render(<My />);
    // 줄의 **역할**로 찾는다 — 껍데기 구조가 바뀌어도 규칙은 그대로다
    const pressable = (label: string) =>
      r.queryAllByRole("button").some((b) => within(b).queryByText(label) != null);

    // 지원 세 줄은 2026-08-21 에 랜딩 페이지로 이어졌다 — 더 이상 「준비 중」이 아니다
    for (const label of [
      "알림 설정",
      "기본 정보 수정",
      "로그아웃",
      "문의하기",
      "이용약관",
      "개인정보 처리방침",
    ]) {
      expect(pressable(label)).toBe(true);
    }
  });

  it("지원 세 줄이 각자의 웹 문서를 앱 안에서 연다", async () => {
    // **주소를 화면이 알지 않는다** — 무엇을 여는지만 여기서 고정하고,
    // 주소가 바뀌면 고칠 곳은 `src/lib/links.ts` 하나다
    const r = await render(<My />);

    for (const [label, path] of [
      ["문의하기", "notion.site"],
      ["이용약관", "/terms"],
      ["개인정보 처리방침", "/privacy"],
    ] as const) {
      browser.openBrowserAsync.mockClear();
      await fireEvent.press(r.getByText(label));

      await waitFor(() => expect(browser.openBrowserAsync).toHaveBeenCalledTimes(1));
      expect(browser.openBrowserAsync.mock.calls[0]![0]).toContain(path);
    }
  });

  it("약관을 앱 안에 복사해 두지 않는다 — 웹에서 갱신되는 문서다", async () => {
    const r = await render(<My />);

    expect(r.queryByText(/제 ?\d+ ?조|수집하는 개인정보|시행일/)).toBeNull();
  });

  it("온보딩에서 답한 것은 [기본 정보 수정] 한 줄 뒤에 모여 있다", async () => {
    const r = await render(<My />);

    await fireEvent.press(r.getByText("기본 정보 수정"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/my/profile");
  });

  it("회원 탈퇴는 목록 밖에 홀로 있고 아직 실행되지 않는다", async () => {
    // 되돌릴 수 없는 동작을 확인 없이 실행하지 않는다 (my.pendingStates)
    const r = await render(<My />);

    expect(r.getByText("회원 탈퇴")).toBeTruthy();
    expect(r.getByText("회원 탈퇴").parent?.props.accessibilityRole).not.toBe("button");
  });

  it("알림 설정 줄이 지금 시각을 말하고, 끄면 「꺼짐」이 된다", async () => {
    const r = await render(<My />);
    expect(r.getByText("매일 밤 9:30")).toBeTruthy();

    useSettings.getState().toggle("retro");

    expect(await r.findByText("꺼짐")).toBeTruthy();
  });
});

describe("M2 · 알림 설정 시트 — 하나의 결정만 담는다", () => {
  /** 시트 제목과 줄 이름이 같은 말이다 — 줄은 목록에 먼저 있다 */
  const row = (r: Awaited<ReturnType<typeof render>>) => r.getAllByText("알림 설정")[0]!;

  it("줄을 누르면 시각을 고르는 시트가 열린다", async () => {
    const r = await render(<My />);

    await fireEvent.press(row(r));

    expect(r.getByText("알림 시간")).toBeTruthy();
    expect(r.getByText("완료")).toBeTruthy();
    // 시트에 설정 요소를 늘리지 않는다 (design.md §11)
    expect(r.queryByText(/낮 기록|주간 돌아보기|새로운 소식/)).toBeNull();
  });

  it("[완료] 를 눌러야 시각이 정해진다", async () => {
    // 휠을 굴린 것만으로 설정이 바뀌면 시트를 열어 본 것과 고른 것이 같아진다
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("10시"));
    expect(useSettings.getState().notify.retro.time).toBe("21:30");

    await fireEvent.press(r.getByText("완료"));

    await waitFor(() => expect(useSettings.getState().notify.retro.time).toBe("22:30"));
    expect(r.queryByText("알림 시간")).toBeNull();
  });

  it("딤을 누르면 고르던 값이 버려진다", async () => {
    const r = await render(<My />);
    await fireEvent.press(row(r));
    await fireEvent.press(r.getByText("10시"));

    await fireEvent.press(r.getByLabelText("닫기"));

    expect(useSettings.getState().notify.retro.time).toBe("21:30");
  });

  it("꺼져 있었다면 [완료] 가 OS 권한을 묻고, 받아야 켠다", async () => {
    // 켜진 채 아무 알림도 오지 않으면 사용자는 확인할 방법이 없다
    useSettings.getState().toggle("retro"); // 꺼 둔 상태에서 시작
    // 아직 한 번도 묻지 않은 기기 — `완료` 가 곧 그 물음이다
    notifications.getPermissionsAsync.mockResolvedValue({ granted: false, canAskAgain: true });
    notifications.requestPermissionsAsync.mockResolvedValue({
      granted: false,
      canAskAgain: false,
    });
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("완료"));

    await waitFor(() => expect(notifications.requestPermissionsAsync).toHaveBeenCalled());
    expect(useSettings.getState().notify.retro.enabled).toBe(false);
    // 다시 물을 수 없을 때만 한 줄로 길을 알려준다 — 모달도 재시도 버튼도 없다
    expect(await r.findByText("기기 설정에서 알림을 켜면 이 시간에 찾아갈게요.")).toBeTruthy();
    expect(r.queryByText(/다시 시도|허용하기/)).toBeNull();
  });

  it("켜져 있으면 묻지 않는다 — 시각만 바꾼다", async () => {
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("완료"));

    await waitFor(() => expect(r.queryByText("알림 시간")).toBeNull());
    expect(notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("[알림 받지 않기] 로 끌 수 있고, 껐어도 시각은 남는다", async () => {
    // 껐다고 값을 지우면 다시 켜는 일이 다시 설정하는 일이 된다 (M3.md)
    const r = await render(<My />);
    await fireEvent.press(row(r));

    await fireEvent.press(r.getByText("알림 받지 않기"));

    expect(useSettings.getState().notify.retro).toMatchObject({
      enabled: false,
      time: "21:30",
    });
  });

  it("꺼져 있을 때는 끄는 줄을 두지 않는다", async () => {
    useSettings.getState().toggle("retro");
    const r = await render(<My />);

    await fireEvent.press(row(r));

    expect(r.queryByText("알림 받지 않기")).toBeNull();
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
