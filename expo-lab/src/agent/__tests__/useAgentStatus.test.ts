import { afterEach, beforeEach, expect, jest, test } from "@jest/globals";
import { act, renderHook } from "@testing-library/react-native";

import type { AgentClient } from "../client";
import { useAgentStatus } from "../useAgentStatus";

const OK = {
  ok: true,
  data: { activeRuns: [], workspaces: [] },
};

function pendingClient() {
  const answers: ((value: unknown) => void)[] = [];
  const status = jest.fn(() => new Promise((resolve) => answers.push(resolve)));
  return { client: { status } as unknown as AgentClient, status, answers };
}

const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

test("앞선 응답이 안 왔으면 폴링을 건너뛰고, 응답이 오면 다시 읽는다", async () => {
  const { client, status, answers } = pendingClient();
  await renderHook(() => useAgentStatus(client));

  await advance(35_000);
  expect(status).toHaveBeenCalledTimes(1);

  await act(async () => {
    answers[0]?.(OK);
  });
  await advance(10_000);
  expect(status).toHaveBeenCalledTimes(2);
});

test("부르는 쪽의 새로 읽기는 폴링이 도는 중이어도 나간다 — 방금 한 일의 결과를 봐야 한다", async () => {
  const { client, status } = pendingClient();
  const { result } = await renderHook(() => useAgentStatus(client));
  await advance(1);
  expect(status).toHaveBeenCalledTimes(1);

  await act(async () => {
    void result.current.refresh();
  });
  expect(status).toHaveBeenCalledTimes(2);
});
