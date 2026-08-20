import {
  createSchedule as createScheduleApi,
  deleteSchedule as deleteScheduleApi,
  fetchSchedules as fetchSchedulesApi,
  patchScheduleVisibility as patchScheduleVisibilityApi,
  putCompletion as putCompletionApi,
} from "@/features/home/data/scheduleApi";
import { remainingLabel, useDay, weekStartOf } from "@/features/home/model/day";
import type { Schedule } from "@/features/home/model/types";

jest.mock("@/features/home/data/scheduleApi", () => ({
  fetchSchedules: jest.fn(),
  createSchedule: jest.fn(),
  deleteSchedule: jest.fn(),
  putCompletion: jest.fn(),
  patchScheduleVisibility: jest.fn(),
}));

const fetchSchedules = jest.mocked(fetchSchedulesApi);
const createSchedule = jest.mocked(createScheduleApi);
const deleteSchedule = jest.mocked(deleteScheduleApi);
const putCompletion = jest.mocked(putCompletionApi);
const patchScheduleVisibility = jest.mocked(patchScheduleVisibilityApi);

const row = (over: Partial<Schedule> = {}): Schedule => ({
  id: "7",
  date: "2026-07-27",
  title: "면접 스터디",
  time: null,
  source: "manual",
  externalId: null,
  done: false,
  doneAt: null,
  emotions: [],
  hidden: false,
  ...over,
});

