// @ts-check
/**
 * 작업 공간 = git worktree. 「AI에게 수정 맡기기」를 그 화면에서(또는 새 화면 하나에 대해) **처음 보낼 때**
 * 하나 만들고, 같은 대상의 지시는 그 작업 공간을 이어 쓴다. 사용자의 작업 트리는 건드리지 않는다.
 *
 * 자리: 저장소 **바깥** 형제 폴더 `<저장소의 부모>/<저장소 이름>-lab-ws/<id>`.
 * 저장소 안에 두면 lint · prettier · jest 가 그 사본까지 훑는다(실제로 그랬다).
 * 같은 폴더에 `registry.json`(작업 공간 목록) · `.logs/`(실행 기록) · `.tmp/`(커밋 메시지 · PR 본문)가 산다.
 * 첨부 그림 · 시안 파일은 작업 공간 **안** `.lab-attachments/<실행>/` 에 쓰고 `info/exclude` 로 git 에서 뺀다.
 *
 * node_modules 는 원본으로 **junction** 을 건다(새로 설치하지 않는다). 그래서 지울 때가 위험하다 —
 * junction 을 따라 들어가 지우면 **원본 node_modules 가 날아간다.** 버릴 때는 반드시
 * ① junction 을 `cmd /c rmdir` 로 먼저 끊고(따라가지 않는다) ② 끊긴 것을 확인한 뒤에야
 * ③ `git worktree remove --force` 를 부른다. 어느 단계든 실패하면 멈추고 사람에게 남긴다.
 */
const fs = require("node:fs");
const path = require("node:path");
const { Buffer } = require("node:buffer");

const { IS_WIN, git, run } = require("./proc");
const { branchName, routeSlug, routesFromAppFiles } = require("./prompt");

/** @typedef {import("./prompt").Target} Target */
/** @typedef {import("./prompt").AttachmentFile} AttachmentFile */

/**
 * @typedef {{
 *   id: string; kind: "edit" | "new-screen"; key: string;
 *   route: string | null; title: string; file: string; specId: string | null;
 *   slug: string | null; section: string | null; description: string | null;
 *   path: string; branch: string; baseBranch: string; baseSha: string; createdAt: string;
 *   session: { agent: "claude" | "codex"; id: string } | null;
 *   runCount: number; lastSummary: string | null;
 *   blocks: { commitMessage: string | null; prBody: string | null };
 *   pr: { number: number | null; url: string } | null;
 *   broken?: string | null;
 * }} WorkspaceMeta
 */

const ATTACH_DIR = ".lab-attachments";

/**
 * 작업 공간을 어디서 갈라 낼지 · 검토 요청(PR)의 기본 대상 — **여기 하나만 고치면 된다**(2026-11-02 사용자 결정: main).
 * 실행할 때 `MOMENTORY_LAB_BASE=<브랜치>` 로 덮어쓸 수 있다.
 */
const BASE_BRANCH = process.env.MOMENTORY_LAB_BASE || "main";

/** 작업 공간 하나를 가리키는 열쇠 — 화면 수정은 라우트, 새 화면은 slug. @param {Target} target */
const targetKey = (target) => (target.kind === "new-screen" ? `new:${target.slug}` : target.route);

const IMAGE_TYPES = /** @type {Record<string, string>} */ ({
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
});

/** `data:image/...;base64,...` → { ext, bytes } @param {unknown} dataUrl */
function decodeImage(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const m = /^data:image\/(png|jpeg|jpg|webp|gif|svg\+xml);base64,(.*)$/s.exec(dataUrl);
  if (!m) return null;
  const type = m[1] ?? "png";
  const ext = type === "jpeg" ? "jpg" : type === "svg+xml" ? "svg" : type;
  return { ext, bytes: Buffer.from(m[2] ?? "", "base64") };
}

