import { describe, expect, it } from "@jest/globals";
import { decodeFrameConfig, encodeFrameConfig } from "../../lab-contract";
import { findDevice, labDevices, skinFile } from "../../lab-devices";
import { chromeGeometry } from "../device/geometry";
import { framesFor } from "../frameSpecs";
import {
  DEFAULT_STATE,
  parseHash,
  serializeHash,
  stepZoom,
  withPlatform,
  withRoute,
  type ShellState,
} from "../hashState";
import { shellRoutes } from "../routes";
import { describeVirtual, setClock, shiftDays, statusBarClock } from "../time";

const REAL = Date.parse("2026-11-02T14:05:00+09:00");
const noSample = () => ({});

describe("해시 상태", () => {
  it("모든 값이 해시를 한 바퀴 돌아도 같다", () => {
    const state: ShellState = {
      route: "/diary/[id]",
      dataset: "many",
      platform: "android",
      device: "pixel-8",
      layout: "ab",
      signedIn: false,
      now: "2026-11-03T21:30:00+09:00",
      latencyMs: 5000,
      failPaths: ["/api/v1/reports", "/api/v1/diaries"],
      textScale: 1.3,
      zoom: 1.5,
      b: { dataset: "long-copy", latencyMs: 60_000, failPaths: ["/api/v1/diaries"] },
      repeatToday: false,
      panel: "agent",
      navOpen: false,
      sideOpen: false,
      group: "gmhxyz12",
    };
    const hash = serializeHash(state);
    expect(hash.startsWith("#/screens?route=/diary/%5Bid%5D")).toBe(true);
    expect(parseHash(hash)).toEqual(state);
  });

  it("기본값은 적지 않는다", () => {
    expect(serializeHash(DEFAULT_STATE)).toBe(
      "#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=single",
    );
  });

  it("읽을 수 없는 값은 기본값으로 — 다른 플랫폼의 기기는 그 플랫폼 기본 기기로", () => {
    const state = parseHash(
      "#/screens?route=/nope&dataset=x&platform=android&device=iphone-16&layout=zzz&now=bad&zoom=9",
    );
    expect(state).toEqual({ ...DEFAULT_STATE, platform: "android", device: "pixel-8" });
  });

  it("옛 주소의 확대 값(0.1 ~ 2)도 그대로 읽고, 패널 접기가 없으면 둘 다 펼친 것으로", () => {
    const state = parseHash("#/screens?route=/home&layout=ab&zoom=0.6");
    expect(state).toMatchObject({ zoom: 0.6, navOpen: true, sideOpen: true });
    expect(parseHash("#/screens?route=/home&zoom=2").zoom).toBe(2);
    expect(parseHash("#/screens?route=/home&zoom=2.5").zoom).toBe("fit");
    // 옛 「요청」 탭은 조작 패널로
    expect(parseHash("#/screens?route=/home&panel=log").panel).toBe("controls");
  });

  it("지운 기능의 옛 주소도 열린다 — 상태별로 보기 · 데이터별 매트릭스 · 디자인 편집 · 참고 시안 · 시안", () => {
    expect(parseHash("#/screens?route=/report&layout=states")).toMatchObject({
      route: "/report",
      layout: "single",
    });
    const matrix = parseHash("#/screens?route=/report&layout=matrix&matrix=datasets");
    expect(matrix.layout).toBe("matrix");
    expect(serializeHash(matrix)).not.toContain("matrix=");
    for (const panel of ["design", "reference", "log"]) {
      expect(parseHash(`#/screens?route=/home&panel=${panel}`).panel).toBe("controls");
    }
    const old = parseHash("#/screens?route=/home&layout=ab&draft=v1");
    expect(old).toEqual({ ...DEFAULT_STATE, layout: "ab" });
    expect(serializeHash(old)).not.toContain("draft=");
  });

  it("B 화면 상태 — bdata 가 없거나 읽을 수 없으면 A와 같게", () => {
    expect(parseHash("#/screens?route=/home&layout=ab").b).toBeNull();
    expect(parseHash("#/screens?route=/home&layout=ab&bdata=zzz&blatency=5").b).toBeNull();
    expect(parseHash("#/screens?route=/home&layout=ab&bdata=many").b).toEqual({
      dataset: "many",
      latencyMs: 0,
      failPaths: [],
    });
  });

  it("−/+ 는 계단을 밟고, 맞춤 배율에서도 다음 칸으로 간다", () => {
    expect(stepZoom(1, 1)).toBe(1.1);
    expect(stepZoom(1, -1)).toBe(0.9);
    expect(stepZoom(0.82, 1)).toBe(0.9);
    expect(stepZoom(0.82, -1)).toBe(0.75);
    expect(stepZoom(2, 1)).toBe(2);
    expect(stepZoom(0.25, -1)).toBe(0.25);
  });

  it("라우트를 고르면 그 화면의 프리셋이 적용된다", () => {
    const login = withRoute(DEFAULT_STATE, "/login");
    expect(login).toMatchObject({ signedIn: false, dataset: "new-user" });
    // 로그인 전 → 일반 화면으로 오면 new-user 를 벗고 normal 로
    expect(withRoute(login, "/home")).toMatchObject({ signedIn: true, dataset: "normal" });
    // 사용자가 고른 데이터 세트는 유지
    expect(withRoute({ ...DEFAULT_STATE, dataset: "many" }, "/report")).toMatchObject({
      dataset: "many",
    });
  });

  it("B 화면 상태도 화면을 옮길 때 같은 규칙 — 온보딩이면 신규 사용자, 나오면 보통", () => {
    const b = { dataset: "many" as const, latencyMs: 60_000, failPaths: [] };
    const ab: ShellState = { ...DEFAULT_STATE, layout: "ab", b };
    expect(withRoute(ab, "/report").b).toEqual(b);
    const onboarding = withRoute(ab, "/mood");
    expect(onboarding.b).toEqual({ ...b, dataset: "new-user" });
    expect(withRoute(onboarding, "/home").b).toEqual({ ...b, dataset: "normal" });
    expect(withRoute(DEFAULT_STATE, "/report").b).toBeNull();
  });

  it("스플래시가 건 실패 주소는 떠날 때 거두고, 사용자가 고친 것은 둔다", () => {
    const splash = withRoute(DEFAULT_STATE, "/");
    expect(splash.failPaths).toEqual(["/api/v1/users/me"]);
    expect(withRoute(splash, "/home").failPaths).toEqual([]);
    const custom = { ...splash, failPaths: ["/api/v1/users/me", "/api/v1/reports"] };
    expect(withRoute(custom, "/home").failPaths).toEqual(custom.failPaths);
  });

  it("플랫폼을 바꾸면 그 플랫폼의 기본 기기", () => {
    expect(withPlatform(DEFAULT_STATE, "android").device).toBe("pixel-8");
  });
});

