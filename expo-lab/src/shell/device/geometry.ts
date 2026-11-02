/**
 * 기기 외형의 배치 — 화면(= iframe)이 외형 안 어디에 놓이는가. 화면 크기 · 모서리 · 안전 영역은
 * 전부 `lab-devices.ts` 가 정하고, 여기는 **화면 바깥(테두리 · 버튼)** 만 정한다.
 *
 * - iOS(Face ID): 검은 유리 테두리 12 + 금속 테두리 3. 겉 모서리 = 화면 모서리 + 15 (동심원)
 * - iPhone SE: 위·아래 이마/턱 104 · 옆 24 · 홈 버튼. 화면 모서리 없음
 * - Android 스킨: SDK `skins/<name>/layout` 의 px 값을 화면 폭에 맞춰 줄인 것
 * - Android 스킨 없음: 테두리 10 + 2 의 SVG 외형
 * 옆 버튼이 몸통 밖으로 3 튀어나오므로 좌우에 4 여유를 둔다.
 */
import type { LabDevice } from "../../lab-devices";

export type ChromeKind = "ios" | "ios-home-button" | "android-skin" | "android";

export type ChromeGeometry = {
  kind: ChromeKind;
  outerWidth: number;
  outerHeight: number;
  /** 몸통(버튼 여유를 뺀) 자리 */
  bodyX: number;
  bodyY: number;
  bodyWidth: number;
  bodyHeight: number;
  bodyRadius: number;
  /** 화면 자리 — iframe 이 여기 놓인다 */
  screenX: number;
  screenY: number;
  /** 스킨 이미지 배율(px → 기기 단위). 스킨이 아니면 1 */
  skinScale: number;
};

const BUTTON_ROOM = 4;

export function chromeGeometry(device: LabDevice, skinAvailable: boolean): ChromeGeometry {
  const { width: w, height: h } = device;
  if (device.platform === "android" && device.skin && skinAvailable) {
    const s = device.skin;
    const scale = w / s.displayWidth;
    return {
      kind: "android-skin",
      outerWidth: s.frameWidth * scale,
      outerHeight: s.frameHeight * scale,
      bodyX: 0,
      bodyY: 0,
      bodyWidth: s.frameWidth * scale,
      bodyHeight: s.frameHeight * scale,
      bodyRadius: 0,
      screenX: s.displayX * scale,
      screenY: s.displayY * scale,
      skinScale: scale,
    };
  }
  if (device.bottomBar === "home-button") {
    const side = 24;
    const top = 104;
    return {
      kind: "ios-home-button",
      outerWidth: w + side * 2 + BUTTON_ROOM * 2,
      outerHeight: h + top * 2,
      bodyX: BUTTON_ROOM,
      bodyY: 0,
      bodyWidth: w + side * 2,
      bodyHeight: h + top * 2,
      bodyRadius: 64,
      screenX: BUTTON_ROOM + side,
      screenY: top,
      skinScale: 1,
    };
  }
  const bezel = device.platform === "ios" ? 15 : 12;
  return {
    kind: device.platform === "ios" ? "ios" : "android",
    outerWidth: w + bezel * 2 + BUTTON_ROOM * 2,
    outerHeight: h + bezel * 2,
    bodyX: BUTTON_ROOM,
    bodyY: 0,
    bodyWidth: w + bezel * 2,
    bodyHeight: h + bezel * 2,
    bodyRadius: device.cornerRadius + bezel,
    screenX: BUTTON_ROOM + bezel,
    screenY: bezel,
    skinScale: 1,
  };
}

/** 옆 버튼 — 몸통 높이에 대한 비율(위치 · 길이). 실물 사진의 배치를 따른 근사 */
export type SideButton = { side: "left" | "right"; top: number; length: number };

export function sideButtons(kind: ChromeKind, bodyHeight: number): SideButton[] {
  const at = (side: SideButton["side"], top: number, length: number): SideButton => ({
    side,
    top: top * bodyHeight,
    length: length * bodyHeight,
  });
  switch (kind) {
    case "ios":
      return [
        at("left", 0.135, 0.038),
        at("left", 0.205, 0.072),
        at("left", 0.295, 0.072),
        at("right", 0.25, 0.11),
      ];
    case "ios-home-button":
      return [
        at("left", 0.13, 0.034),
        at("left", 0.205, 0.062),
        at("left", 0.285, 0.062),
        at("right", 0.205, 0.075),
      ];
    case "android":
      return [at("right", 0.22, 0.07), at("right", 0.33, 0.13)];
    case "android-skin":
      return [];
  }
}
