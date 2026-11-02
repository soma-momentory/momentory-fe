// @ts-check
/**
 * 에이전트에게 무엇을 어떤 권한으로 시키는가 — 프롬프트와 명령줄을 **만드는 것만** 한다(실행은 `runs.js`).
 *
 * 정해진 것(2026-11-02 사용자 결정 · `expo-lab/HANDOFF.md` 「Lab 에서 바로 맡길 때」 · 「새 화면 만들기」):
 * - 에이전트는 작업 공간(git worktree)에서 **고치고 검사까지만** 한다.
 *   커밋 · push · PR 은 사용자가 Lab 에서 버튼으로 한다 — 그래서 에이전트의 git 권한은 읽기뿐이다.
 * - 끝에 `COMMIT_MESSAGE:` · `PR_BODY:` 블록을 내게 한다 — Lab 이 그 둘을 고칠 수 있는 기본값으로 쓴다.
 * - 스킬 `momentory-lab-handoff` 를 부른다 — 화면 수정 · 새 화면 만들기가 다 그 절차다.
 */
const os = require("node:os");

/** @typedef {"claude" | "codex"} AgentId */
/** @typedef {{ kind: "edit"; route: string; title?: string; file?: string; specId?: string | null }} EditTarget */
/** @typedef {{ kind: "new-screen"; slug: string; title: string; section?: string | null; description?: string }} NewScreenTarget */
/** @typedef {EditTarget | NewScreenTarget} Target */
/** @typedef {{ path: string; purpose: "reference" | "asset"; note?: string }} AttachmentFile */

const INSTRUCTION_LIMIT = 20_000;
const START = "----- 사용자 지시 시작 -----";
const END = "----- 사용자 지시 끝 -----";

/** 새 화면이 들어갈 묶음 — id → 이름 · 자리 힌트. UI(`src/agent/sections.ts`)와 id 를 맞춘다. */
const SECTIONS = /** @type {const} */ ({
  intro: { label: "소개", hint: "app/intro/" },
  onboarding: {
    label: "온보딩",
    hint: "app/(onboarding)/ (순서는 features/onboarding/model/flow.ts)",
  },
  home: { label: "홈", hint: "app/home/ (홈 시트) 또는 app/(tabs)/home 근처" },
  retro: { label: "회고", hint: "app/retro/" },
  letter: { label: "편지", hint: "app/letter/" },
  rest: { label: "쉼터", hint: "app/rest/" },
  archive: { label: "보관함", hint: "app/diary/ 또는 보관함 탭(app/(tabs)/archive) 근처" },
  report: { label: "리포트", hint: "app/(tabs)/report 근처 — 새 스택이면 app/report/" },
  my: { label: "마이", hint: "app/my/" },
  other: { label: "기타", hint: "기존 구조를 보고 정한다" },
});

/** 한 줄 값으로 — 줄바꿈 · 제어 문자를 지우고 길이를 자른다. @param {unknown} value */
const oneLine = (value, max = 300) =>
  String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .trim()
    .slice(0, max);

/**
 * 사용자 글을 경계 안에 넣을 수 있게 다듬는다 — 경계 줄을 흉내 내서 지시 밖으로 나가는 것을 막는다.
 * (stdin 으로 넘기므로 셸 해석은 애초에 없다. 이건 프롬프트 안의 경계만 지킨다)
 * @param {unknown} text
 */
function sanitizeInstruction(text, max = INSTRUCTION_LIMIT) {
  return String(text ?? "")
    .replace(/\u0000/g, "")
    .replace(/-{3,}\s*사용자 지시 (시작|끝)\s*-{3,}/g, "(경계 줄 지움)")
    .slice(0, max)
    .trim();
}

/** @param {AgentId} agent */
const skillCall = (agent) =>
  agent === "claude" ? "/momentory-lab-handoff" : "$momentory-lab-handoff";

