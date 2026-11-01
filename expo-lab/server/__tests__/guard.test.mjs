import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
const { checkLocalRequest } = require("../guard.js");

/** @param {{ method?: string; headers?: Record<string, string>; remote?: string; port?: number }} o */
const req = (o = {}) => ({
  method: o.method ?? "GET",
  headers: { host: `localhost:${o.port ?? 8085}`, ...o.headers },
  socket: { remoteAddress: o.remote ?? "127.0.0.1", localPort: o.port ?? 8085 },
});

test("같은 PC · 같은 포트의 Lab 화면 요청은 통과한다", () => {
  assert.equal(
    checkLocalRequest(req({ headers: { referer: "http://localhost:8085/#/home" } })).ok,
    true,
  );
  assert.equal(
    checkLocalRequest(
      req({
        method: "POST",
        headers: {
          origin: "http://127.0.0.1:8085",
          "x-momentory-lab": "1",
          host: "127.0.0.1:8085",
        },
      }),
    ).ok,
    true,
  );
  assert.equal(
    checkLocalRequest(req({ remote: "::1", headers: { referer: "http://[::1]:8085/" } })).ok,
    true,
  );
});

test("루프백이 아닌 주소는 막는다", () => {
  const verdict = checkLocalRequest(
    req({ remote: "192.168.0.10", headers: { referer: "http://localhost:8085/" } }),
  );
  assert.equal(verdict.ok, false);
  assert.equal(verdict.ok === false && verdict.status, 403);
});

test("다른 출처 · 다른 포트 · 출처 없음은 막는다", () => {
  assert.equal(checkLocalRequest(req({ headers: { origin: "https://evil.example" } })).ok, false);
  assert.equal(
    checkLocalRequest(req({ headers: { referer: "http://localhost:9999/" } })).ok,
    false,
  );
  assert.equal(
    checkLocalRequest(req({ headers: { referer: "https://localhost:8085/" } })).ok,
    false,
  );
  assert.equal(checkLocalRequest(req({})).ok, false);
});

test("DNS 리바인딩 — Host 가 로컬이 아니면 막는다", () => {
  assert.equal(
    checkLocalRequest(
      req({ headers: { host: "evil.example:8085", referer: "http://evil.example:8085/" } }),
    ).ok,
    false,
  );
});

test("GET 이 아닌 요청은 X-Momentory-Lab 헤더가 있어야 한다", () => {
  const base = { method: "POST", headers: { origin: "http://localhost:8085" } };
  assert.equal(checkLocalRequest(req(base)).ok, false);
  assert.equal(checkLocalRequest(req({ ...base, method: "DELETE" })).ok, false);
  assert.equal(
    checkLocalRequest(req({ ...base, headers: { ...base.headers, "x-momentory-lab": "1" } })).ok,
    true,
  );
});