describe("가상 시각", () => {
  it("하루 넘기기는 실제 시각에서 시작해 시·분을 지킨다", () => {
    const next = shiftDays(null, 1, REAL);
    expect(next).toBe("2026-11-03T14:05:00+09:00");
    expect(shiftDays(next, -2, REAL)).toBe("2026-11-01T14:05:00+09:00");
  });

  it("시각 프리셋은 가상 날짜를 지킨다", () => {
    expect(setClock("2026-11-05T10:00:00+09:00", "03:59", REAL)).toBe("2026-11-05T03:59:00+09:00");
    expect(setClock(null, "21:30", REAL)).toBe("2026-11-02T21:30:00+09:00");
  });

  it("가상 날짜를 사람 말로", () => {
    expect(describeVirtual("2026-11-03T21:30:00+09:00", REAL)).toBe(
      "11월 3일 (화) 21:30 · 실제보다 +1일",
    );
    expect(describeVirtual("2026-11-01T08:00:00+09:00", REAL)).toBe(
      "11월 1일 (일) 08:00 · 실제보다 −1일",
    );
    expect(describeVirtual(null, REAL)).toBe("11월 2일 (월) 14:05 · 실제 시각");
  });

  it("상태바 시계는 12시간제 · 앞자리 0 없음", () => {
    expect(statusBarClock("2026-11-03T21:30:00+09:00", REAL)).toBe("9:30");
    expect(statusBarClock("2026-11-03T00:05:00+09:00", REAL)).toBe("12:05");
    expect(statusBarClock(null, REAL)).toBe("2:05");
  });
});

