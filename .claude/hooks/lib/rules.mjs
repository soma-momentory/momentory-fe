/**
 * 저장소 규칙 훅의 **판정 로직** — 순수 함수만 둔다(파일·프로세스를 건드리지 않는다).
 *
 * Claude Code(`.claude/settings.json`)와 Codex(`.codex/hooks.json`)가 같은 진입점
 * (`guard.mjs` · `post-edit.mjs`)을 부르고, 그 진입점이 여기를 쓴다. 규칙이 둘로
 * 갈라지지 않게 판정은 이 파일 하나에만 있다 — 테스트: `node --test .claude/hooks/__tests__`.
 *
 * 규칙의 **정본은 여기가 아니다** — `CLAUDE.md` 「생성물·반입물」과
 * `docs/CONTRIBUTING.md` 「생성물」·「PR · 리뷰 · 머지」를 기계로 옮긴 것이다.
 * 판정을 고치면 그 문서와 `.claude/hooks/README.md` 「저장소 규칙 훅」 표도 함께 고친다.
 *
 * 이 훅은 **가드레일**이다 — 셸 명령은 어림 해석이라 마음먹고 돌아가는 길을 다 막지는 못한다.
 * 대신 평소 작업(읽기 · `git push -u origin lab/…` · `gh pr create` · `npm run sync:api`)은
 * 절대 막지 않는 쪽으로 기운다.
 */

import path from "node:path";

/* ------------------------------------------------------------ 경로 규칙 */

const SOURCE_CLAUDE = "CLAUDE.md 「생성물·반입물」";
const SOURCE_CONTRIBUTING = "docs/CONTRIBUTING.md 「생성물 — 직접 수정 금지 파일」";

/**
 * 손으로 고치면 안 되는 자리. `rel` 은 저장소 루트 기준 posix 경로다.
 * `labOnly` 는 Lab 무인 실행(`MOMENTORY_LAB_RUN=1`)에서만 켜진다.
 */
export const PROTECTED_PATHS = [
  {
    id: "spec",
    test: (rel) => /^docs\/spec(\/|$)/i.test(rel),
    reason:
      "docs/spec/** 은 동결 스냅샷이다 — 직접 고치지 않는다. 스펙과 어긋나야 하면 docs/PRODUCT.md 「상류와 차이」에 기록하고, 새 규칙·문안은 docs/DESIGN.md 에 적는다. " +
      `(${SOURCE_CLAUDE} · ${SOURCE_CONTRIBUTING})`,
  },
  {
    id: "openapi",
    test: (rel) => /^docs\/api\/openapi\.json$/i.test(rel),
    reason:
      "docs/api/openapi.json 은 서버에서 받은 반입 스냅샷이다 — `npm run sync:api` 로만 갱신한다(docs/api/README.md). " +
      `(${SOURCE_CONTRIBUTING})`,
  },
  {
    id: "native",
    test: (rel) => /^(ios|android)(\/|$)/i.test(rel),
    reason:
      "ios/ · android/ 는 생성물이다 — app.config.ts 나 config plugin(plugins/)을 고치고 `npx expo prebuild --clean` 으로 다시 만든다. " +
      `(${SOURCE_CLAUDE} · ${SOURCE_CONTRIBUTING})`,
  },
  {
    id: "env",
    // `.env.example` 은 공유하는 견본이라 고쳐도 된다(.gitignore 의 `!.env.example`).
    test: (rel) => /(^|\/)\.env(\..+)?$/i.test(rel) && !/(^|\/)\.env\.example$/i.test(rel),
    reason:
      ".env · .env.* 는 기기별 시크릿 자리다 — 에이전트가 쓰지 않는다. 새 키가 필요하면 .env.example 에 이름만 더하고 값은 사람이 넣는다. " +
      "(docs/CONTRIBUTING.md 「값을 다루는 세 등급」)",
  },
  {
    id: "harness-runs",
    test: (rel) => /^harness\/(runs|parallel-runs)(\/|$)/i.test(rel),
    reason:
      "harness/runs/** · harness/parallel-runs/** 는 하네스가 남기는 실행 기록이다 — 손으로 쓰지 않는다. (harness/README.md)",
  },
  {
    id: "agent-config",
    labOnly: true,
    test: (rel) =>
      /^\.claude\/(settings\.json|hooks(\/|$))/i.test(rel) || /^\.codex(\/|$)/i.test(rel),
    reason:
      "Lab 무인 실행(MOMENTORY_LAB_RUN=1)에서는 에이전트 훅·설정(.claude/settings.json · .claude/hooks/** · .codex/**)을 고치지 않는다 — 규칙을 지키는 장치를 스스로 끄는 길이라서다. 필요하면 보고에 적고 사람이 고친다.",
  },
];

