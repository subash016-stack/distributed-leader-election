import React from 'react';
import { Network, Activity, Wifi, WifiOff } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  backendOnline: boolean;
  wsConnected: boolean;
  activeNodesCount: number;
  totalNodesCount: number;
}

export const DashboardLayout: React.FC<Props> = ({
  children,
  backendOnline,
  wsConnected,
  activeNodesCount,
  totalNodesCount,
}) => {
  return (
    <div className="min-h-screen bg-ground text-text flex flex-col font-sans">
      {/* Top Console Bar */}
      <header className="border-b border-border bg-surface sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-control text-accent flex items-center justify-center border border-border">
              <Network size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-semibold tracking-tight text-text">
                  Distributed Systems Laboratory
                </h1>
                <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-raised text-muted border border-border">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-muted">
                Leader Election & Consensus • Stanford SNAP Gnutella & Bully Engine
              </p>
            </div>
          </div>

          {/* System Telemetry & Status */}
          <div className="flex items-center gap-2 text-xs">
            {/* Active Nodes Count */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-raised border border-border text-muted">
              <Activity size={13} className="text-accent" />
              <span className="tabular-nums">
                Hosts: <strong className="text-text font-medium">{activeNodesCount}</strong> / {totalNodesCount}
              </span>
            </div>

            {/* WebSocket Telemetry */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono tabular-nums ${
                wsConnected
                  ? 'bg-surface border-border text-positive'
                  : 'bg-surface border-border text-negative'
              }`}
            >
              {wsConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span className="hidden sm:inline">
                {wsConnected ? 'WS:5173/ws' : 'WS:Disconnected'}
              </span>
            </div>

            {/* Backend HTTP API Telemetry */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono tabular-nums ${
                backendOnline
                  ? 'bg-surface border-border text-positive'
                  : 'bg-surface border-border text-negative'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${backendOnline ? 'bg-positive' : 'bg-negative'}`} />
              <span className="hidden sm:inline">
                {backendOnline ? 'API:8000' : 'API:Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Workbench Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {children}
      </main>

      {/* System Status Footer */}
      <footer className="border-t border-border py-3 text-center text-xs text-muted font-mono">
        Parallel & Distributed Systems Mini-Project • Bounded Diameter Rounds (&Delta;) • MPI & Multithreaded Watchdogs
      </footer>
    </div>
  );
};
