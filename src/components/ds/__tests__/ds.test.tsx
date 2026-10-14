import { act, fireEvent, render } from "@testing-library/react-native";
import { Dimensions, Keyboard, processColor } from "react-native";

import {
  BottomNavigation,
  BottomSheet,
  Button,
  Chip,
  EmotionDot,
  EmotionPebble,
  EmotionSticker,
  SelectLift,
  WeekEmptyDot,
  IconButton,
  ListCell,
  Menu,
  Modal,
  SectionHeader,
  SocialButton,
  SOCIAL_BUTTON_SIZE,
  Text,
  TextField,
  Toast,
} from "@/components/ds";
import { anchoredMenuTop } from "@/components/ds/Menu";
import { ICON_PATHS, type IconName } from "@/components/ds/icons/paths";
import { interaction, label, primary, social, status, zIndex } from "@/design/ds";

// 애플 줄은 시스템 버튼이다 — 눌리는 판 하나로 갈아끼운다(받은 이름 · 상태를 그대로 단다)
jest.mock("expo-apple-authentication", () => ({
  AppleAuthenticationButtonType: { SIGN_IN: 0 },
  AppleAuthenticationButtonStyle: { BLACK: 2 },
  AppleAuthenticationButton: (props: object) =>
    jest.requireActual("react").createElement(jest.requireActual("react-native").Pressable, props),
}));

/**
 * DS 컴포넌트가 **규칙을 지키는지** 본다 — 모양을 픽셀로 고정하지 않는다.
 * 여기서 단언하는 것은 `DESIGN.md` 와 `docs/spec/RULES.md` 가 요구하는 것들이다.
 */
const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

/** 렌더 트리에서 host 이름으로 첫 노드를 찾는다 — SVG 는 role 로 잡을 수 없다 */
type Node = { type?: string; props?: Record<string, unknown>; children?: unknown } | null;
const findByType = (node: unknown, type: string): { props: Record<string, unknown> } | null => {
  if (node == null || typeof node !== "object") return null;
  const n = node as Node & { children?: unknown[] };
  if (n?.type === type) return { props: n.props ?? {} };
  for (const child of n?.children ?? []) {
    const hit = findByType(child, type);
    if (hit) return hit;
  }
  return null;
};

/**
 * 누르는 것 넷은 **둥근 클립을 쓰지 않는다.**
 *
 * `borderRadius` + `overflow: "hidden"` 을 함께 두면 Android(Fabric)에서 둥근 클립이
 * 하드웨어 레이어를 만들고, 그 뒤 자식이 다시 그려져도 레이어가 무효화되지 않는다 —
 * 면만 새 색으로 칠해지고 **글자·아이콘이 사라진다.** 실기기에서 「색은 바뀌는데
 * 글자가 없다」로 드러났다(`Button.tsx` 머리말).
 *
 * 클립은 필요하지도 않다 — 스크림이 자기 `borderRadius` 를 들고 있다.
 */

/**
 * 키보드 이벤트를 흉내 낸다 — RN 의 `Keyboard` 에는 테스트용 `emit` 이 없어서
 * `addListener` 로 등록된 콜백을 가로채 직접 부른다. `beforeEach` 에서 건다.
 */
const keyboardHandlers = new Map<string, (e: unknown) => void>();
const fireKeyboard = (kind: "show" | "hide", covered: number) => {
  // 실제 이벤트처럼 **좌표**를 준다 — 컴포넌트가 재는 것이 `screenY` 이기 때문이다.
  // `height` 는 일부러 **다른 값**으로 둔다: 안드로이드 edge-to-edge 가 내비 바를
  // 뺀 높이를 주는 상황을 흉내 내서, 컴포넌트가 좌표를 본다는 것을 고정한다
  const screenHeight = Dimensions.get("screen").height;
  for (const [event, handler] of keyboardHandlers) {
    if (kind === "show" && event.toLowerCase().includes("show")) {
      handler({
        endCoordinates: { screenY: screenHeight - covered, height: covered - 48 },
      });
    }
    if (kind === "hide" && event.toLowerCase().includes("hide")) {
      handler({ endCoordinates: { screenY: screenHeight, height: 0 } });
    }
  }
};

