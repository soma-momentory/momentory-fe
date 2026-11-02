/**
 * `expo-location` 심 — 권한은 늘 허용, 위치는 서울 시청 근처(37.57, 126.98)로 고정이다.
 * **브라우저 위치 권한 창을 절대 띄우지 않는다**(`navigator.geolocation` 을 부르지 않는다).
 * 앱이 쓰는 것(`src/lib/location.ts`)만 있다.
 */
export const LAB_COORDS = { latitude: 37.57, longitude: 126.98 } as const;

export enum PermissionStatus {
  DENIED = "denied",
  GRANTED = "granted",
  UNDETERMINED = "undetermined",
}

export enum Accuracy {
  Lowest = 1,
  Low = 2,
  Balanced = 3,
  High = 4,
  Highest = 5,
  BestForNavigation = 6,
}

const GRANTED = {
  status: PermissionStatus.GRANTED,
  granted: true,
  canAskAgain: true,
  expires: "never" as const,
};

export async function getForegroundPermissionsAsync() {
  return GRANTED;
}

export async function requestForegroundPermissionsAsync() {
  return GRANTED;
}

export async function hasServicesEnabledAsync(): Promise<boolean> {
  return true;
}

export async function getCurrentPositionAsync(_options?: { accuracy?: Accuracy }) {
  return {
    coords: {
      ...LAB_COORDS,
      altitude: null,
      accuracy: 20,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
    mocked: true,
  };
}

export async function getLastKnownPositionAsync() {
  return getCurrentPositionAsync();
}
