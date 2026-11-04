/** 서버 상태(CLI 유무 · 작업 공간 목록 · 지금 도는 실행)를 읽고, 실행 중이면 자주 · 아니면 가끔 다시 읽는다. */
import { useCallback, useEffect, useRef, useState } from "react";

import type { AgentClient } from "./client";
import type { AgentStatus } from "./types";

export function useAgentStatus(client: AgentClient) {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reading = useRef(0);

  const refresh = useCallback(async () => {
    reading.current += 1;
    try {
      const res = await client.status();
      if (res.ok) {
        setStatus(res.data);
        setError(null);
      } else setError(res.error);
    } finally {
      reading.current -= 1;
    }
  }, [client]);

  const busy =
    Boolean(status?.activeRuns.length) ||
    Boolean(
      status?.workspaces.some((w) => w.preview?.status === "starting" || w.status === "checking"),
    );
  useEffect(() => {
    const first = setTimeout(() => void refresh(), 0);
    // 앞선 응답이 아직 안 왔으면 건너뛴다 — 서버가 느릴수록 요청이 쌓여 더 느려진다
    const timer = setInterval(
      () => {
        if (reading.current === 0) void refresh();
      },
      busy ? 2500 : 10_000,
    );
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh, busy]);

  return { status, error, refresh };
}
