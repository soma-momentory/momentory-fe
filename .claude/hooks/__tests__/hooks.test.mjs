/**
 * 진입점을 실제로 띄워 본다 — stdin 으로 훅 입력 JSON 을 넣고 stdout · 종료 코드를 본다.
 * 저장소를 건드리지 않게 OS 임시 디렉터리에 가짜 저장소(`.git` 디렉터리 하나)를 만든다.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const HOOKS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REAL_ROOT = path.resolve(HOOKS, "../..");
const REAL_NODE_MODULES = path.join(REAL_ROOT, "node_modules");

let repo;

function run(script, payload, { agent = "claude", env = {} } = {}) {
  const r = spawnSync(process.execPath, [path.join(HOOKS, script), `--agent=${agent}`], {
    input: JSON.stringify(payload),
    encoding: "utf8",
    env: {
      ...process.env,
      MOMENTORY_GUARD: "",
      MOMENTORY_POST_EDIT: "",
      MOMENTORY_LAB_RUN: "",
      ...env,
    },
    timeout: 60000,
  });
  const out = r.stdout.trim();
  return { status: r.status, json: out ? JSON.parse(out) : null, stderr: r.stderr };
}

const denied = (r) => r.json?.hookSpecificOutput?.permissionDecision === "deny";

before(() => {
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "momentory-hooks-test-"));
  fs.mkdirSync(path.join(repo, ".git"));
  fs.mkdirSync(path.join(repo, "docs/spec"), { recursive: true });
  fs.mkdirSync(path.join(repo, "src/design/ds"), { recursive: true });
  fs.mkdirSync(path.join(repo, "app"), { recursive: true });
  fs.writeFileSync(path.join(repo, "docs/spec/RULES.md"), "# x\n");
  fs.writeFileSync(path.join(repo, ".prettierignore"), "ignored/\n");
  fs.writeFileSync(path.join(repo, ".prettierrc"), '{ "printWidth": 100 }\n');
  if (fs.existsSync(REAL_NODE_MODULES)) {
    fs.symlinkSync(REAL_NODE_MODULES, path.join(repo, "node_modules"), "junction");
  }
});

after(() => {
  // 연결(junction)을 먼저 끊는다 — 따라 들어가 본 저장소 의존성을 지우지 않게
  const link = path.join(repo, "node_modules");
  try {
    if (fs.lstatSync(link).isSymbolicLink()) fs.rmdirSync(link); // 연결만 — `rmdir` 은 안을 따라가지 않는다
  } catch {
    // 연결을 만들지 않았다
  }
  if (fs.existsSync(link)) return; // 연결이 남았으면 통째 지우기를 하지 않는다
  fs.rmSync(repo, { recursive: true, force: true });
});

describe("guard.mjs — Claude Code", () => {
  it("docs/spec 편집을 거부한다 — 절대 경로", () => {
    const r = run("guard.mjs", {
      tool_name: "Edit",
      cwd: repo,
      tool_input: { file_path: path.join(repo, "docs/spec/RULES.md") },
    });
    assert.equal(r.status, 0);
    assert.ok(denied(r));
    assert.match(r.json.hookSpecificOutput.permissionDecisionReason, /동결 스냅샷/);
  });

  it("상대 경로 · 아직 없는 하위 폴더도 잡는다", () => {
    const r = run("guard.mjs", {
      tool_name: "Write",
      cwd: repo,
      tool_input: { file_path: "docs/spec/screens/new/X.md" },
    });
    assert.ok(denied(r));
  });

  it("평범한 편집은 아무 말도 하지 않는다", () => {
    const r = run("guard.mjs", {
      tool_name: "Write",
      cwd: repo,
      tool_input: { file_path: path.join(repo, "src/a.ts") },
    });
    assert.equal(r.status, 0);
    assert.equal(r.json, null);
  });

  it("NotebookEdit 은 notebook_path 를 본다", () => {
    const r = run("guard.mjs", {
      tool_name: "NotebookEdit",
      cwd: repo,
      tool_input: { notebook_path: path.join(repo, "ios/x.ipynb") },
    });
    assert.ok(denied(r));
  });

  it("Bash · PowerShell 명령", () => {
    assert.ok(
      denied(
        run("guard.mjs", {
          tool_name: "Bash",
          cwd: repo,
          tool_input: { command: "gh pr merge 3" },
        }),
      ),
    );
    assert.ok(
      denied(
        run("guard.mjs", {
          tool_name: "PowerShell",
          cwd: repo,
          tool_input: { command: "Remove-Item -Recurse -Force node_modules" },
        }),
      ),
    );
    const ok = run("guard.mjs", {
      tool_name: "Bash",
      cwd: repo,
      tool_input: { command: "gh pr create --fill" },
    });
    assert.equal(ok.json, null);
  });

  it("MOMENTORY_GUARD=0 이면 꺼진다", () => {
    const r = run(
      "guard.mjs",
      { tool_name: "Edit", cwd: repo, tool_input: { file_path: "docs/spec/RULES.md" } },
      { env: { MOMENTORY_GUARD: "0" } },
    );
    assert.equal(r.json, null);
  });

  it("깨진 입력에도 통과로 끝난다", () => {
    const r = spawnSync(process.execPath, [path.join(HOOKS, "guard.mjs")], {
      input: "{not json",
      encoding: "utf8",
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout.trim(), "");
  });
});

describe("guard.mjs — Codex", () => {
  it("apply_patch 가 보호 경로를 건드리면 거부한다", () => {
    const r = run(
      "guard.mjs",
      {
        hook_event_name: "PreToolUse",
        tool_name: "apply_patch",
        cwd: repo,
        tool_input: {
          command:
            "*** Begin Patch\n*** Update File: docs/api/openapi.json\n@@\n-a\n+b\n*** End Patch",
        },
      },
      { agent: "codex" },
    );
    assert.ok(denied(r));
  });

  it("apply_patch 평범한 파일은 통과", () => {
    const r = run(
      "guard.mjs",
      {
        tool_name: "apply_patch",
        cwd: repo,
        tool_input: { command: "*** Begin Patch\n*** Add File: src/b.ts\n+x\n*** End Patch" },
      },
      { agent: "codex" },
    );
    assert.equal(r.json, null);
  });

  it("Bash 의 main push 를 거부한다", () => {
    const r = run(
      "guard.mjs",
      { tool_name: "Bash", cwd: repo, tool_input: { command: "git push origin main" } },
      { agent: "codex" },
    );
    assert.ok(denied(r));
  });
});

describe(
  "post-edit.mjs",
  { skip: !fs.existsSync(REAL_NODE_MODULES) && "node_modules 없음" },
  () => {
    it("고친 파일 하나를 prettier 로 다듬는다", () => {
      const file = path.join(repo, "src/ugly.ts");
      fs.writeFileSync(file, "const  a = {b:1}\n");
      const r = run("post-edit.mjs", {
        tool_name: "Edit",
        cwd: repo,
        tool_input: { file_path: file },
      });
      assert.equal(r.status, 0);
      assert.equal(fs.readFileSync(file, "utf8"), "const a = { b: 1 };\n");
      assert.equal(r.json, null);
    });

    it(".prettierignore 에 있는 파일은 건드리지 않는다", () => {
      fs.mkdirSync(path.join(repo, "ignored"), { recursive: true });
      const file = path.join(repo, "ignored/x.ts");
      fs.writeFileSync(file, "const  a = {b:1}\n");
      run("post-edit.mjs", { tool_name: "Write", cwd: repo, tool_input: { file_path: file } });
      assert.equal(fs.readFileSync(file, "utf8"), "const  a = {b:1}\n");
    });

    it("Codex apply_patch 로 쓴 파일도 다듬는다", () => {
      const file = path.join(repo, "src/patched.ts");
      fs.writeFileSync(file, "let  x=1\n");
      run(
        "post-edit.mjs",
        {
          tool_name: "apply_patch",
          cwd: repo,
          tool_input: {
            command: "*** Begin Patch\n*** Add File: src/patched.ts\n+let  x=1\n*** End Patch",
          },
        },
        { agent: "codex" },
      );
      assert.equal(fs.readFileSync(file, "utf8"), "let x = 1;\n");
    });

    it("Lab 스크립트가 없는 저장소에서 새 화면을 써도 조용하다", () => {
      const file = path.join(repo, "app/new.tsx");
      fs.writeFileSync(file, "export default function X() {\n  return null;\n}\n");
      const r = run("post-edit.mjs", {
        tool_name: "Write",
        cwd: repo,
        tool_input: { file_path: file },
      });
      assert.equal(r.json, null);
    });

    it("MOMENTORY_POST_EDIT=0 이면 꺼진다", () => {
      const file = path.join(repo, "src/off.ts");
      fs.writeFileSync(file, "const  a=1\n");
      run(
        "post-edit.mjs",
        { tool_name: "Edit", cwd: repo, tool_input: { file_path: file } },
        { env: { MOMENTORY_POST_EDIT: "0" } },
      );
      assert.equal(fs.readFileSync(file, "utf8"), "const  a=1\n");
    });
  },
);

describe("notify.mjs", () => {
  it("켜지 않으면 바로 끝난다", () => {
    const r = spawnSync(process.execPath, [path.join(HOOKS, "notify.mjs")], {
      input: JSON.stringify({ message: "x" }),
      encoding: "utf8",
      env: { ...process.env, MOMENTORY_NOTIFY: "" },
    });
    assert.equal(r.status, 0);
    assert.equal(r.stdout, "");
  });
});
