import type { Edge, Node } from "@xyflow/react";

export interface LocalMindMapDraft {
  mapId: string | null;
  title: string;
  nodes: Node[];
  edges: Edge[];
  savedAt: string;
}

interface SaveLocalMindMapDraftInput {
  mapId: string | null;
  title: string;
  nodes: Node[];
  edges: Edge[];
}

const LOCAL_DRAFT_PREFIX = "mindmap:draft:";

function getDraftKey(mapId: string | null) {
  return `${LOCAL_DRAFT_PREFIX}${mapId ?? "new"}`;
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadLocalMindMapDraft(mapId: string | null) {
  if (!canUseLocalStorage()) return null;

  const raw = window.localStorage.getItem(getDraftKey(mapId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LocalMindMapDraft;
  } catch {
    return null;
  }
}

export function hasLocalMindMapDraft(mapId: string | null) {
  return loadLocalMindMapDraft(mapId) !== null;
}

export function saveLocalMindMapDraft({
  mapId,
  title,
  nodes,
  edges,
}: SaveLocalMindMapDraftInput) {
  if (!canUseLocalStorage()) return;

  const payload: LocalMindMapDraft = {
    mapId,
    title,
    nodes,
    edges,
    savedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(getDraftKey(mapId), JSON.stringify(payload));
}

export function clearLocalMindMapDraft(mapId: string | null) {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(getDraftKey(mapId));
}

export function listLocalMindMapDrafts() {
  if (!canUseLocalStorage()) return [] as LocalMindMapDraft[];

  const drafts: LocalMindMapDraft[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(LOCAL_DRAFT_PREFIX)) continue;

    const raw = window.localStorage.getItem(key);
    if (!raw) continue;

    try {
      drafts.push(JSON.parse(raw) as LocalMindMapDraft);
    } catch {
      continue;
    }
  }

  return drafts.sort(
    (left, right) =>
      new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime(),
  );
}
