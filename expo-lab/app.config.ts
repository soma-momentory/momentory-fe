import type { ConfigContext, ExpoConfig } from "expo/config";

/** Local design host. The production app keeps its own app.config.ts and entry point. */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Momentory Design Lab",
  slug: "momentory-expo-lab",
  android: { package: "com.momentory.designlab.qa" },
  web: { bundler: "metro" },
});
