/**
 * 가짜 서버를 **앱의 실제 어댑터**로 부른다 — 어댑터의 런타임 검증을 통과해야 화면이 그린다.
 * `authedRequest` 가 진짜 `fetch` 를 부르고, 설치된 가짜 서버가 그 `fetch` 를 가로챈다.
 */
import { afterAll, afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { exchangeKakaoToken } from "@/features/auth/data/kakaoAuthApi";
import { fetchMe } from "@/features/auth/data/meApi";
import { SESSION_KEY } from "@/features/auth/model/auth";
import { syncCalendarSnapshot } from "@/features/calendar/data/calendarSyncApi";
import {
  deleteDiary,
  loadArchive,
  monthsBackFrom,
  putActionCardCompletion,
  updateDiaryBody,
  writeDiary,
} from "@/features/diary/data/diaryApi";
import {
  createSchedule,
  deleteSchedule,
  fetchSchedules,
  fetchSchedulesInPeriod,
  patchScheduleOrder,
  putCompletion,
} from "@/features/home/data/scheduleApi";
import { fetchCurrentWeather } from "@/features/home/data/weatherApi";
import {
  chooseLetterAction,
  fetchLetter,
  fetchLetters,
  markLetterOpened,
  saveLetterTime,
} from "@/features/letter/data/letterApi";
import { sendInquiry } from "@/features/my/data/inquiryApi";
import { completeOnboardingV2 } from "@/features/onboarding/data/completeOnboardingApi";
import { fetchOnboardingOptions } from "@/features/onboarding/data/optionsApi";
import { fetchWeeklyReport } from "@/features/report/data/weeklyReportApi";
import { addRestRecord, fetchRestRecords } from "@/features/rest/data/restRecordApi";
import { addTreasure, fetchTreasures } from "@/features/rest/data/treasureApi";
import { fetchWorries, keepWorry } from "@/features/rest/data/worryApi";
import { sendTurn, startRetro, type Reply } from "@/features/retro/data/retroApi";

import { DEFAULT_FRAME_CONFIG, LAB_API_BASE_URL, type LabFrameConfig } from "../../lab-contract";
import {
  datasets,
  installedFakeServer,
  installFakeServer,
  onFakeRequest,
  resetFakeData,
  sampleParams,
  storageKey,
  uninstallFakeServer,
} from "..";
import { addDays, sundayOf } from "../time";

jest.mock("@/lib/config", () => ({
  ...jest.requireActual<object>("@/lib/config"),
  getApiBaseUrl: () => "https://lab.momentory.invalid",
}));

type SecureMock = { __store: Map<string, string> };
const secure = jest.requireMock("expo-secure-store") as SecureMock;

/** 브라우저 localStorage 대역 — 다시 설치해도 남는지 본다 */
const local = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => local.get(k) ?? null,
  setItem: (k: string, v: string) => void local.set(k, v),
  removeItem: (k: string) => void local.delete(k),
};

const NOW = "2026-11-02T21:30:00+09:00";
const TODAY = "2026-11-02";
const original = globalThis.fetch;

const config = (over: Partial<LabFrameConfig> = {}): LabFrameConfig => ({
  ...DEFAULT_FRAME_CONFIG,
  frameId: "test",
  now: NOW,
  ...over,
});

const install = (over: Partial<LabFrameConfig> = {}) => {
  uninstallFakeServer();
  installFakeServer(config(over));
};

beforeEach(() => {
  local.clear();
  globalThis.fetch = jest.fn(() => Promise.reject(new Error("밖으로 나간 요청"))) as typeof fetch;
  secure.__store.set(
    SESSION_KEY,
    JSON.stringify({
      accessToken: "lab-access",
      refreshToken: "lab-refresh",
      expiresAt: Date.now() + 3_600_000,
      userId: 7,
    }),
  );
});

afterEach(() => uninstallFakeServer());
afterAll(() => {
  globalThis.fetch = original;
});

/** 회고 한 번을 끝까지 — 두 번째 자유 입력 · 사건 고르기 · 감정 · 바람을 지난다 */
async function runRetro(first = "회의에서 의견을 냈는데 금방 묻혔다.") {
  const start = await startRetro({
    schedules: [{ name: "오전 회의", completed: true }],
    nickname: "모리",
  });
  if (!start.ok) return start;
  const { sessionId } = start.data;
  const replies: Reply[] = [start.data.reply];
  const turn = async (input: { content?: string; optionIds?: string[] }) => {
    const r = await sendTurn(sessionId, input);
    if (!r.ok) throw new Error(`턴 실패 ${r.code}`);
    replies.push(r.data);
    return r.data;
  };
  await turn({ content: first });
  await turn({ content: "저녁에는 친구랑 통화하면서 한참 웃었다." });
  await turn({ optionIds: ["1"] });
  await turn({ optionIds: ["1", "2"] });
  const last = await turn({ optionIds: ["1"] });
  return { ok: true as const, sessionId, replies, last };
}

