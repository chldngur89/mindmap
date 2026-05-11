import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Panel,
  BackgroundVariant,
  ReactFlowProvider,
  type Node as RFNode,
  type Edge as RFEdge,
} from "@xyflow/react";
import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import type { ImperativePanelHandle } from "react-resizable-panels";
import {
  BrainCircuit,
  ChevronRight,
  Download,
  FilePlus,
  GripHorizontal,
  List,
  Loader2,
  Save,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
import { CustomNode } from "@/components/MindMap/CustomNode";
import { WorkspacePanel } from "@/components/MindMap/WorkspacePanel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssistantInsights } from "@/hooks/use-assistant";
import { useGenerateMap } from "@/hooks/use-ai";
import { useDeleteMap, useLoadMap, useSaveMap } from "@/hooks/use-maps";
import { useToast } from "@/hooks/use-toast";
import type { WorkspaceContext } from "@/hooks/use-local-workspace";
import { useGenerateWorkspaceDocs } from "@/hooks/use-workspace-docs";
import { copyShareLink, exportMindMapJson, exportMindMapMarkdown } from "@/lib/export";
import {
  clearLocalMindMapDraft,
  loadLocalMindMapDraft,
  saveLocalMindMapDraft,
} from "@/lib/local-draft";
import { buildTemplateMap, mindMapTemplates } from "@/lib/templates";

interface MindMapNodeData extends Record<string, unknown> {
  label?: string;
  description?: string;
  isRoot?: boolean;
  isNew?: boolean;
  level?: number;
  workspacePath?: string;
  workspaceOverview?: string;
}

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: RFNode<MindMapNodeData>[] = [
  {
    id: "1",
    type: "custom",
    position: { x: 620, y: 320 },
    data: {
      label: "Select a Source Folder",
      isRoot: true,
      level: 0,
      description: "왼쪽 패널에서 로컬 소스 폴더를 선택하면 그 구조를 기준으로 아이디어를 확장합니다.",
    },
  },
];

const initialEdges: RFEdge[] = [];

function getRootNode(nodes: RFNode<MindMapNodeData>[]) {
  return (
    nodes.find((node) => node.data?.isRoot) ??
    nodes[0] ??
    null
  );
}

function normalizeGeneratedNodes(
  nodes: RFNode[],
  workspacePath?: string,
  workspaceOverview?: string,
) {
  return nodes.map((node, index) => {
    const isRoot = !!node.data?.isRoot || index === 0;
    const nextData: MindMapNodeData = {
      ...node.data,
      isRoot,
      level: isRoot ? 0 : 1,
      workspacePath,
      workspaceOverview,
    };

    return {
      ...node,
      position: isRoot
        ? { x: 620, y: 320 }
        : node.position ?? {
            x: 760,
            y: 300,
          },
      data: nextData,
    } as RFNode<MindMapNodeData>;
  });
}

function MindMapCanvas() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const mapId = params?.id ?? null;

  const [nodes, setNodes] = useState<RFNode<MindMapNodeData>[]>(initialNodes);
  const [edges, setEdges] = useState<RFEdge[]>(initialEdges);
  const [selectedWorkspacePath, setSelectedWorkspacePath] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("blank");
  const [localDraftSavedAt, setLocalDraftSavedAt] = useState<string | null>(null);
  const [isWorkspacePanelCollapsed, setIsWorkspacePanelCollapsed] = useState(false);
  const hasLocalDraft = !!localDraftSavedAt;

  const { data: loadedMap, isLoading: isLoadingMap } = useLoadMap(mapId);
  const saveMap = useSaveMap();
  const deleteMap = useDeleteMap();
  const generateMap = useGenerateMap();
  const generateWorkspaceDocs = useGenerateWorkspaceDocs();
  const assistantInsights = useAssistantInsights();
  const prevMapIdRef = useRef<string | null>(null);
  const suppressNextAutosaveRef = useRef(false);
  const workspacePanelRef = useRef<ImperativePanelHandle | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!loadedMap?.nodes) return;

    const nextNodes = loadedMap.nodes as RFNode<MindMapNodeData>[];
    const nextEdges = loadedMap.edges as RFEdge[];
    const rootNode = getRootNode(nextNodes);

    setNodes(nextNodes);
    setEdges(nextEdges);
    setSelectedWorkspacePath(rootNode?.data?.workspacePath ?? null);
  }, [loadedMap]);

  useEffect(() => {
    if (prevMapIdRef.current !== null && mapId === null) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      setSelectedWorkspacePath(null);
    }
    prevMapIdRef.current = mapId;
  }, [mapId]);

  const syncLocalDraftState = useCallback(() => {
    const draft = loadLocalMindMapDraft(mapId);
    setLocalDraftSavedAt(draft?.savedAt ?? null);
  }, [mapId]);

  useEffect(() => {
    syncLocalDraftState();
  }, [syncLocalDraftState]);

  useEffect(() => {
    if (mapId && isLoadingMap) return;
    if (nodes.length === 0) return;
    if (suppressNextAutosaveRef.current) {
      suppressNextAutosaveRef.current = false;
      return;
    }

    const title = String(getRootNode(nodes)?.data?.label ?? "mindmap");
    const timer = window.setTimeout(() => {
      saveLocalMindMapDraft({
        mapId,
        title,
        nodes,
        edges,
      });
      syncLocalDraftState();
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [edges, isLoadingMap, mapId, nodes, syncLocalDraftState]);

  const onNodesChange = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) =>
      setNodes((currentNodes) => applyNodeChanges(changes, currentNodes)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: Parameters<typeof applyEdgeChanges>[0]) =>
      setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges)),
    [],
  );

  const onConnect = useCallback(
    (params: any) =>
      setEdges((currentEdges) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
          },
          currentEdges,
        ),
      ),
    [],
  );

  const closeWorkspacePanel = useCallback(() => {
    workspacePanelRef.current?.collapse();
  }, []);

  const openWorkspacePanel = useCallback(() => {
    workspacePanelRef.current?.expand(22);
  }, []);

  const resetCanvas = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setSelectedWorkspacePath(null);
    setSelectedTemplateId("blank");
  }, []);

  const applyWorkspaceToRoot = useCallback((context: WorkspaceContext) => {
    setSelectedWorkspacePath(context.selectedPath);

    setNodes((currentNodes) => {
      const rootNode = getRootNode(currentNodes);
      if (!rootNode) return currentNodes;

      return currentNodes.map((node) =>
        node.id === rootNode.id
          ? {
              ...node,
              position: { x: 620, y: 320 },
              data: {
                ...node.data,
                label: context.name,
                description: context.overview,
                isRoot: true,
                level: 0,
                workspacePath: context.selectedPath,
                workspaceOverview: context.overview,
              },
            }
          : node,
      );
    });
  }, []);

  const runRootGeneration = useCallback(
    (options?: { prompt?: string; workspacePath?: string; workspaceOverview?: string }) => {
      const rootNode = getRootNode(nodes);
      const prompt = options?.prompt ?? rootNode?.data?.label ?? "";
      const workspacePath = options?.workspacePath ?? rootNode?.data?.workspacePath;
      const workspaceOverview =
        options?.workspaceOverview ?? rootNode?.data?.workspaceOverview;

      if (!prompt) {
        toast({
          variant: "destructive",
          title: "토픽이 비어 있습니다",
          description: "루트 토픽을 입력하거나 왼쪽 패널에서 폴더를 선택해 주세요.",
        });
        return;
      }

      generateMap.mutate(
        {
          prompt,
          workspacePath,
          parentLevel: 0,
          currentMapTitle: prompt,
        },
        {
          onSuccess: (response) => {
            const nextNodes = normalizeGeneratedNodes(
              response.nodes,
              workspacePath,
              workspaceOverview,
            );
            startTransition(() => {
              setNodes(nextNodes);
              setEdges(response.edges);
            });
            toast({
              title: "Mind map generated!",
              description: `${response.nodes.length}개 노드를 생성했습니다.${response.modelUsed ? ` 모델: ${response.modelUsed}` : ""}`,
            });
          },
          onError: (error) => {
            toast({
              variant: "destructive",
              title: "Generation failed",
              description: error.message,
            });
          },
        },
      );
    },
    [generateMap, nodes, toast],
  );

  const handleWorkspaceSelection = useCallback(
    (context: WorkspaceContext) => {
      applyWorkspaceToRoot(context);
      closeWorkspacePanel();
      toast({
        title: "폴더 선택됨",
        description: `${context.name}를 루트 토픽으로 연결했습니다.`,
      });
    },
    [applyWorkspaceToRoot, closeWorkspacePanel, toast],
  );

  const handleGenerateFromWorkspace = useCallback(
    (context: WorkspaceContext) => {
      applyWorkspaceToRoot(context);
      closeWorkspacePanel();
      runRootGeneration({
        prompt: context.name,
        workspacePath: context.selectedPath,
        workspaceOverview: context.overview,
      });
    },
    [applyWorkspaceToRoot, closeWorkspacePanel, runRootGeneration],
  );

  const handleGenerateWorkspaceDocs = useCallback(
    (context: WorkspaceContext) => {
      generateWorkspaceDocs.mutate(
        { workspacePath: context.selectedPath },
        {
          onSuccess: (response) => {
            toast({
              title: "문서 생성 완료",
              description: response.readme.created
                ? `README와 ${response.docs.length}개의 분석 문서를 만들었습니다.`
                : `${response.docs.length}개의 분석 문서를 갱신했습니다.`,
            });
          },
          onError: (error) => {
            toast({
              variant: "destructive",
              title: "문서 생성 실패",
              description: error.message,
            });
          },
        },
      );
    },
    [generateWorkspaceDocs, toast],
  );

  const handleSave = () => {
    const rootNode = getRootNode(nodes);
    const title = rootNode?.data?.label || undefined;

    saveMap.mutate(
      { mapId, title, nodes, edges },
      {
        onSuccess: (data) => {
          if (!mapId) {
            clearLocalMindMapDraft(null);
            saveLocalMindMapDraft({
              mapId: data.id,
              title: String(title ?? data.title ?? "mindmap"),
              nodes,
              edges,
            });
            setLocation(`/map/${data.id}`);
          }
          syncLocalDraftState();
          toast({ title: "저장됨", description: "마인드맵이 저장되었습니다." });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "저장 실패",
            description: error.message,
          });
        },
      },
    );
  };

  const handleApplyTemplate = () => {
    const currentRoot = getRootNode(nodes);
    const { template, nodes: templateNodes, edges: templateEdges } =
      buildTemplateMap(selectedTemplateId);
    const workspacePath = currentRoot?.data?.workspacePath;
    const workspaceOverview = currentRoot?.data?.workspaceOverview;

    const nextNodes = templateNodes.map((node, index) => ({
      ...node,
      data: {
        ...node.data,
        label:
          index === 0 && workspacePath
            ? String(currentRoot?.data?.label ?? template.rootLabel)
            : node.data?.label,
        description:
          index === 0 && workspaceOverview
            ? String(workspaceOverview)
            : node.data?.description,
        workspacePath,
        workspaceOverview,
      },
    })) as RFNode<MindMapNodeData>[];

    setNodes(nextNodes);
    setEdges(templateEdges);
    toast({
      title: "템플릿 적용됨",
      description: `${template.name} 템플릿으로 구조를 초기화했습니다.`,
    });
  };

  const handleExportJson = () => {
    exportMindMapJson({
      title: getRootNode(nodes)?.data?.label?.toString() || "mindmap",
      nodes,
      edges,
    });
    toast({ title: "JSON 내보내기 완료" });
  };

  const handleExportMarkdown = () => {
    exportMindMapMarkdown({
      title: getRootNode(nodes)?.data?.label?.toString() || "mindmap",
      nodes,
      edges,
    });
    toast({ title: "Markdown 내보내기 완료" });
  };

  const handleSaveLocalDraft = () => {
    const title = String(getRootNode(nodes)?.data?.label ?? "mindmap");

    saveLocalMindMapDraft({
      mapId,
      title,
      nodes,
      edges,
    });
    syncLocalDraftState();
    toast({
      title: "로컬 저장됨",
      description: "현재 브라우저에 작업 상태를 저장했습니다.",
    });
  };

  const handleLoadLocalDraft = () => {
    const draft = loadLocalMindMapDraft(mapId);

    if (!draft) {
      toast({
        variant: "destructive",
        title: "로컬 저장본 없음",
        description: "불러올 수 있는 브라우저 저장본이 없습니다.",
      });
      return;
    }

    const nextNodes = draft.nodes as RFNode<MindMapNodeData>[];
    const nextEdges = draft.edges as RFEdge[];
    const rootNode = getRootNode(nextNodes);

    startTransition(() => {
      setNodes(nextNodes);
      setEdges(nextEdges);
      setSelectedWorkspacePath(rootNode?.data?.workspacePath?.toString() ?? null);
    });

    toast({
      title: "로컬 저장본 불러옴",
      description: `${new Date(draft.savedAt).toLocaleString()} 저장본을 복구했습니다.`,
    });
  };

  const handleClearLocalDraft = () => {
    suppressNextAutosaveRef.current = true;
    clearLocalMindMapDraft(mapId);
    syncLocalDraftState();
    toast({
      title: "로컬 저장본 삭제됨",
      description: "브라우저에 저장된 로컬 편집본을 지웠습니다.",
    });
  };

  const handleDeleteCurrent = () => {
    suppressNextAutosaveRef.current = true;

    if (mapId) {
      deleteMap.mutate(mapId, {
        onSuccess: () => {
          clearLocalMindMapDraft(mapId);
          setDeleteOpen(false);
          setLocation("/");
          toast({
            title: "삭제됨",
            description: "마인드맵과 로컬 저장본을 함께 삭제했습니다.",
          });
        },
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "삭제 실패",
            description: error.message,
          });
        },
      });
      return;
    }

    clearLocalMindMapDraft(null);
    syncLocalDraftState();
    resetCanvas();
    setDeleteOpen(false);
    toast({
      title: "삭제됨",
      description: "로컬 저장본을 삭제하고 새 캔버스로 초기화했습니다.",
    });
  };

  const handleShare = async () => {
    try {
      await copyShareLink();
      toast({
        title: "링크 복사됨",
        description: "현재 마인드맵 링크를 클립보드에 복사했습니다.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "공유 실패",
        description:
          error instanceof Error ? error.message : "링크 복사에 실패했습니다.",
      });
    }
  };

  const handleGenerateAssistantInsights = () => {
    const rootNode = getRootNode(nodes);
    assistantInsights.mutate(
      {
        title: String(rootNode?.data?.label ?? "Mind Map"),
        workspacePath: rootNode?.data?.workspacePath?.toString(),
        nodes,
        edges,
      },
      {
        onError: (error) => {
          toast({
            variant: "destructive",
            title: "Assistant failed",
            description: error.message,
          });
        },
      },
    );
  };

  return (
    <div className="flex h-screen w-screen flex-col bg-background selection:bg-primary/10">
      <header className="relative z-10 flex h-14 items-center justify-between border-b bg-background/80 px-6 shadow-sm backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary p-1.5 text-primary-foreground shadow-sm">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="mb-0.5 text-sm font-semibold leading-none">
              Brainstorming Canvas
            </h1>
            <p className="text-[11px] leading-none text-muted-foreground">
              Source-driven ideation
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="bg-background hover:bg-muted" asChild>
            <Link href="/">
              <List className="mr-2 h-4 w-4 text-muted-foreground" />
              목록
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="bg-background hover:bg-muted" asChild>
            <Link href="/new">
              <FilePlus className="mr-2 h-4 w-4 text-muted-foreground" />
              새 맵
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden bg-background hover:bg-muted md:flex"
            onClick={handleShare}
          >
            <Share2 className="mr-2 h-4 w-4 text-muted-foreground" />
            Share
          </Button>
          {(mapId || hasLocalDraft) && (
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {mapId ? "이 맵을 삭제할까요?" : "로컬 저장본을 삭제할까요?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {mapId
                      ? "클라우드에 저장된 맵과 현재 로컬 편집본을 함께 지웁니다."
                      : "현재 브라우저에 저장된 임시 작업을 지우고 새 캔버스로 되돌립니다."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(event) => {
                      event.preventDefault();
                      handleDeleteCurrent();
                    }}
                  >
                    {deleteMap.isPending ? "삭제 중…" : "삭제"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            size="sm"
            className="shadow-sm"
            onClick={handleSave}
            disabled={saveMap.isPending || (!!mapId && isLoadingMap)}
          >
            {saveMap.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {saveMap.isPending ? "저장 중…" : "저장"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="shadow-sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportJson}>
                JSON 내보내기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportMarkdown}>
                Markdown 내보내기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel
            ref={workspacePanelRef}
            defaultSize={26}
            minSize={20}
            maxSize={34}
            collapsible
            collapsedSize={0}
            onCollapse={() => setIsWorkspacePanelCollapsed(true)}
            onExpand={() => setIsWorkspacePanelCollapsed(false)}
          >
            <WorkspacePanel
              selectedPath={selectedWorkspacePath}
              onSelectWorkspace={handleWorkspaceSelection}
              onGenerateWorkspaceIdeas={handleGenerateFromWorkspace}
              onGenerateWorkspaceDocs={handleGenerateWorkspaceDocs}
              isGeneratingWorkspaceDocs={generateWorkspaceDocs.isPending}
              onClose={closeWorkspacePanel}
            >
              <Card className="border-stone-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-stone-900">Templates</CardTitle>
                  <CardDescription>
                    빈 캔버스 대신 자주 쓰는 프레임으로 시작합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select
                    value={selectedTemplateId}
                    onValueChange={setSelectedTemplateId}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="템플릿 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {mindMapTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs leading-relaxed text-stone-600">
                    {
                      mindMapTemplates.find(
                        (template) => template.id === selectedTemplateId,
                      )?.description
                    }
                  </p>
                  <Button className="w-full" onClick={handleApplyTemplate}>
                    템플릿 적용
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-stone-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-stone-900">AI Assistant</CardTitle>
                  <CardDescription>
                    현재 맵을 요약하고 다음 질문과 조사 포인트를 제안합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={handleGenerateAssistantInsights}
                    disabled={assistantInsights.isPending}
                  >
                    {assistantInsights.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    요약과 질문 생성
                  </Button>

                  {assistantInsights.data && (
                    <div className="space-y-4">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                          Summary
                        </p>
                        <p className="leading-relaxed text-stone-700">
                          {assistantInsights.data.summary}
                        </p>
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                          Questions
                        </p>
                        <ul className="space-y-1 text-stone-700">
                          {assistantInsights.data.questionSuggestions.map((question) => (
                            <li key={question}>- {question}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-stone-500">
                          Research Topics
                        </p>
                        <ul className="space-y-1 text-stone-700">
                          {assistantInsights.data.researchTopics.map((topic) => (
                            <li key={topic}>- {topic}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-stone-200 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-stone-900">로컬 저장</CardTitle>
                  <CardDescription>
                    브라우저에 자동 저장되며, 필요하면 수동 복구도 가능합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="text-xs leading-relaxed text-stone-600">
                    {hasLocalDraft
                      ? `마지막 저장: ${new Date(localDraftSavedAt ?? "").toLocaleString()}`
                      : "편집 중인 내용은 약 1.2초 후 자동 저장됩니다."}
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    <Button className="w-full" variant="outline" onClick={handleSaveLocalDraft}>
                      로컬 저장
                    </Button>
                    <Button
                      className="w-full"
                      variant="secondary"
                      onClick={handleLoadLocalDraft}
                      disabled={!hasLocalDraft}
                    >
                      로컬 저장본 불러오기
                    </Button>
                    <Button
                      className="w-full"
                      variant="ghost"
                      onClick={handleClearLocalDraft}
                      disabled={!hasLocalDraft}
                    >
                      로컬 저장본 삭제
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </WorkspacePanel>
          </ResizablePanel>
          <ResizableHandle
            withHandle
            className={isWorkspacePanelCollapsed ? "pointer-events-none opacity-0" : ""}
          />
          <ResizablePanel defaultSize={74}>
            <div className="relative h-full">
              {isWorkspacePanelCollapsed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute left-5 top-5 z-20 bg-background/95 shadow-sm backdrop-blur"
                  onClick={openWorkspacePanel}
                >
                  <ChevronRight className="mr-2 h-4 w-4" />
                  소스 폴더
                </Button>
              )}
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                fitView
                className="bg-zinc-50/60"
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                minZoom={0.1}
                maxZoom={2}
                proOptions={{ hideAttribution: true }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={24}
                  size={2}
                  color="hsl(var(--muted-foreground)/0.2)"
                />
                <Controls
                  className="!m-6 !overflow-hidden !rounded-lg !border-border !bg-background !shadow-md"
                  showInteractive={false}
                />

                <Panel position="bottom-center" className="mb-8">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center gap-3 rounded-full border bg-background/95 px-5 py-2.5 shadow-xl backdrop-blur"
                  >
                    <div className="mr-1 flex items-center text-xs font-medium text-muted-foreground">
                      <GripHorizontal className="mr-2 h-4 w-4 opacity-50" />
                      Actions
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 rounded-full px-4 font-medium transition-colors"
                      onClick={() => {
                        const rootNode = getRootNode(nodes);
                        const nextLevel = (rootNode?.data?.level ?? 0) + 1;
                        const id = crypto.randomUUID();
                        const newNode: RFNode<MindMapNodeData> = {
                          id,
                          type: "custom",
                          position: {
                            x: Math.random() * 200 + 580,
                            y: Math.random() * 220 + 120,
                          },
                          data: {
                            label: "New Floating Idea",
                            isNew: true,
                            level: nextLevel,
                            workspacePath: rootNode?.data?.workspacePath,
                            workspaceOverview: rootNode?.data?.workspaceOverview,
                          },
                        };
                        setNodes((currentNodes) => [...currentNodes, newNode]);
                      }}
                    >
                      Add Idea
                    </Button>
                    <div className="mx-1 h-4 w-px bg-border" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full px-4 font-medium text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                      onClick={() => runRootGeneration()}
                      disabled={generateMap.isPending}
                    >
                      {generateMap.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {generateMap.isPending ? "Generating..." : "Organize Map"}
                    </Button>
                  </motion.div>
                </Panel>
              </ReactFlow>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <ReactFlowProvider>
      <MindMapCanvas />
    </ReactFlowProvider>
  );
}
