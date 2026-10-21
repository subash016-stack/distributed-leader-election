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
import { Crown, AlertOctagon, Server } from 'lucide-react';

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
      const x = centerX + radius * Math.cos(angle) - 80;
      const y = centerY + radius * Math.sin(angle) - 40;

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
          stroke: isCoordEdge ? '#44a282' : '#24242c',
          strokeWidth: isCoordEdge ? 2 : 1,
          opacity: isCoordEdge ? 0.9 : 0.6,
        },
      };
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [topology, selectedNodeId]);

  return (
    <div className="relative h-[480px] w-full rounded border border-border bg-[#0b0b0e] overflow-hidden">
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
        <Background color="#1c1c22" gap={20} size={1} variant={BackgroundVariant.Dots} />
        <Controls className="!bg-surface !border-border !text-muted" />
      </ReactFlow>

      {/* Visual Legend */}
      <div className="absolute bottom-2.5 left-2.5 flex flex-wrap gap-3 bg-surface border border-border px-3 py-1.5 rounded text-xs pointer-events-none">
        <div className="flex items-center gap-1.5 text-positive font-medium">
          <Crown size={12} />
          <span>Coordinator</span>
        </div>
        <div className="flex items-center gap-1.5 text-accent font-medium">
          <Server size={12} />
          <span>Active Peer</span>
        </div>
        <div className="flex items-center gap-1.5 text-negative font-medium">
          <AlertOctagon size={12} />
          <span>Failed Node</span>
        </div>
      </div>
    </div>
  );
};
