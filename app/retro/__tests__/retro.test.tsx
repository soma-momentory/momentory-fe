import { render, fireEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import RetroConfirm from "../confirm";
import RetroEmotion from "../emotion";
import RetroIntro from "../intro";

import { paperColors } from "@/design/paper";
import { useDay } from "@/features/home/model/day";
import { useRetro } from "@/features/retro/model/retro";
import { SAMPLE_MOMENTS, SAMPLE_SCHEDULES } from "@/mocks/sample";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn(), replace: jest.fn() },
}));

const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

beforeEach(() => {
  useDay.setState({
    schedules: SAMPLE_SCHEDULES.map((s) => ({ ...s, emotions: [...s.emotions] })),
    moments: [...SAMPLE_MOMENTS],
  });
  useRetro.getState().reset();
  jest.clearAllMocks();
});

describe("C1 · 회고 인트로 — 떠올리기가 아니라 고르기", () => {
  it("바바가 기억해둔 재료를 먼저 보여준다", async () => {
    // 샘플 하루 = 스키마 정본: 일정 4 · 순간 2 · 감정 기록 3
    // (화남/답답 · 행복함 · 불안함 — 「면접 스터디 · 불안함」은 마침 없이 감정만 있다)
    const { getByText } = await render(<RetroIntro />);

    expect(getByText("오늘 바바가 기억해둔 것")).toBeTruthy();
    expect(getByText("일정 4개 · 순간 2개 · 감정 기록 3개")).toBeTruthy();
  });

  it("재료는 홈과 같은 값을 본다 — 하드코딩하지 않는다", async () => {
    useDay.getState().selectEmotion("s4", 9); // 운동 가기에 평온함 추가
    const { getByText } = await render(<RetroIntro />);

    expect(getByText("일정 4개 · 순간 2개 · 감정 기록 4개")).toBeTruthy();
  });

  it("숨긴 일정은 재료에서도 빠진다 — 그 줄의 감정까지", async () => {
    useDay.getState().hide("s3"); // 면접 스터디 = 불안함
    const { getByText } = await render(<RetroIntro />);

    expect(getByText("일정 3개 · 순간 2개 · 감정 기록 2개")).toBeTruthy();
  });

  it("몇 분 걸린다고 말하지 않고 진행률도 두지 않는다", async () => {
    // 대화 길이는 사용자가 정한다 (C1.md)
    const { queryByText } = await render(<RetroIntro />);

    expect(queryByText(/\d+\s*분/)).toBeNull();
    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/단계/)).toBeNull();
  });

  it("[시작하기] 가 오늘 정리로 간다", async () => {
    const { getByText } = await render(<RetroIntro />);

    await fireEvent.press(getByText("시작하기"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/retro/confirm");
  });
});