const RULES = [
  "이 실행의 약속 — expo-lab/HANDOFF.md 「Lab 에서 바로 맡길 때」 그대로다. 어기지 않는다:",
  "- 지금 폴더는 이 작업 전용 작업 공간(git worktree)이고, 작업 브랜치는 이미 만들어져 있다. 브랜치를 새로 만들거나 바꾸지 않는다.",
  "- 고치고 검사(npm run typecheck · npm run lint · npm run format:check · 바뀐 곳과 관련된 테스트 npx jest <경로>)까지만 한다.",
  "- **커밋 · push · PR 을 하지 않는다.** 사용자가 결과를 보고 Lab 에서 직접 누른다. git 은 status · diff · log 같은 읽기만 쓴다.",
  "- 절차 1 의 「확인받기」는 요약을 출력으로 남기는 것으로 대신한다 — 묻지 말고 진행한다.",
  "  단, 저장소 규칙(CLAUDE.md · docs/DESIGN.md)과 부딪히거나 값으로 안 되는 큰 구조 변경이면 고치지 말고 보고만 한다.",
  "- 절차 2(브랜치) · 6(Lab 에서 다시 보기) · 7(PR)은 건너뛴다 — 사용자가 미리보기에서 본다.",
  "- 앱에 넣기 이미지는 expo-lab/HANDOFF.md 「이미지 넣기」 절차를 따른다 · Lab 실행 중에는 이미지 생성 도구(ask.py image 등)를 쓰지 않고 필요한 그림은 보고에 적는다.",
  "- `.lab-attachments/` 는 Lab 이 넘긴 첨부 자리다(git 에 안 올라간다). 거기에 파일을 만들거나 고치지 않는다 — 앱에 넣을 그림은 assets/ 로 복사한다.",
  "- 명령은 셸 도구로 실행한다. 파일 삭제(rm) · git reset/checkout/stash 같은 되돌릴 수 없는 명령은 쓰지 않는다.",
].join("\n");

/**
 * 마지막 응답의 모양 — Claude `--json-schema` · Codex `--output-schema` 로 받는다.
 * OpenAI 구조화 출력 규칙(모든 속성 required · additionalProperties false)에 맞춘다.
 */
const RESULT_SCHEMA = (() => {
  /** @param {string[]} keys */
  const record = (keys) => ({
    type: "object",
    additionalProperties: false,
    required: keys,
    properties: Object.fromEntries(keys.map((k) => [k, { type: "string" }])),
  });
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "summary",
      "changedScreens",
      "commitMessage",
      "prBody",
      "neededImages",
      "neededApis",
      "skipped",
    ],
    properties: {
      summary: { type: "string" },
      changedScreens: { type: "array", items: { type: "string" } },
      commitMessage: { type: "string" },
      prBody: { type: "string" },
      neededImages: { type: "array", items: record(["what", "size", "where"]) },
      neededApis: { type: "array", items: record(["method", "path", "request", "response"]) },
      skipped: { type: "array", items: record(["request", "reason"]) },
    },
  };
})();

const BLOCKS = [
  "마지막 응답은 JSON 객체 하나다 — 실행기가 스키마로 받는다. 필드:",
  "- summary: 한 일 요약(사용자에게 보이는 한국어 몇 문장 — 절차 1 의 「확인받기」 요약을 여기 쓴다)",
  "- changedScreens: 바뀌거나 새로 생긴 화면의 라우트(예: /(tabs)/home · /rest/sleep-log)",
  "- commitMessage: `type: 한국어 문장형` 제목(docs/CONTRIBUTING.md 「커밋」 — 마침표 없이 50자 안팎) + 빈 줄 + 왜 바꿨는지 본문 · 검사 결과 수치. **Co-Authored-By 공저자 줄 · 「Generated with Claude Code」 같은 생성 도구 표기 · 세션 링크를 넣지 않는다**(사용자 규칙)",
  "- prBody: .github/PULL_REQUEST_TEMPLATE.md 의 절을 그대로 채운 본문. 값을 바꿨으면 「주요 변경」에 전 → 후 표, 서버에 없는 데이터를 썼으면 「백엔드·스펙 영향」에 필요한 API 표. 끝에 「🤖 Generated with …」 같은 생성 도구 · 세션 표기를 붙이지 않는다",
  "- neededImages: 더 필요한 그림 {what, size, where} — 만들지 말고 여기 적는다",
  "- neededApis: 서버에 아직 없는 데이터 {method, path, request, response}",
  "- skipped: 하지 않은 요청 {request, reason} — 규칙과 부딪히거나 값으로 안 되는 큰 구조 변경",
  "구조화 출력이 안 되는 환경이면 같은 내용을 `COMMIT_MESSAGE:` · `PR_BODY:` 줄 다음 ~~~~ 울타리 블록으로 남긴다.",
].join("\n");

