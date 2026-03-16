import { useState, useCallback, useEffect, useRef } from 'react';
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
  type Edge as RFEdge
} from '@xyflow/react';
import { useParams, useLocation } from 'wouter';
import { CustomNode } from '@/components/MindMap/CustomNode';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import { Sparkles, Download, Share2, BrainCircuit, GripHorizontal, Loader2, Save, FilePlus, List, Trash2 } from 'lucide-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { useGenerateMap } from '@/hooks/use-ai';
import { useLoadMap, useSaveMap, useDeleteMap } from '@/hooks/use-maps';
import { useToast } from '@/hooks/use-toast';

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes: RFNode[] = [
  {
    id: '1',
    type: 'custom',
    position: { x: 400, y: 300 },
    data: {
      label: 'Product Vision 2026',
      isRoot: true,
      description: 'Core themes and strategic directions for the upcoming year'
    },
  },
];

const initialEdges: RFEdge[] = [];

function MindMapCanvas() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const mapId = params?.id ?? null;

  const [nodes, setNodes] = useState<RFNode[]>(initialNodes);
  const [edges, setEdges] = useState<RFEdge[]>(initialEdges);

  const { data: loadedMap, isLoading: isLoadingMap } = useLoadMap(mapId);
  const saveMap = useSaveMap();
  const deleteMap = useDeleteMap();
  const prevMapIdRef = useRef<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (loadedMap?.nodes) {
      setNodes(loadedMap.nodes as RFNode[]);
      setEdges(loadedMap.edges as RFEdge[]);
    }
  }, [loadedMap]);

  useEffect(() => {
    if (prevMapIdRef.current !== null && mapId === null) {
      setNodes(initialNodes);
      setEdges(initialEdges);
    }
    prevMapIdRef.current = mapId;
  }, [mapId]);

  const handleSave = () => {
    const title = (nodes.find((n) => n.data?.isRoot)?.data?.label as string) || undefined;
    saveMap.mutate(
      { mapId, title, nodes, edges },
      {
        onSuccess: (data) => {
          if (!mapId) setLocation(`/map/${data.id}`);
          toast({ title: "저장됨", description: "마인드맵이 저장되었습니다." });
        },
        onError: (error) => {
          toast({ variant: "destructive", title: "저장 실패", description: error.message });
        },
      }
    );
  };

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 } }, eds)),
    [],
  );

  const { toast } = useToast();
  const generateMap = useGenerateMap();

  const handleGenerateIdea = () => {
    // For now, always use the label of the root node (first node)
    const rootNode = nodes.find(n => n.data.isRoot) || nodes[0];
    if (!rootNode) return;

    generateMap.mutate(rootNode.data.label as string, {
      onSuccess: (data) => {
        // Replace existing nodes/edges with the AI generated ones
        setNodes(data.nodes);
        setEdges(data.edges);
        toast({
          title: "Mind map generated!",
          description: `Successfully created ${data.nodes.length} nodes via Ollama.`,
        });
      },
      onError: (error) => {
        toast({
          variant: "destructive",
          title: "Generation failed",
          description: error.message,
        });
      }
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background selection:bg-primary/10">
      {/* Header */}
      <header className="h-14 border-b bg-background/80 backdrop-blur-md flex items-center justify-between px-6 z-10 relative shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-sm">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-none mb-0.5">Brainstorming Canvas</h1>
            <p className="text-[11px] text-muted-foreground leading-none">AI-Powered Ideation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2 mr-4">
            <div className="w-7 h-7 rounded-full bg-blue-100 border-2 border-background flex items-center justify-center text-[10px] font-medium text-blue-700 z-30">JS</div>
            <div className="w-7 h-7 rounded-full bg-emerald-100 border-2 border-background flex items-center justify-center text-[10px] font-medium text-emerald-700 z-20">AK</div>
            <div className="w-7 h-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-medium text-muted-foreground z-10">+3</div>
          </div>
          <Button variant="outline" size="sm" className="bg-background hover:bg-muted" asChild>
            <Link href="/">
              <List className="h-4 w-4 mr-2 text-muted-foreground" />
              목록
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="bg-background hover:bg-muted" asChild>
            <Link href="/new">
              <FilePlus className="h-4 w-4 mr-2 text-muted-foreground" />
              새 맵
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="hidden md:flex bg-background hover:bg-muted">
            <Share2 className="h-4 w-4 mr-2 text-muted-foreground" />
            Share
          </Button>
          {mapId && (
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>이 맵을 삭제할까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    삭제하면 복구할 수 없습니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={(e) => {
                      e.preventDefault();
                      if (!mapId) return;
                      deleteMap.mutate(mapId, {
                        onSuccess: () => {
                          setDeleteOpen(false);
                          setLocation("/");
                          toast({ title: "삭제됨", description: "마인드맵이 삭제되었습니다." });
                        },
                        onError: (error) => {
                          toast({ variant: "destructive", title: "삭제 실패", description: error.message });
                        },
                      });
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
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saveMap.isPending ? "저장 중…" : "저장"}
          </Button>
          <Button size="sm" variant="outline" className="shadow-sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      {/* Main Canvas Area */}
      <main className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          className="bg-zinc-50/50"
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
          <Controls className="!bg-background !border-border !shadow-md !rounded-lg overflow-hidden !m-6" showInteractive={false} />

          <Panel position="bottom-center" className="mb-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-background/95 backdrop-blur border shadow-xl rounded-full px-5 py-2.5 flex items-center gap-3"
            >
              <div className="flex items-center text-xs font-medium text-muted-foreground mr-1">
                <GripHorizontal className="w-4 h-4 mr-2 opacity-50" />
                Actions
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="rounded-full h-8 px-4 font-medium transition-colors"
                onClick={() => {
                  const id = crypto.randomUUID();
                  const newNode: RFNode = {
                    id,
                    type: 'custom',
                    position: { x: Math.random() * 200 + 300, y: Math.random() * 200 + 100 },
                    data: { label: 'New Floating Idea', isNew: true }
                  };
                  setNodes(nds => [...nds, newNode]);
                }}
              >
                Add Idea
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full h-8 px-4 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-medium"
                onClick={handleGenerateIdea}
                disabled={generateMap.isPending}
              >
                {generateMap.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                {generateMap.isPending ? "Generating..." : "Organize Map"}
              </Button>
            </motion.div>
          </Panel>
        </ReactFlow>
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