/** 저장소 루트 기준 posix 상대 경로. 루트 밖이면 `null`. */
export function toRepoRelative(absPath, root) {
  if (!absPath || !root) return null;
  const rel = path.relative(root, absPath);
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return rel === "" ? "" : null;
  return rel.split(path.sep).join("/").replace(/\\/g, "/");
}

/** 보호 경로 판정. 막아야 하면 규칙 하나를, 아니면 `null` 을 돌려준다. */
export function checkProtectedPath(rel, { labRun = false } = {}) {
  if (rel == null) return null;
  const normalized = rel.replace(/\\/g, "/").replace(/^\.\//, "");
  for (const rule of PROTECTED_PATHS) {
    if (rule.labOnly && !labRun) continue;
    if (rule.test(normalized)) return rule;
  }
  return null;
}

/**
 * 셸이 넘겨준 경로를 이 기계의 절대 경로로 바꾼다.
 * Git Bash 의 `/c/Users/…` 와 `C:/…` · `C:\…` 를 모두 받는다.
 */
export function resolveShellPath(p, cwd, platform = process.platform) {
  if (!p) return null;
  let value = String(p).trim();
  if (!value) return null;
  const impl = platform === "win32" ? path.win32 : path.posix;
  if (platform === "win32") {
    const drive = /^\/([a-zA-Z])(\/|$)/.exec(value);
    if (drive) value = `${drive[1].toUpperCase()}:/${value.slice(3)}`;
    if (/^~[\\/]/.test(value) || value === "~") return null; // 홈 — 저장소 밖
  }
  return impl.resolve(cwd, value);
}

/* --------------------------------------------------- Codex apply_patch */

/** `*** Add File: x` 같은 줄에서 건드리는 파일 경로를 뽑는다(이동 대상 포함). */
export function parseApplyPatchPaths(patch) {
  if (typeof patch !== "string") return [];
  const out = [];
  const re = /^\*\*\* (?:Add File|Update File|Delete File|Move to):\s*(.+?)\s*$/gm;
  let m;
  while ((m = re.exec(patch))) out.push(m[1]);
  return [...new Set(out)];
}

/** 패치 중 「지우기」만이 아닌 경로 — 포맷 대상 */
export function parseApplyPatchWrittenPaths(patch) {
  if (typeof patch !== "string") return [];
  const out = [];
  const re = /^\*\*\* (?:Add File|Update File|Move to):\s*(.+?)\s*$/gm;
  let m;
  while ((m = re.exec(patch))) out.push(m[1]);
  // Update 뒤에 Move to 가 오면 원래 이름은 더 없다
  const moved = new Set();
  const moveRe = /^\*\*\* Update File:\s*(.+?)\s*\n\*\*\* Move to:\s*(.+?)\s*$/gm;
  while ((m = moveRe.exec(patch))) moved.add(m[1]);
  return [...new Set(out.filter((p) => !moved.has(p)))];
}

/* ------------------------------------------------------- 셸 명령 해석 */

/**
 * 셸 명령을 어림으로 토큰화한다 — 따옴표 · 구분자(`&& || ; | & 줄바꿈`) · 리다이렉트(`>` `>>`).
 * bash 와 PowerShell 을 함께 받는 것이 목적이라 백슬래시는 **따옴표·공백 앞에서만** 이스케이프로 본다
 * (`C:\SWM\…` 을 망가뜨리지 않으려고).
 */
export function tokenize(command) {
  const tokens = [];
  let cur = "";
  let has = false;
  let quote = null;
  const push = () => {
    if (has) tokens.push({ type: "word", value: cur });
    cur = "";
    has = false;
  };
  const text = String(command ?? "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === quote) quote = null;
      else if (c === "\\" && quote === '"' && (text[i + 1] === '"' || text[i + 1] === "\\")) {
        cur += text[++i];
      } else cur += c;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      has = true;
      continue;
    }
    if (c === "\\" && i + 1 < text.length && /[\s"'\\]/.test(text[i + 1])) {
      if (text[i + 1] === "\n") {
        i++;
        continue;
      }
      cur += text[++i];
      has = true;
      continue;
    }
    if (c === "\n" || c === ";") {
      push();
      tokens.push({ type: "sep", value: c });
      continue;
    }
    if (c === "&" || c === "|") {
      const two = text.slice(i, i + 2);
      if (two === "&&" || two === "||") {
        push();
        tokens.push({ type: "sep", value: two });
        i++;
        continue;
      }
      if (c === "&" && text[i + 1] === ">") {
        push();
        const op = text[i + 2] === ">" ? "&>>" : "&>";
        tokens.push({ type: "redir", value: op });
        i += op.length - 1;
        continue;
      }
      if (c === "&" && !has && tokens.at(-1)?.type === "redir") {
        cur += c; // `2>&1` 의 `&1`
        has = true;
        continue;
      }
      push();
      tokens.push({ type: "sep", value: c });
      continue;
    }
    if (c === ">") {
      // 앞에 붙은 fd 숫자(`2>`)는 리다이렉트의 일부다
      let fd = "";
      if (has && /^\d+$/.test(cur)) {
        fd = cur;
        cur = "";
        has = false;
      } else push();
      let op = ">";
      if (text[i + 1] === ">") {
        op = ">>";
        i++;
      } else if (text[i + 1] === "|") {
        op = ">|";
        i++;
      }
      tokens.push({ type: "redir", value: fd + op });
      continue;
    }
    if (/\s/.test(c)) {
      push();
      continue;
    }
    cur += c;
    has = true;
  }
  push();
  return tokens;
}

/** 토큰을 단순 명령 단위로 나눈다 — `{ argv, redirects }` 의 배열 */
export function splitCommands(command) {
  const out = [];
  let argv = [];
  let redirects = [];
  const flush = () => {
    if (argv.length || redirects.length) out.push({ argv, redirects });
    argv = [];
    redirects = [];
  };
  const tokens = tokenize(command);
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "sep") {
      flush();
      continue;
    }
    if (t.type === "redir") {
      const target = tokens[i + 1]?.type === "word" ? tokens[++i].value : null;
      if (target != null) redirects.push({ op: t.value, target });
      continue;
    }
    argv.push(t.value);
  }
  flush();
  return out;
}

