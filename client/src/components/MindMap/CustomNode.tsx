import { memo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Sparkles, Plus, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export const CustomNode = memo(({ id, data, isConnectable, selected }: any) => {
  const { setNodes, setEdges, getNode } = useReactFlow();
  const [isGenerating, setIsGenerating] = useState(false);

  const onAddNode = () => {
    const parentNode = getNode(id);
    if (!parentNode) return;

    const newNodeId = crypto.randomUUID();
    const newNode = {
      id: newNodeId,
      type: 'custom',
      position: {
        x: parentNode.position.x + 250,
        y: parentNode.position.y + (Math.random() * 100 - 50),
      },
      data: { label: 'New Idea', isNew: true },
    };

    const newEdge = {
      id: `e-${id}-${newNodeId}`,
      source: id,
      target: newNodeId,
      animated: true,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 },
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
  };

  const onGenerateAI = async () => {
    const parentNode = getNode(id);
    if (!parentNode) return;

    setIsGenerating(true);
    
    // Simulate AI generation delay
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    const ideas = ['Marketing Strategy', 'Product Roadmap', 'Technical Architecture'];
    const newNodes = ideas.map((idea, index) => {
      const newNodeId = crypto.randomUUID();
      return {
        id: newNodeId,
        type: 'custom',
        position: {
          x: parentNode.position.x + 300,
          y: parentNode.position.y + (index - 1) * 120,
        },
        data: { label: idea, isNew: true },
      };
    });

    const newEdges = newNodes.map((node) => ({
      id: `e-${id}-${node.id}`,
      source: id,
      target: node.id,
      animated: true,
      style: { stroke: 'hsl(var(--primary))', strokeWidth: 2, opacity: 0.5 },
    }));

    setNodes((nds) => [...nds, ...newNodes]);
    setEdges((eds) => [...eds, ...newEdges]);
    setIsGenerating(false);
  };

  const onDelete = () => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
  };

  return (
    <Card 
      data-testid={`node-${id}`}
      className={cn(
        "min-w-[220px] border-2 transition-all duration-200 group relative",
        selected ? "border-primary shadow-lg ring-4 ring-primary/10" : "border-border shadow-sm hover:shadow-md hover:border-primary/50",
        data.isNew && "animate-in zoom-in-95 duration-300"
      )}
    >
      <Handle type="target" position={Position.Left} isConnectable={isConnectable} className="!w-3 !h-3 !-ml-1.5" />
      
      <div className="p-4">
        {data.isRoot && (
          <div className="text-[10px] font-semibold text-primary/60 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            Central Topic
          </div>
        )}
        <div 
          className="text-sm font-medium outline-none empty:before:content-['Empty_Node'] empty:before:text-muted-foreground/50" 
          contentEditable 
          suppressContentEditableWarning 
          onBlur={(e) => {
           data.label = e.currentTarget.textContent || '';
          }}
        >
          {data.label}
        </div>
        
        {data.description && (
          <div className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
            {data.description}
          </div>
        )}
      </div>

      <div className={cn(
        "absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-background border shadow-md rounded-full p-1 z-10 scale-95 group-hover:scale-100",
        selected && "opacity-100 scale-100"
      )}>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground" 
          onClick={onAddNode} 
          title="Add connected node"
        >
          <Plus className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn("h-7 w-7 rounded-full text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50", isGenerating && "animate-pulse bg-indigo-50")} 
          onClick={onGenerateAI} 
          disabled={isGenerating}
          title="Generate ideas with AI"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-0.5" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-32">
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer">
              Delete Node
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Handle type="source" position={Position.Right} isConnectable={isConnectable} className="!w-3 !h-3 !-mr-1.5" />
    </Card>
  );
});

CustomNode.displayName = 'CustomNode';