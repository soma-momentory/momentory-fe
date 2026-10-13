import { render } from "@testing-library/react-native";

import WorriesScreen from "../worries";

import { fetchWorries } from "@/features/rest/data/worryApi";

/** 맡겨둔 걱정 — 하루씩 묶어 최신 날부터, 하루 안은 맡긴 순서로 보여 준다 */
jest.mock("@/features/rest/data/worryApi", () => ({ fetchWorries: jest.fn() }));
jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

const worry = (id: string, date: string, createdAt: string, content: string) => ({
  id,
  date,
  createdAt,
  content,
});

describe("맡겨둔 걱정", () => {
  it("하루씩 묶어 최신 날부터 보여 준다", async () => {
    jest.mocked(fetchWorries).mockResolvedValue({
      ok: true,
      data: [
        worry("3", "2026-10-13", "2026-10-13T12:00:00Z", "오늘 두 번째"),
        worry("2", "2026-10-13", "2026-10-13T10:00:00Z", "오늘 첫 번째"),
        worry("1", "2026-10-12", "2026-10-12T10:00:00Z", "어제 걱정"),
      ],
    });
    const r = await render(<WorriesScreen />);

    const texts = (await r.findAllByText(/번째|어제 걱정/)).map((n) => n.props.children);
    expect(texts).toEqual(["오늘 첫 번째", "오늘 두 번째", "어제 걱정"]);
  });

  it("못 받아 오면 비어 있다는 말만 한다", async () => {
    jest.mocked(fetchWorries).mockResolvedValue({ ok: false, code: "network" });
    const r = await render(<WorriesScreen />);
    expect(await r.findByText("아직 맡겨둔 걱정이 없어요")).toBeTruthy();
  });
});
