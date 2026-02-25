import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Panel,
  BackgroundVariant,
  ReactFlowProvider
} from '@xyflow/react';
import { CustomNode } from '@/components/MindMap/CustomNode';
import { Button } from '@/components/ui/button';
import { Sparkles, Download, Share2, BrainCircuit, GripHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

const nodeTypes = {
  custom: CustomNode,
};

const initialNodes = [
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

const initialEdges: any[] = [];

function MindMapCanvas() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

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
          <Button variant="outline" size="sm" className="hidden md:flex bg-background hover:bg-muted">
            <Share2 className="h-4 w-4 mr-2 text-muted-foreground" />
            Share
          </Button>
          <Button size="sm" className="shadow-sm">
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
                  setNodes(nds => [...nds, {
                    id,
                    type: 'custom',
                    position: { x: Math.random() * 200 + 300, y: Math.random() * 200 + 100 },
                    data: { label: 'New Floating Idea', isNew: true }
                  }]);
                }}
              >
                Add Idea
              </Button>
              <div className="w-px h-4 bg-border mx-1" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full h-8 px-4 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-medium"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Organize Map
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