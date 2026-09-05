import { randomUUID } from "expo-crypto";

import { analyticsEnabled, loadAmplitude } from "./amplitude";
import { createAnalytics } from "./client";

const key = process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY ?? "";
export const isAnalyticsEnabled = analyticsEnabled(
  key,
  __DEV__,
  process.env.EXPO_PUBLIC_AMPLITUDE_ALLOW_DEVELOPMENT,
);
const analytics = createAnalytics({
  enabled: isAnalyticsEnabled,
  load: () => loadAmplitude(key),
  uuid: randomUUID,
  now: Date.now,
});

export const track = analytics.track;
export const identifyAnalytics = analytics.identify;
export const resetAnalytics = () => analytics.identify(null);
export const captureAnalytics = analytics.capture;
export const flushAnalytics = analytics.flush;
