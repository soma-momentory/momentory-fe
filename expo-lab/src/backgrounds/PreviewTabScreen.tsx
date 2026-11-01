import { useContext, type ComponentProps } from "react";

import { Screen } from "../../../src/components/ds/Screen";
import { TabPaperBackground } from "../../../src/components/ds/TabPaperBackground";
import { PreviewBackgroundContext } from "./backgrounds";

/** The phone frame paints one image across the status bar and body, with no seam or double crop. */
export function PreviewTabScreen(props: ComponentProps<typeof Screen>) {
  const backgroundId = useContext(PreviewBackgroundContext);
  if (backgroundId === null) return <Screen {...props} />;
  return (
    <Screen
      {...props}
      surface={backgroundId === "grid" ? props.surface : "transparent"}
      grid={false}
      backdrop={backgroundId === "grid" ? <TabPaperBackground /> : null}
    />
  );
}
