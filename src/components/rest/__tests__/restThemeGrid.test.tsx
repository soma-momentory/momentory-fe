import { render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { RestThemeGrid } from "@/components/rest/RestThemeGrid";
import { REST_THEMES } from "@/components/rest/restThemes";
import { keepWords } from "@/features/letter/model/letter";
import { REST_CONTENTS } from "@/features/rest/model/contents";

const rowsOf = async (count: number) => {
  const items = REST_CONTENTS.slice(0, count);
  const screen = await render(<RestThemeGrid items={items} onOpen={() => {}} />);
  const grid = screen.getByTestId("rest-theme-grid");
  return { screen, rows: grid.children as unknown as { children: unknown[] }[] };
};

describe("RestThemeGrid", () => {
  it("쉼 콘텐츠마다 테마가 있다", () => {
    for (const item of REST_CONTENTS) {
      const theme = REST_THEMES[item.id];
      expect(theme.scene ?? theme.Art).toBeDefined();
    }
  });

  it("개수가 늘어도 두 칸씩 놓고, 눌리는 이름을 그대로 둔다", async () => {
    const { screen, rows } = await rowsOf(REST_CONTENTS.length);
    expect(rows.map((row) => row.children.length)).toEqual([2, 2, 2, 1]);
    for (const item of REST_CONTENTS) {
      expect(screen.getByRole("button", { name: `${item.title} 열기` })).toBeTruthy();
      expect(screen.getByText(keepWords(item.title))).toBeTruthy();
    }
  });

  it("홀수면 마지막 카드 혼자 한 줄을 쓴다 — 빈 칸을 남기지 않는다", async () => {
    const { screen, rows } = await rowsOf(5);
    expect(rows.map((row) => row.children.length)).toEqual([2, 2, 1]);
    const last = screen.getByRole("button", { name: `${REST_CONTENTS[4]!.title} 열기` });
    expect(StyleSheet.flatten(last.props.style)).toMatchObject({ flex: 1 });
  });

  it("화면이 없는 콘텐츠는 누르게 두지 않고, 추천 한 줄은 글자로 적는다", async () => {
    const { route: _route, ...rest } = REST_CONTENTS[0]!;
    const screen = await render(<RestThemeGrid items={[{ ...rest, note: "오늘 추천" }]} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("오늘 추천")).toBeTruthy();
  });
});
