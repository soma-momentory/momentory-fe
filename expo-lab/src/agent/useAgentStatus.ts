/** 서버 상태(CLI 유무 · 작업 공간 목록 · 지금 도는 실행)를 읽고, 실행 중이면 자주 · 아니면 가끔 다시 읽는다. */
import { useCallback, useEffect, useState } from "react";

import type { AgentClient } from "./client";
import type { AgentStatus } from "./types";

export function useAgentStatus(client: AgentClient) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await client.status();
    if (res.ok) {
      setStatus(res.data);
      setError(null);
    } else setError(res.error);
  }, [client]);

  const busy =
    Boolean(status?.activeRuns.length) ||
    Boolean(
      status?.workspaces.some((w) => w.preview?.status === "starting" || w.status === "checking"),
    );
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), busy ? 2500 : 10_000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh, busy]);

  return { status, error, refresh };
}
