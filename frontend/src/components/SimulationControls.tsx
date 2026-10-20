import React, { useState } from 'react';
import { Play, Square, RotateCcw, Zap, AlertTriangle, RefreshCw } from 'lucide-react';
import { TopologyData } from '../types/node';

interface Props {
  topology: TopologyData | null;
  isRunning: boolean;
  isLoading: boolean;
  actionError: string | null;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
  onFailNode: (id: number) => void;
  onRestartNode: (id: number) => void;
  onTriggerElection: (initiatorId?: number) => void;
}

export const SimulationControls: React.FC<Props> = ({
  topology,
  isRunning,
  isLoading,
  actionError,
  onStart,
  onStop,
  onReset,
  onFailNode,
  onRestartNode,
  onTriggerElection,
}) => {
  const [selectedFailId, setSelectedFailId] = useState<number>(5);
  const [selectedRestartId, setSelectedRestartId] = useState<number>(5);
  const [selectedElectionId, setSelectedElectionId] = useState<number>(1);

  const activeNodes = topology?.nodes.filter((n) => n.status === 'ALIVE' || n.status === 'ELECTION') || [];
  const failedNodes = topology?.nodes.filter((n) => n.status === 'FAILED') || [];

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur">
      <div className="flex items-center justify-between pb-4 border-b border-border/60">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Zap size={18} className="text-blue-400" />
            Simulation & Failure Controls
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Inject coordinator failure, restart processes, and trigger Bully elections
          </p>
        </div>

        {/* Global Lifecycle Buttons */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={onStart}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              <Play size={14} />
              Start System
            </button>
          ) : (
            <button
              onClick={onStop}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              <Square size={14} />
              Stop Nodes
            </button>
          )}

          <button
            onClick={onReset}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium transition disabled:opacity-50"
            title="Reset simulation to initial state"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertTriangle size={14} />
          <span>{actionError}</span>
        </div>
      )}

      {/* Action Grids */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* 1. Fail Node Control */}
        <div className="p-3.5 rounded-xl border border-rose-500/20 bg-rose-950/10 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
              <AlertTriangle size={14} />
              Fail Node (Simulate Crash)
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Terminates the node OS process over TCP
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <select
              value={selectedFailId}
              onChange={(e) => setSelectedFailId(Number(e.target.value))}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            >
              {topology?.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  Node {n.id} {n.is_coordinator ? '(Coordinator)' : ''} {n.status === 'FAILED' ? '[Failed]' : ''}
                </option>
              ))}
            </select>
            <button
              onClick={() => onFailNode(selectedFailId)}
              disabled={isLoading || !activeNodes.some((n) => n.id === selectedFailId)}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-40"
            >
              Fail
            </button>
          </div>
        </div>

        {/* 2. Restart Node Control */}
        <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-950/10 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
              <RefreshCw size={14} />
              Restart Failed Node
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Spawns fresh process on assigned port
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <select
              value={selectedRestartId}
              onChange={(e) => setSelectedRestartId(Number(e.target.value))}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              {topology?.nodes.map((n) => (
                <option key={n.id} value={n.id}>
                  Node {n.id} {n.status === 'FAILED' ? '[Failed]' : '[Alive]'}
                </option>
              ))}
            </select>
            <button
              onClick={() => onRestartNode(selectedRestartId)}
              disabled={isLoading || !failedNodes.some((n) => n.id === selectedRestartId)}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition disabled:opacity-40"
            >
              Restart
            </button>
          </div>
        </div>

        {/* 3. Manual Election Trigger */}
        <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-950/10 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Zap size={14} />
              Trigger Election
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Initiates Bully election from chosen node
            </p>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <select
              value={selectedElectionId}
              onChange={(e) => setSelectedElectionId(Number(e.target.value))}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              {activeNodes.map((n) => (
                <option key={n.id} value={n.id}>
                  Initiate from Node {n.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => onTriggerElection(selectedElectionId)}
              disabled={isLoading || activeNodes.length === 0}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition disabled:opacity-40"
            >
              Elect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
