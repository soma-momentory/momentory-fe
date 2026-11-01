/**
 * `react-native-safe-area-context` 심 — 진짜 모듈을 그대로 내보내되, **프레임 안에서는**
 * `SafeAreaProvider` 가 재지 않고 흉내 내는 기기의 안전 영역(`lab-devices.ts`)을 준다.
 *
 * 웹의 진짜 Provider 는 CSS `env(safe-area-inset-*)` 를 재는데, iframe 안에서는 늘 0 이다.
 * 컨텍스트 객체는 진짜 모듈의 것을 쓰므로 `useSafeAreaInsets` · `SafeAreaView` ·
 * React Navigation 의 Provider 호환층이 모두 같은 값을 본다.
 *
 * 셸(프레임 설정 없음)에서는 진짜 Provider 그대로다.
 */
import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions, View, type ViewProps } from "react-native";
import * as Real from "react-native-safe-area-context";

import { getFrameInsets } from "../runtime";

export * from "react-native-safe-area-context";

type Metrics = NonNullable<Real.Metrics>;

/** 지금 창 크기와 기기 여백으로 만든 측정값. 프레임이 아니면 `null` */
export function labWindowMetrics(width: number, height: number): Metrics | null {
  const insets = getFrameInsets();
  if (insets == null) return null;
  return { insets: { ...insets }, frame: { x: 0, y: 0, width, height } };
}

const windowSize = () =>
  typeof window === "undefined"
    ? { width: 0, height: 0 }
    : { width: window.innerWidth, height: window.innerHeight };

/** 앱이 `SafeAreaProvider initialMetrics` 로 넘기는 값 — 프레임이면 기기 값이다 */
export const initialWindowMetrics: Real.Metrics | null =
  labWindowMetrics(windowSize().width, windowSize().height) ?? Real.initialWindowMetrics;

function LabSafeAreaProvider({ children, style, ...rest }: ViewProps & { children?: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const metrics = labWindowMetrics(width, height)!;
  return (
    <View {...rest} style={[styles.fill, style]}>
      <Real.SafeAreaFrameContext.Provider value={metrics.frame}>
        <Real.SafeAreaInsetsContext.Provider value={metrics.insets}>
          {children}
        </Real.SafeAreaInsetsContext.Provider>
      </Real.SafeAreaFrameContext.Provider>
    </View>
  );
}

export function SafeAreaProvider(props: Real.SafeAreaProviderProps) {
  if (getFrameInsets() == null) return <Real.SafeAreaProvider {...props} />;
  const { initialMetrics: _metrics, initialSafeAreaInsets: _insets, ...rest } = props;
  return <LabSafeAreaProvider {...rest} />;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
