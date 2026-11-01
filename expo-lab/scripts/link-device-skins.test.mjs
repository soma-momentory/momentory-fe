import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  findSkinDir,
  geometryMismatches,
  parseSkinLayout,
  readSkinTable,
} from "./link-device-skins.mjs";

// Android SDK skins/pixel_8/layout 과 같은 형식
const SDK_LAYOUT = `parts {
  device { display { width 1080 height 2400 x 0 y 0 } }
  portrait {
    background { image back.webp }
    foreground { mask mask.webp cutout hole }
  }
}
layouts {
  portrait {
    width 1187
    height 2513
    event EV_SW:0:1
    part1 { name portrait x 0 y 0 }
    part2 { name device x 49 y 55 }
  }
}`;

// Samsung Galaxy Emulator Skin 의 layout 형식(버튼 그림 · 탭 들여쓰기)
const SAMSUNG_LAYOUT = `parts {
    portrait {
        background {
            image   device_Port-OnyxBlack.png
        }
\t\tforeground {
\t\t\tmask\tfore_port.png
\t\t}
\t\tbuttons {
\t\t\tpower {
\t\t\t\timage \trocker_power.png
\t\t\t\tx\t\t1469
\t\t\t\ty\t\t1215
\t\t\t}
\t\t}
    }
    device {
        display {
            width   1080
            height  2340
            x       0
            y       0
        }
    }
}
layouts {
    portrait {
        width     1746
        height    3006
        color     0x000000
        part1 { name portrait x 0 y 0 }
        part2 {
            name    device
            x       332
            y       331
        }
    }
}`;

test("layout 에서 그림 이름과 화면 자리를 읽는다 — SDK · 삼성 형식", () => {
  assert.deepEqual(parseSkinLayout(SDK_LAYOUT), {
    background: "back.webp",
    mask: "mask.webp",
    displayWidth: 1080,
    displayHeight: 2400,
    frameWidth: 1187,
    frameHeight: 2513,
    displayX: 49,
    displayY: 55,
  });
  assert.deepEqual(parseSkinLayout(SAMSUNG_LAYOUT), {
    background: "device_Port-OnyxBlack.png",
    mask: "fore_port.png",
    displayWidth: 1080,
    displayHeight: 2340,
    frameWidth: 1746,
    frameHeight: 3006,
    displayX: 332,
    displayY: 331,
  });
});

test("표의 skin 덩어리를 읽고 안쪽 bodyCrop 은 수치로 섞지 않는다", () => {
  const source = `
    skin: {
      name: "pixel_8",
      frameWidth: 1187, frameHeight: 2513, displayX: 49, displayY: 55,
      displayWidth: 1080, displayHeight: 2400,
    },
    skin: {
      name: "Galaxy_S24",
      origin: "samsung",
      frameWidth: 1746, frameHeight: 3006,
      bodyCrop: { x: 1, y: 2, width: 3, height: 4 },
      displayX: 332, displayY: 331, displayWidth: 1080, displayHeight: 2340,
    },`;
  const [pixel, galaxy] = readSkinTable(source);
  assert.equal(pixel.origin, "android-sdk");
  assert.deepEqual(geometryMismatches(pixel, parseSkinLayout(SDK_LAYOUT)), []);
  assert.equal(galaxy.origin, "samsung");
  assert.equal(galaxy.displayX, 332);
  assert.deepEqual(geometryMismatches(galaxy, parseSkinLayout(SAMSUNG_LAYOUT)), []);
  assert.deepEqual(
    geometryMismatches({ ...galaxy, displayY: 330 }, parseSkinLayout(SAMSUNG_LAYOUT)),
    ["displayY 표 330 · layout 331"],
  );
});

test("삼성 스킨 폴더는 이름을 느슨하게 · 두 단계 아래까지 찾는다", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "momentory-skins-"));
  const nested = path.join(root, "Galaxy S24 Emulator Skin", "galaxy s24");
  await mkdir(nested, { recursive: true });
  await writeFile(path.join(nested, "layout"), SAMSUNG_LAYOUT);
  assert.equal(findSkinDir(root, "Galaxy_S24"), nested);
  assert.equal(findSkinDir(root, "Galaxy_A35"), null);
  assert.equal(findSkinDir(path.join(root, "없음"), "Galaxy_S24"), null);
});
