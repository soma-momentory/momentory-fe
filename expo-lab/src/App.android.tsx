import { useFonts } from "expo-font";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { background } from "../../src/design/ds";
import { approvedDesign } from "../../src/design/studioDesign";
import { HomeV2Preview } from "./claude-home/HomeV2Preview";

/** Android QA entry for the existing Design Lab. It uses the production home view and local fixtures. */
export function App() {
  const [fontsLoaded] = useFonts({
    "Gaegu-Regular": require("../../assets/fonts/Gaegu-Regular.ttf"),
    "Gaegu-Bold": require("../../assets/fonts/Gaegu-Bold.ttf"),
    KyoboHandwriting2025lyb: require("../../assets/fonts/KyoboHandwriting2025lyb.ttf"),
  });
  const [scenarioId, setScenarioId] = useState("5b");
  const [message, setMessage] = useState("Mock data only");

  if (!fontsLoaded)
    return (
      <View style={styles.root}>
        <Text>Loading local fonts...</Text>
      </View>
    );

  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <View style={styles.toolbar}>
          <Text style={styles.title}>Momentory Android QA</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show empty home"
            onPress={() => setScenarioId("5a")}
            style={styles.button}
          >
            <Text>Empty</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Show two schedules"
            onPress={() => setScenarioId("5b")}
            style={styles.button}
          >
            <Text>Two</Text>
          </Pressable>
        </View>
        <View style={styles.preview}>
          <HomeV2Preview
            key={scenarioId}
            design={approvedDesign}
            scenarioId={scenarioId}
            onMessage={setMessage}
          />
        </View>
        <Text accessibilityLabel={`QA message: ${message}`} style={styles.message}>
          {message}
        </Text>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: background.normal },
  toolbar: { flexDirection: "row", alignItems: "center", gap: 8, padding: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: "700" },
  button: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: background.elevated },
  preview: { flex: 1 },
  message: { padding: 4, fontSize: 10, textAlign: "center" },
});
