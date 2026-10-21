import React from 'react';
import { Server, X, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { NodeInfo } from '../types/node';
import { StatusBadge } from './StatusBadge';

interface Props {
  nodeInfo: NodeInfo | null;
  onClose: () => void;
  onFail: (id: number) => void;
  onRestart: (id: number) => void;
  onTriggerElection: (id: number) => void;
}

export const NodeInspector: React.FC<Props> = ({
  nodeInfo,
  onClose,
  onFail,
  onRestart,
  onTriggerElection,
}) => {
  if (!nodeInfo) {
    return (
      <div className="rounded border border-border bg-surface p-5 flex flex-col items-center justify-center text-center text-xs text-muted h-full">
        <Server size={24} className="text-muted/60 mb-2" />
        <p className="font-medium text-text">No host selected</p>
        <p className="text-[11px] text-muted mt-1 max-w-[200px]">
          Click any node in the topology to inspect its socket state and trigger node actions.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded border border-border bg-surface p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-rule">
        <div className="flex items-center gap-2">
          <Server size={15} className="text-accent" />
          <h2 className="text-sm font-semibold text-text tabular-nums">
            Node {nodeInfo.id} Inspector
          </h2>
          <StatusBadge status={nodeInfo.status} isCoordinator={nodeInfo.is_coordinator} size="sm" />
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-muted hover:text-text hover:bg-raised transition-colors"
          title="Close inspector"
        >
          <X size={14} />
        </button>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
        <div className="p-2 rounded bg-raised border border-border">
          <span className="text-muted block text-[10px]">TCP Endpoint</span>
          <span className="font-mono text-text font-medium text-[11px] tabular-nums">
            {nodeInfo.host}:{nodeInfo.port}
          </span>
        </div>

        <div className="p-2 rounded bg-raised border border-border">
          <span className="text-muted block text-[10px]">Current Leader</span>
          <span className="font-mono text-positive font-medium text-[11px] tabular-nums">
            {nodeInfo.current_coordinator ? `Node ${nodeInfo.current_coordinator}` : 'None'}
          </span>
        </div>

        <div className="p-2 rounded bg-raised border border-border">
          <span className="text-muted block text-[10px]">Process ID (PID)</span>
          <span className="font-mono text-text text-[11px] tabular-nums">
            {nodeInfo.pid ? nodeInfo.pid : 'Not running'}
          </span>
        </div>

        <div className="p-2 rounded bg-raised border border-border">
          <span className="text-muted block text-[10px]">Bully Generation</span>
          <span className="font-mono text-warning text-[11px] tabular-nums">
            #{nodeInfo.election_generation}
          </span>
        </div>
      </div>

      {/* Peers list */}
      <div className="mt-2.5 p-2 rounded bg-raised border border-border text-xs">
        <span className="text-muted block text-[10px] mb-1">Configured Peer Links:</span>
        <div className="flex flex-wrap gap-1">
          {nodeInfo.peers.map((peerId) => (
            <span
              key={peerId}
              className="px-1.5 py-0.5 rounded bg-control text-text font-mono text-[10px] tabular-nums"
            >
              Host {peerId}
            </span>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-2 mt-auto pt-3 border-t border-rule">
        {nodeInfo.status !== 'FAILED' ? (
          <>
            <button
              onClick={() => onFail(nodeInfo.id)}
              className="w-full sm:flex-1 py-1.5 px-2.5 rounded bg-control hover:bg-raised text-negative border border-negative/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <AlertTriangle size={13} />
              <span>Simulate Crash</span>
            </button>
            <button
              onClick={() => onTriggerElection(nodeInfo.id)}
              className="w-full sm:flex-1 py-1.5 px-2.5 rounded bg-control hover:bg-raised text-warning border border-warning/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Zap size={13} />
              <span>Initiate Election</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => onRestart(nodeInfo.id)}
            className="w-full py-1.5 px-2.5 rounded bg-control hover:bg-raised text-positive border border-positive/30 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} />
            <span>Restart Node Process</span>
          </button>
        )}
      </div>
    </div>
  );
};