describe("C2 · 오늘 정리 확인 — 홈과 같은 카드", () => {
  it("홈과 같은 제목·버튼을 쓴다 — 새 컴포넌트를 배우게 하지 않는다", async () => {
    const { getByText } = await render(<RetroConfirm />);

    expect(getByText("오늘 일정")).toBeTruthy();
    expect(getByText("오늘의 순간")).toBeTruthy();
    expect(getByText("＋ 일정 추가하기")).toBeTruthy();
  });

  it("순간을 시각 없이 라벨 아래 모은다", async () => {
    const { getByText, queryByText } = await render(<RetroConfirm />);

    expect(getByText("발표 자료 피드백 정리하기")).toBeTruthy();
    expect(getByText("생각보다 반응이 좋았다.")).toBeTruthy();
    // 시각을 붙이지 않는다 (C2.md)
    expect(queryByText(/\d{1,2}:\d{2}/)).toBeNull();
  });

  it("감정이 비어 있는 줄에만 [감정 추가] 점선 칩이 붙는다", async () => {
    const { getByLabelText, queryByLabelText } = await render(<RetroConfirm />);

    // 「운동 가기」는 아직 마치지 않았고 감정도 없다 — **마침을 요구하지 않는다** (C2.md)
    expect(getByLabelText("운동 가기 감정 추가")).toBeTruthy();

    // 감정이 있는 줄에는 붙지 않는다. 「면접 스터디」는 마치지 않았어도 감정이 있다
    expect(queryByLabelText("팀 회의 감정 추가")).toBeNull();
    expect(queryByLabelText("면접 스터디 감정 추가")).toBeNull();
  });

  it("감정 3개를 모은다 — 화남/답답 · 행복함 · 불안함", async () => {
    // C2.md 의 「감정 3개」. 마침 여부와 무관하게 줄에 달린 감정을 그대로 모은다
    const { getAllByText } = await render(<RetroConfirm />);

    for (const name of ["화남/답답", "행복함", "불안함"]) {
      expect(getAllByText(name).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("여기서 고친 것은 곧바로 홈에도 반영된다 — 같은 Schedule 이다", async () => {
    const { getByLabelText, getByText } = await render(<RetroConfirm />);

    await fireEvent.press(getByLabelText("면접 스터디 마침"));

    expect(useDay.getState().schedules.find((s) => s.id === "s3")?.done).toBe(true);
    expect(getByText("3/4 마침")).toBeTruthy();
  });

  it("오늘 기록한 감정을 이름과 함께 모은다", async () => {
    // 줄에 붙은 알약과 요약 카드에 각각 한 번씩 — 같은 감정을 두 자리에서 본다
    const { getByText, getAllByText } = await render(<RetroConfirm />);

    expect(getByText("오늘 기록한 감정")).toBeTruthy();
    expect(getAllByText("화남/답답")).toHaveLength(2);
    expect(getAllByText("행복함")).toHaveLength(2);
  });

  it("[다음] 이 감정 고르기로 간다", async () => {
    const { getByText } = await render(<RetroConfirm />);

    await fireEvent.press(getByText("다음"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/retro/emotion");
  });
});

describe("C3 · 지금 감정 고르기 — 필수다", () => {
  it("통과 버튼을 두지 않고, 고르기 전에는 CTA 가 잠긴다", async () => {
    const { getByText, queryByText } = await render(<RetroEmotion />);

    expect(queryByText("잘 모르겠어요")).toBeNull();
    expect(queryByText(/건너뛰/)).toBeNull();
    // 사라지지 않고 흐려진다
    expect(flatten(getByText("회고 시작하기").parent?.props.style).opacity).toBe(0.36);
  });

  it("9종을 한 화면에 다 보인다", async () => {
    const { getByLabelText } = await render(<RetroEmotion />);

    for (const name of [
      "불안함",
      "우울함",
      "화남/답답",
      "행복함",
      "막막함",
      "무기력",
      "피곤함",
      "뿌듯함",
      "평온함",
    ]) {
      expect(getByLabelText(name)).toBeTruthy();
    }
  });

  it("하나만 고른다 — 다른 것을 누르면 옮겨간다", async () => {
    const { getByLabelText } = await render(<RetroEmotion />);

    await fireEvent.press(getByLabelText("우울함"));
    expect(useRetro.getState().startEmotion).toBe(2);

    await fireEvent.press(getByLabelText("평온함"));
    expect(useRetro.getState().startEmotion).toBe(9);
    expect(getByLabelText("우울함").props.accessibilityState.selected).toBe(false);
  });

  it("고르면 요약 카드가 되돌릴 수 있음을 말한다", async () => {
    const r = await render(<RetroEmotion />);
    expect(r.queryByText(/시작할게요/)).toBeNull(); // 고르기 전엔 없다

    await fireEvent.press(r.getByLabelText("우울함"));

    expect(r.getByText("우울함으로 시작할게요")).toBeTruthy();
    expect(
      r.getByText("이 감정으로 오늘 대화를 시작해요 · 지금 다시 골라도 괜찮아요."),
    ).toBeTruthy();
    expect(flatten(r.getByText("회고 시작하기").parent?.props.style).opacity).toBeUndefined();
  });

  it("선택을 색만으로 표시하지 않는다 — 잉크 2px 테두리 + 굵기 700", async () => {
    // 새 디자인의 3×3 타일(`EmotionGrid variant="paper"`)은 꺼진 칸에도 2px 자리를
    // 비워 두고 **테두리 색**으로 켜짐을 말한다 — 켤 때 글자가 밀리지 않게(EmotionGrid).
    const r = await render(<RetroEmotion />);

    expect(flatten(r.getByLabelText("우울함").props.style).borderColor).toBe("transparent");
    await fireEvent.press(r.getByLabelText("우울함"));

    const cell = flatten(r.getByLabelText("우울함").props.style);
    expect(cell.borderWidth).toBe(2);
    expect(cell.borderColor).toBe(paperColors.line.ink);
    expect(flatten(r.getByText("우울함").props.style).fontFamily).toBe("Pretendard-Bold");
  });

  it("강도 척도·임상 용어를 쓰지 않는다", async () => {
    const { queryByText } = await render(<RetroEmotion />);

    expect(queryByText(/강도/)).toBeNull();
    expect(queryByText(/점수/)).toBeNull();
    expect(queryByText(/우울증|불안장애|증상/)).toBeNull();
  });
});

describe("회고 상단 — 진행률을 노출하지 않는다", () => {
  it("[잠시 쉬기] 는 중단을 묻지 않고 홈으로 나간다", async () => {
    // 확인 모달을 두지 않는다 (C1.md). 영속 저장은 아직 아니다 — retro.ts 주석
    const { getByText } = await render(<RetroIntro />);

    await fireEvent.press(getByText("잠시 쉬기"));

    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home");
  });

  it("나갔다 와도 이 세션 동안은 값이 남는다 — 다만 영속은 아니다", async () => {
    // 앱이 떠 있는 동안만이다. 화면에 「저장했어요」류 문구를 두지 않는 이유다
    useRetro.getState().setStartEmotion(2);
    const { getByText } = await render(<RetroIntro />);
    await fireEvent.press(getByText("잠시 쉬기"));

    expect(useRetro.getState().startEmotion).toBe(2);
  });

  it("저장을 약속하는 문구를 화면에 두지 않는다", async () => {
    const { queryByText } = await render(<RetroIntro />);

    expect(queryByText(/저장/)).toBeNull();
    expect(queryByText(/이어서 하기|이어가기/)).toBeNull();
  });

  it("단계 번호를 두지 않는다", async () => {
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText(/\d\/\d단계/)).toBeNull();
  });
});