const base = (word) =>
  String(word ?? "")
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    .replace(/\.(exe|cmd|bat|ps1)$/i, "")
    .toLowerCase();

/** `env X=1` · `sudo` · `command` · `X=1` 같은 앞머리를 걷어낸다 */
function stripPrefixes(argv) {
  let i = 0;
  while (i < argv.length) {
    const w = argv[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(w)) {
      i++;
      continue;
    }
    const b = base(w);
    if (b === "env") {
      i++;
      while (i < argv.length && (/^-/.test(argv[i]) || /^[A-Za-z_][A-Za-z0-9_]*=/.test(argv[i])))
        i++;
      continue;
    }
    if (["sudo", "command", "exec", "nohup", "time", "&", "."].includes(b)) {
      i++;
      continue;
    }
    break;
  }
  return argv.slice(i);
}

/** `bash -c "…"` · `cmd /c …` · `powershell -Command …` 안쪽 명령 문자열 */
function nestedScript(argv) {
  const b = base(argv[0]);
  if (["bash", "sh", "zsh", "dash"].includes(b)) {
    for (let i = 1; i < argv.length; i++) {
      if (/^-[a-z]*c[a-z]*$/i.test(argv[i])) return argv[i + 1] ?? null;
      if (!argv[i].startsWith("-")) return null;
    }
    return null;
  }
  if (b === "cmd") {
    const i = argv.findIndex((w, k) => k > 0 && /^\/{1,2}[ck]$/i.test(w));
    return i > 0 ? argv.slice(i + 1).join(" ") : null;
  }
  if (b === "powershell" || b === "pwsh") {
    const i = argv.findIndex((w, k) => k > 0 && /^-(c|command)$/i.test(w));
    return i > 0 ? argv.slice(i + 1).join(" ") : null;
  }
  return null;
}

const GIT_OPTS_WITH_VALUE = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace"]);

