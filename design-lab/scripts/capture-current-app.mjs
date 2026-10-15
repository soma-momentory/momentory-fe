/**
 * 현재 실행 중인 Momentory 개발 앱을 읽어 Design Lab 전용 캡처를 만든다.
 * 실행 전: 13 mini 시뮬레이터에 기존 앱 빌드 설치, Metro 8081 실행, 개발 세션 진입.
 * 앱 소스·docs 원본 캡처는 쓰지 않는다. 실제로 도착한 라우트만 저장한다.
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const labDirectory = path.resolve(scriptDirectory, "..");
const requireFromApp = createRequire(path.resolve(labDirectory, "../package.json"));
const WebSocket = requireFromApp("ws");
const simulatorId =
  process.env.MOMENTORY_CAPTURE_SIMULATOR ?? "01E554A7-7DAC-4D05-AD74-619D0D20C48D";
const outputDirectory = path.join(labDirectory, "public/app-captures");
const catalog = await readFile(path.join(labDirectory, "src/screens/currentAppScreens.ts"), "utf8");
const screens = [...catalog.matchAll(/\{ id: "([^"]+)", title: "([^"]+)", route: "([^"]+)"/g)]
  .map((match) => ({ id: match[1], title: match[2], route: match[3] }))
  .filter(
    ({ id, route }) =>
      !["splash", "schedule-new", "retro-talk", "retro-draft", "report"].includes(id) &&
      !route.includes("[id]"),
  );

const targets = await fetch("http://127.0.0.1:8081/json/list").then((response) => response.json());
const target = targets.find((item) => item.appId === "kr.momentory.app");
if (!target) throw new Error("실행 중인 Momentory 앱 디버거를 찾지 못했습니다.");

const socket = new WebSocket(target.webSocketDebuggerUrl, {
  headers: { origin: "http://127.0.0.1:8081" },
});
await new Promise((resolve, reject) => {
  socket.once("open", resolve);
  socket.once("error", reject);
});

let nextId = 0;
function evaluate(expression) {
  return new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(
      () => reject(new Error(`디버거 응답 시간 초과: ${expression}`)),
      10000,
    );
    const onMessage = (raw) => {
      const message = JSON.parse(String(raw));
      if (message.id !== id) return;
      clearTimeout(timeout);
      socket.off("message", onMessage);
      if (message.error || message.result?.exceptionDetails) {
        reject(new Error(JSON.stringify(message.error ?? message.result.exceptionDetails)));
      } else {
        resolve(message.result?.result?.value);
      }
    };
    socket.on("message", onMessage);
    socket.send(
      JSON.stringify({
        id,
        method: "Runtime.evaluate",
        params: { expression, returnByValue: true },
      }),
    );
  });
}

const ids = JSON.parse(
  await evaluate(
    `JSON.stringify([...__r.getModules()].filter(([id, module]) => /node_modules\\/expo-router\\/build\\/(exports|global-state\\/router-store)\\.js/.test(module.verboseName || "")).map(([id, module]) => [module.verboseName, id]))`,
  ),
);
const routerId = ids.find(([name]) => name.endsWith("/exports.js"))?.[1];
const storeId = ids.find(([name]) => name.endsWith("/router-store.js"))?.[1];
if (routerId == null || storeId == null) throw new Error("Expo Router 모듈을 찾지 못했습니다.");
const authId = await evaluate(
  `[...__r.getModules()].find(([id, module]) => module.verboseName === "src/features/auth/model/auth.ts")?.[0]`,
);
if (authId == null) throw new Error("개발 세션 모듈을 찾지 못했습니다.");
await evaluate(`__r(${authId}).useAuth.getState().signInDev(); "sent"`);
await new Promise((resolve) => setTimeout(resolve, 400));

execFileSync("xcrun", [
  "simctl",
  "status_bar",
  simulatorId,
  "override",
  "--time",
  "9:41",
  "--dataNetwork",
  "wifi",
  "--wifiMode",
  "active",
  "--wifiBars",
  "3",
  "--batteryState",
  "discharging",
  "--batteryLevel",
  "100",
]);
await mkdir(outputDirectory, { recursive: true });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const results = [];
for (const screen of screens) {
  await evaluate(`__r(${routerId}).router.replace(${JSON.stringify(screen.route)}); "sent"`);
  await pause(1450);
  const actual = JSON.parse(await evaluate(`JSON.stringify(__r(${storeId}).store.getRouteInfo())`));
  const actualPath = actual.pathname;
  const expectedPath = screen.route.replace(/^\/\((onboarding|tabs)\)/, "");
  if (actualPath !== expectedPath) {
    results.push({ id: screen.id, expected: expectedPath, actual: actualPath, captured: false });
    process.stdout.write(`SKIP ${screen.id}: ${actualPath}\n`);
    continue;
  }
  const output = path.join(outputDirectory, `${screen.id}.png`);
  execFileSync("xcrun", ["simctl", "io", simulatorId, "screenshot", output], { stdio: "ignore" });
  results.push({ id: screen.id, expected: expectedPath, actual: actualPath, captured: true });
  process.stdout.write(`CAPTURE ${screen.id}\n`);
}
socket.close();
process.stdout.write(
  `${results.filter((result) => result.captured).length}/${screens.length} screens captured\n`,
);
