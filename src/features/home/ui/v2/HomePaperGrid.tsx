import { V2PaperGrid } from "@/components/ds/V2PaperGrid";

/** Home keeps its test identifier while all v2 tabs share the same paper grid. */
export function HomePaperGrid() {
  return <V2PaperGrid testID="home-v2-grid" />;
}
