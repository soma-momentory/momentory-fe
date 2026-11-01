import { createContext, useContext, useState, type ReactNode } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { SafeAreaInsetsContext, useSafeAreaInsets } from "react-native-safe-area-context";

/** The approved phone preview is 390pt wide. Height remains free to fit each device. */
export const DESIGN_WIDTH = 390;
export const DesignViewportContext = createContext({ scale: 1, active: false });

export function useDesignScale() {
  return useContext(DesignViewportContext).scale;
}

/** Scale the whole composition, rather than enlarging text independently of its artwork. */
export function DesignViewport({ children }: { children: ReactNode }) {
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: DESIGN_WIDTH, height: window.height });
  const scale = size.width / DESIGN_WIDTH;
  const safe = {
    top: insets.top / scale,
    right: insets.right / scale,
    bottom: insets.bottom / scale,
    left: insets.left / scale,
  };
  return (
    <View
      testID="design-viewport"
      style={styles.viewport}
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width <= 0 || layout.height <= 0) return;
        setSize((previous) =>
          previous.width === layout.width && previous.height === layout.height
            ? previous
            : { width: layout.width, height: layout.height },
        );
      }}
    >
      <DesignViewportContext.Provider value={{ scale, active: true }}>
        <SafeAreaInsetsContext.Provider value={safe}>
          <View
            testID="design-canvas"
            style={[
              styles.canvas,
              { width: DESIGN_WIDTH, height: size.height / scale, transform: [{ scale }] },
            ]}
          >
            {children}
          </View>
        </SafeAreaInsetsContext.Provider>
      </DesignViewportContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: { flex: 1, minHeight: 0 },
  canvas: { position: "absolute", top: 0, left: 0, transformOrigin: "top left" },
});
