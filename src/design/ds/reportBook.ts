import { fontFamily } from "./typography";

/**
 * 주간 리포트 공책의 색 · 글자 크기 — 책상 위 스프링 공책 한 권(2026-11-04 시안 v10).
 * 공책 안에서만 쓴다. 글자는 손글씨 최소 14(`DESIGN.md`)를 지킨다.
 */
export const reportBook = {
  color: {
    kraft: "#E5CCA3",
    kraftBack: "#C6A679",
    stitch: "rgba(255,255,255,.7)",
    band: "#567049",
    bandEdge: "#4A6143",
    page: "#FBF8F1",
    pageEdge: "#F6EFE2",
    pageLine: "#D8CAB2",
    rule: "#E4DACA",
    label: "#FBF8F1",
    green: "#5B7553",
    honey: "#DDAF6C",
    honeySoft: "#EBD2A4",
    honeyInk: "#C08A3E",
    card: "#FFFEFB",
    cardBorder: "#D9CDB8",
    tape: "#E9D6BF",
    tagTape: "#CDAE8A",
    tabs: ["#EBDCC6", "#D9C3A2", "#C9D2B4"],
    ring: "#6B5847",
    ringBack: "#9A8874",
    ringShine: "#F1E9DB",
    hole: "#3F2C1F",
    shadow: "#48291A",
    empty: "#E4DACA",
    faded: "#D9CDB8",
    fieldLine: "#BFB09A",
    curl: "#EFE6D6",
    fold: "rgba(72,41,26,.16)",
  },
  shadow: {
    book: "0px 12px 16px rgba(72,41,26,.2)",
    label: "0px 1px 2px rgba(72,41,26,.25)",
  },
  font: fontFamily.hand,
  size: {
    rings: { pitch: 28, width: 34, out: 15 },
    tab: { width: 15, onWidth: 21, height: 32, pitch: 42, top: 30 },
  },
} as const;