describe.each(datasets.map((d) => d.id))("데이터 세트 %s", (datasetId) => {
  beforeEach(() => install({ datasetId }));

  it("모든 조회가 앱 어댑터의 검증을 통과한다", async () => {
    const me = await fetchMe();
    expect(me.ok).toBe(true);
    if (!me.ok) return;
    expect(me.data.needsOnboarding).toBe(datasetId === "new-user");
    expect(me.data.profile == null).toBe(datasetId === "new-user");

    const options = await fetchOnboardingOptions();
    expect(options.ok).toBe(true);

    const today = await fetchSchedules(TODAY);
    expect(today.ok).toBe(true);
    const period = await fetchSchedulesInPeriod("2026-08-01", "2026-11-30");
    expect(period.ok).toBe(true);

    const archive = await loadArchive(monthsBackFrom(TODAY, 4));
    expect(archive.ok).toBe(true);

    const report = await fetchWeeklyReport(sundayOf(TODAY));
    expect(report.ok).toBe(true);
    if (report.ok) expect(report.data.days).toHaveLength(7);
    const lastWeek = await fetchWeeklyReport(addDays(sundayOf(TODAY), -7));
    expect(lastWeek.ok).toBe(true);

    const letters = await fetchLetters(7);
    expect(letters.ok).toBe(true);
    if (letters.ok && letters.data[0]) {
      expect((await fetchLetter(letters.data[0].date)).ok).toBe(true);
    }

    for (const content of [
      "sense_pond",
      "worry_box",
      "treasure_box",
      "body_release",
      "meditation",
    ] as const) {
      expect((await fetchRestRecords(content)).ok).toBe(true);
    }
    expect((await fetchTreasures()).ok).toBe(true);
    expect((await fetchTreasures(TODAY)).ok).toBe(true);
    expect((await fetchWorries()).ok).toBe(true);

    const weather = await fetchCurrentWeather({ latitude: 37.5665, longitude: 126.978 });
    expect(weather.kind).toBe("ready");

    // 시드의 레코드는 하나도 버려지지 않는다
    const db = installedFakeServer()!.db();
    if (archive.ok) {
      expect(archive.data.diaries).toHaveLength(
        db.diaries.filter((d) => d.createdAt >= "2026-07-31").length,
      );
      const linkable = db.actionCards.filter((c) =>
        db.diaries.some((d) => d.retrospectId === c.retrospectId && d.createdAt >= "2026-07-31"),
      );
      expect(archive.data.actionCards).toHaveLength(linkable.length);
    }
    if (period.ok) {
      expect(period.data).toHaveLength(
        db.schedules.filter((s) => s.date >= "2026-08-01" && s.date <= "2026-11-30").length,
      );
    }
  });

  it("sampleParams 가 실제로 있는 id 를 준다", async () => {
    const params = sampleParams(datasetId, NOW);
    const db = installedFakeServer()!.db();
    if (params.diaryId != null) expect(db.diaries.some((d) => d.id === params.diaryId)).toBe(true);
    if (params.letterDate != null) expect((await fetchLetter(params.letterDate)).ok).toBe(true);
    if (params.scheduleId != null)
      expect(db.schedules.some((s) => s.id === params.scheduleId)).toBe(true);
    const hasData = datasetId !== "new-user" && datasetId !== "empty";
    expect(params.diaryId != null).toBe(hasData);
    expect(params.letterDate != null).toBe(hasData);
  });
});

