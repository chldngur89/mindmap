import type { ReactNode } from "react";
import { useDeferredValue, useMemo, useState } from "react";
import { ChevronLeft, FolderTree, Layers3, RefreshCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useWorkspaceContext,
  useWorkspaceFolders,
  type WorkspaceContext,
} from "@/hooks/use-local-workspace";
import { cn } from "@/lib/utils";

interface WorkspacePanelProps {
  selectedPath: string | null;
  onSelectWorkspace: (context: WorkspaceContext) => void;
  onGenerateWorkspaceIdeas: (context: WorkspaceContext) => void;
  onGenerateWorkspaceDocs?: (context: WorkspaceContext) => void;
  isGeneratingWorkspaceDocs?: boolean;
  onClose?: () => void;
  children?: ReactNode;
}

export function WorkspacePanel({
  selectedPath,
  onSelectWorkspace,
  onGenerateWorkspaceIdeas,
  onGenerateWorkspaceDocs,
  isGeneratingWorkspaceDocs = false,
  onClose,
  children,
}: WorkspacePanelProps) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const foldersQuery = useWorkspaceFolders(".");
  const contextQuery = useWorkspaceContext(selectedPath);

  const filteredFolders = useMemo(() => {
    const keyword = deferredSearch.trim().toLowerCase();
    const folders = foldersQuery.data?.folders ?? [];

    if (!keyword) return folders;

    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(keyword) ||
      folder.path.toLowerCase().includes(keyword),
    );
  }, [deferredSearch, foldersQuery.data?.folders]);

  return (
    <div className="h-full border-r bg-stone-50/85 backdrop-blur-sm">
      <div className="flex h-full flex-col">
        <div className="border-b px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FolderTree className="h-4 w-4 text-emerald-700" />
                <h2 className="text-sm font-semibold tracking-tight text-stone-900">
                  Source Folders
                </h2>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-stone-600">
                폴더를 클릭하면 코드 분석 기반 마인드맵을 바로 펼칩니다.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0 bg-white"
                onClick={() => foldersQuery.refetch()}
                title="새로고침"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
              {onClose && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0 bg-white"
                  onClick={onClose}
                  title="패널 닫기"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="bg-white/80 font-mono text-[10px] text-stone-700">
              {foldersQuery.data?.rootPath ?? "Loading workspace root..."}
            </Badge>
            {selectedPath && (
              <Badge className="bg-emerald-700 text-white">
                Selected: {selectedPath}
              </Badge>
            )}
          </div>

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="폴더 검색"
            className="mt-4 bg-white"
          />
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 p-4">
            <Card className="border-stone-200 bg-white/90 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-stone-900">Workspace Candidates</CardTitle>
                <CardDescription>
                  프로젝트를 클릭하면 기능, 수익화, 고도화 방향까지 바로 분석합니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {foldersQuery.isLoading && (
                  <p className="text-sm text-stone-500">폴더 목록을 읽는 중입니다...</p>
                )}

                {foldersQuery.isError && (
                  <p className="text-sm text-destructive">
                    {foldersQuery.error.message}
                  </p>
                )}

                {!foldersQuery.isLoading && filteredFolders.length === 0 && (
                  <p className="text-sm text-stone-500">선택 가능한 폴더가 없습니다.</p>
                )}

                {filteredFolders.map((folder) => (
                  <button
                    key={folder.path}
                    type="button"
                    className={cn(
                      "w-full rounded-xl border px-3 py-3 text-left transition-colors",
                      selectedPath === folder.path
                        ? "border-emerald-600 bg-emerald-50"
                        : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50",
                    )}
                    onClick={() => onGenerateWorkspaceIdeas({
                      rootName: foldersQuery.data?.rootName ?? "",
                      rootPath: foldersQuery.data?.rootPath ?? "",
                      selectedPath: folder.path,
                      name: folder.name,
                      overview: `${folder.name} 폴더를 주요 토픽으로 사용합니다.`,
                      childDirectories: [],
                      files: [],
                      tree: [],
                      hasReadme: false,
                    })}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-stone-900">
                          {folder.name}
                        </p>
                        <p className="mt-1 text-[11px] text-stone-500">
                          {folder.path}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-[11px] text-stone-500">
                        <p>{folder.childDirectoryCount} dirs</p>
                        <p>{folder.fileCount} files</p>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {contextQuery.data && (
              <Card className="border-stone-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <Layers3 className="h-4 w-4 text-stone-700" />
                    <CardTitle className="text-sm text-stone-900">
                      {contextQuery.data.name}
                    </CardTitle>
                  </div>
                  <CardDescription>{contextQuery.data.overview}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <Badge variant={contextQuery.data.hasReadme ? "default" : "outline"}>
                      {contextQuery.data.hasReadme ? "README 있음" : "README 없음"}
                    </Badge>
                    <p className="text-[11px] text-stone-500">
                      README가 없으면 생성 시 자동으로 만들어집니다.
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 font-medium text-stone-800">하위 디렉터리</p>
                    <div className="flex flex-wrap gap-2">
                      {contextQuery.data.childDirectories.map((directory) => (
                        <Badge key={directory} variant="outline" className="bg-stone-50">
                          {directory}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 font-medium text-stone-800">대표 파일</p>
                    <div className="flex flex-wrap gap-2">
                      {contextQuery.data.files.map((file) => (
                        <Badge key={file} variant="outline" className="bg-stone-50">
                          {file}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 font-medium text-stone-800">구조 미리보기</p>
                    <pre className="overflow-x-auto rounded-lg bg-stone-950 px-3 py-3 text-[11px] leading-5 text-stone-100">
                      {contextQuery.data.tree.join("\n")}
                    </pre>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => onSelectWorkspace(contextQuery.data)}
                    >
                      루트 토픽으로 설정
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 bg-white"
                      onClick={() => onGenerateWorkspaceIdeas(contextQuery.data)}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      다시 분석
                    </Button>
                  </div>

                  {onGenerateWorkspaceDocs && (
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => onGenerateWorkspaceDocs(contextQuery.data)}
                      disabled={isGeneratingWorkspaceDocs}
                    >
                      {isGeneratingWorkspaceDocs ? "문서 생성 중..." : "README / 문서 생성"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {children}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
