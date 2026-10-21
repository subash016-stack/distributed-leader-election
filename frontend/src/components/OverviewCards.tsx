import React from 'react';
import { Crown, AlertTriangle, Activity, CheckCircle2 } from 'lucide-react';
import { TopologyData } from '../types/node';
import { CoordinatorRecord } from '../types/event';

interface Props {
  topology: TopologyData | null;
  history?: CoordinatorRecord[];
  isElectionInProgress: boolean;
}

export const OverviewCards: React.FC<Props> = ({
  topology,
  isElectionInProgress,
}) => {
  const currentCoordinator = topology?.current_coordinator;
  const failedNodes = topology?.nodes.filter((n) => n.status === 'FAILED') || [];
  const activeNodesCount = topology?.active_nodes ?? 0;
  const totalNodesCount = topology?.total_nodes ?? 5;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
      {/* 1. Current Coordinator */}
      <div className="rounded border border-border bg-surface p-4">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs text-muted font-medium">
            Current coordinator
          </span>
          <Crown size={15} className={currentCoordinator ? 'text-positive' : 'text-muted'} />
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          {currentCoordinator ? (
            <>
              <span className="text-2xl font-bold tracking-tight text-text tabular-nums">
                Node {currentCoordinator}
              </span>
              <span className="text-xs text-muted font-mono tabular-nums">
                :port {9000 + currentCoordinator}
              </span>
            </>
          ) : (
            <span className="text-xl font-medium text-muted">None elected</span>
          )}
        </div>
        <div className="mt-2 text-xs text-muted">
          Acknowledged leader of active ring
        </div>
      </div>

      {/* 2. Election Consensus State */}
      <div className="rounded border border-border bg-surface p-4">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs text-muted font-medium">
            Consensus state
          </span>
          {isElectionInProgress ? (
            <Activity size={15} className="text-warning" />
          ) : (
            <CheckCircle2 size={15} className="text-positive" />
          )}
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-text">
            {isElectionInProgress ? 'In progress' : 'Stable'}
          </span>
          <span
            className={`text-xs px-2 py-0.5 rounded font-mono ${
              isElectionInProgress
                ? 'bg-control text-warning'
                : 'bg-control text-positive'
            }`}
          >
            {isElectionInProgress ? 'Voting' : 'Converged'}
          </span>
        </div>
        <div className="mt-2 text-xs text-muted">
          {isElectionInProgress
            ? 'Exchanging candidate & ACK proposals'
            : 'All living peers synchronized'}
        </div>
      </div>

      {/* 3. Active Process Hosts */}
      <div className="rounded border border-border bg-surface p-4">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs text-muted font-medium">
            Active hosts
          </span>
          <Activity size={15} className="text-accent" />
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-text tabular-nums">
            {activeNodesCount} / {totalNodesCount}
          </span>
          <span className="text-xs text-muted font-mono tabular-nums">
            ({Math.round((activeNodesCount / (totalNodesCount || 1)) * 100)}%)
          </span>
        </div>
        <div className="mt-2 text-xs text-muted">
          Autonomous TCP socket workers
        </div>
      </div>

      {/* 4. Failed Nodes */}
      <div className="rounded border border-border bg-surface p-4">
        <div className="flex items-center justify-between pb-1">
          <span className="text-xs text-muted font-medium">
            Failed processes
          </span>
          <AlertTriangle
            size={15}
            className={failedNodes.length > 0 ? 'text-negative' : 'text-muted'}
          />
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          {failedNodes.length > 0 ? (
            <span className="text-2xl font-bold tracking-tight text-negative tabular-nums">
              {failedNodes.map((n) => `Node ${n.id}`).join(', ')}
            </span>
          ) : (
            <span className="text-2xl font-bold tracking-tight text-text">
              0
            </span>
          )}
          <span className="text-xs text-muted font-mono">
            {failedNodes.length > 0 ? 'crashed' : 'none'}
          </span>
        </div>
        <div className="mt-2 text-xs text-muted">
          {failedNodes.length > 0
            ? 'Process terminated or unresponsive'
            : 'All node sockets healthy'}
        </div>
      </div>
    </div>
  );
};