describe("데이터 세트 내용", () => {
  it("normal — 2주치 · 오늘은 회고 전 · 가장 최근 편지가 새것", async () => {
    install({ datasetId: "normal" });
    const archive = await loadArchive(monthsBackFrom(TODAY, 2));
    if (!archive.ok) throw new Error("archive");
    expect(archive.data.diaries.length).toBeGreaterThanOrEqual(10);
    expect(archive.data.diaries.some((d) => d.authoredBy === "user")).toBe(true);
    expect(archive.data.diaries.some((d) => d.authoredBy === "baba")).toBe(true);
    expect(archive.data.actionCards.length).toBeGreaterThan(0);
    expect(archive.data.diaries.some((d) => d.date === TODAY)).toBe(false);

    const today = await fetchSchedules(TODAY);
    if (!today.ok) throw new Error("today");
    expect(today.data.length).toBeGreaterThanOrEqual(3);
    const period = await fetchSchedulesInPeriod(addDays(TODAY, -14), TODAY);
    if (!period.ok) throw new Error("period");
    expect(period.data.some((s) => s.source === "calendar")).toBe(true);
    expect(period.data.some((s) => s.done && s.emotions.length > 0)).toBe(true);

    const letters = await fetchLetters(7);
    if (!letters.ok) throw new Error("letters");
    expect(letters.data.length).toBeGreaterThanOrEqual(3);
    expect(letters.data[0]).toMatchObject({
      date: addDays(TODAY, -1),
      isNew: true,
      openedAt: null,
    });
    expect(letters.data.slice(1).every((l) => !l.isNew && l.openedAt != null)).toBe(true);

    const treasures = await fetchTreasures();
    expect(treasures.ok && treasures.data.length).toBeGreaterThan(0);
  });

  it("many — 하루 일정 10개 이상 · 감정 10종 전부 · 3개월치", async () => {
    install({ datasetId: "many" });
    const today = await fetchSchedules(TODAY);
    expect(today.ok && today.data.length).toBeGreaterThanOrEqual(10);
    const archive = await loadArchive(monthsBackFrom(TODAY, 4));
    if (!archive.ok) throw new Error("archive");
    const emotions = new Set(archive.data.diaries.flatMap((d) => d.emotions));
    expect(emotions.size).toBe(10);
    expect(archive.data.diaries.length).toBeGreaterThan(60);
    expect(archive.data.actionCards.length).toBeGreaterThan(30);
    const letters = await fetchLetters(7);
    expect(letters.ok && letters.data.length).toBeGreaterThanOrEqual(20);
    const quiet = letters.ok ? letters.data[3] : undefined;
    const letter = quiet ? await fetchLetter(quiet.date) : null;
    expect(letter?.ok && letter.data.status).toBe("QUIET");
  });

  it("long-copy — 닉네임이 최대 길이이고 본문이 길다", async () => {
    install({ datasetId: "long-copy" });
    const me = await fetchMe();
    const options = await fetchOnboardingOptions();
    if (!me.ok || !options.ok) throw new Error("me");
    expect(me.data.profile?.nickname).toHaveLength(options.data.nickname!.maxLength);
    const archive = await loadArchive(monthsBackFrom(TODAY, 2));
    if (!archive.ok) throw new Error("archive");
    expect(archive.data.diaries[0]!.body.length).toBeGreaterThan(300);
    expect(archive.data.diaries[0]!.body).toContain("\n\n");
    const today = await fetchSchedules(TODAY);
    expect(today.ok && today.data[0]!.title.length).toBeGreaterThan(40);
  });
});

