import Constants from "expo-constants";
import { useCallback, useEffect, useRef, useState } from "react";

import { currentUserId, useAuth } from "@/features/auth/model/auth";

import { markWhatsNewSeen, readWhatsNewSeen } from "../data/whatsNewMemory";
import { shouldShowWhatsNew } from "./whatsNew";

const appVersion = () => Constants.expoConfig?.version;

/** 새 가입자는 소식을 받지 않는다 — 온보딩을 마칠 때 지금 버전을 본 것으로 남긴다 */
export async function markWhatsNewSeenAtSignup(): Promise<void> {
  const userId = await currentUserId().catch(() => null);
  const version = appVersion();
  if (userId != null && version != null) await markWhatsNewSeen(userId, version);
}

/**
 * 홈의 업데이트 소식 상태. `checking` 동안에는 홈이 다른 시트를 띄우지 않고 기다린다.
 * 닫는 길(확인 · 바깥 · 쓸어내리기)은 모두 `dismiss` 하나로 모인다.
 */
export function useWhatsNew() {
  const authStatus = useAuth((s) => s.status);
  const [checked, setChecked] = useState<"open" | "none" | null>(null);
  const owner = useRef<number | null>(null);

  useEffect(() => {
    if (authStatus !== "authenticated") return;
    let active = true;
    void (async () => {
      const userId = await currentUserId().catch(() => null);
      const seen = userId == null ? undefined : await readWhatsNewSeen(userId);
      if (!active) return;
      owner.current = userId;
      setChecked(shouldShowWhatsNew(appVersion(), seen) ? "open" : "none");
    })();
    return () => {
      active = false;
      setChecked(null);
    };
  }, [authStatus]);

  const dismiss = useCallback(() => {
    setChecked("none");
    const version = appVersion();
    if (owner.current != null && version != null) void markWhatsNewSeen(owner.current, version);
  }, []);

  return { status: checked ?? ("checking" as const), dismiss };
}