/**
 * 스키마 결과를 다듬는다 — 빠진 칸은 빈 값으로. 모양이 아니면 null.
 * @param {any} value
 * @returns {null | { summary: string; changedScreens: string[]; commitMessage: string; prBody: string;
 *   neededImages: { what: string; size: string; where: string }[];
 *   neededApis: { method: string; path: string; request: string; response: string }[];
 *   skipped: { request: string; reason: string }[] }}
 */
function normalizeResult(value) {
  if (!value || typeof value !== "object" || typeof value.summary !== "string") return null;
  const s = (/** @type {unknown} */ v) => (typeof v === "string" ? v : "");
  /** @template T @param {unknown} list @param {(x: any) => T} map */
  const arr = (list, map) =>
    Array.isArray(list) ? list.filter((x) => x && typeof x === "object").map(map) : [];
  return {
    summary: value.summary,
    changedScreens: Array.isArray(value.changedScreens)
      ? value.changedScreens.filter((x) => typeof x === "string")
      : [],
    commitMessage: s(value.commitMessage),
    prBody: s(value.prBody),
    neededImages: arr(value.neededImages, (x) => ({
      what: s(x.what),
      size: s(x.size),
      where: s(x.where),
    })),
    neededApis: arr(value.neededApis, (x) => ({
      method: s(x.method),
      path: s(x.path),
      request: s(x.request),
      response: s(x.response),
    })),
    skipped: arr(value.skipped, (x) => ({ request: s(x.request), reason: s(x.reason) })),
  };
}

/** 시안을 몇 개까지 한 번에 만드는가 — 시안마다 작업 공간 · 미리보기 서버가 하나씩이라 PC 부담을 생각해 3 */
const MAX_VARIANTS = 3;

/**
 * 시안 k 의 출발점 — 시안끼리 같은 답을 내지 않게 방향을 하나씩 건넨다. 꼭 따르지 않아도 된다(지시가 먼저다).
 * @type {readonly string[]}
 */
const VARIANT_DIRECTIONS = [
  "지시를 가장 곧게 따르는 정석 — 지금 구성은 지키고 값 · 위계를 다듬는다",
  "구성을 과감하게 — 배치 · 묶음 · 순서를 바꿔 같은 지시를 다른 모양으로 푼다",
  "덜어 내는 방향 — 요소를 줄이고 여백과 강조 하나로 위계를 분명히 한다",
];

/**
 * 「시안 k / N」 안내 — 같은 지시로 시안 여러 개를 차례로 만들 때 시안마다 붙는다(`server/index.js` 시안 묶음).
 * @param {{ index: number; total: number; earlier?: readonly { index: number; summary: string }[] }} variant
 */
function variantBlock(variant) {
  const { index, total } = variant;
  const lines = [
    `[시안 ${index} / ${total}]`,
    `- 같은 지시로 시안 ${total}개를 따로 만든다 — 이 작업 공간은 그중 시안 ${index} 다. 시안마다 작업 공간이 따로라 다른 시안의 폴더는 열지 않는다.`,
    "- 다른 시안은 다른 방향을 맡는다. 다른 시안과 겹치지 않는 뚜렷한 디자인 방향 하나를 골라 끝까지 밀고 간다 — 사용자가 시안을 나란히 놓고 하나를 고른다.",
    `- 출발점(꼭 따르지 않아도 된다): ${VARIANT_DIRECTIONS[(index - 1) % VARIANT_DIRECTIONS.length]}`,
    "- 방향이 달라도 저장소 규칙(CLAUDE.md · docs/DESIGN.md)은 그대로다 — 규칙을 어겨서 다르게 만들지 않는다.",
    "- summary 첫 줄은 「방향: …」 한 줄로 이 시안이 고른 방향을 적는다(Lab 이 시안 비교 화면의 이름 아래에 그 줄을 띄운다).",
  ];
  const earlier = (variant.earlier ?? []).filter((e) => e.summary.trim());
  if (earlier.length > 0)
    lines.push(
      "[앞서 만든 시안 — 이것들과 다른 방향으로]",
      ...earlier.map((e) => `- 시안 ${e.index}: ${oneLine(e.summary, 300)}`),
    );
  return lines.join("\n");
}

/** @param {AttachmentFile} a */
const attachmentLine = (a) =>
  `[첨부] ${a.path} · 용도: ${a.purpose === "asset" ? "앱에 넣기" : "참고용"}${a.note ? ` · 설명: ${oneLine(a.note, 200)}` : ""}`;

