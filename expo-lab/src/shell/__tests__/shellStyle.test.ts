/** @jest-environment jsdom */
import { afterEach, describe, expect, it } from "@jest/globals";

import { installShellWebStyle, SHELL_WEB_CSS } from "../shellStyle";

describe("installShellWebStyle", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("스크롤바 막대를 숨기는 스타일을 한 번만 넣는다", () => {
    installShellWebStyle(document);
    installShellWebStyle(document);
    const styles = document.head.querySelectorAll("style#momentory-lab-shell-web");
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toBe(SHELL_WEB_CSS);
    expect(SHELL_WEB_CSS).toContain("scrollbar-width: none");
    // 막대만 숨긴다 — 스크롤 자체를 막으면 패널 아래쪽에 갈 수 없다
    expect(SHELL_WEB_CSS).not.toContain("overflow");
  });

  it("문서가 없으면 아무것도 하지 않는다", () => {
    expect(() => installShellWebStyle(undefined)).not.toThrow();
  });
});
