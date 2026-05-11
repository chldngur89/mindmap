import { useMutation } from "@tanstack/react-query";
import type { Edge, Node } from "@xyflow/react";
import { fetchWithTimeout, getApiErrorMessage } from "@/lib/api";

export interface AssistantInsightInput {
  title: string;
  workspacePath?: string;
  nodes: Node[];
  edges: Edge[];
}

export interface AssistantInsightResponse {
  summary: string;
  questionSuggestions: string[];
  researchTopics: string[];
  modelUsed?: string;
}

export function useAssistantInsights() {
  return useMutation<AssistantInsightResponse, Error, AssistantInsightInput>({
    mutationFn: async (payload) => {
      const response = await fetchWithTimeout(
        "/api/assistant/insights",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        45000,
      );

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Failed to generate assistant insights"),
        );
      }

      return response.json();
    },
  });
}
