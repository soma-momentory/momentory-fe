import type { HeroStructureNode } from "./studioDesign";

const validId = /^[a-z][a-z0-9-]{0,39}$/;

export function validateHeroStructure(value: unknown): HeroStructureNode[] {
  if (!Array.isArray(value) || value.length > 8) throw new Error("Invalid hero structure");
  const ids = new Set<string>();
  let count = 0;
  const visit = (nodes: unknown[], depth: number): HeroStructureNode[] =>
    nodes.map((raw) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw))
        throw new Error("Invalid hero block");
      const node = raw as Record<string, unknown>;
      if (typeof node.id !== "string" || !validId.test(node.id) || ids.has(node.id))
        throw new Error("Invalid or duplicate hero block ID");
      ids.add(node.id);
      if (++count > 12) throw new Error("Too many hero blocks");
      if (
        node.kind === "text" &&
        Object.keys(node).length === 3 &&
        typeof node.text === "string" &&
        node.text.trim().length > 0 &&
        node.text.length <= 80 &&
        !/[\u0000-\u001f\u007f\u061c\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/u.test(node.text)
      )
        return { id: node.id, kind: "text", text: node.text };
      if (
        node.kind === "group" &&
        Object.keys(node).length === 3 &&
        depth === 0 &&
        Array.isArray(node.children) &&
        node.children.length <= 6
      )
        return { id: node.id, kind: "group", children: visit(node.children, depth + 1) };
      throw new Error("Unsupported hero block or nesting depth");
    });
  return visit(value, 0);
}

export function changeHeroStructure(
  nodes: HeroStructureNode[],
  action: {
    type: "add-text" | "add-group" | "remove" | "up" | "down" | "nest" | "unnest" | "text";
    id?: string;
    text?: string;
    newId?: string;
  },
): HeroStructureNode[] {
  const copy: HeroStructureNode[] = JSON.parse(JSON.stringify(nodes));
  const find = (id: string) => {
    for (const [index, node] of copy.entries()) {
      if (node.id === id) return { list: copy, index, parent: null as string | null };
      if (node.kind === "group") {
        const child = node.children.findIndex((item) => item.id === id);
        if (child >= 0) return { list: node.children, index: child, parent: node.id };
      }
    }
    throw new Error("Hero block not found");
  };
  if (action.type === "add-text" || action.type === "add-group") {
    if (!action.newId) throw new Error("Missing hero block ID");
    copy.push(
      action.type === "add-text"
        ? { id: action.newId, kind: "text", text: "새 정보" }
        : { id: action.newId, kind: "group", children: [] },
    );
  } else {
    const found = find(action.id ?? ""),
      node = found.list[found.index]!;
    if (action.type === "remove") found.list.splice(found.index, 1);
    else if (action.type === "text") {
      if (node.kind !== "text") throw new Error("Only text blocks can change text");
      found.list[found.index] = { ...node, text: action.text ?? "" };
    } else if (action.type === "up" || action.type === "down") {
      const target = found.index + (action.type === "up" ? -1 : 1);
      if (target < 0 || target >= found.list.length)
        throw new Error("Hero block cannot move further");
      [found.list[found.index], found.list[target]] = [found.list[target]!, node];
    } else if (action.type === "nest") {
      if (found.parent !== null || found.index === 0 || node.kind !== "text")
        throw new Error("Text can nest only in a preceding group");
      const previous = copy[found.index - 1]!;
      if (previous.kind !== "group") throw new Error("Preceding block must be a group");
      copy.splice(found.index, 1);
      previous.children.push(node);
    } else if (action.type === "unnest") {
      if (!found.parent) throw new Error("Block is not nested");
      found.list.splice(found.index, 1);
      copy.splice(copy.findIndex((item) => item.id === found.parent) + 1, 0, node);
    }
  }
  return validateHeroStructure(copy);
}
