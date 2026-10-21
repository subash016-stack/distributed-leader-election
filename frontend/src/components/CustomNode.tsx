import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Crown, AlertOctagon, Server, RefreshCw, PowerOff } from 'lucide-react';
import { NodeInfo } from '../types/node';

export interface CustomNodeData extends Record<string, unknown> {
  nodeInfo: NodeInfo;
  isSelected: boolean;
}

export const CustomNode = memo((props: NodeProps) => {
  const data = props.data as unknown as CustomNodeData;
  const { nodeInfo, isSelected } = data;
  const { id, status, is_coordinator, port } = nodeInfo;

  let borderColor = 'border-border';
  let badgeClass = 'text-muted bg-raised';
  let Icon = Server;
  let statusText: string = status;

  if (status === 'FAILED') {
    borderColor = 'border-negative';
    badgeClass = 'text-negative bg-control';
    Icon = AlertOctagon;
  } else if (status === 'ELECTION') {
    borderColor = 'border-warning';
    badgeClass = 'text-warning bg-control';
    Icon = RefreshCw;
  } else if (is_coordinator && status === 'ALIVE') {
    borderColor = 'border-positive';
    badgeClass = 'text-positive bg-control font-semibold';
    Icon = Crown;
    statusText = 'COORDINATOR';
  } else if (status === 'ALIVE') {
    borderColor = isSelected ? 'border-accent' : 'border-border';
    badgeClass = 'text-accent bg-control';
    Icon = Server;
  } else {
    borderColor = 'border-border';
    badgeClass = 'text-muted bg-raised';
    Icon = PowerOff;
  }

  const selectionOutline = isSelected ? 'ring-1 ring-accent' : '';

  return (
    <div
      className={`relative min-w-[160px] rounded border ${borderColor} ${selectionOutline} bg-surface p-3 cursor-pointer transition-colors`}
    >
      {/* Hidden Handles for React Flow Edge Connections */}
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <Handle type="target" position={Position.Left} id="left" className="!opacity-0" />
      <Handle type="source" position={Position.Right} id="right" className="!opacity-0" />

      {/* Top row: Icon and Node ID */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-control text-text">
            <Icon size={15} />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight text-text tabular-nums">
              Host {id}
            </div>
            <div className="text-[11px] font-mono text-muted tabular-nums">
              :{port}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: status pill and coordinator view */}
      <div className="mt-2.5 pt-2 border-t border-rule flex items-center justify-between text-[11px]">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase ${badgeClass}`}>
          {statusText}
        </span>
        <span className="text-muted font-mono text-[10px] tabular-nums">
          {nodeInfo.current_coordinator ? `C:${nodeInfo.current_coordinator}` : 'C:-'}
        </span>
      </div>
    </div>
  );
});
