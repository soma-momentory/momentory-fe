/**
 * 진입 판정 — 이 창이 **셸**(Lab 도구)인가 **프레임**(실제 앱 한 벌)인가.
 *
 * - iframe 안(`window.self !== window.top`)이거나 주소에 `?labFrame=1` 이 있으면 프레임이다.
 * - 프레임 설정은 `window.name`(셸이 `encodeFrameConfig` 로 싣는다)이 정본이다.
 *   이름이 없을 때만(`?labFrame=1` 로 직접 연 창) 기본값 + 쿼리로 만든다.
 *
 * 쿼리 이름: `frameId` · `dataset` · `os`(ios|android — `platform` 도 읽지만 개발 서버가 그 이름을
 * 가로챈다, 아래) · `device` · `signedIn` · `now` · `latency` · `fail`(쉼표로 여러 개) · `repeat`(오늘 다시 쓰기 · 0|1) · `todayDiary`(오늘 쓴 일기 · 0|1).
 * 플랫폼만 주면 기기는 그 플랫폼의 기본 기기다. 기기를 주면 플랫폼은 기기를 따른다.
 *
 * 순수 함수다 — 테스트가 창 없이 부른다.
 */
import {
  DATASET_IDS,
  DEFAULT_FRAME_CONFIG,
  decodeFrameConfig,
  type LabFrameConfig,
  type LabPlatform,
} from "../lab-contract";
import { DEFAULT_DEVICE_ID, labDevices } from "../lab-devices";

export type LaunchInput = {
  /** `window.name` */
  name: string | null | undefined;
  /** `window.location.search` */
  search: string;
  /** `window.self !== window.top` */
  inIframe: boolean;
};

export type Launch = { mode: "shell" } | { mode: "frame"; config: LabFrameConfig };

const isPlatform = (value: string | null): value is LabPlatform =>
  value === "ios" || value === "android";

const readBoolean = (value: string | null): boolean | undefined => {
  if (value == null) return undefined;
  if (value === "1" || value === "true") return true;
  if (value === "0" || value === "false") return false;
  return undefined;
};

/** `?labFrame=1` 로 직접 연 창의 설정 — 기본값 위에 쿼리를 얹는다. 모르는 값은 버린다 */
export function configFromQuery(search: string): LabFrameConfig {
  const params = new URLSearchParams(search);
  const config: LabFrameConfig = { ...DEFAULT_FRAME_CONFIG };

  const frameId = params.get("frameId");
  if (frameId) config.frameId = frameId;

  const dataset = params.get("dataset");
  if (dataset && (DATASET_IDS as readonly string[]).includes(dataset)) config.datasetId = dataset;

  // ⚠ 개발 서버는 `?platform=` 을 네이티브 매니페스트 요청으로 읽어 HTML 대신 404 를 준다 —
  // 그래서 `os` 가 먼저다. `platform` 은 내보낸(정적) 번들에서만 쓸 수 있다
  const platform = params.get("os") ?? params.get("platform");
  const device = labDevices.find((d) => d.id === params.get("device"));
  if (device) {
    // 기기가 플랫폼을 정한다 — 둘이 엇갈리면 기기를 믿는다
    config.deviceId = device.id;
    config.platform = device.platform;
  } else if (isPlatform(platform)) {
    config.platform = platform;
    config.deviceId = DEFAULT_DEVICE_ID[platform];
  }

  const signedIn = readBoolean(params.get("signedIn"));
  if (signedIn != null) config.signedIn = signedIn;

  const now = params.get("now");
  if (now && !Number.isNaN(new Date(now).getTime())) config.now = now;

  const latency = Number(params.get("latency"));
  if (params.has("latency") && Number.isFinite(latency) && latency >= 0) config.latencyMs = latency;

  const repeat = readBoolean(params.get("repeat"));
  if (repeat != null) config.repeatToday = repeat;

  if (readBoolean(params.get("todayDiary"))) config.todayDiary = true;

  const fail = params.get("fail");
  if (fail) config.failPaths = fail.split(",").filter(Boolean);

  return config;
}

export function resolveLaunch(input: LaunchInput): Launch {
  const params = new URLSearchParams(input.search);
  const forced = params.get("labFrame") === "1";
  if (!input.inIframe && !forced) return { mode: "shell" };

  const fromName = decodeFrameConfig(input.name);
  if (fromName) return { mode: "frame", config: fromName };
  return { mode: "frame", config: configFromQuery(input.search) };
}

/** 지금 창으로 판정한다. 창이 없으면(네이티브 Expo Go) 셸이다 */
export function resolveLaunchFromWindow(): Launch {
  if (typeof window === "undefined" || typeof window.location === "undefined") {
    return { mode: "shell" };
  }
  let inIframe = false;
  try {
    inIframe = window.self !== window.top;
  } catch {
    // 다른 출처의 부모 — 그래도 iframe 이다
    inIframe = true;
  }
  return resolveLaunch({ name: window.name, search: window.location.search, inIframe });
}
