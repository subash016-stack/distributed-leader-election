import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  Node,
  Edge,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { TopologyData } from '../types/node';
import { CustomNode, CustomNodeData } from './CustomNode';
import { Crown, AlertOctagon, Server, RefreshCw, PowerOff } from 'lucide-react';

const nodeTypes: NodeTypes = {
  custom: CustomNode,
};

interface Props {
  topology: TopologyData | null;
  selectedNodeId: number | null;
  onSelectNode: (id: number) => void;
}

export const NetworkGraph: React.FC<Props> = ({
  topology,
  selectedNodeId,
  onSelectNode,
}) => {
  // Generate circular layout coordinates for nodes
  const { nodes, edges } = useMemo(() => {
    if (!topology || topology.nodes.length === 0) {
      return { nodes: [], edges: [] };
    }

    const total = topology.nodes.length;
    const centerX = 320;
    const centerY = 240;
    const radius = 170;

    const flowNodes: Node<CustomNodeData>[] = topology.nodes.map((node, index) => {
      // Circular positioning: distribute evenly starting from top
      const angle = (2 * Math.PI * index) / total - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle) - 85;
      const y = centerY + radius * Math.sin(angle) - 45;

      return {
        id: String(node.id),
        type: 'custom',
        position: { x, y },
        data: {
          nodeInfo: node,
          isSelected: selectedNodeId === node.id,
        },
      };
    });

    const flowEdges: Edge[] = topology.edges.map((edge) => {
      const isSrcCoord = topology.current_coordinator === edge.source;
      const isTgtCoord = topology.current_coordinator === edge.target;
      const isCoordEdge = isSrcCoord || isTgtCoord;

      return {
        id: `e${edge.source}-${edge.target}`,
        source: String(edge.source),
        target: String(edge.target),
        animated: isCoordEdge,
        style: {
          stroke: isCoordEdge ? '#10B981' : '#334155',
          strokeWidth: isCoordEdge ? 2.5 : 1.5,
          opacity: 0.7,
        },
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [topology, selectedNodeId]);

  return (
    <div className="relative h-[480px] w-full rounded-2xl border border-border bg-slate-950/70 overflow-hidden shadow-2xl backdrop-blur-xl">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onNodeClick={(_, node) => onSelectNode(Number(node.id))}
        nodesDraggable={true}
        nodesConnectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#1e293b" gap={20} size={1.5} variant={BackgroundVariant.Dots} />
        <Controls className="!bg-slate-900 !border-slate-800 !text-slate-300" />
      </ReactFlow>

      {/* Visual Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-3 bg-slate-900/90 border border-slate-800/80 px-3.5 py-2 rounded-xl backdrop-blur text-xs pointer-events-none shadow-lg">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <Crown size={13} />
          <span>Coordinator (Green)</span>
        </div>
        <div className="flex items-center gap-1.5 text-blue-400">
          <Server size={13} />
          <span>Active Node (Blue)</span>
        </div>
        <div className="flex items-center gap-1.5 text-rose-400">
          <AlertOctagon size={13} />
          <span>Failed Node (Red)</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-400">
          <RefreshCw size={13} />
          <span>Election (Amber)</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <PowerOff size={13} />
          <span>Offline (Gray)</span>
        </div>
      </div>
    </div>
  );
};
