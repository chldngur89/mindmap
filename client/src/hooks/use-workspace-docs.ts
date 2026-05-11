import { useMutation } from "@tanstack/react-query";
import { fetchWithTimeout, getApiErrorMessage } from "@/lib/api";

export interface GenerateWorkspaceDocsInput {
  workspacePath: string;
}

export interface GenerateWorkspaceDocsResponse {
  projectName: string;
  modelUsed?: string;
  readme: {
    path: string;
    created: boolean;
  };
  docs: Array<{
    path: string;
    bytes: number;
  }>;
}

export function useGenerateWorkspaceDocs() {
  return useMutation<
    GenerateWorkspaceDocsResponse,
    Error,
    GenerateWorkspaceDocsInput
  >({
    mutationFn: async (payload) => {
      const response = await fetchWithTimeout(
        "/api/local/workspace-docs/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        90000,
      );

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Failed to generate workspace docs"),
        );
      }

      return response.json();
    },
  });
}
