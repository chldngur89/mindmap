import { useQuery } from "@tanstack/react-query";
import { fetchWithTimeout, getApiErrorMessage } from "@/lib/api";

export interface WorkspaceFolderItem {
  name: string;
  path: string;
  childDirectoryCount: number;
  fileCount: number;
}

export interface WorkspaceFolderList {
  rootName: string;
  rootPath: string;
  currentPath: string;
  folders: WorkspaceFolderItem[];
}

export interface WorkspaceContext {
  rootName: string;
  rootPath: string;
  selectedPath: string;
  name: string;
  overview: string;
  childDirectories: string[];
  files: string[];
  tree: string[];
  hasReadme: boolean;
}

export function useWorkspaceFolders(path = ".") {
  return useQuery({
    queryKey: ["local-workspaces", path],
    queryFn: async (): Promise<WorkspaceFolderList> => {
      const response = await fetchWithTimeout(
        `/api/local/workspaces?path=${encodeURIComponent(path)}`,
      );

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Failed to list local workspaces"),
        );
      }

      return response.json();
    },
  });
}

export function useWorkspaceContext(selectedPath: string | null) {
  return useQuery({
    queryKey: ["local-workspace-context", selectedPath],
    queryFn: async (): Promise<WorkspaceContext> => {
      const response = await fetchWithTimeout(
        `/api/local/workspace-context?path=${encodeURIComponent(selectedPath ?? ".")}`,
      );

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, "Failed to load workspace context"),
        );
      }

      return response.json();
    },
    enabled: !!selectedPath,
  });
}
