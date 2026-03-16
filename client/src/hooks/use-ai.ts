import { useMutation } from "@tanstack/react-query";
import { type Node, type Edge } from "@xyflow/react";

interface GenerateMapResponse {
    nodes: Node[];
    edges: Edge[];
}

export function useGenerateMap() {
    return useMutation<GenerateMapResponse, Error, string>({
        mutationFn: async (prompt: string) => {
            const response = await fetch("/api/generate-map", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt }),
            });

            if (!response.ok) {
                throw new Error("Failed to generate mind map");
            }

            return response.json();
        },
    });
}
