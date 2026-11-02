/** @jest-environment jsdom */
import { afterEach, describe, expect, it } from "@jest/globals";

import { FRAME_WEB_CSS, installFrameWebStyle } from "../webStyle";

describe("installFrameWebStyle", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("프레임 문서에 포커스 테두리를 끄는 스타일을 한 번만 넣는다", () => {
    installFrameWebStyle(document);
    installFrameWebStyle(document);
    const styles = document.head.querySelectorAll("style#momentory-lab-frame-web");
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toBe(FRAME_WEB_CSS);
    expect(FRAME_WEB_CSS).toContain("outline: none");
  });

  it("문서가 없으면 아무것도 하지 않는다", () => {
    expect(() => installFrameWebStyle(undefined)).not.toThrow();
  });
});
