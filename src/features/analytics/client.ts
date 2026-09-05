import { sanitizeEvent, type EventName, type EventProperties } from "./events";

export type AnalyticsEnvelope = {
  name: EventName;
  properties: Record<string, string | number | boolean>;
  userId: string | null;
  time: number;
  insertId: string;
};
export type AnalyticsTransport = {
  identify: (userId: string | null) => void;
  send: (event: AnalyticsEnvelope) => void;
  flush: () => void;
};
export type Track = <K extends EventName>(
  name: K,
  properties: EventProperties<K>,
  stableId?: string,
) => void;

/** SDK나 기기 의존성이 없는 실패 격리 경계. 서비스는 이 큐를 기다리지 않는다. */
export function createAnalytics(options: {
  enabled: boolean;
  load: () => Promise<AnalyticsTransport>;
  uuid: () => string;
  now: () => number;
}) {
  let userId: string | null | undefined;
  let invalidIdentity = false;
  let generation = 0;
  let loading = false;
  let failed = false;
  let transport: AnalyticsTransport | undefined;
  let pending: { run: (transport: AnalyticsTransport) => void; identity: boolean }[] = [];
  let startup: Omit<AnalyticsEnvelope, "userId">[] = [];
  const completed = new Set<string>();
  const guard = (action: () => void) => {
    try {
      action();
    } catch {
      /* 계측은 서비스 실패가 아니다. */
    }
  };
  const enqueue = (action: (transport: AnalyticsTransport) => void, identity = false) => {
    if (!options.enabled || failed) return;
    if (transport) {
      guard(() => action(transport!));
      return;
    }
    // SDK 초기화가 지연되더라도 앱 메모리가 무한히 자라지 않는다.
    if (pending.length >= 200) {
      if (!identity) return;
      const event = pending.findIndex((item) => !item.identity);
      if (event >= 0) pending.splice(event, 1);
      else pending = [];
    }
    pending.push({ run: action, identity });
    if (loading) return;
    loading = true;
    void Promise.resolve()
      .then(options.load)
      .then((loaded) => {
        transport = loaded;
        const actions = pending;
        pending = [];
        for (const { run } of actions) guard(() => run(loaded));
      })
      .catch(() => {
        failed = true;
        pending = [];
        startup = [];
      });
  };

  const track: Track = (name, properties, stableId) =>
    guard(() => {
      if (!options.enabled || failed || invalidIdentity) return;
      const clean = sanitizeEvent(name, properties);
      if (!clean) return;
      const time = options.now();
      // 완료의 멱등 키에는 원문이 들어갈 수 없다.
      if (stableId != null && !/^(?:[1-9]\d*|onboarding)$/.test(stableId)) return;
      const insertId = stableId != null ? [name, userId, stableId].join(":") : options.uuid();
      if (stableId != null) {
        if (userId == null || completed.has(insertId)) return;
        completed.add(insertId);
        if (completed.size > 500) completed.delete(completed.values().next().value!);
      }
      const event = { name, properties: clean, time, insertId };
      if (userId === undefined) {
        if (startup.length < 50) startup.push(event);
        return;
      }
      const envelope = { ...event, userId };
      enqueue((sdk) => sdk.send(envelope));
    });

  const identify = (value: number | string | null) =>
    guard(() => {
      if (!options.enabled) return;
      const next = value === null ? null : String(value);
      if (next != null && !/^[1-9]\d*$/.test(next)) {
        invalidIdentity = true;
        generation++;
        startup = [];
        return;
      }
      invalidIdentity = false;
      if (next === userId) return;
      userId = next;
      generation++;
      enqueue((sdk) => sdk.identify(next), true);
      const queued = startup;
      startup = [];
      for (const event of queued) {
        enqueue((sdk) => sdk.send({ ...event, userId: next }));
      }
    });

  return {
    track,
    identify,
    capture: (): Track => {
      const captured = generation;
      return (name, properties, stableId) => {
        if (captured === generation) track(name, properties, stableId);
      };
    },
    flush: () => guard(() => enqueue((sdk) => sdk.flush())),
  };
}
