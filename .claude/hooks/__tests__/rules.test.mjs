import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

import {
  checkCommand,
  checkProtectedPath,
  isDesignToken,
  isPrettierTarget,
  parseApplyPatchPaths,
  parseApplyPatchWrittenPaths,
  resolveShellPath,
  routeOf,
  splitCommands,
  toRepoRelative,
} from "../lib/rules.mjs";

/* --------------------------------------------------------------- 경로 */

describe("보호 경로", () => {
  const denied = [
    "docs/spec/RULES.md",
    "docs/spec/screens/C2.md",
    "docs/spec",
    "Docs/Spec/x.md",
    "./docs/spec/x.md",
    "docs/api/openapi.json",
    "ios/Podfile",
    "android/app/build.gradle",
    "ios",
    ".env",
    ".env.local",
    ".env.production",
    "expo-lab/.env",
    "harness/runs/2026/state.json",
    "harness/parallel-runs/r1/log.txt",
  ];
  for (const rel of denied) {
    it(`막는다 — ${rel}`, () => assert.ok(checkProtectedPath(rel), rel));
  }

  const allowed = [
    "docs/DESIGN.md",
    "docs/PRODUCT.md",
    "docs/api/README.md",
    "docs/specs.md",
    "docs/spec-notes/x.md",
    "src/design/ds/color.ts",
    "app/(tabs)/home.tsx",
    ".env.example",
    "src/lib/env.ts",
    "plugins/withInsecureDevApi.ts",
    "harness/run.mjs",
    "harness/README.md",
    "iosx/a.ts",
    ".claude/settings.json",
    ".claude/hooks/guard.mjs",
    ".codex/hooks.json",
    "",
  ];
  for (const rel of allowed) {
    it(`통과 — ${rel || "(루트)"}`, () => assert.equal(checkProtectedPath(rel), null, rel));
  }

  it("Lab 무인 실행에서는 에이전트 설정도 막는다", () => {
    for (const rel of [".claude/settings.json", ".claude/hooks/guard.mjs", ".codex/hooks.json"]) {
      assert.ok(checkProtectedPath(rel, { labRun: true }), rel);
    }
    assert.equal(checkProtectedPath(".claude/skills/x/SKILL.md", { labRun: true }), null);
    assert.equal(checkProtectedPath(".claude/settings.local.json", { labRun: true }), null);
  });

  it("null(저장소 밖)은 판정하지 않는다", () => assert.equal(checkProtectedPath(null), null));
});

describe("저장소 상대 경로", () => {
  const win = process.platform === "win32";
  const root = win ? "C:\\work\\lab-wt\\abc" : "/work/lab-wt/abc";

  it("worktree 루트 기준으로 잰다 — C:\\SWM 밖이어도", () => {
    assert.equal(toRepoRelative(path.join(root, "docs", "spec", "x.md"), root), "docs/spec/x.md");
  });
  it("루트 밖은 null", () => {
    assert.equal(toRepoRelative(path.join(root, "..", "other", "x.md"), root), null);
  });
  it("루트 자신은 빈 문자열", () => assert.equal(toRepoRelative(root, root), ""));

  if (win) {
    it("Git Bash 경로(/c/…)와 슬래시 섞인 경로를 받는다", () => {
      assert.equal(
        resolveShellPath("/c/work/lab-wt/abc/docs/spec/x.md", "C:\\", "win32"),
        "C:\\work\\lab-wt\\abc\\docs\\spec\\x.md",
      );
      assert.equal(
        resolveShellPath("docs\\spec\\x.md", root, "win32"),
        "C:\\work\\lab-wt\\abc\\docs\\spec\\x.md",
      );
      assert.equal(
        resolveShellPath("C:/work/lab-wt/abc/ios/a", "D:\\", "win32"),
        "C:\\work\\lab-wt\\abc\\ios\\a",
      );
    });
  }
  it("posix 상대 경로", () => {
    assert.equal(resolveShellPath("../x", "/a/b", "linux"), "/a/x");
  });
});

/* ------------------------------------------------------------- 패치 */