describe("회고 대본", () => {
  it("diary_chat → await_branch → 감정 → 바람 → complete 이고 일기·바람카드가 보관함에 선다", async () => {
    install({ datasetId: "normal", repeatToday: false });
    const run = await runRetro();
    if (!run.ok) throw new Error(`start ${run.code}`);
    expect(run.replies.map((r) => r.phase)).toEqual([
      "diary_chat",
      "diary_chat",
      "await_branch",
      "emotion_exploration",
      "emotion_exploration",
      "complete",
    ]);
    expect(run.replies[2]!.text).toContain("\n오늘 이야기는 일기로 정리해뒀어요.\n");
    expect(run.replies[2]!.options).toHaveLength(2);
    expect(run.replies[3]!.options?.some((o) => o.input)).toBe(true);
    const { last } = run;
    expect(last.done).toBe(true);
    expect(last.diary?.diaryId).not.toBeNull();
    expect(last.wishCard?.wishCardId).not.toBeNull();

    const archive = await loadArchive(monthsBackFrom(TODAY, 1));
    if (!archive.ok) throw new Error("archive");
    const diary = archive.data.diaries.find((d) => d.date === TODAY);
    expect(diary).toMatchObject({
      id: last.diary!.diaryId,
      authoredBy: "baba",
      retrospectId: String(run.sessionId),
    });
    expect(archive.data.actionCards.some((c) => c.id === last.wishCard!.wishCardId)).toBe(true);

    // 하루 한 번
    const again = await startRetro({ schedules: [] });
    expect(again).toEqual({ ok: false, code: "already_today" });
    // 고치기 · 해봤어요
    expect((await updateDiaryBody(String(run.sessionId), "고친 본문")).ok).toBe(true);
    expect(
      (await putActionCardCompletion(last.wishCard!.wishCardId!, true, "해 보니 좋았다")).ok,
    ).toBe(true);
    expect((await putActionCardCompletion(last.wishCard!.wishCardId!, false, null)).ok).toBe(true);
  });

  it("첫 입력이 길면 두 번째 자유 입력을 건너뛴다 · 「위험」은 safety_hold · 「#종료」는 ended", async () => {
    install({ datasetId: "empty" });
    const start = await startRetro({ schedules: [] });
    if (!start.ok) throw new Error("start");
    const id = start.data.sessionId;
    const hold = await sendTurn(id, { content: "요즘 너무 위험한 생각이 들어요" });
    expect(hold.ok && hold.data).toMatchObject({
      phase: "safety_hold",
      done: false,
      safetyLevel: "risk",
    });
    const long = await sendTurn(id, {
      content:
        "아침에 늦잠을 자서 회의에 늦었고 하루 종일 정신이 없었다. 저녁에는 겨우 운동을 다녀왔는데 그래도 피곤했다.",
    });
    expect(long.ok && long.data.phase).toBe("await_branch");
    const ended = await sendTurn(id, { content: "#종료" });
    expect(ended.ok && ended.data).toMatchObject({ phase: "ended", done: true });
    expect((await sendTurn(9999, { content: "없는 세션" })).ok).toBe(false);
  });

  it("오늘 다시 쓰기(기본) — 같은 날 두 번 끝내도 오늘 일기는 하나(두 번째)이고 바람카드도 두 번째 것만", async () => {
    install({ datasetId: "normal" });
    const first = await runRetro("첫 번째 회고에서 남긴 이야기다.");
    const second = await runRetro("두 번째 회고에서 남긴 이야기다.");
    if (!first.ok || !second.ok) throw new Error("retro");
    const archive = await loadArchive(monthsBackFrom(TODAY, 1));
    if (!archive.ok) throw new Error("archive");
    const todays = archive.data.diaries.filter((d) => d.date === TODAY);
    expect(todays).toHaveLength(1);
    expect(todays[0]!.body).toContain("두 번째 회고");
    expect(todays[0]!.id).toBe(second.last.diary!.diaryId);
    const cards = archive.data.actionCards.filter((c) => c.diaryId === todays[0]!.id);
    expect(cards.map((c) => c.id)).toEqual([second.last.wishCard!.wishCardId]);
    const db = installedFakeServer()!.db();
    expect(db.actionCards.some((c) => c.id === Number(first.last.wishCard!.wishCardId))).toBe(
      false,
    );
  });
});

describe("직접 쓴 일기 · 하루 넘기기", () => {
  it("repeatToday:false 면 하루 한 편(409), 켜면 오늘 일기를 대체한다", async () => {
    install({ datasetId: "empty", repeatToday: false });
    const a = await writeDiary("오늘은 조용한 하루였다.", 3);
    expect(a.ok).toBe(true);
    expect(await writeDiary("한 번 더")).toEqual({ ok: false, alreadyWritten: true });

    install({ datasetId: "empty", repeatToday: true });
    const b = await writeDiary("다시 쓴 오늘", 1);
    expect(b.ok).toBe(true);
    const archive = await loadArchive(monthsBackFrom(TODAY, 1));
    if (!archive.ok) throw new Error("archive");
    expect(archive.data.diaries.map((d) => d.body)).toEqual(["다시 쓴 오늘"]);
  });

  it("시계를 하루씩 옮기면 일기 → 다음 날 일기 → 회고 → 다음 날 회고가 되고 전날 편지가 온다", async () => {
    const at = (day: string) => `${day}T21:30:00+09:00`;
    install({ datasetId: "empty", repeatToday: false, now: at("2026-11-02") });
    expect((await writeDiary("월요일 일기")).ok).toBe(true);

    install({ datasetId: "empty", repeatToday: false, now: at("2026-11-03") });
    expect((await writeDiary("화요일 일기")).ok).toBe(true);
    const letters = await fetchLetters(7);
    if (!letters.ok) throw new Error("letters");
    expect(letters.data[0]).toMatchObject({ date: "2026-11-02", isNew: true });
    const letter = await fetchLetter("2026-11-02");
    expect(letter.ok && letter.data.quote).toBe("월요일 일기");

    install({ datasetId: "empty", repeatToday: false, now: at("2026-11-04") });
    expect((await runRetro()).ok).toBe(true);
    expect((await startRetro({ schedules: [] })).ok).toBe(false);

    install({ datasetId: "empty", repeatToday: false, now: at("2026-11-05") });
    expect((await runRetro()).ok).toBe(true);

    const archive = await loadArchive([{ year: 2026, month: 11 }]);
    if (!archive.ok) throw new Error("archive");
    expect(archive.data.diaries.map((d) => d.date)).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
    ]);
    expect(archive.data.actionCards).toHaveLength(2);
    // 새벽 3시는 아직 전날이다(04:00 경계)
    install({ datasetId: "empty", repeatToday: false, now: "2026-11-06T03:00:00+09:00" });
    expect(await writeDiary("새벽에")).toEqual({ ok: false, alreadyWritten: true });
  });
});

