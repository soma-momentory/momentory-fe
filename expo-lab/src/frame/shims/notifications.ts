/**
 * `expo-notifications` 심 — 권한은 늘 허용이고 **예약은 메모리에 적기만 한다.** 브라우저 알림
 * 권한 창(`Notification.requestPermission`)을 띄우지 않고, 알림도 울리지 않는다.
 * 앱이 쓰는 것(`src/lib/notifications.ts`)만 있다.
 */
export enum AndroidImportance {
  UNKNOWN = 0,
  UNSPECIFIED = 1,
  NONE = 2,
  MIN = 3,
  LOW = 4,
  DEFAULT = 5,
  HIGH = 6,
  MAX = 7,
}

export enum SchedulableTriggerInputTypes {
  CALENDAR = "calendar",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
  YEARLY = "yearly",
  DATE = "date",
  TIME_INTERVAL = "timeInterval",
}

export const DEFAULT_ACTION_IDENTIFIER = "expo.modules.notifications.actions.DEFAULT";

export type LabNotificationRequest = {
  identifier: string;
  content: { title?: string | null; body?: string | null; data?: Record<string, unknown> };
  trigger: unknown;
};

const scheduled = new Map<string, LabNotificationRequest>();

/** Lab 이 들여다보는 창 — 지금 예약된 것 */
export function getLabScheduledNotifications(): LabNotificationRequest[] {
  return [...scheduled.values()];
}

const GRANTED = {
  status: "granted" as const,
  granted: true,
  canAskAgain: true,
  expires: "never" as const,
  ios: { status: 2, allowsAlert: true, allowsBadge: true, allowsSound: true },
};

export async function getPermissionsAsync() {
  return GRANTED;
}

export async function requestPermissionsAsync() {
  return GRANTED;
}

export function setNotificationHandler(_handler: unknown): void {}

export async function setNotificationChannelAsync(id: string, channel: object) {
  return { id, ...channel };
}

export async function scheduleNotificationAsync(request: {
  identifier?: string;
  content: LabNotificationRequest["content"];
  trigger: unknown;
}): Promise<string> {
  const identifier = request.identifier ?? `lab-${scheduled.size + 1}-${Date.now()}`;
  scheduled.set(identifier, { identifier, content: request.content, trigger: request.trigger });
  return identifier;
}

export async function cancelScheduledNotificationAsync(identifier: string): Promise<void> {
  scheduled.delete(identifier);
}

export async function cancelAllScheduledNotificationsAsync(): Promise<void> {
  scheduled.clear();
}

export async function getAllScheduledNotificationsAsync(): Promise<LabNotificationRequest[]> {
  return getLabScheduledNotifications();
}

export async function getLastNotificationResponseAsync(): Promise<null> {
  return null;
}

export async function clearLastNotificationResponseAsync(): Promise<void> {}

const subscription = () => ({ remove: () => {} });

export function addNotificationResponseReceivedListener(_listener: unknown) {
  return subscription();
}

export function addNotificationReceivedListener(_listener: unknown) {
  return subscription();
}

export async function setBadgeCountAsync(_count: number): Promise<boolean> {
  return true;
}
