// 테스트 재료 — `git init` 한 임시 저장소. 이 저장소(momentory-fe)에는 작업 공간을 만들지 않는다.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** @param {string} cwd @param {string[]} args */
export const git = (cwd, args) =>
  execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8", windowsHide: true }).trim();

/** 1×1 투명 PNG */
export const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * 임시 저장소: `<tmp>/repo`(app/(tabs)/home.tsx · .gitignore · node_modules/표지 파일) + 맨 저장소 `origin.git`.
 * 작업 공간은 기본 자리 `<tmp>/repo-lab-ws/` 에 생긴다.
 */
export function makeRepo() {
  const tmp = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), "lab-agent-")));
  const repo = path.join(tmp, "repo");
  fs.mkdirSync(path.join(repo, "app", "(tabs)"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, "app", "(tabs)", "home.tsx"),
    "export default function Home() {}\n",
  );
  fs.writeFileSync(path.join(repo, ".gitignore"), "node_modules/\n");
  fs.mkdirSync(path.join(repo, "node_modules", "pkg"), { recursive: true });
  fs.writeFileSync(
    path.join(repo, "node_modules", "pkg", "SENTINEL"),
    "원본 node_modules — 지워지면 안 된다",
  );
  git(tmp, ["init", "-q", "-b", "main", repo]);
  git(repo, ["config", "user.email", "lab@example.com"]);
  git(repo, ["config", "user.name", "Lab Test"]);
  git(repo, ["config", "commit.gpgsign", "false"]);
  git(repo, ["add", "-A"]);
  git(repo, ["commit", "-q", "-m", "chore: 처음"]);
  const origin = path.join(tmp, "origin.git");
  git(tmp, ["init", "-q", "--bare", origin]);
  git(repo, ["remote", "add", "origin", origin]);
  return {
    tmp,
    repo,
    origin,
    wsRoot: path.join(tmp, "repo-lab-ws"),
    sentinel: path.join(repo, "node_modules", "pkg", "SENTINEL"),
    cleanup() {
      // 작업 공간의 junction 은 테스트가 이미 끊었다 — 남았어도 대상은 임시 node_modules 뿐이다
      try {
        git(repo, ["worktree", "prune"]);
      } catch {
        /* 무시 */
      }
      fs.rmSync(tmp, { recursive: true, force: true });
    },
  };
}
