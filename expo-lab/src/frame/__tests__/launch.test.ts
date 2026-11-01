import { describe, expect, it } from "@jest/globals";

import { DEFAULT_FRAME_CONFIG, encodeFrameConfig } from "../../lab-contract";
import { configFromQuery, resolveLaunch } from "../launch";

describe("frame launch", () => {
  it("stays in shell mode in the top window without ?labFrame=1", () => {
    expect(resolveLaunch({ name: "", search: "", inIframe: false })).toEqual({ mode: "shell" });
    expect(resolveLaunch({ name: "", search: "?labFrame=0", inIframe: false })).toEqual({
      mode: "shell",
    });
  });

  it("reads the frame config from window.name inside an iframe", () => {
    const config = { ...DEFAULT_FRAME_CONFIG, frameId: "a", platform: "android" as const };
    expect(resolveLaunch({ name: encodeFrameConfig(config), search: "", inIframe: true })).toEqual({
      mode: "frame",
      config,
    });
  });

  it("prefers window.name over query params", () => {
    const config = { ...DEFAULT_FRAME_CONFIG, frameId: "named" };
    const launch = resolveLaunch({
      name: encodeFrameConfig(config),
      search: "?labFrame=1&frameId=query",
      inIframe: false,
    });
    expect(launch).toEqual({ mode: "frame", config });
  });

  it("falls back to defaults merged with query params", () => {
    const launch = resolveLaunch({
      name: "",
      search: "?labFrame=1&dataset=many&os=android&signedIn=false&now=2026-11-02T21:30:00%2B09:00",
      inIframe: false,
    });
    expect(launch).toEqual({
      mode: "frame",
      config: {
        ...DEFAULT_FRAME_CONFIG,
        datasetId: "many",
        platform: "android",
        deviceId: "pixel-8",
        signedIn: false,
        now: "2026-11-02T21:30:00+09:00",
      },
    });
  });

  it("lets the device decide the platform and ignores unknown values", () => {
    const config = configFromQuery(
      "?device=iphone-se-3&platform=android&dataset=nope&now=garbage&latency=-3",
    );
    expect(config.deviceId).toBe("iphone-se-3");
    expect(config.platform).toBe("ios");
    expect(config.datasetId).toBe(DEFAULT_FRAME_CONFIG.datasetId);
    expect(config.now).toBeNull();
    expect(config.latencyMs).toBe(0);
  });

  it("reads latency, failing paths and a design draft", () => {
    const config = configFromQuery("?latency=400&fail=/api/v1/reports,/api/v1/letters&draft=d1");
    expect(config.latencyMs).toBe(400);
    expect(config.failPaths).toEqual(["/api/v1/reports", "/api/v1/letters"]);
    expect(config.designDraftId).toBe("d1");
  });

  it("treats an iframe with no name as a frame with defaults", () => {
    expect(resolveLaunch({ name: "", search: "", inIframe: true })).toEqual({
      mode: "frame",
      config: DEFAULT_FRAME_CONFIG,
    });
  });
});
