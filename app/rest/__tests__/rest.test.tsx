import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, fireEvent, waitFor, act, within } from "@testing-library/react-native";
import { router } from "expo-router";

import Rest from "../../(tabs)/rest";
import RestCards from "../cards/index";

import { restRecommendMotion } from "@/design/ds";
import { track } from "@/features/analytics";
import { keepWords } from "@/features/letter/model/letter";
import { useDiary } from "@/features/diary/model/diary";
import { emotionName } from "@/features/emotion/model/emotion";
import { useProfile } from "@/features/my/model/settings";
import {
  readRecommendationMemory,
  writeRecommendationMemory,
} from "@/features/rest/data/recommendMemory";
import { datedCards } from "@/features/rest/model/cards";
import { recommendRest } from "@/features/rest/model/recommend";
import { useToast } from "@/lib/toast";
import * as http from "@/lib/http";
import { seedDiaries } from "@/testing/fixtures";

/**
 * 쉼터는 **두 화면**이다: `R1` 진입(항목 하나) → `R2` 날짜별 카드 + 캘린더.
 *
 * `Rest.dc.html`(2026-08-20)은 셋이었고 `R3` 누적 기록이 있었는데 **2026-09-06 에
 * 지웠다**(`docs/PRODUCT.md` 「상류와 차이」 #35) — 그 화면 테스트도 함께 걷었다.
 *
 * 그보다 더 옛 구조는 탭이 곧 카드 화면이었다 — 그 시절 단언(카드 탭 가로채기 ·
 * 상세 이동)은 화면이 갈리면서 자리가 바뀌었고, **규칙 단언**으로 옮겨 적었다.
 */
let mockParams: Record<string, string> = { date: "2026-07-27" };

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    setParams: jest.fn((params: Record<string, string>) => Object.assign(mockParams, params)),
  },
  useLocalSearchParams: () => mockParams,
  Stack: jest.fn(() => null),
  Redirect: jest.fn(() => null),
}));

jest.mock("@/features/analytics", () => ({
  ...jest.requireActual("@/features/analytics"),
  track: jest.fn(),
}));

beforeEach(async () => {
  mockParams = { date: "2026-07-27" };
  await AsyncStorage.clear();
  seedDiaries();
  useToast.setState({ current: null });
  jest.clearAllMocks();
});

/**
 * 삭제만 보는 테스트가 쓰는 **한 장짜리 시드** — 샘플 데이터에 기대지 않는다.
 * 지우는 일은 「카드가 하나 있다」면 충분한데, 시드 목록에 기대면 시드가 바뀔 때
 * 관계없는 테스트가 함께 깨진다.
 */
const seedOneCard = () => {
  const card = {
    id: "ac-1",
    diaryId: "d-1",
    situation: "회의가 길어져 지쳤다",
    emotions: [],
    needs: [],
    desiredState: null,
    sentiment: "uncomfortable" as const,
    targetAction: "10분 걷기",
    done: false,
    doneAt: null,
    reflection: null,
    createdAt: "2026-07-27",
  };
  useDiary.setState({ actionCards: [card] });
  return card;
};

/** 화면과 **같은 기준**으로 고른다 — 최신 날짜의 카드다 (store 순서가 아니다) */
const latest = () => {
  const { actionCards } = useDiary.getState();
  const first = datedCards(actionCards)[0];
  if (first == null) throw new Error("샘플에 행동 카드가 있어야 한다");
  return first.card;
};

