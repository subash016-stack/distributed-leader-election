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

  let borderColor = 'border-slate-700';
  let bgColor = 'bg-slate-900/90';
  let glowColor = '';
  let textColor = 'text-slate-300';
  let badgeBg = 'bg-slate-800 text-slate-400';
  let Icon = Server;

  if (status === 'FAILED') {
    // Red: failed node
    borderColor = 'border-rose-500/80';
    bgColor = 'bg-rose-950/70';
    glowColor = 'shadow-[0_0_15px_rgba(244,63,94,0.35)]';
    textColor = 'text-rose-200';
    badgeBg = 'bg-rose-500/20 text-rose-300';
    Icon = AlertOctagon;
  } else if (status === 'ELECTION') {
    // Amber: election in progress
    borderColor = 'border-amber-500/80';
    bgColor = 'bg-amber-950/70';
    glowColor = 'shadow-[0_0_20px_rgba(245,158,11,0.4)] animate-pulse';
    textColor = 'text-amber-200';
    badgeBg = 'bg-amber-500/20 text-amber-300';
    Icon = RefreshCw;
  } else if (is_coordinator && status === 'ALIVE') {
    // Green: active coordinator
    borderColor = 'border-emerald-500';
    bgColor = 'bg-emerald-950/80';
    glowColor = 'shadow-[0_0_25px_rgba(16,185,129,0.45)] ring-2 ring-emerald-400/50';
    textColor = 'text-emerald-100';
    badgeBg = 'bg-emerald-500/30 text-emerald-300 font-bold';
    Icon = Crown;
  } else if (status === 'ALIVE') {
    // Blue: active non-coordinator
    borderColor = 'border-blue-500/60';
    bgColor = 'bg-blue-950/70';
    glowColor = 'shadow-[0_0_15px_rgba(59,130,246,0.25)]';
    textColor = 'text-blue-100';
    badgeBg = 'bg-blue-500/20 text-blue-300';
    Icon = Server;
  } else {
    // Gray: offline
    borderColor = 'border-slate-800';
    bgColor = 'bg-slate-900/60';
    textColor = 'text-slate-500';
    badgeBg = 'bg-slate-800 text-slate-500';
    Icon = PowerOff;
  }

  const selectedRing = isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-background' : '';

  return (
    <div
      className={`relative min-w-[170px] rounded-2xl border-2 ${borderColor} ${bgColor} ${glowColor} ${selectedRing} p-3.5 backdrop-blur-md transition-all duration-300 hover:scale-105 cursor-pointer shadow-xl`}
    >
      {/* Hidden Handles for React Flow Edge Connections */}
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
      <Handle type="target" position={Position.Left} id="left" className="!opacity-0" />
      <Handle type="source" position={Position.Right} id="right" className="!opacity-0" />

      {/* Top row: Icon and Node ID */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${badgeBg}`}>
            <Icon size={18} className={status === 'ELECTION' ? 'animate-spin' : ''} />
          </div>
          <div>
            <div className={`text-base font-bold tracking-tight ${textColor}`}>
              Node {id}
            </div>
            <div className="text-[11px] font-mono text-slate-400">
              :{port}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: status pill and coordinator view */}
      <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex items-center justify-between text-[11px]">
        <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider text-[10px] font-semibold ${badgeBg}`}>
          {is_coordinator && status === 'ALIVE' ? 'COORDINATOR' : status}
        </span>
        <span className="text-slate-400 font-mono text-[10px]">
          {nodeInfo.current_coordinator ? `Coord: ${nodeInfo.current_coordinator}` : 'Coord: -'}
        </span>
      </div>
    </div>
  );
});
