import React, { useState, useEffect } from 'react';
import {
  Database,
  Cpu,
  Play,
  CheckCircle2,
  AlertTriangle,
  Download,
  BarChart3,
  Layers,
  Activity,
  RefreshCw,
  ExternalLink,
  Zap,
  Sliders,
} from 'lucide-react';
import { api, DatasetInfo, MetricRecord } from '../services/api';

export const GnutellaMPISection: React.FC = () => {
  const [datasetInfo, setDatasetInfo] = useState<DatasetInfo | null>(null);
  const [metrics, setMetrics] = useState<MetricRecord[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [runningExp, setRunningExp] = useState(false);
  const [expResult, setExpResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [subgraphSize, setSubgraphSize] = useState<number>(10);
  const [numRanks, setNumRanks] = useState<number>(2);
  const [seed, setSeed] = useState<number>(42);
  const [failNodeInput, setFailNodeInput] = useState<string>('');

  useEffect(() => {
    fetchDatasetAndMetrics();
  }, []);

  const fetchDatasetAndMetrics = async () => {
    setLoadingInfo(true);
    setErrorMsg(null);
    try {
      const [info, mData] = await Promise.all([
        api.getDatasetInfo(),
        api.getMetrics(),
      ]);
      setDatasetInfo(info);
      setMetrics(mData.metrics || []);
    } catch (err: any) {
      console.error('Failed to load dataset/metrics:', err);
      setErrorMsg(err.message || 'Error communicating with backend');
    } finally {
      setLoadingInfo(false);
    }
  };

  const handleRunMPI = async () => {
    setRunningExp(true);
    setErrorMsg(null);
    setExpResult(null);
    try {
      const failedNodes = failNodeInput
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n));

      const res = await api.runMPIExperiment(subgraphSize, numRanks, seed, failedNodes);
      setExpResult(res);
      // Refresh metrics after run
      const mData = await api.getMetrics();
      setMetrics(mData.metrics || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute MPI experiment');
    } finally {
      setRunningExp(false);
    }
  };

  return (
    <div className="space-y-8 mt-4">
      {/* Top Banner / Dataset Overview */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                <Database size={13} />
                Stanford SNAP Dataset
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                <Cpu size={13} />
                MPI Topology-Aware Engine
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                <Activity size={13} />
                MPI.THREAD_FUNNELED Watchdog
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Distributed Leader Election over Gnutella P2P Network
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Programmatically parsed from the Stanford SNAP Gnutella-08 Peer-to-Peer network. Subgraphs are mapped
              across isolated MPI processes with threaded non-blocking heartbeat monitoring, bounded by graph diameter &Delta;.
            </p>
          </div>

          {/* Dataset citation external link */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="https://snap.stanford.edu/data/p2p-Gnutella08.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition-all text-sm shadow-md"
            >
              <ExternalLink size={15} />
              Stanford SNAP Citation
            </a>
          </div>
        </div>

        {/* Dataset Stats Cards */}
        {datasetInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
            <div className="bg-slate-900/60 backdrop-blur rounded-xl p-3 border border-slate-800">
              <span className="text-xs text-slate-400">Total Network Hosts</span>
              <p className="text-lg font-bold text-white mt-0.5">
                {datasetInfo.published_nodes.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">SNAP hosts</span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur rounded-xl p-3 border border-slate-800">
              <span className="text-xs text-slate-400">Directed Connections</span>
              <p className="text-lg font-bold text-indigo-300 mt-0.5">
                {datasetInfo.published_edges.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">Raw graph edges</span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur rounded-xl p-3 border border-slate-800">
              <span className="text-xs text-slate-400">Undirected Overlay</span>
              <p className="text-lg font-bold text-blue-300 mt-0.5">
                {datasetInfo.undirected_unique_edges.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">Bidirectional overlay</span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur rounded-xl p-3 border border-slate-800">
              <span className="text-xs text-slate-400">Largest Component</span>
              <p className="text-lg font-bold text-emerald-400 mt-0.5">
                {datasetInfo.largest_connected_component_nodes.toLocaleString()}
              </p>
              <span className="text-[10px] text-slate-500">99.97% connected</span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur rounded-xl p-3 border border-slate-800">
              <span className="text-xs text-slate-400">Average Degree &lang;k&rang;</span>
              <p className="text-lg font-bold text-amber-300 mt-0.5">
                {datasetInfo.average_degree}
              </p>
              <span className="text-[10px] text-slate-500">Avg connections/host</span>
            </div>
            <div className="bg-slate-900/60 backdrop-blur rounded-xl p-3 border border-slate-800">
              <span className="text-xs text-slate-400">Duplicate Edges</span>
              <p className="text-lg font-bold text-slate-300 mt-0.5">
                {datasetInfo.duplicate_directed_edges}
              </p>
              <span className="text-[10px] text-emerald-400">Cleanly deduped</span>
            </div>
          </div>
        )}
      </div>

      {/* Control & Experiment Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Card */}
        <div className="lg:col-span-1 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Sliders size={18} className="text-indigo-400" />
                MPI Experiment Configuration
              </h3>
              <button
                onClick={fetchDatasetAndMetrics}
                disabled={loadingInfo}
                className="text-slate-400 hover:text-white transition-colors"
                title="Refresh stats"
              >
                <RefreshCw size={14} className={loadingInfo ? 'animate-spin' : ''} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Subgraph Size */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Connected Subgraph Size (|V|)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSubgraphSize(sz)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        subgraphSize === sz
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {sz} Nodes
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of MPI Ranks */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  MPI Process Ranks (p)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 4].map((rk) => (
                    <button
                      key={rk}
                      type="button"
                      onClick={() => setNumRanks(rk)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        numRanks === rk
                          ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                          : 'bg-slate-800/60 border-slate-700/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      {rk} {rk === 1 ? 'Rank (Seq)' : 'Ranks'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seed */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Random Sampling Seed
                </label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value, 10) || 42)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Injected Failures */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Injected Node Failures (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5040, 103"
                  value={failNodeInput}
                  onChange={(e) => setFailNodeInput(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Simulates non-responsive node state without aborting the MPI runtime.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            {errorMsg && (
              <div className="mb-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleRunMPI}
              disabled={runningExp}
              className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {runningExp ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Running MPI Distributed Election...
                </>
              ) : (
                <>
                  <Play size={16} className="fill-current" />
                  Launch MPI Distributed Election
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Execution Output */}
        <div className="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap size={18} className="text-amber-400" />
              MPI Election Live Result
            </h3>
            {expResult && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 size={12} />
                Converged in {expResult.rounds} Rounds
              </span>
            )}
          </div>

          {!expResult && !runningExp && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-slate-800 rounded-xl">
              <Cpu size={40} className="text-slate-600 mb-3" />
              <p className="text-slate-400 text-sm font-medium">No MPI experiment active</p>
              <p className="text-slate-600 text-xs max-w-sm mt-1">
                Select your subgraph parameters on the left and click &ldquo;Launch MPI Distributed Election&rdquo; to execute the topology-aware maximum-ID protocol.
              </p>
            </div>
          )}

          {runningExp && (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <RefreshCw size={36} className="text-indigo-400 animate-spin mb-3" />
              <p className="text-indigo-300 text-sm font-medium">
                Dispatching MPI ranks across Gnutella subgraph...
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Exchanging candidate proposals and synchronizing graph diameter bounds.
              </p>
            </div>
          )}

          {expResult && (
            <div className="space-y-4">
              {/* Outcome summary grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Elected Coordinator</span>
                  <p className="text-lg font-bold text-amber-300 mt-0.5">
                    Node {expResult.coordinators ? expResult.coordinators.join(', ') : 'None'}
                  </p>
                  <span className="text-[10px] text-slate-500">Highest-ID Active Host</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Wall-Clock Time</span>
                  <p className="text-lg font-bold text-indigo-300 mt-0.5">
                    {(expResult.wall_clock_time_sec * 1000).toFixed(2)} ms
                  </p>
                  <span className="text-[10px] text-slate-500">{expResult.wall_clock_time_sec.toFixed(4)}s total</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">MPI Messages</span>
                  <p className="text-lg font-bold text-blue-300 mt-0.5">
                    {expResult.total_messages.toLocaleString()}
                  </p>
                  <span className="text-[10px] text-slate-500">Exchanged across edges</span>
                </div>
                <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
                  <span className="text-[11px] text-slate-400">Graph Diameter (&Delta;)</span>
                  <p className="text-lg font-bold text-emerald-400 mt-0.5">
                    {expResult.graph_diameter}
                  </p>
                  <span className="text-[10px] text-slate-500">Upper bound for rounds</span>
                </div>
              </div>

              {/* Rank to Node Assignment */}
              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Layers size={14} className="text-indigo-400" />
                    MPI Rank-to-Host Workload Distribution
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {expResult.num_ranks} MPI process ranks active
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                  {Object.entries(expResult.rank_node_distribution || {}).map(([rk, nodes]: any) => (
                    <div
                      key={rk}
                      className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs"
                    >
                      <div className="font-semibold text-indigo-300 mb-1">
                        MPI Rank {rk} ({nodes.length} hosts)
                      </div>
                      <div className="text-[11px] text-slate-400 truncate" title={nodes.join(', ')}>
                        Nodes: {nodes.slice(0, 6).join(', ')}
                        {nodes.length > 6 ? '...' : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Event preview */}
              {expResult.events && expResult.events.length > 0 && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 font-mono text-[11px] max-h-36 overflow-y-auto space-y-1">
                  <div className="text-slate-500 text-[10px] uppercase font-bold sticky top-0 bg-slate-950/90 py-0.5">
                    Recent MPI Engine Trace
                  </div>
                  {expResult.events.slice(-6).map((ev: any, idx: number) => (
                    <div key={idx} className="text-slate-300 flex items-center gap-2">
                      <span className="text-indigo-400">[{ev.type}]</span>
                      <span>{ev.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Laboratory Benchmark Suite & Charts */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-400" />
              Empirical Performance Evaluation & Benchmark Suite
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Real measurements collected across 12 full experimental configurations (1, 2, and 4 MPI ranks for 10, 25, 50, and 100 Gnutella nodes).
            </p>
          </div>
          <a
            href="/plots/speedup_and_efficiency.png"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-xs text-slate-300 hover:text-white border border-slate-700 shrink-0"
          >
            <Download size={13} />
            High-Res Plots
          </a>
        </div>

        {/* 3 Matplotlib Plots Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 hover:border-slate-700 transition-all flex flex-col">
            <span className="text-xs font-semibold text-slate-300 mb-2">
              Execution Runtime vs Graph Size
            </span>
            <div className="rounded-lg overflow-hidden bg-white/5 p-1 flex-1 flex items-center justify-center">
              <img
                src="/plots/runtime_vs_graph_size.png"
                alt="Runtime vs Graph Size"
                className="w-full h-auto rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-2">
              Measures wall-clock convergence time across varying ranks.
            </span>
          </div>

          <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 hover:border-slate-700 transition-all flex flex-col">
            <span className="text-xs font-semibold text-slate-300 mb-2">
              MPI Message Overhead vs Graph Size
            </span>
            <div className="rounded-lg overflow-hidden bg-white/5 p-1 flex-1 flex items-center justify-center">
              <img
                src="/plots/message_count_vs_size.png"
                alt="Message Count vs Graph Size"
                className="w-full h-auto rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-2">
              Demonstrates message complexity bounding based on overlay edges.
            </span>
          </div>

          <div className="bg-slate-950/70 rounded-xl p-3 border border-slate-800 hover:border-slate-700 transition-all flex flex-col">
            <span className="text-xs font-semibold text-slate-300 mb-2">
              Speedup S(p) & Parallel Efficiency E(p)
            </span>
            <div className="rounded-lg overflow-hidden bg-white/5 p-1 flex-1 flex items-center justify-center">
              <img
                src="/plots/speedup_and_efficiency.png"
                alt="Speedup and Parallel Efficiency"
                className="w-full h-auto rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-2">
              Confirms communication-bound nature of distributed graph consensus.
            </span>
          </div>
        </div>

        {/* Benchmarks Summary Table */}
        {metrics.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/90 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Graph Size (|V|)</th>
                  <th className="py-3 px-4">MPI Ranks (p)</th>
                  <th className="py-3 px-4">Wall-Clock (s)</th>
                  <th className="py-3 px-4">Total Messages</th>
                  <th className="py-3 px-4">Rounds</th>
                  <th className="py-3 px-4">Diameter (&Delta;)</th>
                  <th className="py-3 px-4">Speedup S(p)</th>
                  <th className="py-3 px-4">Efficiency E(p)</th>
                  <th className="py-3 px-4">Coordinator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {metrics.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-white">{row.GraphSize} nodes</td>
                    <td className="py-2.5 px-4 text-indigo-300">{row.MPIRanks}</td>
                    <td className="py-2.5 px-4 text-slate-200">{Number(row.WallClockSec).toFixed(4)}s</td>
                    <td className="py-2.5 px-4 text-blue-300">{Number(row.TotalMessages).toLocaleString()}</td>
                    <td className="py-2.5 px-4">{row.Rounds}</td>
                    <td className="py-2.5 px-4">{row.Diameter}</td>
                    <td className="py-2.5 px-4 text-amber-300">{Number(row.Speedup).toFixed(3)}x</td>
                    <td className="py-2.5 px-4 text-emerald-400">{(Number(row.Efficiency) * 100).toFixed(1)}%</td>
                    <td className="py-2.5 px-4 text-slate-400">{row.Coordinators}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
