import { render, fireEvent } from "@testing-library/react-native";
import { router } from "expo-router";

import RetroConfirm from "../confirm";
import RetroEmotion from "../emotion";

import { interaction, primary, selectedTint } from "@/design/ds";
import { useDay } from "@/features/home/model/day";
import { useRetro } from "@/features/retro/model/retro";
import { SAMPLE_MOMENTS, SAMPLE_SCHEDULES } from "@/mocks/sample";

/**
 * ⚠ **`C1`(인트로)은 사라졌다** — 새 시안의 「일기」 흐름은 일정 확인부터 시작한다
 * (`design.md` 「일기」 1~5). 홈 CTA 가 곧바로 `C2` 를 연다.
 *
 * 여기 남은 단언은 **규칙**이다. 옛 화면의 모양을 재던 것(요약 카드 문구 ·
 * 감정 추가 점선 칩 · 「오늘의 순간」 · `잠시 쉬기`)은 시안이 그 기능을 없애서
 * 함께 사라졌고, **없앤 것을 지키는 단언**으로 바꿔 뒀다.
 */
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

describe("C2 · 오늘 일정 확인 — 읽기 전용이다", () => {
  it("오늘 일정을 그대로 보여준다", async () => {
    const { getByText } = await render(<RetroConfirm />);

    expect(getByText("오늘 있었던 일을 잠깐 떠올려봐요.")).toBeTruthy();
    expect(getByText("팀 회의")).toBeTruthy();
    expect(getByText("운동 가기")).toBeTruthy();
  });

  it("여기서 일정을 고치거나 더하지 못한다 — 고치는 자리는 홈 하나다", async () => {
    const { queryByText, queryByLabelText } = await render(<RetroConfirm />);

    expect(queryByText("＋ 일정 추가하기")).toBeNull();
    // 마침 토글도 감정 추가 칩도 없다 — 회고 도중 화면 밖으로 새는 길을 만들지 않는다
    expect(queryByLabelText("면접 스터디 마침")).toBeNull();
    expect(queryByLabelText("운동 가기 감정 추가")).toBeNull();
  });

  it("완료만 초록 체크로 말한다 — 안 한 일에 표식을 붙이지 않는다", async () => {
    const { getByText } = await render(<RetroConfirm />);

    // 마친 줄은 취소선으로 남고, 안 한 줄에는 아무 표식이 없다
    expect(flatten(getByText("팀 회의").props.style).textDecorationLine).toBe("line-through");
    expect(flatten(getByText("운동 가기").props.style).textDecorationLine).toBeUndefined();
  });

  it("숨긴 일정은 여기서도 빠진다", async () => {
    useDay.getState().hide("s3");
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText("면접 스터디")).toBeNull();
  });

  it("숫자로 압박하지 않는다 — 마침 개수도 단계 번호도 없다", async () => {
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText(/\d\/\d 마침/)).toBeNull();
    expect(queryByText(/\d\/\d단계/)).toBeNull();
    expect(queryByText(/%/)).toBeNull();
  });

  it("[다음] 이 감정 고르기로 간다", async () => {
    const { getByText } = await render(<RetroConfirm />);

    await fireEvent.press(getByText("다음"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/retro/emotion");
  });

  it("나가는 길은 닫기 하나다 — 회고는 한 줄이다", async () => {
    const { getByLabelText } = await render(<RetroConfirm />);

    await fireEvent.press(getByLabelText("닫기"));

    expect(jest.mocked(router.replace)).toHaveBeenCalledWith("/home");
  });
});

