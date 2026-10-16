import { Image, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path, Rect } from "react-native-svg";

import { claudeHomeColor as c } from "../claude-home/tokens";
import { CurrentHomeMockPreview } from "../current-home/MockPreview";
import type { InboxScenarioId, WeatherScenarioId } from "../claude-home/validationScenarios";
import { captureAssets } from "./captures";
import type { CatalogScreen } from "./screens";
import { captureThumbnails } from "./thumbnails";
import type { LabVariant } from "./variants";

export const devices = [
  { label: "iPhone 13 mini", width: 375, height: 812 },
  { label: "iPhone 16e", width: 390, height: 844 },
  { label: "원본 402", width: 402, height: 874 },
  { label: "iPhone 16 Plus", width: 430, height: 932 },
] as const;
export type PreviewDevice = (typeof devices)[number];

function ScaledPhone({
  width,
  height,
  scale,
  children,
}: {
  width: number;
  height: number;
  scale: number;
  children: React.ReactNode;
}) {
  return (
    <View style={{ width: width * scale, height: height * scale, alignSelf: "center" }}>
      <View style={{ width, height, transform: [{ scale }], transformOrigin: "top left" }}>
        {children}
      </View>
    </View>
  );
}

export function CapturePhone({
  screen,
  device,
  scale = 1,
  thumbnail = false,
}: {
  screen: CatalogScreen;
  device: PreviewDevice;
  scale?: number;
  thumbnail?: boolean;
}) {
  return (
    <ScaledPhone width={device.width + 14} height={device.height + 14} scale={scale}>
      <View style={[styles.capturePhone, { width: device.width + 14, height: device.height + 14 }]}>
        <Image
          accessibilityLabel={`${screen.title} 실제 앱 화면 캡처`}
          source={thumbnail ? captureThumbnails[screen.id] : captureAssets[screen.id]}
          resizeMode="stretch"
          style={{ width: device.width, height: device.height }}
        />
      </View>
    </ScaledPhone>
  );
}

function PreviewStatusBar({ width }: { width: number }) {
  return (
    <View style={styles.statusBar}>
      <Svg pointerEvents="none" width={width} height={62} style={StyleSheet.absoluteFill}>
        {Array.from({ length: Math.ceil(width / 22) + 1 }, (_, index) => (
          <Line
            key={`v${index}`}
            x1={index * 22}
            y1={0}
            x2={index * 22}
            y2={62}
            stroke={c.grid}
            strokeWidth={1}
          />
        ))}
        {[0, 22, 44].map((y) => (
          <Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke={c.grid} strokeWidth={1} />
        ))}
      </Svg>
      <Text style={styles.statusTime}>9:41</Text>
      <Svg width={74} height={20} viewBox="0 0 74 20" fill={c.statusInk}>
        <Rect x={0} y={13} width={3} height={5} rx={1} />
        <Rect x={4} y={10} width={3} height={8} rx={1} />
        <Rect x={8} y={7} width={3} height={11} rx={1} />
        <Rect x={12} y={4} width={3} height={14} rx={1} />
        <Path d="M27 7c4-4 12-4 16 0l-2 2c-3-3-9-3-12 0zM31 11c2-2 6-2 8 0l-4 5z" />
        <Rect
          x={53}
          y={4}
          width={18}
          height={13}
          rx={3}
          fill="none"
          stroke={c.statusInk}
          strokeWidth={1.5}
        />
        <Rect x={55} y={6} width={14} height={9} rx={1} />
        <Rect x={72} y={8} width={2} height={5} rx={1} />
      </Svg>
    </View>
  );
}

export function VariantPhone({
  variant,
  scenarioId,
  weatherId,
  inboxId,
  fontScale,
  device,
  scale = 1,
  onMessage,
}: {
  variant: LabVariant;
  scenarioId: string;
  weatherId: WeatherScenarioId;
  inboxId: InboxScenarioId;
  fontScale: 1 | 1.3;
  device: PreviewDevice;
  scale?: number;
  onMessage: (message: string) => void;
}) {
  return (
    <ScaledPhone width={device.width + 20} height={device.height + 20} scale={scale}>
      <View style={[styles.variantPhone, { width: device.width + 20, height: device.height + 20 }]}>
        <PreviewStatusBar width={device.width} />
        {variant.render({ scenarioId, weatherId, inboxId, fontScale, onMessage, scale })}
      </View>
    </ScaledPhone>
  );
}

export function CurrentHomePhone({
  scenarioId,
  device,
  scale = 1,
  onMessage,
}: {
  scenarioId: string;
  device: PreviewDevice;
  scale?: number;
  onMessage: (message: string) => void;
}) {
  return (
    <ScaledPhone width={device.width + 20} height={device.height + 20} scale={scale}>
      <View style={[styles.variantPhone, { width: device.width + 20, height: device.height + 20 }]}>
        <PreviewStatusBar width={device.width} />
        <CurrentHomeMockPreview scenarioId={scenarioId} onMessage={onMessage} scale={scale} />
      </View>
    </ScaledPhone>
  );
}

const styles = StyleSheet.create({
  capturePhone: {
    borderRadius: 42,
    borderWidth: 7,
    borderColor: c.bezel,
    backgroundColor: c.paper,
    overflow: "hidden",
    shadowColor: c.shadow,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  variantPhone: {
    borderRadius: 44,
    borderWidth: 10,
    borderColor: c.bezel,
    overflow: "hidden",
    backgroundColor: c.paper,
    shadowColor: c.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
  },
  statusBar: {
    height: 62,
    paddingLeft: 35,
    paddingRight: 26,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: c.paper,
  },
  statusTime: { color: c.statusInk, fontSize: 16, fontWeight: "700" },
});
