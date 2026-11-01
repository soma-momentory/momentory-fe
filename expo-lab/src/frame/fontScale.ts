/**
 * 기기 글씨 배율 흉내 — 프레임 설정 `textScale` 을 **OS 글씨 배율처럼** 앱에 보인다.
 *
 * 웹(react-native-web)의 `Dimensions` · `useWindowDimensions` 는 `fontScale` 을 늘 1 로 준다.
 * 앱은 `useEffectiveFontScale()`(`src/components/ds/Text.tsx`)로 이 값을 읽어 줄 높이 등을 계산하는데,
 * Lab 의 `PreviewFontScaleContext` 는 1 보다 **큰** 쪽만 반영한다(`Math.max(native, preview)`).
 * 그래서 「작게(0.85)」를 고르면 글자만 작아지고 줄 높이는 1 기준으로 남았다 — 실기기와 다르다.
 *
 * 여기서 `Dimensions.get` 과 change 이벤트가 주는 `fontScale` 을 설정값으로 바꿔 두면, 실기기처럼
 * `useEffectiveFontScale()` 이 `min(fontScale, maxFontScale)` 을 돌려준다(1.3 상한도 그대로 걸린다).
 * 글자 크기 자체는 웹이 OS 배율을 곱해 주지 않으므로 `PreviewFontScaleContext`(FrameBridge)가 맡는다.
 *
 * 앱 코드는 고치지 않는다 — 프레임 문서 안의 react-native-web 싱글턴만 감싼다.
 */
type WindowMetrics = { fontScale: number; width: number; height: number; scale: number };
type DimensionsLike = {
  get: (dimension: "window" | "screen") => WindowMetrics;
  addEventListener: (
    type: "change",
    handler: (dims: { window?: WindowMetrics; screen?: WindowMetrics }) => void,
  ) => unknown;
};

const PATCHED = Symbol.for("momentory.lab.fontScale");

export function emulateFontScale(dimensions: DimensionsLike, fontScale: number | undefined): void {
  if (typeof fontScale !== "number" || !Number.isFinite(fontScale) || fontScale <= 0) return;
  if (fontScale === 1) return;
  const target = dimensions as DimensionsLike & { [PATCHED]?: boolean };
  if (target[PATCHED]) return;
  target[PATCHED] = true;

  const withScale = (metrics: WindowMetrics | undefined) =>
    metrics == null ? metrics : { ...metrics, fontScale };

  const get = dimensions.get.bind(dimensions);
  dimensions.get = (dimension) => withScale(get(dimension)) as WindowMetrics;

  const addEventListener = dimensions.addEventListener.bind(dimensions);
  dimensions.addEventListener = (type, handler) =>
    addEventListener(type, (dims) =>
      handler({ ...dims, window: withScale(dims.window), screen: withScale(dims.screen) }),
    );
}
