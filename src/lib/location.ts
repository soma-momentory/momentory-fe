/**
 * 기기 위치의 단일 통로 — **`expo-location` 을 부르는 곳은 여기 하나다.**
 *
 * `calendar.ts` · `notifications.ts` 와 같은 자리다: 네이티브의 말을 우리 말로 바꿔 주고
 * **던지지 않는다.** 날씨는 일기와 홈을 거드는 것이라 위치에서 난 오류가 화면을 멈추게 하면 안 된다.
 *
 * ## 모듈은 쓸 때 불러온다
 *
 * `expo-location` 은 2026-10-07(일기 날씨)에 들어왔다. 그 전에 만든 dev client 에는 네이티브 모듈이
 * 없어 맨 위에서 import 하면 이 파일을 지나는 화면이 함께 멈춘다 — 함수마다 `try` 안에서 require 한다
 * (`features/rest/data/deviceStorage.ts` 와 같은 이유).
 *
 * ## 묻는 함수와 묻지 않는 함수를 나눈다
 *
 * 홈은 포커스 · 복귀마다 권한과 위치 서비스를 **다시 읽지만 묻지는 않는다**(계획 §4.6) — 그래서
 * 읽기(`getLocationPermission` · `isLocationServiceEnabled`)와 요청(`requestLocationPermission`)이
 * 따로 있고, `locateRounded` 는 권한을 묻지 않는다. 일기는 지금처럼 「묻고 → 위치」다(`diaryWeather.ts`).
 *
 * ## 좌표는 소수 둘째 자리까지만 나간다
 *
 * 0.01° ≈ 1.1km 격자 — 날씨를 찾는 데는 이것으로 충분하다. 정밀도는 `Accuracy.Balanced` 그대로다
 * (`Low` 로 낮추는 것은 실기기 검증 뒤 — 계획 §4.7). 좌표를 로그에 남기지 않는다.
 */

/** 권한 읽기의 결과 — 「다시 물을 수 있나」는 보지 않는다(거부면 다시 묻든 말든 숨긴다 · 계획 §4.6) */
export type LocationPermission = "granted" | "denied" | "undetermined";

export type RoundedPosition =
  { kind: "located"; latitude: number; longitude: number } | { kind: "unavailable" };

/** GPS 가 답하지 않아도 이 시간이 지나면 「못 찾음」으로 닫는다 */
export const LOCATE_TIMEOUT_MS = 12_000;

type LocationModule = typeof import("expo-location");

const load = (): LocationModule =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require("expo-location") as LocationModule;

/** 소수 둘째 자리로 반올림한다 — 일기 날씨가 1.3.0 부터 보내던 것과 같은 식이다 */
export function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 유한수이고 위도 −90~90 · 경도 −180~180 안인가 */
export function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

/**
 * 지금 권한을 **묻지 않고** 읽는다. 못 읽으면 `"denied"` — 묻지 않는 쪽으로 닫는다
 * (안내도 띄우지 않는다).
 */
export async function getLocationPermission(): Promise<LocationPermission> {
  try {
    const { status, granted } = await load().getForegroundPermissionsAsync();
    if (status === "granted" || status === "denied" || status === "undetermined") return status;
    return granted ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

/**
 * OS 권한 창을 띄운다. 모듈이 없거나 실패하면 `"unavailable"` — 일기가 1.3.0 부터 그 경우를
 * 「거부」가 아니라 「못 함」으로 다뤄 왔다.
 */
export async function requestLocationPermission(): Promise<"granted" | "denied" | "unavailable"> {
  try {
    const permission = await load().requestForegroundPermissionsAsync();
    return permission.granted ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

/** OS 위치 서비스가 켜져 있나 — **묻지 않는다.** 못 읽으면 `false` */
export async function isLocationServiceEnabled(): Promise<boolean> {
  try {
    return (await load().hasServicesEnabledAsync()) === true;
  } catch {
    return false;
  }
}

/**
 * 지금 위치를 소수 둘째 자리로 줄여 돌려준다. **권한을 묻지 않는다** — 부르기 전에 호출자가
 * 권한을 확인한다. 서비스 꺼짐 · {@link LOCATE_TIMEOUT_MS} 초과 · 좌표 이상 · 모듈 없음은 전부
 * `unavailable` 이다. 시간 초과로 끝나도 타이머를 남기지 않는다.
 */
export async function locateRounded(): Promise<RoundedPosition> {
  try {
    const location = load();
    if (!(await location.hasServicesEnabledAsync())) return { kind: "unavailable" };
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const position = await Promise.race([
        location.getCurrentPositionAsync({ accuracy: location.Accuracy.Balanced }),
        new Promise<null>((resolve) => {
          timer = setTimeout(() => resolve(null), LOCATE_TIMEOUT_MS);
        }),
      ]);
      if (position == null) return { kind: "unavailable" };
      const { latitude, longitude } = position.coords;
      if (!isValidCoordinate(latitude, longitude)) return { kind: "unavailable" };
      return {
        kind: "located",
        latitude: roundCoordinate(latitude),
        longitude: roundCoordinate(longitude),
      };
    } finally {
      if (timer) clearTimeout(timer);
    }
  } catch {
    return { kind: "unavailable" };
  }
}
