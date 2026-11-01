/**
 * 그림 붙이기 — 여러 장 · 끌어 놓기 · 고르기 · 붙여넣기(Ctrl+V). 장마다 용도와 짧은 설명을 단다.
 * 서버는 받은 그림을 작업 공간의 `.lab-attachments/<실행>/` 에 원본 이름 그대로 쓰고 경로를 AI 에게 넘긴다.
 */
import { useRef, useState, type ClipboardEvent, type DragEvent } from "react";

import { shellColor } from "../shell/theme";
import type { Attachment } from "./types";
import { Btn, Chip, inputStyle, Note, smallStyle } from "./ui";

/** 이보다 크면 한 줄 경고(막지는 않는다) */
export const LARGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;

let nextId = 0;

/** File → Attachment(data: URL). 그림이 아니면 null. */
export function readAttachment(file: File): Promise<Attachment | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id: `att-${(nextId += 1)}`,
        name: file.name || "붙여넣은 그림.png",
        dataUrl: String(reader.result ?? ""),
        size: file.size,
        purpose: "reference",
        note: "",
      });
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/** 서버로 보낼 모양 */
export const toPayload = (list: readonly Attachment[]) =>
  list.map(({ name, dataUrl, purpose, note }) => ({ name, dataUrl, purpose, note }));

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
    : `${Math.max(1, Math.round(bytes / 1024))}KB`;

export function AttachmentPicker({
  value,
  onChange,
  disabled,
}: {
  value: readonly Attachment[];
  onChange: (next: Attachment[]) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [skipped, setSkipped] = useState(0);

  const add = async (files: readonly File[]) => {
    const read = await Promise.all(files.map(readAttachment));
    const images = read.filter((a): a is Attachment => a != null);
    setSkipped(read.length - images.length);
    if (images.length > 0) onChange([...value, ...images]);
  };
  const update = (id: string, patch: Partial<Attachment>) =>
    onChange(value.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!disabled) void add([...event.dataTransfer.files]);
  };
  const onPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const files = [...event.clipboardData.files];
    if (files.length === 0 || disabled) return;
    event.preventDefault();
    void add(files);
  };
  const large = value.filter((a) => a.size > LARGE_ATTACHMENT_BYTES);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onPaste={onPaste}
      tabIndex={-1}
      aria-label="그림 붙이는 곳"
      style={{
        border: `1px dashed ${dragging ? shellColor.accent : shellColor.border}`,
        borderRadius: 8,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        background: dragging ? shellColor.accentSoft : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Btn
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
          title="그림 파일을 골라요. 여기에 끌어 놓거나 Ctrl+V 로 붙여 넣어도 돼요"
        >
          그림 붙이기
        </Btn>
        <span style={smallStyle}>끌어 놓기 · Ctrl+V 도 돼요 (선택)</span>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-label="그림 파일 고르기"
          onChange={(e) => {
            void add([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </div>
      {value.map((a) => (
        <div key={a.id} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <img
            src={a.dataUrl}
            alt={a.name}
            style={{
              width: 56,
              height: 56,
              objectFit: "cover",
              borderRadius: 6,
              border: `1px solid ${shellColor.border}`,
            }}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <div
              style={{
                ...smallStyle,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {a.name} · {formatSize(a.size)}
            </div>
            <div
              style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
              role="group"
              aria-label={`${a.name} 용도`}
            >
              <Chip
                selected={a.purpose === "reference"}
                disabled={disabled}
                onClick={() => update(a.id, { purpose: "reference" })}
              >
                참고용 (이렇게 보이게)
              </Chip>
              <Chip
                selected={a.purpose === "asset"}
                disabled={disabled}
                onClick={() => update(a.id, { purpose: "asset" })}
              >
                앱에 넣기 (이 그림을 그대로 사용)
              </Chip>
            </div>
            <input
              style={inputStyle}
              value={a.note}
              disabled={disabled}
              aria-label={`${a.name} 설명`}
              placeholder="짧은 설명 — 예: 쉼터 카드 오른쪽 위에 들어갈 바바"
              onChange={(e) => update(a.id, { note: e.target.value })}
            />
          </div>
          <Btn
            disabled={disabled}
            onClick={() => onChange(value.filter((x) => x.id !== a.id))}
            aria-label={`${a.name} 빼기`}
          >
            빼기
          </Btn>
        </div>
      ))}
      {large.length > 0 ? (
        <Note tone="danger">10MB 가 넘는 그림이 있어요 — 보내는 데 오래 걸릴 수 있어요</Note>
      ) : null}
      {skipped > 0 ? <Note tone="danger">그림이 아닌 파일 {skipped}개는 빼 두었어요</Note> : null}
    </div>
  );
}
