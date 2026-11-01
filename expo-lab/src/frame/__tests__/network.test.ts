import { describe, expect, it, jest } from "@jest/globals";

import { LAB_API_BASE_URL } from "../../lab-contract";
import { classifyRequest, createGuardedFetch } from "../network";

const ORIGIN = "http://localhost:8091";

/** Response 가 없는 환경에서도 돌게 최소한의 응답 모양만 쓴다 */
const fakeResponse = (status: number) => ({ status }) as Response;

describe("frame network guard", () => {
  it("classifies requests", () => {
    expect(classifyRequest("/assets/font.ttf", ORIGIN)).toBe("same-origin");
    expect(classifyRequest(`${ORIGIN}/index.bundle`, ORIGIN)).toBe("same-origin");
    expect(classifyRequest("https://api2.amplitude.com/2/httpapi", ORIGIN)).toBe("amplitude");
    expect(classifyRequest("https://api.eu.amplitude.com/batch", ORIGIN)).toBe("amplitude");
    expect(classifyRequest(`${LAB_API_BASE_URL}/api/v1/users/me`, ORIGIN)).toBe("lab-api");
    expect(classifyRequest("https://api.momentory.co.kr/api/v1/users/me", ORIGIN)).toBe("external");
    expect(classifyRequest("https://evil.amplitude.com.example.org/", ORIGIN)).toBe("external");
  });

  it("passes same-origin requests through and closes everything else locally", async () => {
    const real = jest.fn(async () => fakeResponse(200)) as unknown as typeof fetch;
    const log = jest.fn();
    const guarded = createGuardedFetch(real, ORIGIN, log);

    await guarded("/index.bundle");
    expect(real).toHaveBeenCalledTimes(1);

    const amplitude = await guarded("https://api2.amplitude.com/2/httpapi", { method: "POST" });
    expect(amplitude.status).toBe(200);
    expect(log).not.toHaveBeenCalled();

    const unhandled = await guarded(`${LAB_API_BASE_URL}/api/v1/letters`);
    expect(unhandled.status).toBe(503);

    const external = await guarded("https://api.momentory.co.kr/api/v1/users/me");
    expect(external.status).toBe(503);

    expect(real).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledTimes(2);
  });
});
