import { fireEvent, render } from "@testing-library/react-native";

import { GrassButton } from "../ui/GrassButton";

/**
 * 홈 CTA 의 잔디 버튼. **모양은 그림이 들고 있으므로**(`assets/home/cta-grass.png`)
 * 코드가 지킬 것은 좁다 — 문이 열리는가, 그리고 **낭독기에 버튼으로 읽히는가**.
 *
 * 카피바라와 달리 이쪽은 **눌러서 얻는 것이 있다**(회고가 열린다). 장식이 아니라
 * 화면의 주 행동이라 접근성 트리에 그대로 서야 한다.
 */
describe("GrassButton", () => {
  it("누르면 onPress 가 불린다", async () => {
    const onPress = jest.fn();
    const r = await render(<GrassButton label="지금 하루 돌아보기" onPress={onPress} />);

    fireEvent.press(r.getByRole("button", { name: "지금 하루 돌아보기" }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("모양이 그림이어도 라벨은 글자다 — 낭독기가 읽는다", async () => {
    const r = await render(<GrassButton label="지금 하루 돌아보기" onPress={() => {}} />);

    expect(r.getByRole("button", { name: "지금 하루 돌아보기" })).toBeTruthy();
  });
});
