import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Node, Edge } from "@xyflow/react";

export interface MindMapData {
  id: string;
  title?: string;
  nodes: Node[];
  edges: Edge[];
  updatedAt: string;
}

export interface MindMapListItem {
  id: string;
  title?: string;
  updatedAt: string;
}

export function useListMaps() {
  return useQuery({
    queryKey: ["maps"],
    queryFn: async (): Promise<MindMapListItem[]> => {
      const res = await fetch("/api/maps");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error || body?.message || "Failed to list mind maps";
        throw new Error(msg);
      }
      return res.json();
    },
  });
}

export function useLoadMap(mapId: string | null) {
  return useQuery({
    queryKey: ["map", mapId],
    queryFn: async (): Promise<MindMapData> => {
      const res = await fetch(`/api/maps/${mapId}`);
      if (!res.ok) throw new Error("Failed to load mind map");
      return res.json();
    },
    enabled: !!mapId,
  });
}

export function useSaveMap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      mapId,
      title,
      nodes,
      edges,
    }: {
      mapId: string | null;
      title?: string;
      nodes: Node[];
      edges: Edge[];
    }): Promise<MindMapData> => {
      if (mapId) {
        const res = await fetch(`/api/maps/${mapId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, nodes, edges }),
        });
        if (!res.ok) throw new Error("Failed to save mind map");
        return res.json();
      } else {
        const res = await fetch("/api/maps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, nodes, edges }),
        });
        if (!res.ok) throw new Error("Failed to create mind map");
        return res.json();
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["map", data.id], data);
      queryClient.invalidateQueries({ queryKey: ["maps"] });
    },
  });
}

export function useDeleteMap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mapId: string): Promise<void> => {
      const res = await fetch(`/api/maps/${mapId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete mind map");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maps"] });
    },
  });
}
