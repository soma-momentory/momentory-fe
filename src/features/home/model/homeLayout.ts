export type HomeLayoutMode = "listOnly" | "wholeBody";

/** The dock covers this much of the list viewport; the card adds a small top gap. */
export const HOME_LIST_GAP = 10;
const HYSTERESIS_ROWS = 0.5;

/** Use the same measured row pitch that ScheduleList uses for drag and row placement. */
export function homeLayoutMode({
  availableHeight,
  rowPitch,
  emptyHeight = 0,
  previous = "listOnly",
}: {
  availableHeight: number;
  rowPitch: number;
  emptyHeight?: number;
  previous?: HomeLayoutMode;
}): HomeLayoutMode {
  const minimum = Math.max(2 * rowPitch, emptyHeight) + HOME_LIST_GAP;
  const returnMargin = previous === "wholeBody" ? rowPitch * HYSTERESIS_ROWS : 0;
  return availableHeight < minimum + returnMargin ? "wholeBody" : "listOnly";
}