/** store 가 `void promise.then(...)` 으로 보낸 뒷일이 끝나기를 기다린다 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  jest.clearAllMocks();
  useDay.getState().reset();
  putCompletion.mockResolvedValue({ ok: true, data: { completed: true, emotions: [] } });
  createSchedule.mockResolvedValue({ ok: true, data: row({ id: "99", title: "산책" }) });
  deleteSchedule.mockResolvedValue({ ok: true, data: true });
  patchScheduleVisibility.mockResolvedValue({ ok: true, data: true });
});

describe("일정은 서버가 정본이다", () => {
  it("홈이 부르면 그날의 일정을 받아 채운다", async () => {
    fetchSchedules.mockResolvedValue({ ok: true, data: [row()] });

    await useDay.getState().load();

    expect(fetchSchedules).toHaveBeenCalledWith("2026-07-27"); // SampleClock
    expect(useDay.getState().schedules).toHaveLength(1);
    expect(useDay.getState().loaded).toBe(true);
  });

  it("여러 번 불러도 요청은 하나다", async () => {
    fetchSchedules.mockResolvedValue({ ok: true, data: [] });

    await Promise.all([useDay.getState().load(), useDay.getState().load()]);

    expect(fetchSchedules).toHaveBeenCalledTimes(1);
  });

  it("동기화 뒤 reload는 진행 중 조회를 마친 다음 서버를 한 번 더 읽는다", async () => {
    let finishFirst!: (value: ReturnType<typeof row>[]) => void;
    fetchSchedules
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finishFirst = (data) => resolve({ ok: true, data });
          }),
      )
      .mockResolvedValueOnce({ ok: true, data: [row({ id: "8", title: "동기화 일정" })] });

    const initial = useDay.getState().load();
    const reloaded = useDay.getState().reload();
    finishFirst([]);
    await Promise.all([initial, reloaded]);

    expect(fetchSchedules).toHaveBeenCalledTimes(2);
    expect(useDay.getState().schedules[0]?.title).toBe("동기화 일정");
  });

  it("못 받으면 가진 것을 그대로 둔다 — 빈 목록으로 덮지 않는다", async () => {
    useDay.setState({ schedules: [row()] });
    fetchSchedules.mockResolvedValue({ ok: false, code: "network" });

    await useDay.getState().load();

    expect(useDay.getState().schedules).toHaveLength(1);
    expect(useDay.getState().loaded).toBe(false);
  });

  it("로그아웃이 비운다 — 앞 사람의 하루가 남지 않게", () => {
    useDay.setState({ schedules: [row()], loaded: true });

    useDay.getState().reset();

    expect(useDay.getState().schedules).toEqual([]);
    expect(useDay.getState().loaded).toBe(false);
  });
});

describe("먼저 화면을 바꾸고 서버에 보낸다", () => {
  it("마침은 기다리지 않고 즉시 켜진다", () => {
    useDay.setState({ schedules: [row()] });

    useDay.getState().toggleDone("7");

    expect(useDay.getState().schedules[0]?.done).toBe(true);
    expect(putCompletion).toHaveBeenCalledWith("7", true, null);
  });

  it("마침에 감정을 실어 보내지 않는다 — 화면이 묻지 않으므로(N7)", () => {
    // 서버에 남아 있던 감정도 함께 비운다. 보내는 값과 기기의 값이 어긋나면
    // 다음 `load()` 에 조용히 사라진다 (`PLAN.md` A-8)
    useDay.setState({ schedules: [row({ emotions: [4] })] });

    useDay.getState().toggleDone("7");

    expect(putCompletion).toHaveBeenCalledWith("7", true, null);
    expect(useDay.getState().schedules[0]?.emotions).toEqual([]);
  });

  it("서버가 거부하면 되돌린다", async () => {
    useDay.setState({ schedules: [row()] });
    putCompletion.mockResolvedValue({ ok: false, code: "server" });

    useDay.getState().toggleDone("7");
    await settle();

    expect(useDay.getState().schedules[0]?.done).toBe(false);
  });

  it("**서버에 닿지 못한 것은 되돌리지 않는다** — 오프라인에서 체크가 풀리면 안 된다", async () => {
    useDay.setState({ schedules: [row()] });
    putCompletion.mockResolvedValue({ ok: false, code: "network" });

    useDay.getState().toggleDone("7");
    await settle();

    expect(useDay.getState().schedules[0]?.done).toBe(true);
  });
});

describe("감정 — 서버 계약이 좁힌 두 자리", () => {
  it("하나만 남는다 — 다른 것을 누르면 갈아치운다", () => {
    useDay.setState({ schedules: [row({ done: true, emotions: [1] })] });

    useDay.getState().selectEmotion("7", 9);

    expect(useDay.getState().schedules[0]?.emotions).toEqual([9]);
    expect(putCompletion).toHaveBeenCalledWith("7", true, 9);
  });

  it("같은 것을 다시 누르면 해제되고 마침은 그대로다", () => {
    useDay.setState({ schedules: [row({ done: true, emotions: [1] })] });

    useDay.getState().selectEmotion("7", 1);

    expect(useDay.getState().schedules[0]?.emotions).toEqual([]);
    expect(useDay.getState().schedules[0]?.done).toBe(true);
  });

  it("고르면 마침이 함께 켜진다 — 서버가 마침 없는 감정을 받지 않는다", () => {
    useDay.setState({ schedules: [row()] });

    useDay.getState().selectEmotion("7", 4);

    expect(useDay.getState().schedules[0]?.done).toBe(true);
    expect(putCompletion).toHaveBeenCalledWith("7", true, 4);
  });

  it("마침을 끄면 감정도 사라진다 — 서버가 그렇게 지운다", () => {
    useDay.setState({ schedules: [row({ done: true, emotions: [4] })] });

    useDay.getState().toggleDone("7");

    expect(useDay.getState().schedules[0]?.emotions).toEqual([]);
    expect(putCompletion).toHaveBeenCalledWith("7", false, null);
  });
});

describe("홈 머리가 세는 것", () => {
  it("「N개 남음」은 미완료 수다 — 마친 수가 아니다 (design.md 「홈」)", () => {
    expect(remainingLabel([row({ id: "1" }), row({ id: "2", done: true })])).toBe("1개 남음");
  });

  it("다 마치면 수 대신 사실을 말한다", () => {
    expect(remainingLabel([row({ id: "1", done: true })])).toBe("모두 완료");
  });

  it("숨긴 줄은 세지 않는다", () => {
    expect(remainingLabel([row({ id: "1" }), row({ id: "2", hidden: true })])).toBe("1개 남음");
  });

  it("주는 월요일에 시작하고 일요일은 그 주의 끝이다", () => {
    expect(weekStartOf("2026-07-27")).toBe("2026-07-27"); // 월요일
    expect(weekStartOf("2026-07-30")).toBe("2026-07-27");
    expect(weekStartOf("2026-08-02")).toBe("2026-07-27"); // 일요일 — 앞선 월요일에 붙는다
  });
});

describe("추가와 삭제", () => {
  it("추가한 줄은 서버 id 로 갈아끼운다 — 안 그러면 이어지는 호출이 404 다", async () => {
    useDay.getState().addSchedule("  산책  ");

    expect(useDay.getState().schedules[0]?.id).toMatch(/^s-local-/);
    expect(createSchedule).toHaveBeenCalledWith("2026-07-27", "산책");

    await settle();
    expect(useDay.getState().schedules[0]?.id).toBe("99");
  });

  it("서버가 거부하면 방금 만든 줄을 걷어낸다", async () => {
    createSchedule.mockResolvedValue({ ok: false, code: "server" });

    useDay.getState().addSchedule("산책");
    await settle();

    expect(useDay.getState().schedules).toEqual([]);
  });

  it("빈 제목은 만들지 않는다", () => {
    useDay.getState().addSchedule("   ");

    expect(createSchedule).not.toHaveBeenCalled();
    expect(useDay.getState().schedules).toEqual([]);
  });

  it("삭제는 서버에서도 지운다. 이미 없으면(404) 되돌리지 않는다", async () => {
    useDay.setState({ schedules: [row()] });
    deleteSchedule.mockResolvedValue({ ok: false, code: "not_found" });

    useDay.getState().remove("7");
    await settle();

    expect(deleteSchedule).toHaveBeenCalledWith("7");
    expect(useDay.getState().schedules).toEqual([]);
  });

  it("삭제를 서버가 거부하면 줄이 돌아온다", async () => {
    useDay.setState({ schedules: [row()] });
    deleteSchedule.mockResolvedValue({ ok: false, code: "server" });

    useDay.getState().remove("7");
    await settle();

    expect(useDay.getState().schedules).toHaveLength(1);
  });

  it("가져온 일정 숨기기는 즉시 반영하고 서버에도 저장한다", () => {
    useDay.setState({ schedules: [row({ source: "calendar" })] });

    useDay.getState().hide("7");

    expect(useDay.getState().schedules[0]?.hidden).toBe(true);
    expect(patchScheduleVisibility).toHaveBeenCalledWith("7", true);
  });

  it("수동 일정에는 캘린더 전용 숨김 API를 부르지 않는다", () => {
    useDay.setState({ schedules: [row()] });

    useDay.getState().hide("7");

    expect(useDay.getState().schedules[0]?.hidden).toBe(false);
    expect(patchScheduleVisibility).not.toHaveBeenCalled();
  });
});
