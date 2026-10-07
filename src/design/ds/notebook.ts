/** 일기 상세 · 사용자가 제공한 모눈종이/연필 드로잉 시안 (2026-10-07). */
import { background } from "./color";

export const notebook = {
  paper: background.normal,
  ink: "#514E48",
  gridStroke: "#DDDCD7",
  rule: "#8D8980",
  gridSize: 16,
} as const;