describe("Codex apply_patch", () => {
  const patch = [
    "*** Begin Patch",
    "*** Add File: app/my/new.tsx",
    "+export default function X() {}",
    "*** Update File: src/a.ts",
    "@@",
    "-a",
    "+b",
    "*** Update File: src/old.ts",
    "*** Move to: src/new.ts",
    "*** Delete File: docs/spec/x.md",
    "*** End Patch",
  ].join("\n");

  it("건드리는 경로를 전부 뽑는다", () => {
    assert.deepEqual(parseApplyPatchPaths(patch), [
      "app/my/new.tsx",
      "src/a.ts",
      "src/old.ts",
      "src/new.ts",
      "docs/spec/x.md",
    ]);
  });
  it("쓰인 파일만 — 지운 것 · 옮기기 전 이름은 빠진다", () => {
    assert.deepEqual(parseApplyPatchWrittenPaths(patch), [
      "app/my/new.tsx",
      "src/a.ts",
      "src/new.ts",
    ]);
  });
  it("문자열이 아니면 빈 목록", () => assert.deepEqual(parseApplyPatchPaths(undefined), []));
});

/* ------------------------------------------------------------- 명령 */

const ROOT = process.platform === "win32" ? "C:\\wt" : "/wt";
const ctx = (extra = {}) => ({
  branch: "lab/home-hero",
  cwd: ROOT,
  resolve: (p, cwd) => resolveShellPath(p, cwd),
  relOf: (p, cwd) => {
    const abs = resolveShellPath(p, cwd);
    return abs ? toRepoRelative(abs, ROOT) : null;
  },
  ...extra,
});

describe("명령 — 막는다", () => {
  const denied = [
    ["gh pr merge 12 --merge", {}],
    ["gh pr merge --squash --delete-branch", {}],
    ["gh api -X PUT repos/soma-momentory/momentory-fe/pulls/12/merge", {}],
    ["git push origin main", {}],
    ["git push origin HEAD:main", {}],
    ["git push origin lab/x:main", {}],
    ["git push origin +lab/x:refs/heads/main", {}],
    ["git push --force origin main", {}],
    ["git push -f origin main", {}],
    ["git push --force-with-lease origin main", {}],
    ["git push origin :main", {}],
    ["git push --delete origin main", {}],
    ["git push", { branch: "main" }],
    ["git push -f", { branch: "main" }],
    ["git push origin HEAD", { branch: "main" }],
    ["git push --all origin", {}],
    ["git push --mirror", {}],
    ["git -C ../fe -c color.ui=never push origin main", {}],
    ["git checkout main && git push", {}],
    ["git switch main; git reset --hard origin/main", {}],
    ["git reset --hard HEAD~3", { branch: "main" }],
    ["git clean -fdx", {}],
    ["git clean -xdf .", {}],
    ["git clean -f -d -x", {}],
    ["git clean -fX", {}],
    ["rm -rf node_modules", {}],
    ["rm -rf ./node_modules/", {}],
    ["rm -r -f expo-lab/node_modules", {}],
    ["rm -rf C:/SWM/momentory/momentory/momentory-fe/node_modules", {}],
    ["Remove-Item -Recurse -Force node_modules", {}],
    ["Remove-Item node_modules -Recurse", {}],
    ["rmdir /s /q node_modules", {}],
    ['cmd /c "rmdir /s /q node_modules"', {}],
    ['bash -lc "rm -rf node_modules && npm i"', {}],
    ['powershell -Command "Remove-Item -Rec node_modules"', {}],
    ["echo hi > docs/spec/x.md", {}],
    ["echo hi >> docs/spec/RULES.md", {}],
    ["cat a | tee docs/api/openapi.json", {}],
    ["sed -i 's/a/b/' docs/spec/RULES.md", {}],
    ["cp /tmp/x.json docs/api/openapi.json", {}],
    ["mv docs/spec/RULES.md /tmp/", {}],
    ["rm docs/spec/screens/C2.md", {}],
    ["git rm -r docs/spec", {}],
    ["cd docs/spec && rm RULES.md", {}],
    ["Set-Content -Path docs/spec/x.md -Value hi", {}],
    ["Out-File -FilePath .env -InputObject KEY=1", {}],
    ['echo "KAKAO_KEY=abc" >> .env', {}],
    ["echo x > ios/Podfile", {}],
    ["touch harness/runs/a.json", {}],
    ["node -e \"require('fs').writeFileSync('docs/spec/x.md','')\"", {}],
    ["MOMENTORY_GUARD=0 git push origin main", {}],
    ["echo > .claude/settings.json", { labRun: true }],
  ];
  for (const [command, extra] of denied) {
    it(command + (extra.branch ? `  (브랜치 ${extra.branch})` : ""), () => {
      assert.ok(checkCommand(command, ctx(extra)), command);
    });
  }
});

