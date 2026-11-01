#!/usr/bin/env node
/**
 * `Notification` 훅 — Claude Code 가 권한을 묻거나 입력을 기다릴 때 Windows 토스트를 띄운다.
 *
 * **기본은 꺼져 있다.** 켜기: `MOMENTORY_NOTIFY=1` (각자 `.claude/settings.local.json` 의 `env` 에).
 * Lab 무인 실행(`MOMENTORY_LAB_RUN=1`)에서는 켜 있어도 띄우지 않는다 — Lab 이 자기 알림을 띄운다.
 * Windows + PowerShell `BurntToast` 모듈이 있을 때만 띄우고, 없으면 아무것도 하지 않는다.
 * 훅은 기다리지 않는다 — PowerShell 을 떼어 놓고 바로 끝난다.
 */

import { spawn } from "node:child_process";

import { readHookInput } from "./lib/runtime.mjs";
import { isOn } from "./lib/rules.mjs";

function main() {
  if (!isOn(process.env.MOMENTORY_NOTIFY)) return;
  if (isOn(process.env.MOMENTORY_LAB_RUN)) return;
  if (process.platform !== "win32") return;

  const input = readHookInput();
  const message = String(input.message ?? "입력을 기다리고 있어요").slice(0, 200);
  const title = `Claude Code · ${String(input.cwd ?? process.env.CLAUDE_PROJECT_DIR ?? "")
    .split(/[\\/]/)
    .filter(Boolean)
    .pop()}`;

  // 값은 환경변수로 넘긴다 — 명령 문자열에 이어 붙이지 않는다(따옴표·한글이 깨지지 않게)
  const script =
    "if (Get-Module -ListAvailable -Name BurntToast) { Import-Module BurntToast; " +
    "New-BurntToastNotification -Text $env:MOMENTORY_TOAST_TITLE, $env:MOMENTORY_TOAST_TEXT }";
  const child = spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env, MOMENTORY_TOAST_TITLE: title, MOMENTORY_TOAST_TEXT: message },
  });
  child.on("error", () => {});
  child.unref();
}

try {
  main();
} catch {
  // 알림은 덤이다 — 무슨 일이 있어도 세션을 건드리지 않는다
}
process.exit(0);
