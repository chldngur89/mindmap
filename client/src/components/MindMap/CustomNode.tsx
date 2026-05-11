import { memo } from "react";
import {
  Handle,
  Position,
  useReactFlow,
  type Edge as RFEdge,
  type Node as RFNode,
} from "@xyflow/react";
import { FolderGit2, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGenerateMap } from "@/hooks/use-ai";
import { useToast } from "@/hooks/use-toast";

interface NodeData extends Record<string, unknown> {
  label?: string;
  description?: string;
  isRoot?: boolean;
  isNew?: boolean;
  level?: number;
  workspacePath?: string;
  workspaceOverview?: string;
}

function getLevelTone(level: number) {
  if (level <= 0) {
    return "border-emerald-600/40 bg-emerald-50/70";
  }

  if (level === 1) {
    return "border-sky-500/30 bg-sky-50/70";
  }

  if (level === 2) {
    return "border-amber-500/30 bg-amber-50/70";
  }

  return "border-stone-300 bg-white";
}

export const CustomNode = memo(
  ({
    id,
    data,
    isConnectable,
    selected,
  }: {
    id: string;
    data: NodeData;
    isConnectable: boolean;
    selected: boolean;
  }) => {
    const { setNodes, setEdges, getNode, getNodes } = useReactFlow<
      RFNode<NodeData>,
      RFEdge
    >();
    const generateMap = useGenerateMap();
    const { toast } = useToast();

    const level = data.level ?? 0;

    const onAddNode = () => {
      const parentNode = getNode(id);
      if (!parentNode) return;

      const newNodeId = crypto.randomUUID();
      const newNode: RFNode<NodeData> = {
        id: newNodeId,
        type: "custom",
        position: {
          x: parentNode.position.x + 260,
          y: parentNode.position.y + (Math.random() * 110 - 55),
        },
        data: {
          label: "New Idea",
          isNew: true,
          level: level + 1,
          workspacePath: data.workspacePath,
          workspaceOverview: data.workspaceOverview,
        },
      };

      const newEdge = {
        id: `e-${id}-${newNodeId}`,
        source: id,
        target: newNodeId,
        animated: true,
        style: { stroke: "hsl(var(--primary))", strokeWidth: 2 },
      };

      setNodes((nodes) => [...nodes, newNode]);
      setEdges((edges) => [...edges, newEdge]);
    };

    const onGenerateAI = () => {
      const parentNode = getNode(id);
      const rootNode = getNodes().find((node) => node.data?.isRoot);
      if (!parentNode) return;

      if (!data.label) {
        toast({
          description: "Please enter a topic first before generating ideas.",
        });
        return;
      }

      generateMap.mutate(
        {
          prompt: data.label,
          workspacePath: rootNode?.data?.workspacePath,
          parentLevel: level,
          currentMapTitle: rootNode?.data?.label ?? data.label,
        },
        {
          onSuccess: (generatedData) => {
            const rawNodes = generatedData.nodes.filter((node) => node.id !== "root");

            const newNodes = rawNodes.map((node, index) => {
              const nextId = crypto.randomUUID();

              return {
                ...node,
                id: nextId,
                position: {
                  x: parentNode.position.x + 360,
                  y:
                    parentNode.position.y +
                    (index - Math.floor(rawNodes.length / 2)) * 120,
                },
                data: {
                  ...node.data,
                  level: level + 1,
                  workspacePath: rootNode?.data?.workspacePath,
                  workspaceOverview: rootNode?.data?.workspaceOverview,
                },
              } as RFNode<NodeData>;
            });

            const newEdges = newNodes.map((node) => ({
              id: `e-${id}-${node.id}`,
              source: id,
              target: node.id,
              animated: true,
              style: {
                stroke: "hsl(var(--primary))",
                strokeWidth: 2,
                opacity: 0.5,
              },
            }));

            setNodes((nodes) => [...nodes, ...newNodes]);
            setEdges((edges) => [...edges, ...newEdges]);

            toast({
              title: "아이디어 확장 완료",
              description: `${newNodes.length}개의 하위 노드를 생성했습니다.${generatedData.modelUsed ? ` 모델: ${generatedData.modelUsed}` : ""}`,
            });
          },
          onError: (error) => {
            toast({
              variant: "destructive",
              title: "AI Error",
              description: error.message,
            });
          },
        },
      );
    };

    const onDelete = () => {
      setNodes((nodes) => nodes.filter((node) => node.id !== id));
      setEdges((edges) =>
        edges.filter((edge) => edge.source !== id && edge.target !== id),
      );
    };

    const updateLabel = (label: string) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  label,
                },
              }
            : node,
        ),
      );
    };

    return (
      <Card
        data-testid={`node-${id}`}
        className={cn(
          "group relative min-w-[250px] border-2 transition-all duration-200",
          getLevelTone(level),
          selected
            ? "border-primary shadow-lg ring-4 ring-primary/10"
            : "shadow-sm hover:border-primary/50 hover:shadow-md",
          data.isNew && "animate-in zoom-in-95 duration-300",
        )}
      >
        <Handle
          type="target"
          position={Position.Left}
          isConnectable={isConnectable}
          className="!-ml-1.5 !h-3 !w-3"
        />

        <div className="p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {data.isRoot && (
                <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                  <Sparkles className="h-3 w-3" />
                  Central Topic
                </div>
              )}
              {!data.isRoot && (
                <Badge variant="outline" className="bg-white/70 text-[10px]">
                  Level {level}
                </Badge>
              )}
            </div>

            {data.workspacePath && (
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <FolderGit2 className="h-3 w-3" />
                {data.workspacePath.split("/").pop()}
              </div>
            )}
          </div>

          <Input
            value={data.label ?? ""}
            onChange={(event) => updateLabel(event.target.value)}
            placeholder="Enter topic"
            className="nodrag border-0 bg-transparent px-0 py-0 text-sm font-medium shadow-none focus-visible:ring-0"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          />

          {data.description && (
            <div className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
              {data.description}
            </div>
          )}
        </div>

        <div
          className={cn(
            "absolute -bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-background p-1 shadow-md transition-all duration-200",
            selected
              ? "opacity-100 scale-100"
              : "scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100",
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onAddNode}
            title="Add connected node"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 rounded-full text-indigo-500 hover:bg-indigo-50 hover:text-indigo-600",
              generateMap.isPending && "animate-pulse bg-indigo-50",
            )}
            onClick={onGenerateAI}
            disabled={generateMap.isPending}
            title="Generate ideas with AI"
          >
            <Sparkles className="h-4 w-4" />
          </Button>
          <div className="mx-0.5 h-4 w-px bg-border" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-32">
              <DropdownMenuItem
                onClick={onDelete}
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
              >
                Delete Node
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Handle
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="!-mr-1.5 !h-3 !w-3"
        />
      </Card>
    );
  },
);

CustomNode.displayName = "CustomNode";
