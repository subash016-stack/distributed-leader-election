import React from 'react';
import { Crown, AlertTriangle, Activity, CheckCircle } from 'lucide-react';
import { TopologyData } from '../types/node';
import { CoordinatorRecord } from '../types/event';

interface Props {
  topology: TopologyData | null;
  history: CoordinatorRecord[];
  isElectionInProgress: boolean;
}

export const OverviewCards: React.FC<Props> = ({
  topology,
  history,
  isElectionInProgress,
}) => {
  const latestCoordRecord = history.length > 0 ? history[history.length - 1] : null;
  const currentCoordinator = topology?.current_coordinator;

  // Find failed nodes
  const failedNodes = topology?.nodes.filter((n) => n.status === 'FAILED') || [];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. MANDATORY OUTPUT: Current Coordinator */}
      <div className="relative overflow-hidden rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 via-card to-card p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            Current Coordinator
          </span>
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 border border-emerald-500/20">
            <Crown size={20} />
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          {currentCoordinator ? (
            <>
              <span className="text-3xl font-bold tracking-tight text-emerald-300">
                Node {currentCoordinator}
              </span>
              <span className="text-xs text-emerald-400/80 font-mono">(Port {9000 + currentCoordinator})</span>
            </>
          ) : (
            <span className="text-2xl font-bold text-slate-500">None Elected</span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Leader recognized by active nodes
        </p>
      </div>

      {/* 2. MANDATORY OUTPUT: Election Process / Status */}
      <div className={`relative overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur ${
        isElectionInProgress
          ? 'border-amber-500/40 bg-gradient-to-br from-amber-950/30 via-card to-card'
          : 'border-border bg-card'
      }`}>
        <div className="flex items-center justify-between pb-2">
          <span className={`text-xs font-semibold uppercase tracking-wider ${
            isElectionInProgress ? 'text-amber-400' : 'text-slate-400'
          }`}>
            Election Process
          </span>
          <div className={`rounded-lg p-2 ${
            isElectionInProgress
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-spin'
              : 'bg-slate-800 text-slate-400 border border-slate-700'
          }`}>
            <Activity size={20} />
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${
            isElectionInProgress ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
          }`} />
          <span className="text-2xl font-bold tracking-tight text-slate-100">
            {isElectionInProgress ? 'In Progress' : 'Stable'}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {isElectionInProgress ? 'Nodes exchanging Bully messages' : 'Bully algorithm converged'}
        </p>
      </div>

      {/* 3. MANDATORY OUTPUT: Failed Node(s) */}
      <div className={`relative overflow-hidden rounded-xl border p-4 shadow-lg backdrop-blur ${
        failedNodes.length > 0
          ? 'border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-card to-card'
          : 'border-border bg-card'
      }`}>
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
            Failed Nodes
          </span>
          <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={20} />
          </div>
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          {failedNodes.length > 0 ? (
            <span className="text-2xl font-bold tracking-tight text-rose-400">
              {failedNodes.map((n) => `Node ${n.id}`).join(', ')}
            </span>
          ) : (
            <span className="text-2xl font-bold text-slate-400">None (0 Failed)</span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {failedNodes.length > 0
            ? `${failedNodes.length} node process crashed or stopped`
            : 'All configured nodes operational'}
        </p>
      </div>

      {/* 4. MANDATORY OUTPUT: Newly Elected Coordinator */}
      <div className="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-card to-card p-4 shadow-lg backdrop-blur">
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">
            Latest Transition
          </span>
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400 border border-blue-500/20">
            <CheckCircle size={20} />
          </div>
        </div>
        <div className="mt-1">
          {latestCoordRecord ? (
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm text-slate-400">
                {latestCoordRecord.previous_coordinator ? `Node ${latestCoordRecord.previous_coordinator} → ` : ''}
              </span>
              <span className="text-2xl font-bold text-blue-300">
                Node {latestCoordRecord.new_coordinator}
              </span>
            </div>
          ) : (
            <span className="text-2xl font-bold text-slate-400">Initial Setup</span>
          )}
        </div>
        <p className="mt-2 text-xs text-slate-400 truncate">
          {latestCoordRecord ? latestCoordRecord.reason : 'Waiting for election event'}
        </p>
      </div>
    </div>
  );
};
