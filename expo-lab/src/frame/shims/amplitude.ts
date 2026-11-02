/**
 * `@amplitude/analytics-react-native` 심 — Lab 은 계측을 내보내지 않는다. 앱 키가 비어 있어
 * 앱이 SDK 를 부르지도 않지만(`features/analytics`), 불러도 아무 데도 보내지 않게 한 겹 더 둔다.
 * 네트워크 겹(`../network.ts`)도 Amplitude 호스트를 따로 막는다.
 */
const done = () => ({ promise: Promise.resolve() });

let userId: string | undefined;

export const init = (..._args: unknown[]) => done();
export const track = (..._args: unknown[]) => done();
export const identify = (..._args: unknown[]) => done();
export const flush = () => done();
export const getUserId = () => userId;
export const setUserId = (next?: string) => {
  userId = next;
};
export const getDeviceId = () => "lab-device";
export const getSessionId = () => 0;
export const setDeviceId = (_deviceId: string) => {};
export const setOptOut = (_optOut: boolean) => {};
export const reset = () => {
  userId = undefined;
};