describe("R1 · 쉼터 진입 — 있다는 사실만 말한다", () => {
  it("바람카드 아래에 쉼 콘텐츠 다섯이 두 칸씩 있다 — 안내 한 줄과 함께", async () => {
    const { getByText } = await render(<Rest />);

    expect(getByText("지금 나에게 맞는 쉼을 골라보세요")).toBeTruthy();
    for (const title of ["감각연못", "걱정상자", "오늘의 보물함", "몸에 힘 빼기", "3분 명상"]) {
      expect(getByText(keepWords(title))).toBeTruthy();
    }
  });

  it("화면이 있는 콘텐츠만 눌린다 — 갈 곳이 없는 줄을 누르게 두지 않는다", async () => {
    const { getAllByRole } = await render(<Rest />);

    // 쉼 콘텐츠 일곱 모두 화면이 있다(3분 명상 · 소원 연꽃 · 주간 행복 2026-11-04) — 바람카드 진입점과 함께 여덟이 눌린다
    const labels = getAllByRole("button").map((b) => b.props.accessibilityLabel);
    expect(labels).toEqual([
      "바람카드 보기",
      "감각연못 열기",
      "걱정상자 열기",
      "오늘의 보물함 열기",
      "몸에 힘 빼기 열기",
      "3분 명상 열기",
      "주간 행복 열기",
      "소원 연꽃 열기",
    ]);
  });

  it("감각연못 카드는 통째로 진입점이다", async () => {
    const { getByLabelText } = await render(<Rest />);

    await fireEvent.press(getByLabelText("감각연못 열기"));
    // 누른 자리의 물결이 카드를 다 덮은 뒤에 간다(`RestCardPressable`)
    await waitFor(() => expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/sense-pond"));
  });

  it("바람카드가 첫 항목이고 카드 전체가 진입점이다", async () => {
    const { getByText, getByLabelText } = await render(<Rest />);

    expect(getByText("바람카드")).toBeTruthy();

    await fireEvent.press(getByLabelText("바람카드 보기"));
    await waitFor(() => expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/cards"));
  });

  it("여기서는 캘린더·수행 기록을 설명하지 않는다", async () => {
    const { queryByText } = await render(<Rest />);

    expect(queryByText("지난 바람카드")).toBeNull();
    expect(queryByText(/했어요|수행했어요|아직 하지 않았어요/)).toBeNull();
    expect(queryByText("상황")).toBeNull();
  });

  it("수행률·연속 일수를 세지 않는다", async () => {
    const { queryByText } = await render(<Rest />);

    expect(queryByText(/%/)).toBeNull();
    expect(queryByText(/연속/)).toBeNull();
    expect(queryByText(/회 실행/)).toBeNull();
  });

  it("카드가 하나도 없어도 들어갈 수 있다 — 안에서 날짜로 둘러본다", async () => {
    useDiary.setState({ diaries: [], actionCards: [] });
    const { getByLabelText, getByText } = await render(<Rest />);

    // 요약 줄은 회고가 먼저라는 사실만 말하되, 진입은 막지 않는다
    expect(getByText(keepWords("회고를 마치면 그날의 바람카드가 여기 남아요"))).toBeTruthy();
    await fireEvent.press(getByLabelText("바람카드 보기"));
    await waitFor(() => expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/cards"));
  });
});

/**
 * 일기를 쓴 날의 쉼 추천 (2026-10-12) — 시드의 오늘(7월 27일) 일기는 불안 · 슬픔이라
 * 첫 감정 불안의 맨 앞 후보 「몸에 힘 빼기」를 권한다(쉬는 방법은 비어 있다).
 */
describe("R1 · 일기를 쓴 날의 쉼 추천", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useProfile.setState({ restMethods: [] });
  });
  afterEach(() => jest.useRealTimers());

  /** 기기 기억을 읽고(비동기) 시트가 올라오기까지의 잠깐(`restRecommendMotion.delay`)을 보낸다 */
  const waitForSheet = async () => {
    await act(async () => {});
    await act(async () => {
      jest.advanceTimersByTime(restRecommendMotion.delay);
    });
  };
  const sent = (name: string) =>
    jest
      .mocked(track)
      .mock.calls.filter(([n]) => n === name)
      .map(([, props]) => props);

  it.each([
    ["2026-07-27", 0],
    ["2026-07-27", 3],
    ["2026-07-26", 3],
  ])(
    "일기 완료 진입은 이전 추천 기록(%s, %i회)과 관계없이 매번 표시한다",
    async (day, dismissStreak) => {
      await writeRecommendationMemory({ day: String(day), dismissStreak: Number(dismissStreak) });
      mockParams.afterDiary = "1";
      const r = await render(<Rest />);
      await waitForSheet();
      expect(r.getByText("불안한 날엔, 이걸 해 봐요")).toBeTruthy();
      expect(router.setParams).toHaveBeenCalledWith({ afterDiary: "" });

      await fireEvent.press(r.getByText("다른 쉼터 둘러보기"));
      await r.unmount();
      const ordinary = await render(<Rest />);
      await waitForSheet();
      expect(ordinary.queryByText("불안한 날엔, 이걸 해 봐요")).toBeNull();
      await ordinary.unmount();

      mockParams.afterDiary = "1";
      const afterNextDiary = await render(<Rest />);
      await waitForSheet();
      expect(afterNextDiary.getByText("불안한 날엔, 이걸 해 봐요")).toBeTruthy();
    },
  );

  it.each([
    [1, "joy", "treasure_box"],
    [12, "exhausted", "body_release"],
    [10, "confused", "worry_box"],
    [5, "sad", "sense_pond"],
    // 12종에서 새로 생긴 감정도 저장 직후 추천으로 이어진다
    [4, "affection", "treasure_box"],
    [11, "sorry", "worry_box"],
  ] as const)(
    "직접 일기에 고른 감정 %i로 저장 직후 쉼을 추천한다",
    async (emotion, key, content) => {
      useDiary.getState().reset();
      const request = jest.spyOn(http, "authedRequest").mockResolvedValueOnce({
        ok: true,
        data: {
          id: 81,
          original: "직접 남긴 오늘 이야기",
          primaryEmotion: key,
          emotions: [key],
          createdAt: "2026-07-27T12:00:00Z",
        },
      });
      try {
        expect(await useDiary.getState().write("직접 남긴 오늘 이야기", emotion)).toEqual({
          status: "saved",
          id: "81",
        });
        expect(request).toHaveBeenCalledWith(
          "POST",
          "/api/v1/diaries",
          { original: "직접 남긴 오늘 이야기", emotion: key },
          expect.any(Object),
        );
      } finally {
        request.mockRestore();
      }
      const r = await render(<Rest />);
      await waitForSheet();
      expect(r.getByText(recommendRest([emotion], []).title)).toBeTruthy();
      // 조약돌 옆에 감정 이름이 함께 선다 — 색만으로 말하지 않는다
      expect(r.getByText(emotionName(emotion))).toBeTruthy();
      expect(sent("rest_recommendation_shown")).toEqual([{ content, basis: "emotion" }]);
    },
  );

  it("들어오고 잠깐 뒤에 시트가 올라온다 — 제목 · 감정 이름 · 쉼터 칸 · 버튼", async () => {
    const r = await render(<Rest />);
    await act(async () => {});
    // 쉼터를 먼저 보게 한다
    expect(r.queryByText("불안한 날엔, 이걸 해 봐요")).toBeNull();

    await waitForSheet();

    expect(r.getByText("불안한 날엔, 이걸 해 봐요")).toBeTruthy();
    expect(r.getByText("불안")).toBeTruthy();
    // 시트의 칸은 폴라로이드(이름 · 설명) · 뒤 격자는 테마 카드(어절을 묶은 이름 · 설명 없음)다
    expect(r.getByText("몸에 힘 빼기")).toBeTruthy();
    expect(r.getByText(keepWords("몸에 힘 빼기"))).toBeTruthy();
    expect(r.getByText("몸에 힘을 줬다가\n천천히 풀어봐요")).toBeTruthy();
    expect(r.getAllByText("1분")).toHaveLength(3);
    expect(r.getByText("지금 해 볼게요")).toBeTruthy();
    // 저장 알림은 두지 않는다 — 쉼터로 넘어온 것이 곧 저장이 끝났다는 뜻이다(사용자 요청)
    expect(r.queryByText(/저장했어요/)).toBeNull();
    expect(sent("rest_recommendation_shown")).toEqual([
      { content: "body_release", basis: "emotion" },
    ]);
  });

  it("「다른 쉼터 둘러보기」는 닫기다 — 쉼터에 남고 닫은 횟수가 쌓인다", async () => {
    const r = await render(<Rest />);
    await waitForSheet();

    await fireEvent.press(r.getByText("다른 쉼터 둘러보기"));

    expect(r.queryByText("불안한 날엔, 이걸 해 봐요")).toBeNull();
    expect(jest.mocked(router.push)).not.toHaveBeenCalled();
    await act(async () => {});
    expect(await readRecommendationMemory()).toEqual({ day: "2026-07-27", dismissStreak: 1 });
  });

  it("「지금 해 볼게요」를 누르면 그 쉼으로 가고, 그날은 다시 묻지 않는다", async () => {
    const r = await render(<Rest />);
    await waitForSheet();

    await fireEvent.press(r.getByText("지금 해 볼게요"));

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/body-release");
    expect(sent("rest_recommendation_accepted")).toEqual([
      { content: "body_release", basis: "emotion", form: "sheet" },
    ]);
    expect(r.queryByText("불안한 날엔, 이걸 해 봐요")).toBeNull();

    await r.unmount();
    const again = await render(<Rest />);
    await waitForSheet();
    expect(again.queryByText("불안한 날엔, 이걸 해 봐요")).toBeNull();
  });

  it("시트의 쉼터 칸을 눌러도 그 쉼으로 간다 — 쉼터 탭의 칸과 같다", async () => {
    const r = await render(<Rest />);
    await waitForSheet();

    const cards = r.getAllByLabelText("몸에 힘 빼기 열기");
    await fireEvent.press(cards[cards.length - 1]!);
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });

    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/body-release");
    expect(sent("rest_recommendation_accepted")).toEqual([
      { content: "body_release", basis: "emotion", form: "sheet" },
    ]);
  });

  it("감정이 없는 날은 조약돌 없이 쉼터 칸만 권한다", async () => {
    useDiary.setState((s) => ({ diaries: s.diaries.map((d) => ({ ...d, emotions: [] })) }));
    const r = await render(<Rest />);
    await waitForSheet();

    expect(r.getByText("오늘은 이걸 해 봐요")).toBeTruthy();
    expect(r.queryByText("불안")).toBeNull();
    expect(r.getByText("지금 해 볼게요")).toBeTruthy();
  });

  it("✕ 로 닫으면 그날은 다시 묻지 않고, 닫은 횟수가 하나 쌓인다", async () => {
    const r = await render(<Rest />);
    await waitForSheet();

    // 바깥(딤)과 ✕ 둘 다 「닫기」다 — 같은 닫기를 부른다
    const closes = r.getAllByLabelText("닫기");
    await fireEvent.press(closes[closes.length - 1]!);

    expect(r.queryByText("불안한 날엔, 이걸 해 봐요")).toBeNull();
    await act(async () => {});
    expect(await readRecommendationMemory()).toEqual({ day: "2026-07-27", dismissStreak: 1 });

    await r.unmount();
    const again = await render(<Rest />);
    await waitForSheet();
    expect(again.queryByText("불안한 날엔, 이걸 해 봐요")).toBeNull();
  });

  it("세 번 연달아 닫은 사람에게는 시트 대신 그 칸에 「오늘 추천」만 붙인다", async () => {
    await writeRecommendationMemory({ day: "2026-07-26", dismissStreak: 3 });
    const r = await render(<Rest />);
    await waitForSheet();

    expect(r.queryByText("불안한 날엔, 이걸 해 봐요")).toBeNull();
    expect(r.getByText("오늘 추천")).toBeTruthy();
    expect(sent("rest_recommendation_shown")).toEqual([]);

    // 그 칸에서 한 번 해 보면 다음 날부터 다시 시트로 권한다
    await fireEvent.press(r.getByLabelText("몸에 힘 빼기 열기"));
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    expect(jest.mocked(router.push)).toHaveBeenCalledWith("/rest/body-release");
    expect(sent("rest_recommendation_accepted")).toEqual([
      { content: "body_release", basis: "emotion", form: "hint" },
    ]);
    expect(await readRecommendationMemory()).toEqual({ day: "2026-07-27", dismissStreak: 0 });
  });

  it("오늘 쓴 일기가 없으면 권하지 않는다", async () => {
    useDiary.setState({ diaries: [], actionCards: [] });
    const r = await render(<Rest />);
    await waitForSheet();

    expect(r.queryByText(/볼까요\?/)).toBeNull();
    expect(r.queryByText("오늘 추천")).toBeNull();
  });

  it("이미 매듭지은 날(위기 안내가 나온 날 포함)은 권하지 않는다", async () => {
    await writeRecommendationMemory({ day: "2026-07-27", dismissStreak: 0 });
    const r = await render(<Rest />);
    await waitForSheet();

    expect(r.queryByText(/볼까요\?/)).toBeNull();
  });
});

