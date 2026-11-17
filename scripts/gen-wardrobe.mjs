/**
 * 바바 꾸미기 카탈로그를 `assets/baba/wardrobe/manifest.json` 에서 만들어
 * `src/features/wardrobe/model/catalog.generated.ts` 에 쓴다.
 *
 *   node scripts/gen-wardrobe.mjs           # 다시 쓴다 (npm run gen:wardrobe)
 *   node scripts/gen-wardrobe.mjs --check   # 어긋나면 1 로 끝난다 (jest 가 부른다)
 *
 * React Native 는 `require` 경로를 코드에 고정해야 해서 손으로 쓰지 않고 만든다.
 * 아이템 id 는 서버와 같은 「칸-아이디」(hat-cowboy)다 — 모자와 옷에 같은 cowboy 가 있다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(path.join(root, "assets/baba/wardrobe/manifest.json"), "utf8"),
);
const outFile = path.join(root, "src/features/wardrobe/model/catalog.generated.ts");
const asset = (p) => `require("../../../../assets/baba/wardrobe/${p}.webp")`;

const SLOTS = [
  ["hats", "hat", (i) => `ears: ${i.ears}, headTop: ${i.headTop}, earsFront: ${i.earsFront}`],
  ["eyes", "eyes", (i) => `baseEyes: ${i.baseEyes}`],
  ["clothes", "clothes", (i) => `lowerBody: ${i.lowerBody}`],
];

export function render() {
  const order = manifest.layerOrder
    .map((l) =>
      l.slot ? `  { slot: "${l.slot}" },` : `  { when: "${l.when}", source: ${asset(l.layer)} },`,
    )
    .join("\n");
  const items = SLOTS.flatMap(([key, slot, flags]) =>
    manifest.items[key].map(
      (i) =>
        `  { id: "${slot}-${i.id}", slot: "${slot}", name: ${JSON.stringify(i.nameKo)}, ` +
        `layer: ${asset(i.layer)}, shop: ${asset(i.shop)}, ${flags(i)} },`,
    ),
  ).join("\n");
  return `// 생성물 — \`npm run gen:wardrobe\` 가 assets/baba/wardrobe/manifest.json 에서 만든다. 직접 고치지 않는다.
import type { WardrobeItemArt, WardrobeLayer } from "./types";

/** 아래 → 위로 겹치는 순서. \`when\` 이 참인 부품과 칸의 아이템을 그린다 */
export const LAYER_ORDER: readonly WardrobeLayer[] = [
${order}
];

export const CATALOG: readonly WardrobeItemArt[] = [
${items}
];
`;
}

const next = render();
if (process.argv.includes("--check")) {
  const current = readFileSync(outFile, "utf8");
  if (current !== next) {
    console.error("catalog.generated.ts 가 manifest.json 과 다릅니다 — npm run gen:wardrobe");
    process.exit(1);
  }
} else {
  writeFileSync(outFile, next);
}