describe("프레임 목록", () => {
  it("한 화면 — 프레임 하나 · 기기 · 시각 · 오늘 다시 쓰기가 설정에 실린다", () => {
    const [solo, ...rest] = framesFor(
      { ...DEFAULT_STATE, now: "2026-11-03T21:30:00+09:00", repeatToday: false },
      noSample,
      REAL,
    );
    expect(rest).toEqual([]);
    expect(solo!.config).toEqual({
      frameId: "solo",
      datasetId: "normal",
      platform: "ios",
      deviceId: "iphone-16",
      now: "2026-11-03T21:30:00+09:00",
      signedIn: true,
      latencyMs: 0,
      failPaths: [],
      repeatToday: false,
    });
    expect(solo!.href).toBe("/home");
    expect(decodeFrameConfig(encodeFrameConfig(solo!.config))).toEqual(solo!.config);
  });

  it("A/B — B 화면 상태가 없으면 A와 같은 설정, 있으면 B 만 그 데이터 · 지연 · 실패 주소", () => {
    const [a, b] = framesFor({ ...DEFAULT_STATE, layout: "ab" }, noSample, REAL);
    expect([a!.frameId, b!.frameId]).toEqual(["A", "B"]);
    expect({ ...b!.config, frameId: "A" }).toEqual(a!.config);
    const [a2, b2] = framesFor(
      {
        ...DEFAULT_STATE,
        layout: "ab",
        b: { dataset: "many", latencyMs: 60_000, failPaths: ["/api/v1/schedules"] },
      },
      noSample,
      REAL,
    );
    expect(a2!.config).toMatchObject({ datasetId: "normal", latencyMs: 0, failPaths: [] });
    expect(b2!.config).toMatchObject({
      datasetId: "many",
      latencyMs: 60_000,
      failPaths: ["/api/v1/schedules"],
    });
    // 데이터 세트가 묶인 화면(온보딩)은 B 도 그 세트
    const [, b3] = framesFor(
      {
        ...DEFAULT_STATE,
        route: "/mood",
        dataset: "new-user",
        layout: "ab",
        b: { dataset: "many", latencyMs: 0, failPaths: [] },
      },
      noSample,
      REAL,
    );
    expect(b3!.config.datasetId).toBe("new-user");
  });

  it("기기별로 보기 — 표의 모든 기기", () => {
    const byDevice = framesFor({ ...DEFAULT_STATE, layout: "matrix" }, noSample, REAL);
    expect(byDevice.map((f) => f.config.deviceId)).toEqual(labDevices.map((d) => d.id));
    expect(byDevice.find((f) => f.config.deviceId === "pixel-8")!.config.platform).toBe("android");
  });

  it("전체 화면 — 라우트마다 하나, 프리셋대로", () => {
    const grid = framesFor({ ...DEFAULT_STATE, layout: "grid" }, noSample, REAL);
    expect(grid).toHaveLength(shellRoutes.length);
    const login = grid.find((f) => f.route.path === "/login")!;
    expect(login.config).toMatchObject({ signedIn: false, datasetId: "new-user" });
    const mood = grid.find((f) => f.route.path === "/mood")!;
    expect(mood.config).toMatchObject({ signedIn: true, datasetId: "new-user" });
    expect(new Set(grid.map((f) => f.frameId)).size).toBe(grid.length);
  });

  it("글씨 배율은 1 이 아닐 때만 싣는다", () => {
    const [plain] = framesFor(DEFAULT_STATE, noSample, REAL);
    expect("textScale" in plain!.config).toBe(false);
    const [large] = framesFor({ ...DEFAULT_STATE, textScale: 1.5 }, noSample, REAL);
    expect(large!.config.textScale).toBe(1.5);
  });
});

