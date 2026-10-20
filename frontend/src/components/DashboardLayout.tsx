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
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border/80 bg-card/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
              <Network size={22} />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-slate-100 tracking-tight">
                Distributed Leader Election
              </h1>
              <p className="text-xs text-slate-400">
                Parallel & Distributed Systems Laboratory • Bully Algorithm
              </p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-3 text-xs">
            {/* Live Nodes Count */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300">
              <Activity size={14} className="text-blue-400" />
              <span>
                Nodes: <strong className="text-white">{activeNodesCount}</strong> / {totalNodesCount}
              </span>
            </div>

            {/* WebSocket connection status */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                wsConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {wsConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span className="hidden md:inline">
                {wsConnected ? 'WebSocket Live' : 'Disconnected'}
              </span>
            </div>

            {/* Backend status */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
                backendOnline
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-blue-400' : 'bg-rose-400'}`} />
              <span className="hidden md:inline">
                {backendOnline ? 'FastAPI Online' : 'Backend Offline'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-4 text-center text-xs text-slate-500">
        Parallel and Distributed Systems Mini-Project • Bully Leader Election System • Built with FastAPI & React Flow
      </footer>
    </div>
  );
};