describe("쓰기 → 읽기", () => {
  beforeEach(() => install({ datasetId: "normal" }));

  it("일정 만들기 · 완료 · 순서 · 삭제 · 캘린더 화해", async () => {
    const made = await createSchedule(TODAY, "새로 넣은 일정");
    if (!made.ok) throw new Error("create");
    const list = await fetchSchedules(TODAY);
    expect(list.ok && list.data.at(-1)?.title).toBe("새로 넣은 일정");
    expect((await putCompletion(made.data.id, true, 2, "manual")).ok).toBe(true);
    const after = await fetchSchedules(TODAY);
    expect(after.ok && after.data.find((s) => s.id === made.data.id)).toMatchObject({
      done: true,
      emotions: [2],
    });
    if (!after.ok) return;
    const ids = after.data.map((s) => Number(s.id)).reverse();
    expect((await patchScheduleOrder(TODAY, ids)).ok).toBe(true);
    const reordered = await fetchSchedules(TODAY);
    expect(reordered.ok && reordered.data.map((s) => Number(s.id))).toEqual(ids);
    expect((await deleteSchedule(made.data.id)).ok).toBe(true);
    expect((await deleteSchedule(made.data.id)).ok).toBe(false);

    const sync = await syncCalendarSnapshot({ from: TODAY, to: TODAY }, [
      { externalId: "device-1", date: TODAY, title: "기기 캘린더 일정" },
    ]);
    expect(sync.ok && sync.data).toEqual({ created: 1, updated: 0, deleted: 0 });
    const synced = await fetchSchedules(TODAY);
    expect(
      synced.ok &&
        synced.data.some((s) => s.source === "calendar" && s.title === "기기 캘린더 일정"),
    ).toBe(true);
    const removed = await syncCalendarSnapshot({ from: TODAY, to: TODAY }, []);
    expect(removed.ok && removed.data.deleted).toBe(1);
  });

  it("편지 열기 · 작은 일 고르기 · 편지 시각", async () => {
    const letters = await fetchLetters(7);
    if (!letters.ok) throw new Error("letters");
    const latest = letters.data[0]!;
    expect(await markLetterOpened(latest.id)).toBe(true);
    const chosen = await chooseLetterAction(latest.id, {
      position: 0,
      whenLabel: "점심 뒤",
      scheduleId: null,
      remindAt: "2026-11-03T03:30:00Z",
    });
    expect(chosen.ok && chosen.data.actions[0]).toMatchObject({
      chosen: true,
      whenLabel: "점심 뒤",
    });
    const again = await fetchLetters(7);
    expect(again.ok && again.data[0]!.openedAt).not.toBeNull();
    expect(await saveLetterTime("07:30", false)).toBe(true);
    const me = await fetchMe();
    expect(me.ok && me.data.profile?.letter).toEqual({ time: "07:30", enabled: false });
  });

  it("쉼 기록 · 보물 · 걱정 · 문의 · 일기 삭제", async () => {
    const record = await addRestRecord("sense_pond", { completed: true, mood: "better" });
    expect(record.ok && record.data).toMatchObject({
      content: "sense_pond",
      date: TODAY,
      mood: "better",
    });
    const records = await fetchRestRecords("sense_pond");
    expect(records.ok && records.data[0]!.id).toBe(record.ok && record.data.id);
    expect((await addRestRecord("body_release", { completed: false })).ok).toBe(true);

    const t = await addTreasure("오늘의 보물");
    expect(t.ok && t.data.date).toBe(TODAY);
    const todays = await fetchTreasures(TODAY);
    expect(todays.ok && todays.data.map((x) => x.content)).toEqual(["오늘의 보물"]);
    const w = await keepWorry("맡겨 둘 걱정");
    const worries = await fetchWorries();
    expect(worries.ok && worries.data[0]!.id).toBe(w.ok && w.data.id);

    expect(
      await sendInquiry({ category: "BUG", content: "버튼이 안 눌려요", replyEmail: "" }),
    ).toBe(true);

    const archive = await loadArchive(monthsBackFrom(TODAY, 1));
    if (!archive.ok) throw new Error("archive");
    const target = archive.data.diaries[archive.data.diaries.length - 1]!;
    expect((await deleteDiary(target.id)).ok).toBe(true);
    expect((await deleteDiary(target.id)).ok).toBe(false);
    const letter = await fetchLetter(target.date);
    expect(letter.ok).toBe(false);
  });
});