/** 원본 이름을 살리되 경로 · 예약 문자를 지운다. @param {unknown} name @param {string} ext */
function safeFileName(name, ext) {
  let base = String(name ?? "")
    .replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "_")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 100);
  if (!base) base = "image";
  if (!/\.(png|jpe?g|webp|gif|svg)$/i.test(base)) base = `${base}.${ext}`;
  return base;
}

/** @param {string} repoRoot */
const defaultWsRoot = (repoRoot) =>
  path.join(path.dirname(repoRoot), `${path.basename(repoRoot)}-lab-ws`);

/** child 가 parent 안(같지 않게)에 있는가. @param {string} parent @param {string} child */
function isInside(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel);
}

/** @param {string} p */
function lstatOrNull(p) {
  try {
    return fs.lstatSync(p);
  } catch {
    return null;
  }
}

/**
 * junction(또는 심볼릭 링크)을 **따라가지 않고** 끊는다. 링크가 아니면 손대지 않는다.
 * @param {string} linkPath
 * @returns {Promise<{ ok: true; removed: boolean } | { ok: false; message: string }>}
 */
async function unlinkJunction(linkPath) {
  const stat = lstatOrNull(linkPath);
  if (!stat) return { ok: true, removed: false };
  if (!stat.isSymbolicLink()) {
    if (!stat.isDirectory()) return { ok: true, removed: false };
    // lstat 이 재분석 지점을 링크로 못 알아보는 경우 — 실제 경로가 다르면 손대지 않고 사람에게 남긴다
    let real = path.resolve(linkPath);
    try {
      real = fs.realpathSync.native(linkPath);
    } catch {
      /* 그대로 */
    }
    if (real.toLowerCase() !== path.resolve(linkPath).toLowerCase())
      return { ok: false, message: `${linkPath} 가 링크인지 확실하지 않아 손대지 않았어요` };
    return { ok: true, removed: false }; // 작업 공간 자신의 진짜 폴더 — worktree 와 함께 지워져도 된다
  }
  if (IS_WIN) {
    // rmdir(/s 없이)은 링크만 지운다 — 링크가 아니어도 비지 않은 폴더는 지우지 못해서 안전하다
    const result = await run(process.env.ComSpec || "cmd.exe", ["/d", "/c", "rmdir", linkPath], {
      timeoutMs: 15_000,
    });
    if (result.code !== 0)
      return {
        ok: false,
        message: `연결 폴더를 끊지 못했어요: ${result.stderr.trim() || result.stdout.trim()}`,
      };
  } else {
    try {
      fs.unlinkSync(linkPath);
    } catch (error) {
      return { ok: false, message: `연결 폴더를 끊지 못했어요: ${String(error)}` };
    }
  }
  if (lstatOrNull(linkPath)) return { ok: false, message: `${linkPath} 가 아직 남아 있어요` };
  return { ok: true, removed: true };
}

/** `git status --porcelain` → [{ status, path }] @param {string} text */
function parsePorcelain(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => l.length > 3)
    .map((l) => {
      const status = l.slice(0, 2).trim() || "?";
      let file = l.slice(3);
      const arrow = file.indexOf(" -> ");
      if (arrow >= 0) file = file.slice(arrow + 4);
      return { status, path: file.replace(/^"|"$/g, "") };
    });
}

class WorkspaceStore {
  /**
   * @param {{ repoRoot: string; wsRoot?: string; nodeModules?: string | null; baseBranch?: string }} opts
   *   nodeModules: junction 대상. 기본은 저장소의 node_modules(실제 경로). null 이면 걸지 않는다(테스트).
   *   baseBranch: 작업 공간의 출발점 · PR 기본 대상. 기본 `BASE_BRANCH`.
   */
  constructor(opts) {
    this.baseBranch = opts.baseBranch ?? BASE_BRANCH;
    this.repoRoot = path.resolve(opts.repoRoot);
    this.wsRoot = path.resolve(opts.wsRoot ?? defaultWsRoot(this.repoRoot));
    this.nodeModules =
      opts.nodeModules === undefined ? path.join(this.repoRoot, "node_modules") : opts.nodeModules;
    /** @type {Map<string, Promise<WorkspaceMeta>>} */
    this.creating = new Map();
  }

