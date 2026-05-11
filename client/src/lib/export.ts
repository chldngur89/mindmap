import type { Edge, Node } from "@xyflow/react";

interface ExportPayload {
  title: string;
  nodes: Node[];
  edges: Edge[];
}

function downloadText(filename: string, content: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sanitizeFilename(input: string) {
  return input
    .trim()
    .replace(/[^a-zA-Z0-9-_가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "") || "mindmap";
}

export function exportMindMapJson(payload: ExportPayload) {
  const filename = `${sanitizeFilename(payload.title)}.json`;
  const content = JSON.stringify(
    {
      title: payload.title,
      exportedAt: new Date().toISOString(),
      nodes: payload.nodes,
      edges: payload.edges,
    },
    null,
    2,
  );

  downloadText(filename, content, "application/json");
}

function buildTreeLines(
  nodeId: string,
  nodesById: Map<string, Node>,
  childrenBySource: Map<string, string[]>,
  depth = 0,
  visited = new Set<string>(),
): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const node = nodesById.get(nodeId);
  if (!node) return [];

  const label = String(node.data?.label ?? node.id);
  const description = node.data?.description
    ? `: ${String(node.data.description)}`
    : "";
  const lines = [`${"  ".repeat(depth)}- ${label}${description}`];
  const children = childrenBySource.get(nodeId) ?? [];

  for (const childId of children) {
    lines.push(...buildTreeLines(childId, nodesById, childrenBySource, depth + 1, visited));
  }

  return lines;
}

export function exportMindMapMarkdown(payload: ExportPayload) {
  const filename = `${sanitizeFilename(payload.title)}.md`;
  const nodesById = new Map(payload.nodes.map((node) => [node.id, node]));
  const childrenBySource = new Map<string, string[]>();

  for (const edge of payload.edges) {
    const existing = childrenBySource.get(edge.source) ?? [];
    existing.push(edge.target);
    childrenBySource.set(edge.source, existing);
  }

  const rootNode =
    payload.nodes.find((node) => node.data?.isRoot) ??
    payload.nodes[0];
  const treeLines = rootNode
    ? buildTreeLines(rootNode.id, nodesById, childrenBySource)
    : [];

  const markdown = [
    `# ${payload.title}`,
    "",
    `- Exported at: ${new Date().toISOString()}`,
    `- Node count: ${payload.nodes.length}`,
    `- Edge count: ${payload.edges.length}`,
    "",
    "## Structure",
    "",
    ...treeLines,
  ].join("\n");

  downloadText(filename, markdown, "text/markdown;charset=utf-8");
}

export async function copyShareLink() {
  await navigator.clipboard.writeText(window.location.href);
}