/** `git -C x -c k=v push …` → `{ sub: "push", args: [...], dir }` */
function parseGit(argv) {
  let i = 1;
  let dir = null;
  while (i < argv.length && argv[i].startsWith("-")) {
    const w = argv[i];
    if (GIT_OPTS_WITH_VALUE.has(w)) {
      if (w === "-C") dir = argv[i + 1] ?? null;
      i += 2;
      continue;
    }
    i++;
  }
  return { sub: argv[i] ?? null, args: argv.slice(i + 1), dir };
}

const MAIN = "main";
const isMainRef = (ref) => /^(refs\/heads\/)?main$/i.test(String(ref ?? "").replace(/^\+/, ""));

const PUSH_OPTS_WITH_VALUE = new Set(["-o", "--push-option", "--repo", "--receive-pack", "--exec"]);

function checkGitPush(args, branch) {
  const positional = [];
  let force = false;
  for (let i = 0; i < args.length; i++) {
    const w = args[i];
    if (PUSH_OPTS_WITH_VALUE.has(w)) {
      i++;
      continue;
    }
    if (w === "--all" || w === "--mirror" || w === "--branches") {
      return `git push ${w} 는 main 까지 밀어 넣는다`;
    }
    if (/^--force(-with-lease|-if-includes)?(=|$)/.test(w) || /^-[a-zA-Z]*f/.test(w)) force = true;
    if (w.startsWith("-")) continue;
    positional.push(w);
  }
  const refspecs = positional.slice(1);
  const targets = refspecs.length
    ? refspecs.map((spec) => {
        if (spec.startsWith("+")) force = true;
        const s = spec.replace(/^\+/, "");
        const dst = s.includes(":") ? s.slice(s.lastIndexOf(":") + 1) : s;
        return /^HEAD$/i.test(dst) ? branch : dst;
      })
    : [branch];
  if (targets.some(isMainRef)) {
    return force ? "main 에 강제로 push 한다" : "main 에 바로 push 한다";
  }
  return null;
}

function checkGitClean(args) {
  let force = false;
  let ignored = false;
  const paths = [];
  let afterDashDash = false;
  for (let i = 0; i < args.length; i++) {
    const w = args[i];
    if (afterDashDash) {
      paths.push(w);
      continue;
    }
    if (w === "--") {
      afterDashDash = true;
      continue;
    }
    if (w === "-e" || w === "--exclude") {
      i++;
      continue;
    }
    if (w === "--force") force = true;
    else if (/^-[a-zA-Z]+$/.test(w)) {
      if (w.includes("f")) force = true;
      if (/[xX]/.test(w)) ignored = true;
    } else if (!w.startsWith("-")) paths.push(w);
  }
  if (!force || !ignored) return null;
  const wholeTree = paths.length === 0 || paths.some((p) => /^(\.\/?|:\/?|\*|:\/\.?)$/.test(p));
  return wholeTree
    ? "git clean -x 가 무시된 파일까지 통째로 지운다 — node_modules 연결(junction)·.env 가 함께 사라진다"
    : null;
}

const hasRecursiveFlag = (args) =>
  args.some((w) => /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(w) || w === "--recursive");

const touchesNodeModules = (p) => /(^|[\\/])node_modules([\\/]|$)/i.test(p);

/** PowerShell 매개변수 이름 접두(`-Rec` → `-Recurse`) */
const psFlag = (args, name) =>
  args.some((w) => {
    const m = /^-([a-z]+)$/i.exec(w);
    return m && m[1].length >= 1 && name.toLowerCase().startsWith(m[1].toLowerCase());
  });

const PS_REMOVE = new Set(["remove-item", "ri", "del", "erase", "rd", "rmdir", "rm"]);

function checkRemoveNodeModules(argv) {
  const b = base(argv[0]);
  const args = argv.slice(1);
  const targets = args.filter((w) => !w.startsWith("-") && !/^\/[a-z]$/i.test(w));
  if (!targets.some(touchesNodeModules)) return null;
  const msg =
    "node_modules 를 통째로 지우려 한다 — worktree 의 node_modules 는 본 저장소로 이어진 연결(junction)이라 본 저장소 의존성이 함께 사라진다. 연결만 끊으려면 `cmd //c rmdir node_modules`(PowerShell: `cmd /c rmdir node_modules`) — /s 없이";
  if (b === "rm" && hasRecursiveFlag(args)) return msg;
  if ((b === "rmdir" || b === "rd") && args.some((w) => /^\/s$/i.test(w))) return msg;
  if (PS_REMOVE.has(b) && psFlag(args, "Recurse")) return msg;
  return null;
}

