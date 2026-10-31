import { usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";

/** 스택에 회고 화면이 남아 있어도 현재 보이는 화면의 배경에 맞춘다. */
export function RouteStatusBar() {
  const pathname = usePathname();
  const diaryBackground = pathname === "/retro/confirm" || pathname === "/retro/talk";
  return <StatusBar style={diaryBackground ? "light" : "dark"} />;
}
