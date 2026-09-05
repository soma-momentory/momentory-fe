import type { AnalyticsTransport } from "./client";

export function analyticsEnabled(
  key: string,
  development: boolean,
  allowDevelopment: string | undefined,
) {
  return key.trim().length > 0 && (!development || allowDevelopment === "true");
}

/** 활성화한 빌드에서만 SDK를 로드한다. 자동 수집은 콘솔 원격 설정으로도 켜지지 않게 한다. */
export async function loadAmplitude(key: string): Promise<AnalyticsTransport> {
  // Metro/Jest가 함께 처리할 수 있는 지연 로드. 초기화 예외는 client 경계에서 흡수한다.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const sdk: typeof import("@amplitude/analytics-react-native") = require("@amplitude/analytics-react-native");
  await sdk.init(key, undefined, {
    minIdLength: 1,
    autocapture: false,
    trackingSessionEvents: false,
    remoteConfig: { fetchRemoteConfig: false },
    migrateLegacyData: false,
    attribution: { disabled: true },
    logLevel: 0,
    trackingOptions: {
      adid: false,
      appSetId: false,
      idfv: false,
      carrier: false,
      country: false,
      deviceManufacturer: false,
      deviceModel: false,
      ipAddress: false,
      language: false,
      osName: true,
      osVersion: true,
      platform: true,
    },
  }).promise;
  return {
    identify: (userId) => {
      const previous = sdk.getUserId();
      // 익명→로그인은 같은 device_id로 잇는다. 로그아웃/다른 계정은 분리한다.
      if (previous != null && previous !== userId) sdk.reset();
      sdk.setUserId(userId ?? undefined);
    },
    send: (event) => {
      // SDK의 비동기 enrichment 전에 신원을 복사한다. 직후 reset되어도 바뀌지 않는다.
      void sdk
        .track(event.name, event.properties, {
          user_id: event.userId ?? undefined,
          device_id: sdk.getDeviceId(),
          session_id: sdk.getSessionId(),
          time: event.time,
          insert_id: event.insertId,
          ip: "0.0.0.0",
        })
        .promise.catch(() => {});
    },
    flush: () => {
      void sdk.flush().promise.catch(() => {});
    },
  };
}
