import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

import { track } from "@/features/analytics";

import { markGuideSeen, readGuideSeen } from "../data/guideMemory";
import type { RestGuideContent } from "./restGuide";

/**
 * 쉼터 설명 카드가 떠 있나 (2026-10-12 · 사용자와 정함).
 *
 * 그 쉼터에 **처음** 들어오면 저절로 뜨고(`first`), 뜨는 순간 「봤음」을 기기에 남긴다(`guideMemory.ts`).
 * 그 뒤로는 뒤로가기 원 옆 「?」 원(`show`)이 같은 카드를 다시 연다 — 계측은 이 누름 하나다.
 *
 * `settled` 는 「처음인지 알아봤고 카드가 닫혀 있다」다. 저절로 흘러가는 것(감각연못의 소개 한 호흡)은
 * 이때부터 시계를 잰다 — 카드를 읽는 동안 소개가 지나가 버리지 않게. 기억을 못 읽으면 띄우지 않는다.
 */
export function useRestGuide(content: RestGuideContent) {
  const [state, setState] = useState<"checking" | "first" | "again" | "closed">("checking");

  useEffect(() => {
    let alive = true;
    void readGuideSeen(content).then((seen) => {
      if (!alive) return;
      if (seen === false) void markGuideSeen(content);
      // 알아보는 사이 「?」로 먼저 열었으면 그대로 둔다
      setState((s) => (s !== "checking" ? s : seen === false ? "first" : "closed"));
    });
    return () => {
      alive = false;
    };
  }, [content]);

  return {
    open: state === "first" || state === "again",
    /** 처음 저절로 뜬 카드다 — 닫는 말이 「시작할게요」다 */
    first: state === "first",
    settled: state === "closed",
    show: () => {
      // 쓰던 키보드가 카드의 닫는 알약을 덮지 않게(걱정상자 · 보물함)
      Keyboard.dismiss();
      track("rest_guide_opened", { content });
      setState("again");
    },
    close: () => setState("closed"),
  };
}