  /**
   * 작업 공간의 출발점 — 지금 브랜치가 무엇이든 **기준 브랜치**(기본 main)의 최신이다.
   * `origin/<기준>` 을 한 번 받아 보고(네트워크가 없으면 넘어간다) 있으면 그것, 없으면 로컬 `<기준>`.
   * @returns {Promise<{ sha: string; ref: string }>}
   */
  async resolveBase() {
    const name = this.baseBranch;
    await git(
      this.repoRoot,
      ["fetch", "--quiet", "origin", `+refs/heads/${name}:refs/remotes/origin/${name}`],
      30_000,
    );
    for (const ref of [`refs/remotes/origin/${name}`, `refs/heads/${name}`]) {
      const found = await git(this.repoRoot, [
        "rev-parse",
        "--verify",
        "--quiet",
        `${ref}^{commit}`,
      ]);
      if (found.code === 0 && found.stdout.trim()) return { sha: found.stdout.trim(), ref };
    }
    throw new Error(`기준 브랜치 ${name} 를 찾지 못했어요(origin/${name} · ${name} 둘 다 없음)`);
  }

  get registryPath() {
    return path.join(this.wsRoot, "registry.json");
  }

  /** @returns {Record<string, WorkspaceMeta>} */
  load() {
    try {
      const data = JSON.parse(fs.readFileSync(this.registryPath, "utf8"));
      return data && typeof data.workspaces === "object" ? data.workspaces : {};
    } catch {
      return {};
    }
  }

