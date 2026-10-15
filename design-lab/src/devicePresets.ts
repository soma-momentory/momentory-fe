/** Apple의 세로 방향 논리 화면 크기(pt). 웹 미리보기에서는 1pt를 1 CSS px로 취급한다. */
export const PREVIEW_DEVICES = [
  { id: "iphone-13-mini", label: "iPhone 13 mini", width: 375, height: 812 },
  { id: "iphone-16e", label: "iPhone 16e", width: 390, height: 844 },
  { id: "iphone-16-plus", label: "iPhone 16 Plus", width: 430, height: 932 },
] as const;

export type PreviewDevice = (typeof PREVIEW_DEVICES)[number];
export type PreviewDeviceId = PreviewDevice["id"];