describe("C3 · 시작 감정 고르기 — 필수다", () => {
  it("통과 버튼을 두지 않고, 고르기 전에는 CTA 가 잠긴다", async () => {
    const { getByRole, queryByText } = await render(<RetroEmotion />);

    expect(queryByText("잘 모르겠어요")).toBeNull();
    expect(queryByText(/건너뛰/)).toBeNull();

    // 사라지지 않고 잠긴다 — 다음이 있다는 사실은 남는다
    const cta = getByRole("button", { name: "이야기 시작하기" });
    expect(cta.props.accessibilityState.disabled).toBe(true);
    expect(flatten(cta.props.style).backgroundColor).toBe(interaction.disabled);
  });

  it("9종을 한 화면에 다 보인다", async () => {
    const { getByText } = await render(<RetroEmotion />);

    for (const name of [
      "불안함",
      "우울함",
      "화남·답답함",
      "행복함",
      "막막함",
      "무기력",
      "피곤함",
      "뿌듯함",
      "평온함",
    ]) {
      expect(getByText(name)).toBeTruthy();
    }
  });

  it("하나만 고른다 — 다른 것을 누르면 옮겨간다", async () => {
    const { getByRole } = await render(<RetroEmotion />);

    await fireEvent.press(getByRole("button", { name: "우울함" }));
    expect(useRetro.getState().startEmotion).toBe(2);

    await fireEvent.press(getByRole("button", { name: "평온함" }));
    expect(useRetro.getState().startEmotion).toBe(9);
    expect(getByRole("button", { name: "우울함" }).props.accessibilityState.selected).toBe(false);
  });

  it("고른 뒤에는 CTA 가 열린다", async () => {
    const r = await render(<RetroEmotion />);

    await fireEvent.press(r.getByRole("button", { name: "우울함" }));

    const cta = r.getByRole("button", { name: "이야기 시작하기" });
    expect(cta.props.accessibilityState.disabled).toBe(false);
    expect(flatten(cta.props.style).backgroundColor).toBe(primary.heavy);
  });

  it("선택을 색만으로 표시하지 않는다 — 테두리 2px + 글자 굵기", async () => {
    const r = await render(<RetroEmotion />);

    const off = flatten(r.getByRole("button", { name: "우울함" }).props.style);
    const offLabel = flatten(r.getByText("우울함").props.style).fontFamily;

    await fireEvent.press(r.getByRole("button", { name: "우울함" }));

    const on = flatten(r.getByRole("button", { name: "우울함" }).props.style);
    expect(off.borderWidth).toBe(1);
    expect(on.borderWidth).toBe(2);
    expect(on.borderColor).toBe(primary.normal);
    expect(flatten(r.getByText("우울함").props.style).fontFamily).not.toBe(offLabel);
  });

  it("감정색을 쓰지 않는다 — 아홉이 같은 브랜드 초록으로 켜진다", async () => {
    // `design.md` §1 — 아홉을 각자 제 색으로 칠하면 고른 것이 색의 밝기 싸움이 된다
    const r = await render(<RetroEmotion />);

    await fireEvent.press(r.getByRole("button", { name: "행복함" }));
    expect(flatten(r.getByRole("button", { name: "행복함" }).props.style).backgroundColor).toBe(
      selectedTint,
    );

    await fireEvent.press(r.getByRole("button", { name: "평온함" }));
    expect(flatten(r.getByRole("button", { name: "평온함" }).props.style).backgroundColor).toBe(
      selectedTint,
    );
  });

  it("강도 척도·임상 용어를 쓰지 않는다", async () => {
    const { queryByText } = await render(<RetroEmotion />);

    expect(queryByText(/강도/)).toBeNull();
    expect(queryByText(/점수/)).toBeNull();
    expect(queryByText(/우울증|불안장애|증상/)).toBeNull();
  });

  it("[이야기 시작하기] 가 대화로 간다", async () => {
    const { getByRole } = await render(<RetroEmotion />);

    await fireEvent.press(getByRole("button", { name: "평온함" }));
    await fireEvent.press(getByRole("button", { name: "이야기 시작하기" }));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/retro/talk");
  });
});

describe("회고 상단 — 진행률도 저장 약속도 두지 않는다", () => {
  it("단계 번호·진행률을 두지 않는다", async () => {
    const { queryByText } = await render(<RetroEmotion />);

    expect(queryByText(/\d\/\d단계/)).toBeNull();
    expect(queryByText(/%/)).toBeNull();
  });

  it("저장을 약속하는 문구를 두지 않는다 — 아직 기기에 남기지 않는다", async () => {
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText(/저장/)).toBeNull();
    expect(queryByText(/이어서 하기|이어가기/)).toBeNull();
  });

  it("나갔다 와도 이 세션 동안은 값이 남는다 — 다만 영속은 아니다", async () => {
    useRetro.getState().setStartEmotion(2);
    const { getByLabelText } = await render(<RetroConfirm />);

    await fireEvent.press(getByLabelText("닫기"));

    expect(useRetro.getState().startEmotion).toBe(2);
  });
});

// 옛 화면에만 있던 라벨 — 시안이 그 기능을 없앴다는 사실을 여기서 고정한다
describe("시안이 걷어낸 것들", () => {
  it("C2 에 순간·날씨·감정 요약 카드를 두지 않는다", async () => {
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText("오늘의 순간")).toBeNull();
    expect(queryByText("오늘 날씨")).toBeNull();
    expect(queryByText("오늘 기록한 감정")).toBeNull();
  });

  it("C3 에 요약 카드를 두지 않는다 — 고른 타일이 이미 말한다", async () => {
    const r = await render(<RetroEmotion />);

    await fireEvent.press(r.getByRole("button", { name: "우울함" }));

    expect(r.queryByText(/시작할게요/)).toBeNull();
  });

  it("[잠시 쉬기] 가 사라졌다 — 나가는 길은 닫기 하나다", async () => {
    const { queryByText } = await render(<RetroConfirm />);

    expect(queryByText("잠시 쉬기")).toBeNull();
  });
});
