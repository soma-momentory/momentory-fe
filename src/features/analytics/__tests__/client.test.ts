import { createAnalytics, type AnalyticsEnvelope, type AnalyticsTransport } from "../client";

function setup(enabled = true) {
  const received: AnalyticsEnvelope[] = [];
  const identities: (string | null)[] = [];
  const transport: AnalyticsTransport = {
    identify: (id) => {
      identities.push(id);
    },
    send: (event) => {
      received.push(event);
    },
    flush: () => {},
  };
  let sequence = 0;
  const load = jest.fn(async () => transport);
  const client = createAnalytics({
    enabled,
    load,
    uuid: () => String(++sequence),
    now: () => 1234,
  });
  return { client, transport, received, identities, load };
}

const settle = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

it("초기화 대기 큐가 가득 차도 로그아웃 신원 초기화를 버리지 않는다", async () => {
  let finish!: (transport: AnalyticsTransport) => void;
  let identity: string | null = null;
  const observed: (string | null)[] = [];
  const client = createAnalytics({
    enabled: true,
    uuid: () => "uuid",
    now: () => 1,
    load: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  client.identify(7);
  for (let i = 0; i < 250; i++) client.track("app_foregrounded", {});
  client.identify(null);
  await settle();
  finish({
    identify: (value) => {
      identity = value;
    },
    send: () => {
      observed.push(identity);
    },
    flush: () => {},
  });
  await settle();
  client.track("login_started", { provider: "kakao" });
  expect(observed.at(-1)).toBeNull();
});

it("키가 없으면 SDK를 로드하지 않고 모든 계측을 무시한다", async () => {
  const { client, load } = setup(false);
  client.identify(7);
  client.track("app_opened", {});
  client.flush();
  await settle();
  expect(load).not.toHaveBeenCalled();
});

it("초기 화면 이벤트는 복원된 내부 ID와 원래 발생 시각으로 보낸다", async () => {
  const { client, received } = setup();
  client.track("screen_viewed", { screen: "home" });
  await settle();
  expect(received).toEqual([]);
  client.identify(7);
  await settle();
  expect(received).toEqual([
    expect.objectContaining({
      name: "screen_viewed",
      userId: "7",
      time: 1234,
      properties: { screen: "home" },
    }),
  ]);
});

it("런타임에 붙은 본문·감정·알림·토큰 필드를 버린다", async () => {
  const { client, received } = setup();
  client.identify(7);
  const properties = {
    schedule_id: "12",
    source: "manual" as const,
    title: "민감한 일정",
    emotion: "depressed",
    notify_time: "22:00",
    token: "secret",
  };
  client.track("schedule_created", properties);
  await settle();
  expect(received[0]?.properties).toEqual({ schedule_id: "12", source: "manual" });
});

it("고정 값 필드에 임의 텍스트나 이메일 ID를 넣으면 이벤트를 버린다", async () => {
  const { client, received } = setup();
  client.identify("private@example.com");
  client.track("app_opened", {});
  client.identify(7);
  // @ts-expect-error 런타임 경계도 검사한다.
  client.track("screen_viewed", { screen: "/diary/나의 비밀" });
  client.track("diary_viewed", { diary_id: "private@example.com" });
  await settle();
  expect(received).toEqual([]);
});

it("로그아웃 완료는 이전 사용자로 보내고 늦게 온 응답을 다음 사용자에게 섞지 않는다", async () => {
  const { client, received, identities } = setup();
  client.identify(7);
  const oldRequest = client.capture();
  client.track("logout_completed", {});
  client.identify(null);
  client.identify(9);
  oldRequest("schedule_deleted", { schedule_id: "12" });
  client.track("screen_viewed", { screen: "home" });
  await settle();
  expect(received.map((e) => [e.name, e.userId])).toEqual([
    ["logout_completed", "7"],
    ["screen_viewed", "9"],
  ]);
  expect(identities).toEqual(["7", null, "9"]);
});

it("같은 생성 완료는 한 번만 보내고 실제 재조회는 다시 센다", async () => {
  const { client, received } = setup();
  client.identify(7);
  client.track("wish_card_created", { wish_card_id: "12", retrospect_id: "30" }, "12");
  client.track("wish_card_created", { wish_card_id: "12", retrospect_id: "30" }, "12");
  client.track("diary_viewed", { diary_id: "12" });
  client.track("diary_viewed", { diary_id: "12" });
  await settle();
  expect(received).toHaveLength(3);
  expect(received[0]?.insertId).toBe("wish_card_created:7:12");
  expect(received[1]?.insertId).not.toBe(received[2]?.insertId);
});

it("SDK 전송 예외가 뒤 이벤트나 서비스 실행을 끊지 않는다", async () => {
  const { client, transport, received } = setup();
  const send = transport.send;
  transport.send = jest
    .fn()
    .mockImplementationOnce(() => {
      throw Error("SDK");
    })
    .mockImplementation(send);
  client.identify(7);
  expect(() => client.track("app_opened", {})).not.toThrow();
  client.track("app_foregrounded", {});
  await settle();
  expect(received.map((e) => e.name)).toEqual(["app_foregrounded"]);
});

it("SDK 초기화 거부와 ID 생성 오류도 호출자에게 전파하지 않는다", async () => {
  const client = createAnalytics({
    enabled: true,
    load: async () => {
      throw Error("native unavailable");
    },
    uuid: () => {
      throw Error("random unavailable");
    },
    now: () => 1,
  });
  expect(() => {
    client.identify(7);
    client.track("app_opened", {});
    client.flush();
  }).not.toThrow();
  await settle();
});