describe("R2 · 날짜별 카드 — 상태와 행동을 나눈다", () => {
  it("가장 최근 카드의 상황·행동을 바로 보인다", async () => {
    const card = latest();
    const { getByText } = await render(<RestCards />);

    expect(getByText("상황")).toBeTruthy();
    expect(getByText("작은 행동")).toBeTruthy();
    expect(getByText(keepWords(card.situation))).toBeTruthy();
  });

  it("쪽지가 다섯 항목을 다 품는다 — 화면 전체가 스크롤해서 잘리지 않는다", async () => {
    const r = await render(<RestCards />);
    const note = r.getByTestId("rest-card-note");

    expect(within(note).getByText("작은 행동")).toBeTruthy();
  });

  it("문구는 클립과 압정이고, 뒤로가기는 앞 화면으로 돌아간다", async () => {
    const r = await render(<RestCards />);

    expect(r.getByTestId("rest-card-clip", { includeHiddenElements: true })).toBeTruthy();
    expect(r.getByTestId("rest-calendar-pin", { includeHiddenElements: true })).toBeTruthy();
    await fireEvent.press(r.getByLabelText("뒤로"));
    expect(router.back).toHaveBeenCalled();
  });

  it("카드 없는 날도 고를 수 있고, 그 자리에 「바람카드가 없어요」를 보여준다", async () => {
    seedOneCard(); // 2026-07-27 에 카드 한 장
    const r = await render(<RestCards />);

    // 처음엔 최신 카드(27일)를 보여준다
    expect(r.getByText(keepWords("10분 걷기"))).toBeTruthy();

    // 카드가 없는 15일을 골라도 잠기지 않고, 카드 자리에 없다는 문구가 뜬다
    await fireEvent.press(r.getByLabelText("15일"));
    expect(r.getByText("7월 15일에 만들어진 바람카드가 없어요.")).toBeTruthy();
  });

  it("카드가 하나도 없어도 캘린더로 날짜를 둘러볼 수 있다", async () => {
    useDiary.setState({ diaries: [], actionCards: [] });
    const r = await render(<RestCards />);

    // 아직 아무 날도 안 골랐으면 회고가 먼저라는 것을, 날을 고르면 그 날 카드가 없다는 것을
    expect(r.getByText("회고를 마치면 그날의 바람카드가 여기 남아요.")).toBeTruthy();
    await fireEvent.press(r.getByLabelText("15일"));
    expect(r.getByText(/15일에 만들어진 바람카드가 없어요\./)).toBeTruthy();
  });

  it("작은 행동을 아직 안 고른 오늘 카드는 예고 문구를 두고, 하단 줄째로 숨긴다", async () => {
    useDiary.setState({ actionCards: [{ ...seedOneCard(), targetAction: null }] });
    const r = await render(<RestCards />);

    expect(r.getByText(keepWords("내일 아침 바바가 골라 올게요"))).toBeTruthy();
    // 누를 대상이 없다 — 상태 줄과 「했어요」를 함께 숨긴다
    expect(r.queryByText("아직 하지 않았어요")).toBeNull();
    expect(r.queryByText("했어요")).toBeNull();
  });

  it("지난 카드의 빈 작은 행동은 예고하지 않는다 — 「내일 아침」이 틀린 말이 된다", async () => {
    useDiary.setState({
      actionCards: [{ ...seedOneCard(), targetAction: null, createdAt: "2026-07-20" }],
    });
    const r = await render(<RestCards />);

    // 감정 · 바람 같은 다른 빈 칸도 같은 말이라 여럿이다 — 작은 행동 칸이 그중 하나다
    expect(r.getAllByText(keepWords("아직 정하지 않음"))).toHaveLength(4);
    expect(r.queryByText(keepWords("내일 아침 바바가 골라 올게요"))).toBeNull();
    expect(r.queryByText("했어요")).toBeNull();
  });

  it("작은 행동 없이 이미 해 본 예전 카드는 「수행 취소」가 남는다", async () => {
    useDiary.setState({
      actionCards: [
        { ...seedOneCard(), targetAction: null, done: true, doneAt: "2026-07-27T09:00:00" },
      ],
    });
    const r = await render(<RestCards />);

    expect(r.getByText("수행 취소")).toBeTruthy();
  });

  it("왼쪽은 상태, 오른쪽은 행동 버튼이다 — 체크박스를 두지 않는다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({ ...c, done: false })),
    });
    const { getByText, queryByLabelText } = await render(<RestCards />);

    expect(getByText("아직 하지 않았어요")).toBeTruthy();
    expect(getByText("했어요")).toBeTruthy();
    // 옛 화면의 체크박스가 하던 두 일(보여주기·바꾸기)이 나뉘었다
    expect(queryByLabelText("수행")).toBeNull();
  });

  /**
   * 2026-11-10 개정 — 「했어요」가 다시 **메모 자리를 곧바로 연다**(사용자 요청 「했어요만 누르는 느낌 —
   * 진짜 글을 써야 할 것 같았으면」). 2026-09-06 에 걷었던 이유는 **닫을 길이 없어서**였다 —
   * 지금은 「나중에 적을게요」가 닫고, 닫으면 연필과 빈 줄(「느낀 점 적기」)이 남는다.
   */
  it("[했어요] 를 누르면 체크와 함께 메모 자리가 바로 열리고, [나중에 적을게요] 로 닫힌다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: false,
        reflection: null,
      })),
    });
    const r = await render(<RestCards />);

    expect(r.queryByLabelText("느낀 점")).toBeNull();
    await fireEvent.press(r.getByText("했어요"));

    expect(latest().done).toBe(true);
    // 「수행했어요」라는 글자는 두지 않는다 — 체크와 오른쪽 「수행 취소」가 이미 수행을 말한다(2026-09-06)
    expect(r.queryByText("수행했어요")).toBeNull();
    // 물음과 줄 친 입력이 바로 선다 — 비어 있으면 「남기기」는 잠긴다
    expect(r.getByText("해 보니 어땠나요?")).toBeTruthy();
    expect(r.getByLabelText("느낀 점")).toBeTruthy();
    expect(r.getByRole("button", { name: "남기기" }).props.accessibilityState?.disabled).toBe(true);
    // 화면을 옮기지 않는다 — 카드 안에서 끝난다
    expect(jest.mocked(router.push)).not.toHaveBeenCalled();

    // 닫을 길이 있다 — 닫으면 다시 적으러 들어갈 빈 줄이 남는다
    await fireEvent.press(r.getByLabelText("느낀 점 없이 넘어가기"));
    expect(r.queryByLabelText("느낀 점")).toBeNull();
    expect(latest().reflection).toBeNull();
    expect(r.getByText("느낀 점 적기")).toBeTruthy();
  });

  it("느낀 점은 선택이다 — 적어서 보내면 그대로 남는다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: true,
        reflection: null,
      })),
    });
    const r = await render(<RestCards />);

    await fireEvent.press(r.getByText("느낀 점 적기"));
    await fireEvent.changeText(r.getByLabelText("느낀 점"), "생각보다 개운했다");
    await fireEvent.press(r.getByRole("button", { name: "남기기" }));

    expect(latest().reflection).toBe("생각보다 개운했다");
  });

  /** 열어 놓고 마음이 바뀌면 「나중에 적을게요」로 닫는다 — 서버로 가는 것은 없고 자리만 처음으로 돌아간다 */
  it("열었다가 [나중에 적을게요] 를 누르면 아무것도 남기지 않고 닫힌다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: true,
        reflection: null,
      })),
    });
    const r = await render(<RestCards />);

    await fireEvent.press(r.getByText("느낀 점 적기"));
    await fireEvent.changeText(r.getByLabelText("느낀 점"), "적다 말았다");
    await fireEvent.press(r.getByText("나중에 적을게요"));

    expect(r.queryByLabelText("느낀 점")).toBeNull();
    expect(latest().reflection).toBeNull();
    // 자리는 처음으로 — 다시 적으러 들어갈 수 있다
    expect(r.getByText("느낀 점 적기")).toBeTruthy();
  });

  /**
   * 2026-09-06 개정 — 「고치기」 버튼을 없애고 **적어 둔 글 자체를 누르게** 했다.
   *
   * 버튼을 아래 줄에 두면 그 줄만큼 하단이 커지고, 같은 줄에 두면 느낀 점이 쓸 폭이
   * 반으로 줄어(495 → 278px) 상한이 24 → 14 자가 됐다. 글을 누르게 하면 자리도 폭도
   * 그대로다.
   */
  it("저장한 느낀 점을 누르면 다시 고칠 수 있다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: true,
        reflection: "생각보다 개운했다",
      })),
    });
    const r = await render(<RestCards />);

    expect(r.getByText(keepWords("생각보다 개운했다"))).toBeTruthy();
    expect(r.queryByLabelText("느낀 점")).toBeNull();
    // 버튼은 없다 — 글이 곧 버튼이다
    expect(r.queryByText("고치기")).toBeNull();

    await fireEvent.press(r.getByLabelText("느낀 점 고치기"));
    expect(r.getByLabelText("느낀 점")).toBeTruthy();
  });

  it("[수행 취소] 로 되돌리면 입력도 초기화된다", async () => {
    useDiary.setState({
      actionCards: useDiary.getState().actionCards.map((c) => ({
        ...c,
        done: true,
        reflection: null,
      })),
    });
    const r = await render(<RestCards />);

    await fireEvent.press(r.getByText("느낀 점 적기"));
    await fireEvent.changeText(r.getByLabelText("느낀 점"), "적다 말았다");
    await fireEvent.press(r.getByText("수행 취소"));

    expect(latest().done).toBe(false);
    // 적던 것이 다음 수행의 초안으로 남지 않는다
    expect(r.queryByLabelText("느낀 점")).toBeNull();
  });

  it("⋮ → [삭제하기] → 확인해야 지워지고, 결과를 한 줄로 알린다", async () => {
    const target = seedOneCard();
    const r = await render(<RestCards />);

    await fireEvent.press(r.getByLabelText("더보기"));
    await fireEvent.press(r.getByText("삭제하기"));

    // 되돌릴 수 없는 행동이라 **먼저 묻는다** — 아직 지우지 않았다
    expect(r.getByText("이 바람카드를 삭제할까요?")).toBeTruthy();
    expect(useDiary.getState().actionCards.find((c) => c.id === target.id)).toBeTruthy();

    await fireEvent.press(r.getByText("삭제"));

    expect(useDiary.getState().actionCards.find((c) => c.id === target.id)).toBeUndefined();
    // 알림은 **기기에 묘비를 남긴 뒤**에 온다 — 남기지 못하면 실패 한 줄이다
    // (규칙 전체는 `features/diary/model/__tests__/deletedCards.test.ts`)
    await waitFor(() =>
      expect(useToast.getState().current).toMatchObject({
        message: "바람카드를 삭제했어요.",
        variant: "positive",
      }),
    );
  });

  it("[그대로 두기] 를 고르면 아무 일도 없다", async () => {
    seedOneCard();
    const before = useDiary.getState().actionCards.length;
    const r = await render(<RestCards />);

    await fireEvent.press(r.getByLabelText("더보기"));
    await fireEvent.press(r.getByText("삭제하기"));
    await fireEvent.press(r.getByText("그대로 두기"));

    expect(useDiary.getState().actionCards).toHaveLength(before);
    expect(useToast.getState().current).toBeNull();
  });
});
