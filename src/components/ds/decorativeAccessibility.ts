import { Platform } from "react-native";

/** Keep decorative artwork out of each platform's accessibility tree. */
export const decorativeAccessibilityProps =
  Platform.OS === "web"
    ? ({ "aria-hidden": true } as const)
    : ({
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants",
      } as const);