beforeEach(() => {
  keyboardHandlers.clear();
  jest
    .spyOn(Keyboard, "addListener")
    .mockImplementation((event: string, handler: (e: never) => void) => {
      keyboardHandlers.set(event, handler as (e: unknown) => void);
      return { remove: () => keyboardHandlers.delete(event) } as never;
    });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("누름 스크림을 얹는 것들 — 둥근 클립을 쓰지 않는다", () => {
  const cases: [string, React.ReactElement][] = [
    ["Button", <Button key="b" label="저장" onPress={() => {}} />],
    ["Chip", <Chip key="c" label="행복함" onPress={() => {}} />],
    [
      "IconButton",
      <IconButton key="i" name="close" accessibilityLabel="닫기" onPress={() => {}} />,
    ],
    ["SocialButton", <SocialButton key="s" provider="kakao" label="계속하기" onPress={() => {}} />],
  ];

  it.each(cases)("%s", async (_name, element) => {
    const { getByRole } = await render(element);
    expect(flatten(getByRole("button").props.style).overflow).toBeUndefined();
  });
});

describe("Button", () => {
  it("solid 면은 primary.heavy 다 — 시안의 primary.normal 은 흰 글자에서 2.9 라 못 쓴다", async () => {
    const { getByRole } = await render(<Button label="저장" onPress={() => {}} />);
    expect(flatten(getByRole("button").props.style).backgroundColor).toBe(primary.heavy);
  });

  /**
   * 누름 반응은 **스크림 + 크기**다(`Button.tsx` 머리말 · `GrassButton` 과 같은 판단). 네이티브 드라이버로
   * 도는 값이라 테스트에서 숫자가 흐르지는 않는다 — **연결만** 본다: 눌리는 버튼에는 크기 값이 걸려 있고,
   * 비활성에는 걸리지 않는다.
   */
  it("누르면 줄어들 크기 값이 걸려 있다 — 스크림만으로는 눌린 것이 약하게 읽혔다", async () => {
    const { getByRole } = await render(<Button label="저장" onPress={() => {}} />);
    const transform = flatten(getByRole("button").props.style).transform as
      { scale?: number }[] | undefined;
    const scale = transform?.[0]?.scale;

    // 손을 대기 전에는 1 — 눌림은 네이티브 드라이버로 흐르므로 여기서는 시작값과 연결만 본다
    expect(scale).toBe(1);
    await fireEvent(getByRole("button"), "pressIn", { nativeEvent: {} });
    await fireEvent(getByRole("button"), "pressOut", { nativeEvent: {} });
  });

  it("비활성에는 크기 값이 걸리지 않는다 — 눌리지 않는 버튼이 반응하면 눌린 줄 안다", async () => {
    const { getByRole } = await render(<Button label="다음" disabled onPress={() => {}} />);
    expect(flatten(getByRole("button").props.style).transform).toBeUndefined();
  });

  it("비활성이면 눌리지 않고 상태를 알린다", async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(<Button label="다음" disabled onPress={onPress} />);

    const button = getByRole("button");
    expect(button.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("비활성은 면·라벨 색으로만 말한다 — 경고 아이콘·문구를 붙이지 않는다", async () => {
    const { getByRole, getByText } = await render(
      <Button label="다음" disabled onPress={() => {}} />,
    );
    expect(flatten(getByRole("button").props.style).backgroundColor).toBe(interaction.disabled);
    expect(flatten(getByText("다음").props.style).color).toBe(label.disabled);
  });

  it("destructive 는 확인 버튼만 위험색이다", async () => {
    const { getByRole } = await render(
      <Button label="삭제" variant="destructive" onPress={() => {}} />,
    );
    expect(flatten(getByRole("button").props.style).backgroundColor).toBe(status.negative);
  });

  it("비활성에서 활성으로 바뀌어도 라벨이 남는다", async () => {
    const { getByText, rerender } = await render(
      <Button label="다음" disabled onPress={() => {}} />,
    );
    expect(flatten(getByText("다음").props.style).color).toBe(label.disabled);

    await rerender(<Button label="다음" onPress={() => {}} />);
    expect(flatten(getByText("다음").props.style).color).toBe(label.onFill);
  });

  // rest 를 먼저 펼치므로 호출자가 준 상태는 살고 잠금은 우리가 쥔다
  it("호출자가 accessibilityState 를 줘도 잠금이 살아남는다", async () => {
    const { getByRole } = await render(
      <Button label="저장" disabled accessibilityState={{ busy: true }} onPress={() => {}} />,
    );
    const state = getByRole("button").props.accessibilityState;
    expect(state.disabled).toBe(true);
    expect(state.busy).toBe(true);
  });
});

describe("Chip — 선택을 색만으로 표시하지 않는다", () => {
  it("선택되면 테두리 두께와 글자색이 함께 바뀐다", async () => {
    const { getByRole, getByText, rerender } = await render(
      <Chip label="행복함" onPress={() => {}} />,
    );
    const off = flatten(getByRole("button").props.style);
    const offLabel = flatten(getByText("행복함").props.style).color;

    await rerender(<Chip label="행복함" selected onPress={() => {}} />);
    const on = flatten(getByRole("button").props.style);
    const onLabel = flatten(getByText("행복함").props.style).color;

    // 면 색만이 아니라 두께도 바뀐다 (1 → 2)
    expect(off.borderWidth).toBe(1);
    expect(on.borderWidth).toBe(2);
    expect(on.backgroundColor).not.toBe(off.backgroundColor);
    expect(onLabel).not.toBe(offLabel);
  });

  it("낭독기에도 선택 상태가 간다", async () => {
    const { getByRole } = await render(<Chip label="평온함" selected onPress={() => {}} />);
    expect(getByRole("button").props.accessibilityState.selected).toBe(true);
  });
});

describe("SocialButton — 같은 둥근 네모 안에 로고만 · 브랜드 색은 손대지 않는다", () => {
  it.each([
    ["kakao", social.kakao.background],
    ["google", social.google.background],
  ] as const)("%s 칸이 공식 색 그대로다", async (provider, expected) => {
    const { getByRole } = await render(
      <SocialButton provider={provider} label="계속하기" onPress={() => {}} />,
    );
    expect(flatten(getByRole("button").props.style).backgroundColor).toBe(expected);
  });

  // 애플은 「다른 로그인 버튼보다 작으면 안 된다」 — 셋의 지름이 같아야 한다
  it.each(["kakao", "google"] as const)(
    "%s 는 한 변 64 · 반경 12 의 둥근 네모다",
    async (provider) => {
      const { getByRole } = await render(
        <SocialButton provider={provider} label="계속하기" onPress={() => {}} />,
      );
      expect(flatten(getByRole("button").props.style)).toMatchObject({
        width: SOCIAL_BUTTON_SIZE,
        height: SOCIAL_BUTTON_SIZE,
        borderRadius: 12,
      });
    },
  );

  it("애플은 시스템 버튼을 같은 크기 · 같은 반경으로 둔다 — 로고를 직접 그리지 않는다", async () => {
    expect("logo-apple" in ICON_PATHS).toBe(false);
    const { getByRole } = await render(
      <SocialButton provider="apple" label="Apple로 로그인" onPress={() => {}} />,
    );
    const button = getByRole("button");

    expect(button.props.accessibilityLabel).toBe("Apple로 로그인");
    // 칸보다 크게 그려 잘라 내면 HIG 「기본 여백을 줄이지 말라」에 걸린다 — 칸 크기 그대로다
    expect(button.props.cornerRadius).toBe(12);
    expect(flatten(button.parent?.props.style)).toMatchObject({
      width: SOCIAL_BUTTON_SIZE,
      height: SOCIAL_BUTTON_SIZE,
    });
    expect(flatten(button.parent?.props.style).overflow).toBeUndefined();
  });

  it("글자를 그리지 않는다 — label 은 낭독기가 읽는 이름이다", async () => {
    const { getByRole, queryByText } = await render(
      <SocialButton provider="kakao" label="카카오 로그인" onPress={() => {}} />,
    );
    expect(queryByText("카카오 로그인")).toBeNull();
    expect(getByRole("button").props.accessibilityLabel).toBe("카카오 로그인");
  });

  it("비활성이어도 브랜드 색과 opacity를 바꾸지 않는다", async () => {
    const { getByRole } = await render(
      <SocialButton provider="kakao" label="계속하기" disabled onPress={() => {}} />,
    );
    const style = flatten(getByRole("button").props.style);
    expect(style.backgroundColor).toBe(social.kakao.background);
    expect(style.opacity).toBeUndefined();
  });

  it.each(["kakao", "apple"] as const)("%s 비활성이면 눌리지 않는다", async (provider) => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <SocialButton provider={provider} label="계속하기" disabled onPress={onPress} />,
    );
    await fireEvent.press(getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
  });

  it("카카오 심볼은 100% 검정이다", async () => {
    const { toJSON } = await render(
      <SocialButton provider="kakao" label="카카오 로그인" onPress={() => {}} />,
    );

    // 말풍선은 `Icon` 이 그린다 — `react-native-svg` 가 색을 `{ type, payload }` 로 싸서 넘긴다
    const symbol = findByType(toJSON(), "RNSVGPath");
    expect(symbol?.props.fill).toMatchObject({ payload: processColor(social.kakao.symbol) });
  });

  // 셋 중 하나만 테두리가 있으면 어색했다(2026-10-13) — 흰 칸이 크림 바탕에서 떨어져 보인다
  it.each(["kakao", "google"] as const)("%s 칸에는 테두리가 없다", async (provider) => {
    const { getByRole } = await render(
      <SocialButton provider={provider} label="계속하기" onPress={() => {}} />,
    );
    expect(flatten(getByRole("button").props.style).borderWidth).toBeUndefined();
  });
});

describe("IconButton", () => {
  it("이름이 없으면 낭독기가 「버튼」으로만 읽는다 — 그래서 이름이 필수다", async () => {
    const { getByLabelText } = await render(
      <IconButton name="close" accessibilityLabel="닫기" onPress={() => {}} />,
    );
    expect(getByLabelText("닫기")).toBeTruthy();
  });

  it("히트 영역이 44 다", async () => {
    const { getByRole } = await render(
      <IconButton name="bell" accessibilityLabel="알림" onPress={() => {}} />,
    );
    const style = flatten(getByRole("button").props.style);
    expect(style.width).toBe(44);
    expect(style.height).toBe(44);
  });
});

describe("BottomNavigation", () => {
  const TABS = [
    { name: "홈", icon: "home", label: "홈" },
    { name: "쉼터", icon: "heart", label: "쉼터" },
    { name: "보관함", icon: "folder-job", label: "보관함" },
    { name: "리포트", icon: "document", label: "리포트" },
    { name: "마이", icon: "nav-my-page", label: "마이" },
  ] as const;

  it("다섯 칸이다", async () => {
    const { getAllByRole } = await render(
      <BottomNavigation items={TABS} active="홈" onPress={() => {}} />,
    );
    expect(getAllByRole("tab")).toHaveLength(5);
  });

  it("활성 칸만 selected 다", async () => {
    const { getAllByRole } = await render(
      <BottomNavigation items={TABS} active="보관함" onPress={() => {}} />,
    );
    const selected = getAllByRole("tab").filter(
      (t) => t.props.accessibilityState?.selected === true,
    );
    expect(selected).toHaveLength(1);
  });

  it("누르면 그 탭 이름이 올라간다", async () => {
    const onPress = jest.fn();
    const { getByLabelText } = await render(
      <BottomNavigation items={TABS} active="홈" onPress={onPress} />,
    );
    await fireEvent.press(getByLabelText("리포트"));
    expect(onPress).toHaveBeenCalledWith("리포트");
  });
});

describe("TextField", () => {
  it("카운터는 상한이 있을 때만 — 오류 문구를 띄우지 않는다", async () => {
    const { getByText } = await render(
      <TextField value="안녕" maxLength={12} showCounter onChangeText={() => {}} />,
    );
    expect(getByText("2/12")).toBeTruthy();
  });

  it("상한이 없으면 카운터를 두지 않는다", async () => {
    const { queryByText } = await render(
      <TextField value="안녕" showCounter onChangeText={() => {}} />,
    );
    expect(queryByText(/\//)).toBeNull();
  });
});

describe("오버레이는 스스로 화면 전체를 덮는다", () => {
  // `flex: 1` 만 두면 화면 트리 안에서 조건부로 그렸을 때 형제와 자리를 나눠 가져
  // 딤이 콘텐츠를 못 덮는다. z 는 `DESIGN.md` §11 (시트·모달 = 3)
  // 엘리먼트를 배열에 담지 않고 만드는 함수를 담는다 — 케이스마다 새로 그린다
  it.each([
    [
      "BottomSheet",
      () => (
        <BottomSheet title="t" onDismiss={() => {}}>
          <Text>내용</Text>
        </BottomSheet>
      ),
      "ds-bottom-sheet-overlay",
    ],
    [
      "Modal",
      () => (
        <Modal
          title="t"
          description="d"
          cancelLabel="취소"
          confirmLabel="삭제"
          onCancel={() => {}}
          onConfirm={() => {}}
        />
      ),
      "ds-modal-overlay",
    ],
  ])("%s 루트가 절대 배치되고 콘텐츠 위에 온다", async (_name, node, testID) => {
    const { getByTestId } = await render(node());
    const root = flatten(getByTestId(testID).props.style);

    expect(root.position).toBe("absolute");
    expect([root.top, root.right, root.bottom, root.left]).toEqual([0, 0, 0, 0]);
    expect(root.zIndex).toBe(zIndex.overlay);
    expect(root.zIndex).toBeGreaterThan(zIndex.content);
  });

  it("Modal 은 네이티브 창에 그려진다 — ScrollView 안에서도 갇히지 않는다", async () => {
    // 절대 배치만 쓰던 시절 보관함이 이 자리를 밟아 우회했다(`PLAN.md` A-12)
    const onCancel = jest.fn();
    const r = await render(
      <Modal
        title="지울까요?"
        description="되돌릴 수 없어요."
        cancelLabel="취소"
        confirmLabel="삭제"
        onCancel={onCancel}
        onConfirm={() => {}}
      />,
    );
    // 트리의 **가장 바깥**이 네이티브 `Modal` 이어야 부모 트리 밖에 그려진다
    const native = r.toJSON() as { type: string; props: Record<string, unknown> };

    expect(native.type).toBe("Modal");
    expect(native.props.transparent).toBe(true);
    // 딤이 상태바까지 덮는다 — 없으면 위쪽만 밝게 남아 덮개가 끊긴다
    expect(native.props.statusBarTranslucent).toBe(true);
    // Android 뒤로가기는 **취소**다 — 되돌릴 수 없는 행동을 실수로 실행하지 않는다
    (native.props.onRequestClose as () => void)();
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("작은 원 — 반지름을 크기의 절반으로 **직접** 준다", () => {
  /**
   * ⚠ `radius.full`(999)을 쓰면 안드로이드에서 **네모로 그려지는 프레임**이 생긴다.
   *
   * New Architecture 의 배경 렌더러는 과대 반지름을 `min(반지름, 크기/2)` 로 깎는데,
   * 그 계산이 **크기가 확정되기 전에** 돌면 0 이 되고, 나중에 크기가 바뀌어도 이미
   * 만든 배경을 다시 계산하지 않는다. 달력에서 이것이 「처음엔 네모, 탭을 바꿨다
   * 오면 동그라미」로 드러났다 — 칸 폭을 `onLayout` 으로 재기 때문이다.
   *
   * **크기를 아는 자리에서는 깎을 일을 만들지 않는다.** 이 테스트가 고정하는 것은
   * 모양이 아니라 그 규칙이다 — 999 로 되돌아가면 여기서 걸린다.
   */
  /**
   * 주간 줄의 조약돌(`EmotionPebble`). **`EmotionDot` 은 그대로 두는 것**이 이 변경의
   * 핵심이라(일기 줄의 10dp 표식은 그림이 들어가면 뭉개진다) 둘이 갈린 채로 산다는
   * 것을 여기서 못 박는다.
   */
  it("EmotionPebble 는 감정마다 다른 그림을 건다", async () => {
    const a = await render(<EmotionPebble id={1} />);
    const b = await render(<EmotionPebble id={9} />);

    const uri = (json: unknown) => JSON.stringify(json).match(/"testUri":"[^"]+"/)?.[0];

    expect(uri(a.toJSON())).toBeDefined();
    expect(uri(a.toJSON())).not.toBe(uri(b.toJSON()));
  });

  /**
   * 「이번 주 감정」의 고른 칸(`SelectLift`). 선택은 **링이 아니라 들어 올림**이라
   * 테두리가 생기면 안 된다 — 조약돌에 둥근 링을 두르면 깨진 테두리로 보였다(2026-09-11).
   */
  it("SelectLift 는 고른 칸에 테두리도, 뒤 판도 깔지 않는다 — 커지기만 한다", async () => {
    const { toJSON } = await render(
      <SelectLift selected size={26}>
        <EmotionPebble id={4} />
      </SelectLift>,
    );

    const json = JSON.stringify(toJSON());
    expect(json).not.toContain("borderWidth");
    // 옅은 빛(뒤 판)을 깔았다가 뺐다(2026-09-11) — 조약돌 뒤에 불투명한 판이 한 겹 더 보였다
    expect(json).not.toContain("backgroundColor");
  });

  it("SelectLift 는 칸 크기만큼만 자리를 차지한다 — 옆 칸을 밀지 않는다", async () => {
    const { toJSON } = await render(
      <SelectLift selected={false} size={26}>
        <EmotionPebble id={4} />
      </SelectLift>,
    );

    // 커진 크기(26 × 1.18 ≈ 31)로 상자를 잡고 음수 여백(−2.5)으로 26 만큼만 차지한다
    const json = JSON.stringify(toJSON());
    expect(json).toContain('"width":31');
    expect(json).toContain('"margin":-2.5');
  });

  /**
   * 기록 없는 날의 원(`WeekEmptyDot`) — **빈 칸은 전부 같다.** 오늘 칸에만 옅은 링을 두르던 것을
   * 지웠다(2026-09-11 · 사용자 요청): 일기를 지운 날이 그 링 때문에 다른 빈 칸과 달라 보였다.
   */
  it("WeekEmptyDot 은 테두리가 없다 — 오늘도 마찬가지다", async () => {
    const { toJSON } = await render(<WeekEmptyDot />);

    expect(JSON.stringify(toJSON())).not.toContain("borderWidth");
  });

  /**
   * 감정 없이 끝난 일기(일기는 썼는데 감정 추출이 안 된 날) — 달력은 **빈 얼굴**, 주간 줄은
   * **빈 조약돌** 그림을 건다(2026-09-11 · 사용자 반입). 색 원으로 되돌아가면 여기서 걸린다.
   */
  it("감정이 없으면 스티커·조약돌 모두 감정 그림과 다른 빈 그림을 건다", async () => {
    const uri = (json: unknown) => JSON.stringify(json).match(/"testUri":"[^"]+"/)?.[0];

    const sticker = await render(<EmotionSticker id={null} size={30} />);
    const stickerFace = await render(<EmotionSticker id={1} size={30} />);
    expect(uri(sticker.toJSON())).toContain("no-emotion");
    expect(uri(sticker.toJSON())).not.toBe(uri(stickerFace.toJSON()));

    const pebble = await render(<EmotionPebble id={null} />);
    expect(uri(pebble.toJSON())).toContain("no-emotion");
    expect(uri(pebble.toJSON())).not.toBe(uri(sticker.toJSON()));
  });

  it("EmotionPebble 도 지름의 절반을 쓴다 — 999 가 아니다", async () => {
    const { toJSON } = await render(<EmotionPebble id={4} size={10} />);

    expect(JSON.stringify(toJSON())).toContain('"borderRadius":5');
  });

  it("EmotionDot 은 지름의 절반을 쓴다 — 999 가 아니다", async () => {
    const { toJSON } = await render(<EmotionDot id={4} size={10} />);
    const style = flatten((toJSON() as unknown as { props: { style: unknown } }).props.style);

    expect(style.borderRadius).toBe(5);
    expect(style.borderRadius).not.toBe(999);
  });

  it("크기가 바뀌면 반지름도 따라간다 — 고정값을 박아 두지 않았다", async () => {
    const { toJSON } = await render(<EmotionDot id={4} size={26} />);
    const style = flatten((toJSON() as unknown as { props: { style: unknown } }).props.style);

    expect(style.borderRadius).toBe(13);
  });
});

describe("BottomSheet", () => {
  // `layout.safeArea`(34)는 iOS 시안 값이다 — 그대로 박으면 Android·제스처 내비에서
  // 여백이 뜨거나 시스템 UI 와 겹친다. 실제 inset 을 쓴다(`metrics.ts` layout 주석).
  it("하단 여백이 시안 고정값 34 가 아니라 실제 inset 을 따른다", async () => {
    const { getByTestId } = await render(
      <BottomSheet title="감정 고르기" onDismiss={() => {}}>
        <Text>내용</Text>
      </BottomSheet>,
    );
    // 테스트 환경의 inset 은 0 이라 바닥에 붙지 않도록 둔 최소 여백만 남는다
    const padding = flatten(getByTestId("ds-bottom-sheet").props.style).paddingBottom;
    expect(padding).toBe(20);
    expect(padding).not.toBe(34);
  });

  /**
   * ⚠ **매니페스트의 `adjustResize` 는 여기서 아무 일도 하지 않는다.**
   * edge-to-edge(Expo SDK 54+)에서 안드로이드 창은 키보드에 밀려 줄지 않고 키보드가
   * 그 위를 덮는다. 시트 안에 입력이 들어간 첫 자리가 **회원 탈퇴 확인**이었고,
   * 거기서 입력창이 키보드에 가려졌다.
   *
   * 고정하는 것은 픽셀이 아니라 규칙 셋이다:
   * **키보드가 올라오면 시트가 그만큼 위로 선다** · **inset 에 더하지 않고 대신한다**
   * (키보드가 내비게이션 바를 덮으므로 더하면 붕 뜬다) · **높이가 아니라 좌표로 잰다**
   * (안드로이드 edge-to-edge 의 `height` 는 내비 바를 빼고 오는데, 시트는 그 뒤까지
   * 뻗어 있어 딱 그만큼 마지막 버튼이 잘렸다 — 실기기에서 확인).
   */
  it("키보드가 가린 자리만큼 시트가 선다 — 높이가 아니라 좌표로 잰다", async () => {
    const { getByTestId } = await render(
      <BottomSheet title="회원 탈퇴" onDismiss={() => {}}>
        <Text>내용</Text>
      </BottomSheet>,
    );
    const padOf = () => flatten(getByTestId("ds-bottom-sheet").props.style).paddingBottom;

    // 닫혀 있을 때는 지금까지와 같다 (테스트 환경 inset 0 → 최소 여백)
    expect(padOf()).toBe(20);

    await act(async () => {
      fireKeyboard("show", 300);
    });
    // 키보드가 가린 300 + space.md(12).
    // - **320(= 300 + 20)이 아니다** — 최소 여백을 더하지 않는다(키보드가 그 자리를 덮는다)
    // - **264(= 252 + 12)도 아니다** — `endCoordinates.height`(내비 바를 뺀 값)를 보지 않는다.
    //   실기기에서 이 차이만큼 마지막 버튼이 잘렸다
    expect(padOf()).toBe(312);

    await act(async () => {
      fireKeyboard("hide", 0);
    });
    expect(padOf()).toBe(20);
  });
});

describe("BottomSheet · 닫는 길", () => {
  /** 손잡이 · 제목 줄을 `from` 에서 `to` 까지 끌었다 놓는다 */
  const pull = async (grab: Parameters<typeof fireEvent>[0], from: number, to: number) => {
    await fireEvent(grab, "responderGrant", { nativeEvent: { pageY: from } });
    await fireEvent(grab, "responderMove", { nativeEvent: { pageY: to } });
    await fireEvent(grab, "responderRelease", { nativeEvent: { pageY: to } });
  };

  it("손잡이를 충분히 쓸어내리면 닫히고, 덜 내리면 그대로다", async () => {
    const onDismiss = jest.fn();
    const { getByTestId } = await render(
      <BottomSheet title="알림 설정" onDismiss={onDismiss}>
        <Text>내용</Text>
      </BottomSheet>,
    );
    const grab = getByTestId("ds-bottom-sheet-grab");

    await pull(grab, 100, 150);
    expect(onDismiss).not.toHaveBeenCalled();

    await pull(grab, 100, 200);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("✕ 는 고른 시트에만 서고, 딤과 같은 닫기를 부른다", async () => {
    const onDismiss = jest.fn();
    const plain = await render(
      <BottomSheet title="알림 설정" onDismiss={() => {}}>
        <Text>내용</Text>
      </BottomSheet>,
    );
    // 딤 하나뿐이다
    expect(plain.getAllByLabelText("닫기")).toHaveLength(1);
    await plain.unmount();

    const closable = await render(
      <BottomSheet eyebrow="바바가 하나 골라 봤어요" closable onDismiss={onDismiss}>
        <Text>내용</Text>
      </BottomSheet>,
    );
    // 제목 없이 작은 한 줄과 ✕ 만으로도 머리 줄이 선다(쉼 추천 시트)
    expect(closable.getByText("바바가 하나 골라 봤어요")).toBeTruthy();
    const closes = closable.getAllByLabelText("닫기");
    expect(closes).toHaveLength(2);
    for (const close of closes) await fireEvent.press(close);
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });
});

describe("Modal", () => {
  it("삭제 확인은 확인 버튼만 위험색이고 취소는 아니다", async () => {
    const { getAllByRole } = await render(
      <Modal
        title="일정을 지울까요?"
        description="되돌릴 수 없어요."
        cancelLabel="취소"
        confirmLabel="삭제"
        destructive
        onCancel={() => {}}
        onConfirm={() => {}}
      />,
    );
    const fills = getAllByRole("button").map((b) => flatten(b.props.style).backgroundColor);
    expect(fills.filter((c) => c === status.negative)).toHaveLength(1);
  });
});

describe("ListCell", () => {
  it("누를 수 없는 줄은 버튼이 아니다 — 낭독기가 눌리는 줄로 읽지 않게", async () => {
    const { queryByRole, getByText } = await render(<ListCell title="팀 회의" />);

    expect(getByText("팀 회의")).toBeTruthy();
    expect(queryByRole("button")).toBeNull();
  });

  it("비활성이면 눌리지 않고 상태를 알린다", async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <ListCell title="데이터 내보내기" description="준비 중이에요" disabled onPress={onPress} />,
    );

    const row = getByRole("button");
    expect(row.props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(row);
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe("SectionHeader", () => {
  it("설명은 제목 아래 한 줄이고 행동은 오른쪽에 선다", async () => {
    const { getByText, getByRole } = await render(
      <SectionHeader
        title="오늘 일정"
        description="3개 남음"
        trailing={<Button label="＋ 추가" variant="text" size="small" onPress={() => {}} />}
      />,
    );

    expect(getByText("오늘 일정")).toBeTruthy();
    expect(getByText("3개 남음")).toBeTruthy();
    expect(getByRole("button", { name: "＋ 추가" })).toBeTruthy();
  });
});

describe("Menu", () => {
  it("행 아래 공간이 있으면 간격을 유지하고, 하단에서는 행 위로 뒤집는다", async () => {
    expect(anchoredMenuTop(308, 256, 800, 90, 2)).toBe(308);
    expect(anchoredMenuTop(678, 626, 800, 90, 2)).toBe(530);

    const screen = await render(
      <Menu
        actions={[
          { label: "수정하기", onPress: () => {} },
          { label: "삭제하기", onPress: () => {} },
        ]}
        top={678}
        anchorTop={626}
        bottomInset={90}
        onDismiss={() => {}}
      />,
    );
    await fireEvent(screen.getByTestId("ds-menu-overlay"), "layout", {
      nativeEvent: { layout: { height: 800 } },
    });
    expect(flatten(screen.getByTestId("ds-menu-panel").props.style).top).toBe(530);
  });

  it("위아래가 모두 부족해도 화면 하단 밖으로 나가지 않는다", () => {
    expect(anchoredMenuTop(128, 76, 220, 40, 2)).toBe(84);
  });

  it("바깥을 누르면 닫힌다 — ⋮ 메뉴의 유일한 취소 길이다", async () => {
    const onDismiss = jest.fn();
    const { getByLabelText } = await render(
      <Menu actions={[{ label: "수정하기", onPress: () => {} }]} top={100} onDismiss={onDismiss} />,
    );

    await fireEvent.press(getByLabelText("메뉴 닫기"));
    expect(onDismiss).toHaveBeenCalled();
  });

  it("위험색은 되돌릴 수 없는 항목에만 얹는다", async () => {
    const { getByText } = await render(
      <Menu
        actions={[
          { label: "수정하기", onPress: () => {} },
          { label: "삭제하기", negative: true, onPress: () => {} },
        ]}
        top={100}
        onDismiss={() => {}}
      />,
    );

    expect(flatten(getByText("삭제하기").props.style).color).toBe(status.negative);
    expect(flatten(getByText("수정하기").props.style).color).toBe(label.normal);
  });
});

describe("Toast", () => {
  it("글자는 변형과 무관하게 반전 면 위에서 읽힌다 — 색만으로 말하지 않는다", async () => {
    const { getByText } = await render(
      <Toast message="저장에 실패했어요." variant="negative" onDismiss={() => {}} />,
    );

    expect(flatten(getByText("저장에 실패했어요.").props.style).color).toBe(label.onFill);
  });

  // 가짜 시계를 쓰므로 이 describe 의 **마지막**에 둔다 — 뒤따르는 비동기 render 가
  // 멈춘 시계를 물려받으면 영영 끝나지 않는다
  it("스스로 사라진다 — 화면마다 시간이 갈리지 않게", async () => {
    jest.useFakeTimers();
    const onDismiss = jest.fn();
    await render(<Toast message="일정을 삭제했어요." onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => jest.advanceTimersByTime(2600));
    expect(onDismiss).toHaveBeenCalled();
    jest.useRealTimers();
  });
});

describe("아이콘 세트", () => {
  it("33개가 다 있고 전부 path 를 든다 — 빈 글리프를 만들지 않는다", async () => {
    // Wanted 반입 26 + `list`(2026-08-24) − `logo-apple`(애플 공식 아트워크로 옮김)
    //   + `logout`(로그아웃 exit 글리프 · 세트에 없어 직접 그림) = 27
    //   + 쉼터 콘텐츠 넷(`wave` `box` `treasure` `capybara-rest` · 2026-09-02 직접 그림) = 31
    //   + `mic` `pulse`(회고 음성 입력 · 2026-09-29 직접 그림) = 33
    const names = Object.keys(ICON_PATHS) as IconName[];
    expect(names).toHaveLength(33);
    for (const n of names) {
      expect(ICON_PATHS[n].length).toBeGreaterThan(0);
      for (const p of ICON_PATHS[n]) expect(p.d.startsWith("M")).toBe(true);
    }
  });

  it("탭바가 쓰는 다섯 글리프가 세트에 있다 — person 은 없고 nav-my-page 다", async () => {
    for (const n of ["home", "heart", "folder-job", "document", "nav-my-page"]) {
      expect(n in ICON_PATHS).toBe(true);
    }
    expect("person" in ICON_PATHS).toBe(false);
  });
});
