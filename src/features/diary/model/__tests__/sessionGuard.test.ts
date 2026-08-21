import { SESSION_KEY } from "@/features/auth/model/auth";
import { deleteDiary, loadArchive } from "@/features/diary/data/diaryApi";
import { useDiary } from "@/features/diary/model/diary";
import type { ActionCard, Diary } from "@/features/diary/model/types";
import { useToast } from "@/lib/toast";
import { testDiaryData } from "@/testing/fixtures";

/**
 * **로그아웃과 겹친 비동기 작업이 다음 사람의 화면에 끼어들지 않는다.**
 *
 * 이 store 의 비동기 작업 셋은 끝날 때 목록에 **무언가를 넣는다** — 조회 결과,
 * 삭제 실패의 되살리기 둘. 그 사이에 로그아웃하고 다른 사람이 로그인해 있으면
 * 앞 사람의 일기·행동카드가 새 보관함에 나타난다. 값을 고치기만 하는 쓰기와
 * 달리 **되살리기는 없는 것을 만들어 내기 때문**이다.
 *
 * `reset()`(로그아웃이 부른다)이 세대를 올리고, 시작할 때 붙잡아 둔 세대와
 * 다르면 손대지 않는다.
 */
jest.mock("@/features/diary/data/diaryApi", () => ({
  ...jest.requireActual("@/features/diary/data/diaryApi"),
  loadArchive: jest.fn(),
  deleteDiary: jest.fn(),
  putActionCardCompletion: jest.fn(() => Promise.resolve({ ok: true })),
}));

const archive = jest.mocked(loadArchive);
const remove = jest.mocked(deleteDiary);
const secure = jest.requireMock("expo-secure-store") as { __store: Map<string, string> };

const flush = () => new Promise((r) => setTimeout(r, 0));

/** 모양은 고정값 한 벌에서 빌린다 — 여기서 보는 것은 **어느 세션의 것인가**뿐이다 */
const template = testDiaryData().diaries[0] as Diary;
const diary = (id: string): Diary => ({ ...template, id });

const card = (id: string): ActionCard => ({
  id,
  diaryId: "d-1",
  situation: "상황",
  targetAction: "행동",
  done: false,
  doneAt: null,
  reflection: null,
  createdAt: "2026-08-14",
});

/** 응답을 손에 쥔 채 멈춰 세운다 — 그 틈에 로그아웃을 끼워 넣는다 */
const pending = <T>() => {
  let release!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

beforeEach(() => {
  jest.clearAllMocks();
  secure.__store.clear();
  secure.__store.set(
    SESSION_KEY,
    JSON.stringify({
      accessToken: "t",
      refreshToken: "r",
      expiresAt: Date.now() + 60_000,
      userId: 7,
    }),
  );
  useDiary.setState({ diaries: [], actionCards: [], loaded: false });
  useToast.setState({ current: null });
});

describe("조회 중 로그아웃", () => {
  it("앞사람의 보관함을 새 세션에 붓지 않는다", async () => {
    const call = pending<Awaited<ReturnType<typeof loadArchive>>>();
    archive.mockReturnValue(call.promise);

    void useDiary.getState().load();
    useDiary.getState().reset(); // 로그아웃
    call.release({ ok: true, data: { diaries: [diary("101")], actionCards: [card("7")] } });
    await flush();

    expect(useDiary.getState().diaries).toEqual([]);
    expect(useDiary.getState().actionCards).toEqual([]);
    expect(useDiary.getState().loaded).toBe(false);
  });

  it("다음 사람의 조회는 새로 나간다 — 앞사람의 요청을 물려받지 않는다", async () => {
    const call = pending<Awaited<ReturnType<typeof loadArchive>>>();
    archive.mockReturnValue(call.promise);

    void useDiary.getState().load();
    useDiary.getState().reset();
    archive.mockResolvedValue({ ok: true, data: { diaries: [diary("109")], actionCards: [] } });

    await useDiary.getState().load();

    expect(archive).toHaveBeenCalledTimes(2);
    expect(useDiary.getState().diaries.map((d) => d.id)).toEqual(["109"]);
  });
});

describe("삭제 중 로그아웃", () => {
  it("일기 삭제가 실패해도 되살리지 않는다 — 앞사람의 일기다", async () => {
    const call = pending<Awaited<ReturnType<typeof deleteDiary>>>();
    remove.mockReturnValue(call.promise);
    useDiary.setState({ diaries: [diary("101")] });

    useDiary.getState().remove("101"); // 그 자리에서 서버로 보낸다
    useDiary.getState().reset(); // 답을 기다리는 사이 로그아웃
    call.release({ ok: false, code: "network" });
    await flush();

    expect(useDiary.getState().diaries).toEqual([]);
    // 로그아웃한 화면에 「삭제하지 못했어요」가 뜰 이유도 없다
    expect(useToast.getState().current).toBeNull();
  });

  it("행동카드 묘비를 남기지 못해도 되살리지 않는다", async () => {
    useDiary.setState({ actionCards: [card("7")] });

    useDiary.getState().removeActionCard("7");
    useDiary.getState().reset();
    await flush();

    expect(useDiary.getState().actionCards).toEqual([]);
    expect(useToast.getState().current).toBeNull();
  });
});

describe("로그아웃하지 않았으면 평소대로 — 가드가 정상 동작을 막지 않는다", () => {
  it("일기 삭제 실패는 되살리고 실패 한 줄", async () => {
    remove.mockResolvedValue({ ok: false, code: "network" });
    useDiary.setState({ diaries: [diary("101")] });

    useDiary.getState().remove("101");
    await flush();

    expect(useDiary.getState().diaries.map((d) => d.id)).toEqual(["101"]);
    expect(useToast.getState().current).toMatchObject({ variant: "negative" });
  });
});