describe("온보딩 · 로그인", () => {
  it("새 사용자 — 로그인은 온보딩 필요, v2 완료 뒤 /users/me 가 바뀐다", async () => {
    install({ datasetId: "new-user" });
    const login = await exchangeKakaoToken("kakao-token");
    expect(login.ok && login.session).toMatchObject({ userId: 7, onboardingRequired: true });

    const done = await completeOnboardingV2({
      nickname: "바다",
      age: "28",
      gender: "MALE",
      retroTime: "22:00",
      notifyRetro: true,
      calendarLinked: false,
      answers: {
        moodChange: "FEW_TIMES",
        knowWhy: "SOMETIMES",
        dayEnd: "OVERTHINK",
        diaryHistory: "STOPPED",
      },
      goals: ["DIARY_HABIT"],
    });
    expect(done).toEqual({ ok: true, data: { onboardingRequired: false } });
    const me = await fetchMe();
    expect(me.ok && me.data).toMatchObject({ onboardingRequired: false, needsOnboarding: false });
    expect(me.ok && me.data.profile).toMatchObject({
      nickname: "바다",
      age: "28",
      retroTime: "22:00",
    });
    const relogin = await exchangeKakaoToken("kakao-token");
    expect(relogin.ok && relogin.session.onboardingRequired).toBe(false);
  });

  it("토큰 없는 요청은 401", async () => {
    install({ datasetId: "normal" });
    const res = await fetch(`${LAB_API_BASE_URL}/api/v1/users/me`);
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: "AUTHENTICATION_REQUIRED" });
  });
});

describe("저장 · 초기화 · 지연 · 실패", () => {
  it("다시 설치해도 남고, resetFakeData 하면 처음으로 돌아간다", async () => {
    install({ datasetId: "normal" });
    await createSchedule(TODAY, "남아야 하는 일정");
    expect(local.has(storageKey(config({ datasetId: "normal" })))).toBe(true);

    install({ datasetId: "normal", now: "2026-11-03T09:00:00+09:00" });
    const kept = await fetchSchedules(TODAY);
    expect(kept.ok && kept.data.some((s) => s.title === "남아야 하는 일정")).toBe(true);

    resetFakeData(config({ datasetId: "normal" }));
    const fresh = await fetchSchedules(TODAY);
    expect(fresh.ok && fresh.data.some((s) => s.title === "남아야 하는 일정")).toBe(false);
  });

  it("failPaths 는 500, latencyMs 만큼 늦게 답하고, 요청마다 알린다", async () => {
    install({ datasetId: "normal", failPaths: ["/api/v1/reports"], latencyMs: 60 });
    const seen: string[] = [];
    const off = onFakeRequest((e) => seen.push(`${e.method} ${e.path} ${e.status}`));
    const report = await fetchWeeklyReport(sundayOf(TODAY));
    expect(report).toEqual({ ok: false, code: "server" });
    const started = Date.now();
    expect((await fetchSchedules(TODAY)).ok).toBe(true);
    expect(Date.now() - started).toBeGreaterThanOrEqual(50);
    off();
    expect(seen).toEqual([
      `GET /api/v1/reports/weekly?date=${sundayOf(TODAY)} 500`,
      `GET /api/v1/schedules?date=${TODAY} 200`,
    ]);
  });

  it("LAB 주소가 아닌 요청은 원래 fetch 로 간다", async () => {
    install({ datasetId: "normal" });
    await expect(fetch("https://example.com/")).rejects.toThrow("밖으로 나간 요청");
  });
});