/* 파일을 쓰거나 지우는 명령 — 인자 중 보호 경로가 있으면 막는다 */
const WRITERS_ANY_ARG = new Set([
  "rm",
  "rmdir",
  "rd",
  "del",
  "erase",
  "unlink",
  "mv",
  "move",
  "tee",
  "touch",
  "truncate",
  "shred",
  "ln",
  "install",
  "set-content",
  "add-content",
  "out-file",
  "clear-content",
  "new-item",
  "ni",
  "remove-item",
  "ri",
  "move-item",
  "mi",
  "rename-item",
  "rni",
  "sc",
  "ac",
]);
const WRITERS_LAST_ARG = new Set(["cp", "copy", "copy-item", "cpi", "xcopy", "robocopy"]);

/** 셸 명령 하나가 건드리려는 **쓰기 대상 경로** 후보 */
export function writeTargets(argv, redirects) {
  const targets = redirects
    .filter((r) => !/^&\d*$/.test(r.target) && !/^(\/dev\/null|nul|\$null)$/i.test(r.target))
    .map((r) => r.target);
  if (!argv.length) return targets;
  const b = base(argv[0]);
  const args = argv.slice(1);
  const words = args.filter((w) => !w.startsWith("-"));
  if (WRITERS_ANY_ARG.has(b)) targets.push(...words);
  else if (WRITERS_LAST_ARG.has(b) && words.length) targets.push(words.at(-1));
  else if (b === "sed" || b === "perl") {
    if (args.some((w) => /^-[a-zA-Z]*i/.test(w) || w.startsWith("--in-place")))
      targets.push(...words);
  } else if (b === "dd") {
    for (const w of args) if (w.startsWith("of=")) targets.push(w.slice(3));
  } else if (b === "git") {
    const g = parseGit(argv);
    if (g.sub === "rm" || g.sub === "mv") targets.push(...g.args.filter((w) => !w.startsWith("-")));
  } else if (b === "node" || b === "python" || b === "python3" || b === "py") {
    const code = args.join(" ");
    if (/writeFile|appendFile|rmSync|unlink|renameSync|open\([^)]*['"][wa]/.test(code)) {
      for (const m of code.matchAll(/["'`]([^"'`]+)["'`]/g)) targets.push(m[1]);
    }
  }
  return targets;
}

/**
 * Bash · PowerShell 명령 판정.
 *
 * @param {string} command
 * @param {object} ctx
 * @param {string|null} ctx.branch      시작 시점 현재 브랜치(모르면 null)
 * @param {(p: string, cwd: string) => string|null} [ctx.relOf]  셸 경로 → 저장소 상대 경로
 * @param {string} [ctx.cwd]
 * @param {boolean} [ctx.labRun]
 * @returns {{ reason: string } | null}
 */
export function checkCommand(command, ctx = {}, depth = 0) {
  if (depth > 3) return null;
  let branch = ctx.branch ?? null;
  let cwd = ctx.cwd ?? null;
  for (const { argv: rawArgv, redirects } of splitCommands(command)) {
    const argv = stripPrefixes(rawArgv);

    const nested = argv.length ? nestedScript(argv) : null;
    if (nested) {
      const hit = checkCommand(nested, { ...ctx, branch, cwd }, depth + 1);
      if (hit) return hit;
    }

    const b = argv.length ? base(argv[0]) : "";

    // cd 를 따라간다 — `cd docs/spec && rm x` 를 놓치지 않으려고
    if ((b === "cd" || b === "set-location" || b === "pushd" || b === "sl") && argv[1] && cwd) {
      cwd = ctx.resolve ? (ctx.resolve(argv[1], cwd) ?? cwd) : cwd;
    }

    if (b === "gh") {
      const words = argv.slice(1).filter((w) => !w.startsWith("-"));
      if (words[0] === "pr" && words[1] === "merge") {
        return {
          reason:
            "gh pr merge 는 막혀 있다 — 머지는 사람이 결과를 보고 승인한 뒤에만 한다. PR 을 올리고 멈춘다. (expo-lab/HANDOFF.md 「AI 의 절차」 8 · docs/CONTRIBUTING.md 「PR · 리뷰 · 머지」)",
        };
      }
      if (words[0] === "api" && argv.some((w) => /\/pulls\/\d+\/merge\b/.test(w))) {
        return { reason: "gh api 로 PR 을 머지하려 한다 — 머지는 사람이 승인한 뒤에만 한다." };
      }
    }

    if (b === "git") {
      const g = parseGit(argv);
      if (g.sub === "checkout" || g.sub === "switch") {
        const pos = g.args.filter((w) => !w.startsWith("-"));
        const created = g.args.findIndex((w) => /^-[bBcC]$/.test(w));
        if (created >= 0 && g.args[created + 1]) branch = g.args[created + 1];
        else if (pos.length === 1 && !g.args.includes("--")) branch = pos[0];
      }
      if (g.sub === "push") {
        const why = checkGitPush(g.args, branch);
        if (why) {
          return {
            reason: `${why} — main 에는 PR 머지로만 들어간다. 작업 브랜치(lab/… · feat/…)로 push 하고 PR 을 올린다. (docs/CONTRIBUTING.md 「브랜치」·「PR · 리뷰 · 머지」)`,
          };
        }
      }
      if (g.sub === "reset" && g.args.includes("--hard") && isMainRef(branch)) {
        return {
          reason:
            "main 에서 git reset --hard 를 하려 한다 — main 의 작업과 이력을 덮는다. 작업 브랜치에서 한다.",
        };
      }
      if (g.sub === "clean") {
        const why = checkGitClean(g.args);
        if (why) {
          return {
            reason: `${why}. 지울 경로를 지정하거나 -x 없이 돌린다(git clean -fd <경로>).`,
          };
        }
      }
    }

    const rm = argv.length ? checkRemoveNodeModules(argv) : null;
    if (rm) return { reason: rm };

    if (ctx.relOf && cwd) {
      for (const target of writeTargets(argv, redirects)) {
        const rel = ctx.relOf(target, cwd);
        const rule = checkProtectedPath(rel, { labRun: ctx.labRun });
        if (rule) return { reason: `${rel} 에 쓰려 한다 — ${rule.reason}`, rule: rule.id };
      }
    }
  }
  return null;
}

/** 브랜치를 알아야 판정할 수 있는 명령인가 — git 을 부르는 비용을 아끼려고 */
export function needsBranch(command) {
  return /\bgit\b[\s\S]*\b(push|reset)\b/.test(String(command ?? ""));
}

export { MAIN };

/* --------------------------------------------------- 편집 뒤 검사 대상 */

const PRETTIER_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml)$/i;

/** prettier 로 다듬을 파일인가 — `.prettierignore` 판정은 prettier 가 직접 한다 */
export function isPrettierTarget(rel) {
  if (rel == null || !PRETTIER_EXT.test(rel)) return false;
  if (/(^|\/)node_modules\//.test(rel)) return false;
  return true;
}

/** 대비 테스트를 돌릴 파일인가 */
export function isDesignToken(rel) {
  return rel != null && /^src\/design\/ds\//.test(rel);
}

/**
 * `app/` 아래 화면 파일이면 그 expo-router 주소, 아니면 `null`.
 * `expo-lab/scripts/gen-routes.mjs` 의 `scanRoutes` 와 같은 규칙이다.
 */
export function routeOf(rel) {
  if (rel == null || !rel.startsWith("app/")) return null;
  const segments = rel.slice("app/".length).split("/");
  const file = segments.at(-1) ?? "";
  if (!/\.tsx?$/.test(file) || file.startsWith("_layout.")) return null;
  if (segments.some((s) => s === "__tests__" || s.startsWith("+"))) return null;
  const parts = rel
    .slice("app/".length)
    .replace(/\.tsx?$/, "")
    .split("/");
  const visible = parts.filter((s) => !/^\(.+\)$/.test(s));
  if (visible.at(-1) === "index") visible.pop();
  return `/${visible.join("/")}`;
}

/* ----------------------------------------------------------- 환경 */

export const isOff = (v) => v != null && /^(0|off|false|no)$/i.test(String(v).trim());
export const isOn = (v) => v != null && /^(1|on|true|yes)$/i.test(String(v).trim());