describe("명령 — 막지 않는다", () => {
  const allowed = [
    ["git push -u origin lab/xyz", {}],
    ["git push origin lab/xyz", {}],
    ["git push --force-with-lease origin lab/xyz", {}],
    ["git push -f origin feat/expo-lab-all-screens", {}],
    ["git push", {}],
    ["git push origin HEAD", {}],
    ["git push --tags", {}],
    ["gh pr create --title t --body b", {}],
    ["gh pr view 12 --json state", {}],
    ["gh pr checks", {}],
    ["npm run sync:api", {}],
    ["npm run lab:routes", {}],
    ["npx expo prebuild --clean", {}],
    ["git reset --hard origin/main", {}],
    ["git reset --hard feat/expo-lab-all-screens", {}],
    ["git reset --soft HEAD~1", { branch: "main" }],
    ["git fetch origin main", { branch: "main" }],
    ["git pull origin main", {}],
    ["git merge origin/main", {}],
    ["git checkout main -- docs/spec/RULES.md", {}],
    ["git diff main -- docs/spec", {}],
    ["git log main", {}],
    ["git clean -fd", {}],
    ["git clean -fdx expo-lab/dist-web", {}],
    ["git clean -n -x", {}],
    ["rm -rf dist .expo", {}],
    ["rm -rf expo-lab/dist-web", {}],
    ["cmd //c rmdir node_modules", {}],
    ["cmd /c rmdir node_modules", {}],
    ["rmdir node_modules", {}],
    ["ls node_modules/.bin", {}],
    ["cat docs/spec/RULES.md", {}],
    ["grep -rn foo docs/spec", {}],
    ["sed -n 1,20p docs/spec/RULES.md", {}],
    ["cp docs/spec/RULES.md /tmp/rules.md", {}],
    ["cat .env", {}],
    ["echo KEY= >> .env.example", {}],
    ["node node_modules/jest/bin/jest.js src/design/ds 2>&1 | tail -5", {}],
    ["npm test > /tmp/out.txt 2>&1", {}],
    ["Get-Content docs/spec/RULES.md | Select-Object -First 5", {}],
    ["echo hi > NUL", {}],
    ["npm run typecheck && npm run lint", {}],
    ["echo > .claude/settings.json", {}],
    ["", {}],
  ];
  for (const [command, extra] of allowed) {
    it(command || "(빈 명령)", () => {
      assert.equal(checkCommand(command, ctx(extra)), null, command);
    });
  }
});

describe("토큰화", () => {
  it("따옴표 · 구분자 · 리다이렉트", () => {
    const cmds = splitCommands(`echo "a && b" > 'x y.txt' && git push 2>&1 | tail`);
    assert.deepEqual(
      cmds.map((c) => c.argv),
      [["echo", "a && b"], ["git", "push"], ["tail"]],
    );
    assert.deepEqual(cmds[0].redirects, [{ op: ">", target: "x y.txt" }]);
    assert.deepEqual(cmds[1].redirects, [{ op: "2>", target: "&1" }]);
  });
  it("Windows 경로의 백슬래시를 지키지 않는다고 망가뜨리지 않는다", () => {
    assert.deepEqual(splitCommands("type C:\\SWM\\a.txt")[0].argv, ["type", "C:\\SWM\\a.txt"]);
  });
});

/* -------------------------------------------------------- 편집 뒤 대상 */

describe("편집 뒤 검사 대상", () => {
  it("prettier 확장자", () => {
    for (const rel of ["a.ts", "app/x.tsx", "s.mjs", "p.json", "docs/A.md", ".github/w.yml"]) {
      assert.ok(isPrettierTarget(rel), rel);
    }
    for (const rel of ["a.png", "a.py", "node_modules/x/a.js", "Podfile"]) {
      assert.ok(!isPrettierTarget(rel), rel);
    }
  });
  it("디자인 토큰", () => {
    assert.ok(isDesignToken("src/design/ds/color.ts"));
    assert.ok(!isDesignToken("src/design/studioApproved.json"));
  });
  it("라우트 주소 — gen-routes.mjs 와 같은 규칙", () => {
    assert.equal(routeOf("app/index.tsx"), "/");
    assert.equal(routeOf("app/(tabs)/home.tsx"), "/home");
    assert.equal(routeOf("app/my/new-thing.tsx"), "/my/new-thing");
    assert.equal(routeOf("app/diary/[id]/index.tsx"), "/diary/[id]");
    assert.equal(routeOf("app/rest/cards/index.tsx"), "/rest/cards");
    assert.equal(routeOf("app/(tabs)/_layout.tsx"), null);
    assert.equal(routeOf("app/__tests__/home.test.tsx"), null);
    assert.equal(routeOf("app/+not-found.tsx"), null);
    assert.equal(routeOf("app/my/README.md"), null);
    assert.equal(routeOf("src/app/x.tsx"), null);
  });
});
