import { fireEvent, render } from "@testing-library/react-native";

import {
  BottomNavigation,
  BottomSheet,
  Button,
  Chip,
  IconButton,
  Modal,
  SocialButton,
  Text,
  TextField,
} from "@/components/ds";
import { ICON_PATHS, type IconName } from "@/components/ds/icons/paths";
import { interaction, label, primary, social, status, zIndex } from "@/design/ds";

/**
 * DS 컴포넌트가 **규칙을 지키는지** 본다 — 모양을 픽셀로 고정하지 않는다.
 * 여기서 단언하는 것은 `design.md` 와 `docs/spec/RULES.md` 가 요구하는 것들이다.
 */
const flatten = (style: unknown) =>
  Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;

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

describe("SocialButton — 브랜드 색·마크는 손대지 않는다", () => {
  it.each([
    ["kakao", social.kakao.background],
    ["google", social.google.background],
    ["apple", social.apple.background],
  ] as const)("%s 면이 공식 색 그대로다", async (provider, expected) => {
    const { getByRole } = await render(
      <SocialButton provider={provider} label="계속하기" onPress={() => {}} />,
    );
    expect(flatten(getByRole("button").props.style).backgroundColor).toBe(expected);
  });

  it("높이 48 · radius 12 — 공통은 치수만 나눠 쓴다", async () => {
    const { getByRole } = await render(
      <SocialButton provider="kakao" label="계속하기" onPress={() => {}} />,
    );
    const style = flatten(getByRole("button").props.style);
    expect(style.height).toBe(48);
    expect(style.borderRadius).toBe(12);
  });

  // DS 비활성 면(#DDE7E0)을 쓰면 브랜드 색이 사라져 어느 줄이 무엇이었는지 읽히지 않는다
  it("비활성이어도 브랜드 면은 남고 흐려지기만 한다", async () => {
    const { getByRole } = await render(
      <SocialButton provider="kakao" label="계속하기" disabled onPress={() => {}} />,
    );
    const style = flatten(getByRole("button").props.style);
    expect(style.backgroundColor).toBe(social.kakao.background);
    expect(style.opacity).toBeLessThan(1);
  });

  it("비활성이면 눌리지 않는다", async () => {
    const onPress = jest.fn();
    const { getByRole } = await render(
      <SocialButton provider="apple" label="계속하기" disabled onPress={onPress} />,
    );
    await fireEvent.press(getByRole("button"));
    expect(onPress).not.toHaveBeenCalled();
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
  // 딤이 콘텐츠를 못 덮는다. z 는 `design.md` §11 (시트·모달 = 3)
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

describe("아이콘 세트", () => {
  it("26개가 다 있고 전부 path 를 든다 — 빈 글리프를 만들지 않는다", async () => {
    const names = Object.keys(ICON_PATHS) as IconName[];
    expect(names).toHaveLength(26);
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
