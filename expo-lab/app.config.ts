import type { ConfigContext, ExpoConfig } from "expo/config";

/** Local-only web host. The production app keeps its own app.config.ts and entry point. */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Momentory Design Lab",
  slug: "momentory-expo-lab",
  web: { bundler: "metro" },
});