describe("기기 외형", () => {
  it("모든 기기의 안전 영역 위쪽은 상태바보다 작지 않다 · 출처가 있다", () => {
    for (const device of labDevices) {
      expect(device.insets.top).toBeGreaterThanOrEqual(device.statusBarHeight);
      expect(device.source.length).toBeGreaterThan(10);
      expect(device.source).not.toMatch(/미확인/);
    }
  });

  it("Pixel 8 스킨은 화면 폭에 맞춰 줄이고 화면 자리를 layout 그대로 옮긴다", () => {
    const g = chromeGeometry(findDevice("pixel-8"), true);
    const scale = 412 / 1080;
    expect(g.kind).toBe("android-skin");
    expect(g.screenX).toBeCloseTo(49 * scale);
    expect(g.screenY).toBeCloseTo(55 * scale);
    expect(g.outerWidth).toBeCloseTo(1187 * scale);
  });

  it("Galaxy S24 삼성 스킨은 bodyCrop 만 외형이다 — 겉 크기 = crop × 배율 · 화면 자리 = (display − crop) × 배율", () => {
    const device = findDevice("galaxy-s24");
    const skin = device.skin!;
    const crop = skin.bodyCrop!;
    const g = chromeGeometry(device, true);
    const scale = 360 / 1080;
    expect(g.kind).toBe("android-skin");
    expect(g.outerWidth).toBeCloseTo(crop.width * scale);
    expect(g.outerHeight).toBeCloseTo(crop.height * scale);
    expect(g.screenX).toBeCloseTo((skin.displayX - crop.x) * scale);
    expect(g.screenY).toBeCloseTo((skin.displayY - crop.y) * scale);
    // 배경 그림은 통째로 그리되 crop 만큼 밀어 몸통만 보인다
    expect(g.skinX).toBeCloseTo(-crop.x * scale);
    expect(g.skinY).toBeCloseTo(-crop.y * scale);
    expect(g.skinWidth).toBeCloseTo(skin.frameWidth * scale);
    // 화면이 외형 안에 다 들어간다
    expect(g.screenX + device.width).toBeLessThanOrEqual(g.outerWidth);
    expect(g.screenY + device.height).toBeLessThanOrEqual(g.outerHeight);
    expect(skinFile(skin, "back")).toBe("back.png");
    expect(skinFile(findDevice("pixel-8").skin!, "mask")).toBe("mask.webp");
  });

  it("스킨이 없는 Galaxy 는 같은 수치의 SVG 외형 — 펀치홀이 화면 가운데 · 상태바 안", () => {
    for (const id of ["galaxy-s24", "galaxy-a35", "galaxy-a55"]) {
      const device = findDevice(id);
      const g = chromeGeometry(device, false);
      expect(g.kind).toBe("android");
      expect(g.bodyRadius).toBeCloseTo(device.cornerRadius + 12);
      expect(device.cutout.kind).toBe("punch-hole");
      if (device.cutout.kind !== "punch-hole") continue;
      expect(device.cutout.centerX).toBeCloseTo(device.width / 2);
      // A55 는 실측 펀치홀 아래(23 + 66px)가 상태바(89px)와 거의 같다 — 반올림 여유 0.1
      expect(device.cutout.top + device.cutout.diameter).toBeLessThanOrEqual(
        device.statusBarHeight + 0.1,
      );
      expect(device.bottomBar).toBe("gesture-bar");
    }
  });

  it("스킨이 없으면 SVG 외형 · SE 는 홈 버튼 외형", () => {
    expect(chromeGeometry(findDevice("pixel-8"), false).kind).toBe("android");
    expect(chromeGeometry(findDevice("iphone-se-3"), false).kind).toBe("ios-home-button");
    const g = chromeGeometry(findDevice("iphone-16"), false);
    expect(g.bodyRadius).toBe(55 + 15);
  });
});
