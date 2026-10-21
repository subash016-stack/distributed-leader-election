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
    resetSimulation,
    failNode,
    restartNode,
    triggerElection,
    crashCoordinatorAndElect,
    restartAllNodes,
    clearEvents,
  } = useSimulation();

  return (
    <DashboardLayout
      backendOnline={backendOnline}
      wsConnected={wsConnected}
      activeNodesCount={topology?.active_nodes ?? 0}
      totalNodesCount={topology?.total_nodes ?? 5}
    >
      {/* Workbench Mode Tabs (Data-Terminal Underline / Segment) */}
      <div className="flex items-center gap-1 mb-5 border-b border-border pb-px">
        <button
          onClick={() => setActiveTab('mpi')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'mpi'
              ? 'border-accent text-text'
              : 'border-transparent text-muted hover:text-text'
          }`}
        >
          <Database size={14} className={activeTab === 'mpi' ? 'text-accent' : 'text-muted'} />
          <span>Stanford SNAP Gnutella & MPI Engine</span>
          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-control text-muted ml-0.5">
            P2P Graph
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bully')}
          className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 transition-colors ${
            activeTab === 'bully'
              ? 'border-accent text-text'
              : 'border-transparent text-muted hover:text-text'
          }`}
        >
          <Network size={14} className={activeTab === 'bully' ? 'text-accent' : 'text-muted'} />
          <span>Live TCP Bully Cluster</span>
          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-control text-muted ml-0.5">
            5 Processes
          </span>
        </button>
      </div>

      {activeTab === 'mpi' ? (
        <GnutellaMPISection />
      ) : (
        <>
          {/* Overview Metric Tiles */}
          <OverviewCards
            topology={topology}
            history={history}
            isElectionInProgress={status?.election_in_progress ?? false}
          />

          {/* Streamlined Lifecycle Toolbar */}
          <SimulationControls
            topology={topology}
            isRunning={status?.is_running ?? false}
            isLoading={isLoading}
            actionError={actionError}
            onReset={resetSimulation}
            onTriggerElection={triggerElection}
            onCrashCoordinator={crashCoordinatorAndElect}
            onRecoverAll={restartAllNodes}
          />

          {/* Interactive Topology Graph & Node Inspector */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
            <div className="lg:col-span-2 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-text">
                  Overlay Network Topology (TCP Sockets)
                </h3>
                <span className="text-[11px] text-muted">
                  Click any host node to inspect or simulate crashes
                </span>
              </div>
              <NetworkGraph
                topology={topology}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
              />
            </div>

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

          {/* Bottom Grid: Real-time Timeline and Coordinator History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ElectionTimeline events={events} onClear={clearEvents} />
            <CoordinatorHistory history={history} />
          </div>
        </>
      )}
    </DashboardLayout>
  );
};
