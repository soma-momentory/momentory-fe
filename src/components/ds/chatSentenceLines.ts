/** 표시할 때만 문장 사이를 한 줄씩 나눈다. 전송·저장하는 원문은 바꾸지 않는다. */
export function chatSentenceLines(message: string): string {
  return message
    .split(/\r?\n/)
    .map((line) =>
      line.trim().replace(/([.!?。！？…]+[”’"'）)\]]*)(?:[ \t]+(?=\S)|(?=[가-힣]))/gu, "$1\n"),
    )
    .filter(Boolean)
    .join("\n");
}
