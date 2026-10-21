import React from 'react';
import { RotateCcw, Zap, AlertTriangle, AlertOctagon, CheckCircle2 } from 'lucide-react';
import { TopologyData } from '../types/node';

interface Props {
  topology: TopologyData | null;
  isRunning: boolean;
  isLoading: boolean;
  actionError: string | null;
  onReset: () => void;
  onTriggerElection: (initiatorId?: number) => void;
  onCrashCoordinator: () => void;
  onRecoverAll: () => void;
}

export const SimulationControls: React.FC<Props> = ({
  topology,
  isLoading,
  actionError,
  onReset,
  onTriggerElection,
  onCrashCoordinator,
  onRecoverAll,
}) => {
  const activeNodes = topology?.nodes.filter((n) => n.status === 'ALIVE') || [];
  const failedNodes = topology?.nodes.filter((n) => n.status === 'FAILED') || [];
  const currentCoordinator = topology?.current_coordinator;
  const lowestActiveId = activeNodes.length > 0 ? activeNodes[0].id : 1;

  return (
    <div className="rounded border border-border bg-surface p-3 mb-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Core Algorithm Status */}
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-positive" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-text">
              Bully Protocol Controller
            </span>
            <span className="text-[11px] font-mono text-muted tabular-nums">
              Leader: {currentCoordinator ? `Node ${currentCoordinator}` : 'None'}
            </span>
          </div>
        </div>

        {/* Clean, High-Value Laboratory Actions */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Action 1: Crash Leader (Demonstrates Bully Algorithm) */}
          <button
            onClick={onCrashCoordinator}
            disabled={isLoading || !currentCoordinator}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-control hover:bg-raised text-negative border border-negative/30 font-medium transition-colors disabled:opacity-40"
            title="Simulate crash of current leader to test automatic election"
          >
            <AlertOctagon size={13} />
            <span>Crash Leader (Node {currentCoordinator ?? '-'})</span>
          </button>

          {/* Action 2: Trigger Election from Lowest Rank */}
          <button
            onClick={() => onTriggerElection(lowestActiveId)}
            disabled={isLoading || activeNodes.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-control hover:bg-raised text-warning border border-warning/30 font-medium transition-colors disabled:opacity-40"
            title="Initiate Bully election from lowest active node"
          >
            <Zap size={13} />
            <span>Trigger Election</span>
          </button>

          {/* Action 3: Recover Failed Nodes */}
          {failedNodes.length > 0 && (
            <button
              onClick={onRecoverAll}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-control hover:bg-raised text-positive border border-positive/30 font-medium transition-colors disabled:opacity-40"
              title="Restart all crashed node processes"
            >
              <CheckCircle2 size={13} />
              <span>Recover All ({failedNodes.length})</span>
            </button>
          )}

          {/* Action 4: Clean Reset */}
          <button
            onClick={onReset}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-control hover:bg-raised text-muted hover:text-text border border-border font-medium transition-colors disabled:opacity-40"
            title="Reset cluster to default initial configuration"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mt-2.5 p-2 rounded bg-surface border border-negative/40 text-negative text-xs flex items-center gap-2">
          <AlertTriangle size={13} className="shrink-0" />
          <span>{actionError}</span>
        </div>
      )}
    </div>
  );
};