  /** @param {Record<string, WorkspaceMeta>} all */
  save(all) {
    fs.mkdirSync(this.wsRoot, { recursive: true });
    const tmp = `${this.registryPath}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, workspaces: all }, null, 2));
    fs.renameSync(tmp, this.registryPath);
  }

  /** 폴더가 남아 있는 것만. @returns {WorkspaceMeta[]} */
  list() {
    return Object.values(this.load())
      .filter((m) => fs.existsSync(m.path))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  /** @param {string} id */
  get(id) {
    const meta = this.load()[id];
    return meta && fs.existsSync(meta.path) ? meta : null;
  }

  /** @param {string} key */
  findByKey(key) {
    return this.list().find((m) => m.key === key && !m.broken) ?? null;
  }

  /** @param {Target} target */
  find(target) {
    return this.findByKey(targetKey(target));
  }

  /** @param {string} id @param {Partial<WorkspaceMeta>} patch */
  update(id, patch) {
    const all = this.load();
    const meta = all[id];
    if (!meta) return null;
    all[id] = { ...meta, ...patch };
    this.save(all);
    return all[id];
  }

  /** 저장소(사용자 작업 트리)의 브랜치 · 더러움. */
  async repoInfo() {
    const [branch, status] = await Promise.all([
      git(this.repoRoot, ["rev-parse", "--abbrev-ref", "HEAD"]),
      git(this.repoRoot, ["status", "--porcelain=v1", "-uall"]),
    ]);
    const files = parsePorcelain(status.stdout).map((f) => f.path);
    return {
      branch: branch.stdout.trim() || null,
      dirty: files.length > 0,
      dirtyFiles: files.slice(0, 20),
    };
  }

  /**
   * 같은 대상의 열린 작업 공간이 있으면 그것, 없으면 지금 HEAD 에서 새로 만든다.
   * @param {Target} target @param {Date} [now]
   * @returns {Promise<WorkspaceMeta>}
   */
  async ensure(target, now = new Date()) {
    const key = targetKey(target);
    const existing = this.findByKey(key);
    if (existing) return existing;
    const pending = this.creating.get(key);
    if (pending) return pending;
    const task = this.create(target, now).finally(() => this.creating.delete(key));
    this.creating.set(key, task);
    return task;
  }

  /**
   * @param {Target} target @param {Date} now
   * @returns {Promise<WorkspaceMeta>}
   */
  async create(target, now) {
    const slug =
      target.kind === "new-screen" ? `new-${routeSlug(target.slug)}` : routeSlug(target.route);
    const all = this.load();
    let id = slug;
    for (let n = 2; all[id] || fs.existsSync(path.join(this.wsRoot, id)); n += 1)
      id = `${slug}-${n}`;
    const wsPath = path.join(this.wsRoot, id);

    const { sha: baseSha } = await this.resolveBase();
    const baseBranch = this.baseBranch;

    let branch = branchName(id, now);
    for (
      let n = 2;
      (await git(this.repoRoot, ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]))
        .code === 0;
      n += 1
    )
      branch = `${branchName(id, now)}-${n}`;

    fs.mkdirSync(this.wsRoot, { recursive: true });
    const added = await git(
      this.repoRoot,
      ["worktree", "add", "-b", branch, wsPath, baseSha],
      120_000,
    );
    if (added.code !== 0) throw new Error(`작업 공간을 만들지 못했어요: ${added.stderr.trim()}`);

    if (this.nodeModules && fs.existsSync(this.nodeModules)) {
      const target = fs.realpathSync.native(this.nodeModules);
      // Windows 에서는 관리자 권한 없이 걸리는 junction, 그 밖에서는 디렉터리 심볼릭 링크
      fs.symlinkSync(target, path.join(wsPath, "node_modules"), "junction");
    }
    await this.excludeAttachments(wsPath);

    /** @type {WorkspaceMeta} */
    const meta = {
      id,
      kind: target.kind,
      key: targetKey(target),
      route: target.kind === "edit" ? target.route : null,
      title: target.kind === "edit" ? (target.title ?? target.route) : target.title || target.slug,
      file: target.kind === "edit" ? (target.file ?? "") : "",
      specId: target.kind === "edit" ? (target.specId ?? null) : null,
      slug: target.kind === "new-screen" ? target.slug : null,
      section: target.kind === "new-screen" ? (target.section ?? null) : null,
      description: target.kind === "new-screen" ? (target.description ?? null) : null,
      path: wsPath,
      branch,
      baseBranch,
      baseSha,
      createdAt: now.toISOString(),
      session: null,
      runCount: 0,
      lastSummary: null,
      blocks: { commitMessage: null, prBody: null },
      pr: null,
      broken: null,
    };
    const latest = this.load();
    latest[id] = meta;
    this.save(latest);
    return meta;
  }

  /**
   * `.lab-attachments/` 를 git 에서 뺀다. worktree 는 따로 exclude 파일이 없어 공용 `info/exclude` 에 한 줄을 더한다
   * (그 이름의 폴더만 빼는 줄이라 원래 작업 트리에는 영향이 없다).
   * @param {string} wsPath
   */
  async excludeAttachments(wsPath) {
    const where = await git(wsPath, ["rev-parse", "--git-path", "info/exclude"]);
    if (where.code !== 0) return;
    const file = path.resolve(wsPath, where.stdout.trim());
    const line = `/${ATTACH_DIR}/`;
    let current = "";
    try {
      current = fs.readFileSync(file, "utf8");
    } catch {
      /* 없다 */
    }
    if (current.split(/\r?\n/).includes(line)) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(
      file,
      `${current && !current.endsWith("\n") ? "\n" : ""}# Expo Lab 「AI에게 맡기기」 첨부 자리\n${line}\n`,
    );
  }

  /**
   * 작업 공간을 버린다. junction 을 먼저 끊고, 끊긴 것을 확인한 뒤에만 worktree 를 지운다.
   * 저장된 커밋이 하나도 없고 PR 도 없으면 브랜치도 지운다(잃을 것이 없다).
   * @param {string} id
   * @returns {Promise<{ ok: true } | { ok: false; message: string }>}
   */
  async remove(id) {
    const all = this.load();
    const meta = all[id];
    if (!meta) return { ok: false, message: "그런 작업 공간이 없어요" };
    if (!isInside(this.wsRoot, meta.path))
      return { ok: false, message: `작업 공간 폴더 밖이라 지우지 않았어요: ${meta.path}` };

    const keep = (/** @type {string} */ message) => {
      all[id] = { ...meta, broken: message };
      this.save(all);
      return {
        ok: /** @type {const} */ (false),
        message: `${message} — ${meta.path} 를 직접 확인해 주세요`,
      };
    };

    if (fs.existsSync(meta.path)) {
      const unlinked = await unlinkJunction(path.join(meta.path, "node_modules"));
      if (!unlinked.ok) return keep(unlinked.message);
      const removed = await git(
        this.repoRoot,
        ["worktree", "remove", "--force", meta.path],
        120_000,
      );
      if (removed.code !== 0) return keep(`작업 공간을 지우지 못했어요: ${removed.stderr.trim()}`);
    }
    await git(this.repoRoot, ["worktree", "prune"]);

    const ahead = await git(this.repoRoot, [
      "rev-list",
      "--count",
      `${meta.baseSha}..refs/heads/${meta.branch}`,
    ]);
    if (ahead.code === 0 && ahead.stdout.trim() === "0" && !meta.pr) {
      await git(this.repoRoot, ["branch", "-D", meta.branch]);
    }
    delete all[id];
    this.save(all);
    return { ok: true };
  }

  /** 바뀐 파일 · 통계 · 저장된 수정(커밋) · 새 라우트 · 새 그림. @param {WorkspaceMeta} meta */
  async changes(meta) {
    const [status, stat, log, added] = await Promise.all([
      git(meta.path, ["status", "--porcelain=v1", "-uall"]),
      git(meta.path, ["diff", "--stat", "HEAD"]),
      git(meta.path, ["log", "--format=%h%x09%s", `${meta.baseSha}..HEAD`]),
      git(meta.path, ["diff", "--name-only", "--diff-filter=A", meta.baseSha]),
    ]);
    const files = parsePorcelain(status.stdout);
    const commits = log.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [sha, ...rest] = line.split("\t");
        return { sha: sha ?? "", subject: rest.join("\t") };
      });
    // 새로 생긴 파일 = 갈라진 뒤 더해진 추적 파일(커밋 · 스테이지 포함) + 아직 추적 안 된 파일
    const newFiles = [
      ...new Set([
        ...added.stdout.split(/\r?\n/).filter(Boolean),
        ...files.filter((f) => f.status === "??" || f.status === "A").map((f) => f.path),
      ]),
    ];
    return {
      files: files.slice(0, 200),
      fileCount: files.length,
      diffStat: stat.stdout.trimEnd(),
      commits,
      newRoutes: routesFromAppFiles(newFiles),
      newAssets: newFiles
        .filter((f) => /^assets\/.+\.(png|jpe?g|webp|gif|svg)$/i.test(f))
        .slice(0, 50),
    };
  }

  /**
   * 바뀐 그림 하나를 읽는다(상태 카드 썸네일). 작업 공간 안 · 그림 확장자만.
   * @param {WorkspaceMeta} meta @param {string} rel
   */
  readImage(meta, rel) {
    const ext = path.extname(rel).slice(1).toLowerCase();
    const type = IMAGE_TYPES[ext];
    const full = path.resolve(meta.path, rel);
    if (!type || !isInside(meta.path, full) || isInside(path.join(meta.path, "node_modules"), full))
      return null;
    const stat = lstatOrNull(full);
    if (!stat || !stat.isFile() || stat.size > 20 * 1024 * 1024) return null;
    return { type, bytes: fs.readFileSync(full) };
  }

  /**
   * 「수정 저장(커밋)」 — 사용자가 누른다. 작업 공간에서 `git add -A` → `git commit -F <파일>`.
   * @param {WorkspaceMeta} meta @param {string} message
   */
  async commit(meta, message) {
    const text = String(message ?? "")
      .replace(/\r\n/g, "\n")
      .trim();
    if (!text) return { ok: false, status: 400, message: "저장 메시지를 적어 주세요" };
    const added = await git(meta.path, ["add", "-A"]);
    if (added.code !== 0)
      return {
        ok: false,
        status: 500,
        message: `바뀐 파일을 모으지 못했어요: ${added.stderr.trim()}`,
      };
    const staged = await git(meta.path, ["diff", "--cached", "--quiet"]);
    if (staged.code === 0) return { ok: false, status: 409, message: "저장할 바뀐 내용이 없어요" };
    const file = this.tmpFile(`commit-${meta.id}.txt`, `${text}\n`);
    try {
      const committed = await git(meta.path, ["commit", "-F", file], 120_000);
      if (committed.code !== 0)
        return {
          ok: false,
          status: 500,
          message: `저장하지 못했어요: ${(committed.stderr || committed.stdout).trim()}`,
        };
    } finally {
      fs.rmSync(file, { force: true });
    }
    const last = await git(meta.path, ["log", "-1", "--format=%h%x09%s"]);
    const [sha, ...subject] = last.stdout.trim().split("\t");
    return { ok: true, status: 200, commit: { sha: sha ?? "", subject: subject.join("\t") } };
  }

  /**
   * 「검토 요청 올리기(PR)」 — `git push -u origin <브랜치>` + `gh pr create`. 머지는 하지 않는다.
   * 이미 PR 이 있으면 push 만 한다(같은 PR 에 쌓인다).
   * @param {WorkspaceMeta} meta
   * @param {{ title?: unknown; body?: unknown; base?: unknown }} input
   * @param {{ file: string; prefix: readonly string[] } | null} gh
   */
  async createPr(meta, input, gh) {
    const base = String(input.base ?? "").trim();
    if (!/^[A-Za-z0-9._/-]+$/.test(base) || base.startsWith("-") || base.includes(".."))
      return { ok: false, status: 400, message: "올릴 곳(브랜치 이름)이 올바르지 않아요" };
    const title = String(input.title ?? "")
      .replace(/[\r\n]+/g, " ")
      .trim()
      .slice(0, 200);
    if (!meta.pr && !title)
      return { ok: false, status: 400, message: "검토 요청 제목을 적어 주세요" };

    const changes = await this.changes(meta);
    if (changes.fileCount > 0)
      return {
        ok: false,
        status: 409,
        message: "저장하지 않은 수정이 있어요 — 먼저 「수정 저장(커밋)」을 눌러요",
      };
    if (changes.commits.length === 0)
      return { ok: false, status: 409, message: "올릴 저장된 수정이 없어요" };

    const pushed = await git(meta.path, ["push", "-u", "origin", meta.branch], 180_000);
    if (pushed.code !== 0)
      return { ok: false, status: 502, message: `올리지 못했어요: ${pushed.stderr.trim()}` };
    if (meta.pr) return { ok: true, status: 200, pr: meta.pr, pushedOnly: true };

    if (!gh)
      return {
        ok: false,
        status: 409,
        message: "이 PC 에서 gh(GitHub CLI)를 찾지 못했어요 — 작업은 올라갔어요",
      };
    const bodyFile = this.tmpFile(`pr-${meta.id}.md`, String(input.body ?? ""));
    try {
      const created = await run(
        gh.file,
        [...gh.prefix, ...prCreateArgs(base, meta.branch, title, bodyFile)],
        {
          cwd: meta.path,
          timeoutMs: 180_000,
        },
      );
      if (created.code !== 0)
        return {
          ok: false,
          status: 502,
          message: `검토 요청을 만들지 못했어요: ${(created.stderr || created.stdout).trim()}`,
        };
      const url = /https?:\/\/\S+\/pull\/\d+/.exec(created.stdout)?.[0] ?? created.stdout.trim();
      const number = Number(/\/pull\/(\d+)/.exec(url)?.[1]) || null;
      return { ok: true, status: 200, pr: { number, url } };
    } finally {
      fs.rmSync(bodyFile, { force: true });
    }
  }

  /** @param {string} name @param {string} content */
  tmpFile(name, content) {
    const dir = path.join(this.wsRoot, ".tmp");
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${Date.now()}-${name}`);
    fs.writeFileSync(file, content, "utf8");
    return file;
  }

  /**
   * 첨부 · 시안 파일을 작업 공간 안 `.lab-attachments/<실행>/` 에 쓴다(git 에서 빠진 자리).
   * 첨부는 원본 파일 이름 그대로(겹치면 뒤에 번호). 시안의 참고 이미지는 파일로 풀고 JSON 에서 dataUrl 을
   * 지워 `imagePath` 로 바꾼다 — 에이전트가 큰 base64 를 읽지 않게. 시안 JSON 은 확장자를 `.lab-json` 으로 해서
   * 작업 공간의 `prettier --check .` 가 훑지 않게 한다.
   * @param {WorkspaceMeta} meta @param {string} runId
   * @param {{ handoff?: any; attachments?: readonly { name?: unknown; dataUrl?: unknown; purpose?: unknown; note?: unknown }[] }} input
   * @returns {{ dir: string; handoffPath: string | null; files: AttachmentFile[] }}
   */
  writeAttachments(meta, runId, input) {
    const dir = path.join(meta.path, ATTACH_DIR, runId);
    /** @type {AttachmentFile[]} */
    const files = [];
    /** @type {Set<string>} */
    const used = new Set();
    const write = (
      /** @type {unknown} */ name,
      /** @type {{ ext: string; bytes: Buffer }} */ image,
    ) => {
      fs.mkdirSync(dir, { recursive: true });
      let fileName = safeFileName(name, image.ext);
      const ext = path.extname(fileName);
      const stem = fileName.slice(0, fileName.length - ext.length);
      for (let n = 2; used.has(fileName.toLowerCase()); n += 1) fileName = `${stem}-${n}${ext}`;
      used.add(fileName.toLowerCase());
      const full = path.join(dir, fileName);
      fs.writeFileSync(full, image.bytes);
      return full;
    };

    for (const item of input.attachments ?? []) {
      const image = decodeImage(item?.dataUrl);
      if (!image) continue;
      files.push({
        path: write(item.name, image),
        purpose: item.purpose === "asset" ? "asset" : "reference",
        note: typeof item.note === "string" ? item.note.slice(0, 300) : undefined,
      });
    }

    let handoffPath = null;
    if (input.handoff) {
      const copy = JSON.parse(JSON.stringify(input.handoff));
      const screens = Array.isArray(copy.screens) ? copy.screens : [];
      for (const screen of screens) {
        const ref = screen?.reference;
        const image = decodeImage(ref?.dataUrl);
        if (!image) continue;
        const full = write(ref.name ?? `reference-${routeSlug(String(screen.route ?? ""))}`, image);
        delete ref.dataUrl;
        ref.imagePath = full;
        files.push({
          path: full,
          purpose: "reference",
          note: `시안 참고 이미지 · ${String(screen.route ?? "")}`,
        });
      }
      fs.mkdirSync(dir, { recursive: true });
      handoffPath = path.join(dir, "handoff.lab-json");
      fs.writeFileSync(handoffPath, JSON.stringify(copy, null, 2), "utf8");
    }
    return { dir, handoffPath, files };
  }
}

/** `gh pr create` 인자 — 값은 전부 `--이름=값` 한 덩어리로(값이 `-` 로 시작해도 플래그로 읽히지 않게). */
function prCreateArgs(
  /** @type {string} */ base,
  /** @type {string} */ head,
  /** @type {string} */ title,
  /** @type {string} */ bodyFile,
) {
  return [
    "pr",
    "create",
    `--base=${base}`,
    `--head=${head}`,
    `--title=${title}`,
    `--body-file=${bodyFile}`,
  ];
}

module.exports = {
  WorkspaceStore,
  defaultWsRoot,
  unlinkJunction,
  parsePorcelain,
  isInside,
  targetKey,
  decodeImage,
  safeFileName,
  prCreateArgs,
  ATTACH_DIR,
  BASE_BRANCH,
};
