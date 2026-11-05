// @ts-check
/**
 * 작업 공간마다 Expo Lab 웹 서버 하나 — 「수정 결과 보기」가 여는 주소다.
 *
 * `node <작업 공간>/node_modules/expo/bin/cli start --web --port <8100부터 빈 포트>` 를
 * cwd = `<작업 공간>/expo-lab` 에서 띄운다(npx · .cmd 셈을 거치지 않는다).
 * - `CI` 변수를 지운다 — CI=1 이면 Metro 가 파일 감시를 끄고, 그러면 에이전트가 고친 것이 안 보인다.
 * - `BROWSER=none` — `--web` 이 브라우저 탭을 새로 열지 않게.
 * - `MOMENTORY_LAB_AGENT=off` — 미리보기 서버에는 에이전트 API 를 달지 않는다(작업 공간 안에서 또 작업 공간을 만들지 않게).
 * 준비 여부는 Metro 의 `/status`(`packager-status:running`)로 안다.
 */
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const { IS_WIN, killTree } = require("./proc");

const PORT_START = 8100;
const PORT_END = 8199;
const READY_POLL_MS = 500;

/** @param {number} port @returns {Promise<boolean>} */
function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port);
  });
}

/** @param {ReadonlySet<number>} taken */
async function findFreePort(taken, start = PORT_START, end = PORT_END) {
  for (let port = start; port <= end; port += 1) {
    if (taken.has(port)) continue;
    if (await isPortFree(port)) return port;
  }
  return null;
}

/** @param {number} port @returns {Promise<boolean>} */
function probe(port) {
  return new Promise((resolve) => {
    const req = http.get({ host: "127.0.0.1", port, path: "/status", timeout: 3000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => resolve(body.includes("packager-status:running")));
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

/**
 * @typedef {{ status: "starting" | "ready" | "failed" | "stopped"; port: number | null; url: string | null;
 *   ready: boolean; error: string | null; startedAt: number }} PreviewState
 */

class PreviewServer {
  /** @param {{ wsPath: string; port: number; logPath: string; readyTimeoutMs?: number }} opts */
  constructor(opts) {
    this.port = opts.port;
    this.url = `http://localhost:${opts.port}`;
    /** @type {PreviewState["status"]} */
    this.status = "starting";
    /** @type {string | null} */
    this.error = null;
    this.startedAt = Date.now();
    /** @type {string[]} */
    this.tail = [];

    const cli = path.join(opts.wsPath, "node_modules", "expo", "bin", "cli");
    const cwd = path.join(opts.wsPath, "expo-lab");
    if (!fs.existsSync(cli) || !fs.existsSync(cwd)) {
      this.status = "failed";
      this.error = "작업 공간에서 Expo 를 찾지 못했어요";
      this.child = null;
      return;
    }
    /** @type {NodeJS.ProcessEnv} */
    const env = {
      ...process.env,
      BROWSER: "none",
      MOMENTORY_LAB_AGENT: "off",
      MOMENTORY_LAB_RUN: "1", // Lab 이 띄운 실행(index.js labRunEnv)
    };
    delete env.CI;
    fs.mkdirSync(path.dirname(opts.logPath), { recursive: true });
    const log = fs.createWriteStream(opts.logPath, { flags: "a" });
    this.child = spawn(process.execPath, [cli, "start", "--web", "--port", String(opts.port)], {
      cwd,
      env,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
      detached: !IS_WIN,
      shell: false,
    });
    const keep = (/** @type {Buffer} */ chunk) => {
      log.write(chunk);
      for (const line of chunk.toString().split(/\r?\n/)) {
        if (!line.trim()) continue;
        this.tail.push(line);
        if (this.tail.length > 20) this.tail.shift();
      }
    };
    this.child.stdout?.on("data", keep);
    this.child.stderr?.on("data", keep);
    this.child.on("error", (error) => {
      this.status = "failed";
      this.error = `미리보기 서버를 띄우지 못했어요: ${error.message}`;
    });
    this.child.on("close", (code) => {
      log.end();
      if (this.status === "stopped") return;
      this.status = "failed";
      this.error =
        this.error ??
        `미리보기 서버가 멈췄어요(종료 코드 ${code}) ${this.tail.slice(-1)[0] ?? ""}`.trim();
    });

    const deadline = Date.now() + (opts.readyTimeoutMs ?? 180_000);
    const tick = async () => {
      if (this.status !== "starting") return;
      if (await probe(this.port)) {
        if (this.status === "starting") this.status = "ready";
        return;
      }
      if (Date.now() > deadline) {
        this.status = "failed";
        this.error = "미리보기 서버가 3분 안에 준비되지 않았어요";
        this.stop("failed");
        return;
      }
      setTimeout(tick, READY_POLL_MS).unref?.();
    };
    setTimeout(tick, READY_POLL_MS).unref?.();
  }

  /** @param {PreviewState["status"]} [as] @param {boolean} [sync] */
  stop(as = "stopped", sync = false) {
    if (this.status !== "failed" || as === "failed") this.status = as;
    killTree(this.child?.pid, { sync });
  }

  get alive() {
    return this.status === "starting" || this.status === "ready";
  }

  /** @returns {PreviewState} */
  state() {
    return {
      status: this.status,
      port: this.port,
      url: this.url,
      ready: this.status === "ready",
      error: this.error,
      startedAt: this.startedAt,
    };
  }
}

module.exports = { PreviewServer, findFreePort, isPortFree, probe, PORT_START, PORT_END };
