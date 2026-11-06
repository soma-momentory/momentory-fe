import { sanitizeEvent } from "../events";
import { createScreenObserver, describeRoute } from "../observation";
import { createRestContentTracker, createRestVisit } from "../restContent";

/** 손으로 돌리는 시계 — 전면 시계가 멈춘 동안에도 이 시각은 흐른다 */
function setup() {
  let time = 1_000;
  const track = jest.fn();
  const rest = createRestContentTracker(track, "worry_box", () => time);
  const pass = (ms: number) => {
    time += ms;
  };
  return { rest, track, pass };
}

describe("쉼 콘텐츠 한 판", () => {
  it("열면 들어온 길과 오늘 일기 여부를 싣는다", () => {
    const { rest, track } = setup();
    rest.open("after_diary", true);
    expect(track).toHaveBeenCalledWith("rest_content_opened", {
      content: "worry_box",
      entry: "after_diary",
      diary_today: true,
    });
  });

  it("끝까지 가면 걸린 시간을 보내고, 그 뒤로 떠나도 이탈을 보내지 않는다", () => {
    const { rest, track, pass } = setup();
    rest.stage("write");
    pass(30_000);
    rest.stage("boxed");
    pass(5_000);
    rest.complete();
    rest.leave();

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("rest_content_completed", {
      content: "worry_box",
      duration_ms: 35_000,
    });
  });

  it("끝내지 않고 떠나면 나간 자리와 시간을 보낸다 — 한 번만", () => {
    const { rest, track, pass } = setup();
    rest.stage("write");
    pass(8_000);
    rest.stage("handing");
    pass(2_000);
    rest.leave();
    rest.leave();

    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith("rest_content_exited", {
      content: "worry_box",
      stage: "handing",
      duration_ms: 10_000,
    });
  });

  it("화면이 잠긴 동안은 세지 않는다", () => {
    const { rest, track, pass } = setup();
    rest.stage("write");
    pass(3_000);
    rest.pause();
    pass(60_000);
    rest.resume();
    pass(2_000);
    rest.leave();

    expect(track).toHaveBeenCalledWith("rest_content_exited", {
      content: "worry_box",
      stage: "write",
      duration_ms: 5_000,
    });
  });

  it("보내는 값은 전부 허용 목록을 지난다", () => {
    expect(
      sanitizeEvent("rest_content_opened", {
        content: "body_release",
        entry: "direct",
        diary_today: false,
      }),
    ).not.toBeNull();
    expect(
      sanitizeEvent("rest_content_exited", {
        content: "sense_pond",
        stage: "feel",
        duration_ms: 1,
      }),
    ).not.toBeNull();
    // 걱정 내용은 보낼 자리가 없다 — 길이만
    expect(sanitizeEvent("worry_box_handed", { chars: 12, text: "걱정" })).toEqual({ chars: 12 });
    expect(sanitizeEvent("rest_content_exited", { content: "worry_box", stage: "x" })).toBeNull();
  });
});

describe("쉼터 방문이 어디서 왔나", () => {
  it("회고 완료에서 쉼터로 들어오면 그 방문 동안 after_diary 다", () => {
    const visit = createRestVisit();
    visit.move("retro_done", "rest");
    expect(visit.entry()).toBe("after_diary");
    // 쉼터 안에서 옮겨 다녀도 이어진다
    visit.move("rest", "worry_box");
    visit.move("worry_box", "rest");
    visit.move("rest", "body_release");
    expect(visit.entry()).toBe("after_diary");
  });

  it("3분 명상을 다녀와도 같은 방문이다", () => {
    const visit = createRestVisit();
    visit.move("retro_done", "rest");
    visit.move("rest", "meditation");
    visit.move("meditation", "rest");
    visit.move("rest", "worry_box");
    expect(visit.entry()).toBe("after_diary");
  });

  it.each(["treasure_box", "treasure_list", "worry_list", "wish_mine", "rest_records"] as const)(
    "%s 에 다녀와도 같은 방문이다",
    (screen) => {
      const visit = createRestVisit();
      visit.move("retro_done", "rest");
      visit.move("rest", screen);
      visit.move(screen, "rest");
      expect(visit.entry()).toBe("after_diary");
    },
  );

  it("바람카드 없이 일기 확인에서 곧장 쉼터로 와도 after_diary 다 — 회고 완료를 거치지 않는다", () => {
    const visit = createRestVisit();
    visit.move("retro_draft", "rest");
    expect(visit.entry()).toBe("after_diary");
  });

  it("쉼터 밖으로 나갔다 다시 들어오면 direct 다", () => {
    const visit = createRestVisit();
    visit.move("retro_done", "rest");
    visit.move("rest", "home");
    visit.move("home", "rest");
    expect(visit.entry()).toBe("direct");
  });

  it("홈에서 곧장 들어오면 direct 다", () => {
    const visit = createRestVisit();
    visit.move("home", "rest");
    expect(visit.entry()).toBe("direct");
  });

  it("화면 관찰이 옮겨 간 화면을 알려 준다", () => {
    const visit = createRestVisit();
    const observer = createScreenObserver(jest.fn(), () => 0, visit.move);
    observer.route("retro/done");
    observer.route("(tabs)/rest");
    observer.route("rest/worry-box");
    expect(visit.entry()).toBe("after_diary");
  });

  it("몸에 힘 빼기 · 걱정상자도 화면 체류를 잰다", () => {
    expect(describeRoute("rest/body-release")).toEqual({ screen: "body_release" });
    expect(describeRoute("rest/worry-box")).toEqual({ screen: "worry_box" });
  });
});
