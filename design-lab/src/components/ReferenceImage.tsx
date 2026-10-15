type Props = {
  filename: string;
  opacity?: number;
  className?: string;
};

export function currentScreenUrl(filename: string): string {
  return `/current-screens/${encodeURIComponent(filename)}`;
}

export function ReferenceImage({ filename, opacity = 1, className }: Props) {
  return (
    <img
      className={className}
      src={currentScreenUrl(filename)}
      alt={`현재 앱 화면: ${filename}`}
      style={{ opacity }}
    />
  );
}
