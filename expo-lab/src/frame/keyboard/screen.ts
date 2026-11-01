/**
 * 프레임 안에서 `Dimensions.get("screen")` 을 **창 크기**로 맞춘다.
 *
 * 웹(react-native-web)의 `screen` 은 `window.screen` — 이 컴퓨터 모니터의 크기다(예: 1920×1080).
 * 폰에서는 화면 = 앱 창이다(edge-to-edge · 전체 화면). 앱의 `BottomSheet` 는 키보드 회피를
 * `Dimensions.get("screen").height - endCoordinates.screenY` 로 재는데(그 파일 머리말), 모니터
 * 높이로 재면 시트가 화면 밖으로 날아간다. 그래서 프레임에서만 `screen` 을 `window` 로 돌린다.
 *
 * 앱 코드는 고치지 않는다 — 프레임 문서 안의 react-native-web 싱글턴만 감싼다(`fontScale.ts` 와 같은 방식).
 */
type Metrics = { fontScale: number; width: number; height: number; scale: number };
type DimensionsLike = {
  get: (dimension: "window" | "screen") => Metrics;
  addEventListener: (
    type: "change",
    handler: (dims: { window?: Metrics; screen?: Metrics }) => void,
  ) => unknown;
};

const PATCHED = Symbol.for("momentory.lab.screenAsWindow");

export function emulateScreenAsWindow(dimensions: DimensionsLike): void {
  const target = dimensions as DimensionsLike & { [PATCHED]?: boolean };
  if (target[PATCHED]) return;
  target[PATCHED] = true;

  const get = dimensions.get.bind(dimensions);
  dimensions.get = (dimension) => get(dimension === "screen" ? "window" : dimension);

  const addEventListener = dimensions.addEventListener.bind(dimensions);
  dimensions.addEventListener = (type, handler) =>
    addEventListener(type, (dims) => handler({ ...dims, screen: dims.window ?? dims.screen }));
}