/**
 * @param {{
 *   agent: AgentId;
 *   target: Target;
 *   instruction?: string;
 *   attachments?: readonly AttachmentFile[];
 *   workspace: { path: string; branch: string; baseBranch: string };
 *   resume?: boolean;
 *   previousSummary?: string | null;
 *   variant?: { index: number; total: number; earlier?: readonly { index: number; summary: string }[] } | null;
 * }} input
 */
function buildPrompt(input) {
  const { agent, target, workspace } = input;
  const instruction = sanitizeInstruction(input.instruction);
  const parts = [];

  if (input.resume) {
    parts.push(
      `${skillCall(agent)} 같은 작업에 대한 이어지는 지시다. 앞의 약속(커밋 · push · PR 하지 않기 등)은 그대로다.`,
    );
  } else if (target.kind === "new-screen") {
    parts.push(
      `${skillCall(agent)} 새 화면을 만든다 — expo-lab/HANDOFF.md 「새 화면 만들기」 절차를 따른다.`,
    );
  } else {
    parts.push(
      `${skillCall(agent)} 아래 화면을 사용자 지시대로 고친다 — expo-lab/HANDOFF.md 「Lab 에서 바로 맡길 때」.`,
    );
  }

  if (target.kind === "new-screen") {
    const section =
      target.section && target.section in SECTIONS
        ? SECTIONS[/** @type {keyof typeof SECTIONS} */ (target.section)]
        : null;
    parts.push(
      [
        "[새 화면]",
        `- 이름: ${oneLine(target.title)}`,
        `- 영문 이름(slug): ${oneLine(target.slug, 60)} — 라우트 파일 이름의 후보`,
        section
          ? `- 들어갈 곳: ${section.label} — ${section.hint}`
          : "- 들어갈 곳: 정하지 않음 — 기존 구조를 보고 정한다",
        `- 작업 공간: ${workspace.path}`,
        `- 작업 브랜치: ${workspace.branch} (${workspace.baseBranch} 에서 갈라짐)`,
        "- 라우트를 만들면 npm run lab:routes 를 돌리고 expo-lab/src/shell/routeMeta.ts 에 제목 · 묶음을 단다.",
      ].join("\n"),
    );
    const description = sanitizeInstruction(target.description, 8000);
    parts.push([START, `어떤 화면인가: ${description || "(설명 없음)"}`, END].join("\n"));
  } else {
    parts.push(
      [
        "[화면]",
        `- 라우트: ${oneLine(target.route)}`,
        target.title ? `- 이름: ${oneLine(target.title)}` : null,
        target.specId
          ? `- 스펙 ID: ${oneLine(target.specId)} (docs/spec/screens/ · docs/PRODUCT.md 매핑)`
          : null,
        target.file ? `- 파일: ${oneLine(target.file)}` : null,
        `- 작업 공간: ${workspace.path}`,
        `- 작업 브랜치: ${workspace.branch} (${workspace.baseBranch} 에서 갈라짐)`,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  if (input.variant && !input.resume) parts.push(variantBlock(input.variant));

  const attachments = input.attachments ?? [];
  if (attachments.length > 0)
    parts.push(
      [
        agent === "claude"
          ? "아래 첨부 이미지는 일을 시작하기 전에 Read 도구로 **먼저 열어 본다**."
          : "아래 첨부 이미지는 이 메시지에 함께 붙어 있다 — 먼저 본다. 경로는 앱에 넣을 파일을 복사할 때 쓴다.",
        ...attachments.map(attachmentLine),
      ].join("\n"),
    );

  if (!input.resume && input.previousSummary) {
    parts.push(
      `[이 작업 공간에서 앞서 한 일 — 요약]\n${String(input.previousSummary).slice(0, 4000)}`,
    );
  }

  parts.push(
    [
      START,
      instruction ||
        (target.kind === "new-screen"
          ? "(따로 적은 말 없음 — 설명대로 만든다)"
          : "(따로 적은 말 없음 — 첨부 그림이 있으면 그대로 맞춘다)"),
      END,
    ].join("\n"),
  );
  parts.push(RULES);
  parts.push(BLOCKS);
  return parts.join("\n\n") + "\n";
}

/** Claude 가 그냥 써도 되는 명령 — 고치고 검사하는 데 필요한 것만, git 은 읽기만. */
const CLAUDE_ALLOWED = [
  "Read",
  "Edit",
  "Write",
  "Glob",
  "Grep",
  "Skill",
  "TodoWrite",
  "StructuredOutput",
  "Bash(npm run *)",
  "Bash(npx prettier *)",
  "Bash(npx eslint *)",
  "Bash(npx jest *)",
  "Bash(npx tsc *)",
  "Bash(git status*)",
  "Bash(git diff*)",
  "Bash(git log*)",
  "Bash(git show*)",
  "Bash(git rev-parse*)",
  "Bash(git branch --show-current)",
];

/** 허락 목록 밖은 어차피 거절되지만(`--permission-prompts none`), 위험한 것은 이름으로 한 번 더 막는다. */
const CLAUDE_DENIED = [
  "Bash(git commit*)",
  "Bash(git push*)",
  "Bash(git checkout*)",
  "Bash(git switch*)",
  "Bash(git reset*)",
  "Bash(git stash*)",
  "Bash(git worktree*)",
  "Bash(gh *)",
  "Bash(rm *)",
];

/** TOML 리터럴 문자열(작은따옴표 — 역슬래시를 그대로 둔다). 작은따옴표가 든 경로는 못 싣는다. @param {string} p */
const tomlLiteral = (p) => (p.includes("'") ? null : `'${p}'`);

/**
 * @param {{
 *   agent: AgentId;
 *   launcher: { file: string; prefix: readonly string[] };
 *   cwd: string;
 *   resumeId?: string | null;
 *   imagePaths?: readonly string[];
 *   tmpDir?: string;
 *   schemaPath?: string | null;
 *   lastMessagePath?: string | null;
 * }} input
 * @returns {{ file: string; args: string[] }}
 */
function buildAgentCommand(input) {
  const { agent, launcher } = input;
  const args = [...launcher.prefix];
  if (agent === "claude") {
    // 첨부는 작업 공간 안(.lab-attachments)이라 --add-dir 이 필요 없다. 그림은 Read 로 본다.
    // --json-schema 는 stream-json 과 함께 된다(2026-11-02 실측 — result 줄에 structured_output).
    args.push(
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--permission-mode",
      "acceptEdits",
      "--permission-prompts",
      "none",
      "--allowedTools",
      ...CLAUDE_ALLOWED,
      "--disallowedTools",
      ...CLAUDE_DENIED,
      "--json-schema",
      JSON.stringify(RESULT_SCHEMA),
    );
    if (input.resumeId) args.push("--resume", input.resumeId);
    return { file: launcher.file, args };
  }

  // codex (codex-cli 0.166 실측 — `--full-auto` 는 없다: 「unexpected argument」):
  // - `-c approval_policy="never"` = 묻지 않는다(실패는 모델에게 돌려준다) · 저장소 훅(.claude/hooks/README.md)과 같은 방식
  // - 샌드박스 workspace-write = 작업 공간 안만 쓴다. 커밋은 하지 않으므로 .git 쓰기도 네트워크도 필요 없다.
  //   임시 폴더는 jest 캐시 때문에 쓰기를 연다.
  // - `--dangerously-bypass-hook-trust` = 훅 **신뢰 확인만** 건너뛰고 프로젝트 훅(.codex/hooks.json — 가드)을 돌린다.
  //   샌드박스와는 무관하다. 이게 없으면 아무도 검토하지 않은 훅은 조용히 건너뛰어져 가드가 안 돈다.
  // `-i` 는 값을 여러 개 받으므로 반드시 다른 플래그 앞에 둔다(맨 끝의 `-` 를 그림으로 먹지 않게).
  const tmp = tomlLiteral(input.tmpDir ?? os.tmpdir());
  const images = (input.imagePaths ?? []).flatMap((p) => ["-i", p]);
  /** 마지막 응답 스키마 · 마지막 말 파일(`exec` · `exec resume` 둘 다 받는다) */
  const result = [
    ...(input.schemaPath ? ["--output-schema", input.schemaPath] : []),
    ...(input.lastMessagePath ? ["-o", input.lastMessagePath] : []),
  ];
  const common = [
    "--json",
    ...result,
    "--dangerously-bypass-hook-trust",
    "-c",
    'approval_policy="never"',
  ];
  args.push("exec");
  if (input.resumeId) {
    // `exec resume` 에는 -s · -C 가 없다 — 설정 덮어쓰기(-c)로 같은 샌드박스를 준다. cwd 는 spawn 이 맞춘다.
    args.push("resume", ...images, ...common, "-c", 'sandbox_mode="workspace-write"');
    if (tmp) args.push("-c", `sandbox_workspace_write.writable_roots=[${tmp}]`);
    args.push(input.resumeId, "-");
  } else {
    args.push(...images, ...common, "-s", "workspace-write", "-C", input.cwd);
    if (tmp) args.push("-c", `sandbox_workspace_write.writable_roots=[${tmp}]`);
    args.push("-");
  }
  return { file: launcher.file, args };
}

/**
 * 에이전트 마지막 말에서 `COMMIT_MESSAGE:` · `PR_BODY:` 블록을 꺼낸다. 마지막에 나온 것이 이긴다.
 * 울타리(~~~~ · ``` )가 있으면 그 안, 없으면 다음 표지까지.
 * @param {string | null | undefined} text
 * @returns {{ commitMessage: string | null; prBody: string | null }}
 */
function parseBlocks(text) {
  const source = String(text ?? "").replace(/\r\n/g, "\n");
  /** @param {string} marker @param {string} other */
  const take = (marker, other) => {
    const re = new RegExp(`(^|\\n)[ \\t]*\\**${marker}\\**:?\\**[ \\t]*\\n`, "g");
    let last = -1;
    let m;
    while ((m = re.exec(source))) last = m.index + m[0].length;
    if (last < 0) return null;
    const rest = source.slice(last);
    const fence = /^[ \t]*(~{3,}|`{3,})[^\n]*\n/.exec(rest);
    if (fence) {
      const mark = /** @type {string} */ (fence[1]);
      const body = rest.slice(fence[0].length);
      const close = new RegExp(
        `(^|\\n)[ \\t]*${mark.replace(/[`~]/g, (c) => `\\${c}`)}[ \\t]*(\\n|$)`,
      );
      const end = close.exec(body);
      const value = end ? body.slice(0, end.index) : body;
      return value.trim() || null;
    }
    const stop = new RegExp(`\\n[ \\t]*\\**${other}\\**:?`).exec(rest);
    const value = stop ? rest.slice(0, stop.index) : rest;
    return value.trim() || null;
  };
  return {
    commitMessage: take("COMMIT_MESSAGE", "PR_BODY"),
    prBody: take("PR_BODY", "COMMIT_MESSAGE"),
  };
}

/** 라우트 → 폴더 · 브랜치에 쓸 이름. `/(tabs)/home` → `tabs-home`. @param {string} route */
function routeSlug(route) {
  const slug = String(route)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return slug || "root";
}

/** @param {Date} d */
function stamp(d) {
  const p = (/** @type {number} */ n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/** @param {string} id 작업 공간 id(`tabs-home` · `new-sleep-log`) @param {Date} [now] */
const branchName = (id, now = new Date()) => `lab/${id}-${stamp(now)}`;

/**
 * 새로 생긴 `app/**` 파일 → expo-router 주소(그룹 `(…)` 은 빠지고 `index` 는 부모 — gen-routes.mjs 와 같은 규칙).
 * 레이아웃(`_layout`) · 특수 파일(`+html` · `+not-found`)은 화면이 아니라 뺀다.
 * @param {readonly string[]} files 저장소 기준 상대 경로(`/` 구분)
 */
function routesFromAppFiles(files) {
  /** @type {Set<string>} */
  const routes = new Set();
  for (const raw of files) {
    const file = raw.replace(/\\/g, "/");
    const m = /^app\/(.+)\.(tsx|ts|jsx|js)$/.exec(file);
    if (!m) continue;
    const segments = (m[1] ?? "").split("/");
    if (segments.some((s) => s.startsWith("_") || s.startsWith("+"))) continue;
    const kept = segments.filter((s) => !/^\(.*\)$/.test(s));
    if (kept.at(-1) === "index") kept.pop();
    routes.add(`/${kept.join("/")}`);
  }
  return [...routes].sort();
}

module.exports = {
  buildPrompt,
  buildAgentCommand,
  parseBlocks,
  routeSlug,
  branchName,
  stamp,
  sanitizeInstruction,
  routesFromAppFiles,
  normalizeResult,
  RESULT_SCHEMA,
  SECTIONS,
  MAX_VARIANTS,
  VARIANT_DIRECTIONS,
  CLAUDE_ALLOWED,
  CLAUDE_DENIED,
  INSTRUCTION_START: START,
  INSTRUCTION_END: END,
};
