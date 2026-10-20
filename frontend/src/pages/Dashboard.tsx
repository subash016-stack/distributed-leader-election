import React, { useState } from 'react';
import { useSimulation } from '../hooks/useSimulation';
import { DashboardLayout } from '../components/DashboardLayout';
import { OverviewCards } from '../components/OverviewCards';
import { NetworkGraph } from '../components/NetworkGraph';
import { SimulationControls } from '../components/SimulationControls';
import { ElectionTimeline } from '../components/ElectionTimeline';
import { CoordinatorHistory } from '../components/CoordinatorHistory';
import { NodeInspector } from '../components/NodeInspector';
import { GnutellaMPISection } from '../components/GnutellaMPISection';
import { Database, Network } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mpi' | 'bully'>('mpi');

  const {
    topology,
    events,
    history,
    status,
    selectedNodeId,
    setSelectedNodeId,
    selectedNodeInfo,
    backendOnline,
    wsConnected,
    isLoading,
    actionError,
    startSimulation,
    stopSimulation,
    resetSimulation,
    failNode,
    restartNode,
    triggerElection,
    clearEvents,
  } = useSimulation();

  return (
    <DashboardLayout
      backendOnline={backendOnline}
      wsConnected={wsConnected}
      activeNodesCount={topology?.active_nodes ?? 0}
      totalNodesCount={topology?.total_nodes ?? 5}
    >
      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('mpi')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'mpi'
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Database size={16} />
          <span>Stanford SNAP Gnutella & MPI Engine</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-bold ml-1">
            LAB FOCUS
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bully')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition-all ${
            activeTab === 'bully'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <Network size={16} />
          <span>Interactive TCP Bully Cluster</span>
        </button>
      </div>

      {activeTab === 'mpi' ? (
        <GnutellaMPISection />
      ) : (
        <>
          {/* Overview Cards displaying the 4 mandatory outputs */}
          <OverviewCards
            topology={topology}
            history={history}
            isElectionInProgress={status?.election_in_progress ?? false}
          />

      {/* Main Grid: Interactive Network Graph & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Network Graph (2 cols) */}
        <div className="lg:col-span-2 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-slate-300">
              Interactive Network Topology (React Flow)
            </h2>
            <span className="text-xs text-slate-500">
              Click any node to inspect TCP socket & process
            </span>
          </div>
          <NetworkGraph
            topology={topology}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
          />
        </div>

        {/* Node Inspector (1 col) */}
        <div className="lg:col-span-1">
          <NodeInspector
            nodeInfo={selectedNodeInfo}
            onClose={() => setSelectedNodeId(null)}
            onFail={failNode}
            onRestart={restartNode}
            onTriggerElection={triggerElection}
          />
        </div>
      </div>

      {/* Simulation Controls */}
      <div className="mb-6">
        <SimulationControls
          topology={topology}
          isRunning={status?.is_running ?? false}
          isLoading={isLoading}
          actionError={actionError}
          onStart={startSimulation}
          onStop={stopSimulation}
          onReset={resetSimulation}
          onFailNode={failNode}
          onRestartNode={restartNode}
          onTriggerElection={triggerElection}
        />
      </div>

        {/* Bottom Grid: Real-time Timeline and Coordinator History */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ElectionTimeline events={events} onClear={clearEvents} />
          <CoordinatorHistory history={history} />
        </div>
      </>
      )}
    </DashboardLayout>
  );
};
