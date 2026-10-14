import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, type Connect, type Plugin } from "vite";

const LAB_ROOT = path.dirname(fileURLToPath(import.meta.url));
const CURRENT_SCREENS_DIRECTORY = path.resolve(LAB_ROOT, "../docs/redesign/current-screens");
const VIRTUAL_MODULE_ID = "virtual:current-screens";
const RESOLVED_VIRTUAL_MODULE_ID = `\0${VIRTUAL_MODULE_ID}`;
/**
 * 앱 저장소의 `assets/`(서체 · 일러스트). 복사하지 않고 읽기만 한다 —
 * `src/design-system/source.ts` 가 상대 경로로 import 하고, dev 서버는 이 폴더 접근만 허용한다.
 */
const APP_ASSETS_DIRECTORY = path.resolve(LAB_ROOT, "../assets");
const IMAGE_EXTENSIONS = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".webp"]);

function currentScreenFiles(): string[] {
  if (!fs.existsSync(CURRENT_SCREENS_DIRECTORY)) return [];

  return fs
    .readdirSync(CURRENT_SCREENS_DIRECTORY, { withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, "ko"));
}

function contentType(filename: string): string {
  switch (path.extname(filename).toLowerCase()) {
    case ".avif":
      return "image/avif";
    case ".gif":
      return "image/gif";
    case ".jpeg":
    case ".jpg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

function currentScreensMiddleware(): Connect.NextHandleFunction {
  return (request, response, next) => {
    const requestUrl = request.url ?? "";
    if (!requestUrl.startsWith("/current-screens/")) {
      next();
      return;
    }

    const filename = path.basename(decodeURIComponent(requestUrl.split("?")[0] ?? ""));
    if (!currentScreenFiles().includes(filename)) {
      response.statusCode = 404;
      response.end("Current screen image not found");
      return;
    }

    response.statusCode = 200;
    response.setHeader("Content-Type", contentType(filename));
    response.setHeader("Cache-Control", "no-store");
    fs.createReadStream(path.join(CURRENT_SCREENS_DIRECTORY, filename)).pipe(response);
  };
}

/**
 * 기존 스크린샷을 design-lab 안으로 복사하지 않는다.
 * 파일 목록은 가상 모듈로 주입하고, dev/preview 서버가 원본 디렉터리에서 읽기만 한다.
 */
function currentScreensPlugin(): Plugin {
  return {
    name: "momentory-current-screens",
    resolveId(id) {
      return id === VIRTUAL_MODULE_ID ? RESOLVED_VIRTUAL_MODULE_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_MODULE_ID) return undefined;
      return `export default ${JSON.stringify(currentScreenFiles())};`;
    },
    configureServer(server) {
      server.middlewares.use(currentScreensMiddleware());
    },
    configurePreviewServer(server) {
      server.middlewares.use(currentScreensMiddleware());
    },
  };
}

export default defineConfig({
  plugins: [react(), currentScreensPlugin()],
  server: {
    port: 4173,
    strictPort: false,
    fs: {
      allow: [LAB_ROOT, APP_ASSETS_DIRECTORY],
    },
  },
  preview: {
    port: 4173,
    strictPort: false,
  },
});
