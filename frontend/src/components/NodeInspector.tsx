import React from 'react';
import { Server, X, Zap, AlertTriangle, RefreshCw, Radio } from 'lucide-react';
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
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur flex items-center justify-center text-xs text-slate-500 h-full">
        Click any node in the network graph to inspect its runtime state and TCP message traffic.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Server size={18} className="text-blue-400" />
          <h2 className="text-base font-bold text-slate-100">
            Node {nodeInfo.id} Inspector
          </h2>
          <StatusBadge status={nodeInfo.status} isCoordinator={nodeInfo.is_coordinator} size="sm" />
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">TCP Endpoint</span>
          <span className="font-mono text-slate-200 font-medium">
            {nodeInfo.host}:{nodeInfo.port}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Coordinator View</span>
          <span className="font-mono text-emerald-400 font-bold">
            {nodeInfo.current_coordinator ? `Node ${nodeInfo.current_coordinator}` : 'None'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Process ID (PID)</span>
          <span className="font-mono text-slate-200">
            {nodeInfo.pid ? nodeInfo.pid : 'Not Running'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-slate-400 block text-[11px]">Election Generation</span>
          <span className="font-mono text-amber-400">
            #{nodeInfo.election_generation}
          </span>
        </div>
      </div>

      {/* Peers list */}
      <div className="mt-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
        <span className="text-slate-400 block text-[11px] mb-1">Configured Peer Nodes:</span>
        <div className="flex flex-wrap gap-1.5">
          {nodeInfo.peers.map((peerId) => (
            <span
              key={peerId}
              className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono text-[11px]"
            >
              Node {peerId}
            </span>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
        {nodeInfo.status !== 'FAILED' ? (
          <button
            onClick={() => onFail(nodeInfo.id)}
            className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <AlertTriangle size={13} />
            Fail Node {nodeInfo.id}
          </button>
        ) : (
          <button
            onClick={() => onRestart(nodeInfo.id)}
            className="flex-1 py-1.5 px-3 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <RefreshCw size={13} />
            Restart Node {nodeInfo.id}
          </button>
        )}

        <button
          onClick={() => onTriggerElection(nodeInfo.id)}
          disabled={nodeInfo.status === 'FAILED'}
          className="flex-1 py-1.5 px-3 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-40"
        >
          <Zap size={13} />
          Trigger Election
        </button>
      </div>

      {/* Recent Traffic */}
      <div className="mt-4 flex-1 flex flex-col min-h-0">
        <span className="text-xs font-semibold text-slate-300 mb-2 flex items-center gap-1.5">
          <Radio size={14} className="text-blue-400" />
          Recent Node TCP Traffic
        </span>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
          {nodeInfo.recent_messages && nodeInfo.recent_messages.length > 0 ? (
            nodeInfo.recent_messages.map((m, idx) => (
              <div
                key={idx}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      m.direction === 'OUT' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {m.direction}
                  </span>
                  <span className="text-slate-200">{m.type}</span>
                </div>
                <span className="text-slate-400">Node {m.peer_id}</span>
              </div>
            ))
          ) : (
            <div className="py-4 text-center text-slate-500 text-xs font-sans">
              No recent TCP messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
