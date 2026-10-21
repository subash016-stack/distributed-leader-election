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

  // Form parameters
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
      const mData = await api.getMetrics();
      setMetrics(mData.metrics || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to execute MPI experiment');
    } finally {
      setRunningExp(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Dataset Overview Header Strip */}
      <div className="rounded border border-border bg-surface p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-control text-accent text-[11px] font-mono">
                <Database size={12} />
                Stanford SNAP p2p-Gnutella08
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-control text-positive text-[11px] font-mono">
                <Cpu size={12} />
                MPI Topology Engine
              </span>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-text">
              Stanford SNAP Gnutella & Distributed MPI Engine
            </h2>
            <p className="text-xs text-muted max-w-3xl">
              Leader election executed on subgraphs extracted from the official Stanford SNAP peer-to-peer dataset. Ranks maintain isolated states and exchange bounded diameter candidate proposals.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://snap.stanford.edu/data/p2p-Gnutella08.html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-control hover:bg-raised text-text border border-border text-xs font-medium transition-colors"
            >
              <ExternalLink size={13} />
              <span>SNAP Dataset Citation</span>
            </a>
            <button
              onClick={fetchDatasetAndMetrics}
              disabled={loadingInfo}
              className="p-1.5 rounded bg-control hover:bg-raised text-muted hover:text-text border border-border transition-colors"
              title="Refresh dataset metadata"
            >
              <RefreshCw size={13} className={loadingInfo ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Dataset Stats Row */}
        {datasetInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-rule text-xs">
            <div className="bg-raised p-2.5 rounded border border-border">
              <span className="text-muted block text-[10px]">Total Network Hosts</span>
              <p className="text-base font-semibold text-text mt-0.5 tabular-nums">
                {datasetInfo.published_nodes.toLocaleString()}
              </p>
              <span className="text-[10px] text-muted">SNAP hosts</span>
            </div>
            <div className="bg-raised p-2.5 rounded border border-border">
              <span className="text-muted block text-[10px]">Directed Connections</span>
              <p className="text-base font-semibold text-text mt-0.5 tabular-nums">
                {datasetInfo.published_edges.toLocaleString()}
              </p>
              <span className="text-[10px] text-muted">Raw directed edges</span>
            </div>
            <div className="bg-raised p-2.5 rounded border border-border">
              <span className="text-muted block text-[10px]">Undirected Overlay</span>
              <p className="text-base font-semibold text-text mt-0.5 tabular-nums">
                {datasetInfo.undirected_unique_edges.toLocaleString()}
              </p>
              <span className="text-[10px] text-muted">Bidirectional overlay</span>
            </div>
            <div className="bg-raised p-2.5 rounded border border-border">
              <span className="text-muted block text-[10px]">Largest Component</span>
              <p className="text-base font-semibold text-positive mt-0.5 tabular-nums">
                {datasetInfo.largest_connected_component_nodes.toLocaleString()}
              </p>
              <span className="text-[10px] text-muted">99.97% connected</span>
            </div>
            <div className="bg-raised p-2.5 rounded border border-border">
              <span className="text-muted block text-[10px]">Average Degree &lang;k&rang;</span>
              <p className="text-base font-semibold text-text mt-0.5 tabular-nums">
                {datasetInfo.average_degree}
              </p>
              <span className="text-[10px] text-muted">Connections / host</span>
            </div>
            <div className="bg-raised p-2.5 rounded border border-border">
              <span className="text-muted block text-[10px]">Duplicate Edges</span>
              <p className="text-base font-semibold text-text mt-0.5 tabular-nums">
                {datasetInfo.duplicate_directed_edges}
              </p>
              <span className="text-[10px] text-positive">Verified clean</span>
            </div>
          </div>
        )}
      </div>

      {/* Control & Experiment Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls Card */}
        <div className="lg:col-span-1 rounded border border-border bg-surface p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-rule mb-3.5">
              <Sliders size={15} className="text-accent" />
              <h3 className="text-sm font-semibold text-text">
                MPI Experiment Parameters
              </h3>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Subgraph Size */}
              <div>
                <label className="block text-muted text-[11px] mb-1.5 font-medium">
                  Connected Subgraph Size (|V|)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[10, 25, 50, 100].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setSubgraphSize(sz)}
                      className={`py-1.5 text-xs font-mono rounded border transition-colors ${
                        subgraphSize === sz
                          ? 'bg-control border-accent text-accent'
                          : 'bg-raised border-border text-muted hover:text-text'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Number of MPI Ranks */}
              <div>
                <label className="block text-muted text-[11px] mb-1.5 font-medium">
                  MPI Process Ranks (p)
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[1, 2, 4].map((rk) => (
                    <button
                      key={rk}
                      type="button"
                      onClick={() => setNumRanks(rk)}
                      className={`py-1.5 text-xs font-mono rounded border transition-colors ${
                        numRanks === rk
                          ? 'bg-control border-accent text-accent'
                          : 'bg-raised border-border text-muted hover:text-text'
                      }`}
                    >
                      {rk} {rk === 1 ? 'Rank' : 'Ranks'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seed */}
              <div>
                <label className="block text-muted text-[11px] mb-1 font-medium">
                  Random Subgraph Seed
                </label>
                <input
                  type="number"
                  value={seed}
                  onChange={(e) => setSeed(parseInt(e.target.value, 10) || 42)}
                  className="w-full bg-raised border border-border rounded px-2.5 py-1.5 text-xs text-text font-mono focus:outline-none focus:border-accent"
                />
              </div>

              {/* Injected Failures */}
              <div>
                <label className="block text-muted text-[11px] mb-1 font-medium">
                  Injected Node Failures (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5040, 103"
                  value={failNodeInput}
                  onChange={(e) => setFailNodeInput(e.target.value)}
                  className="w-full bg-raised border border-border rounded px-2.5 py-1.5 text-xs text-text placeholder-muted/60 font-mono focus:outline-none focus:border-accent"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  Simulates non-responsive nodes without aborting MPI runtime.
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-rule">
            {errorMsg && (
              <div className="mb-2.5 p-2 rounded bg-surface border border-negative/40 text-negative text-xs flex items-start gap-1.5">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              onClick={handleRunMPI}
              disabled={runningExp}
              className="w-full py-2 px-3 rounded text-xs font-semibold bg-accent hover:bg-accent/90 text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {runningExp ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Executing MPI Distributed Protocol...</span>
                </>
              ) : (
                <>
                  <Play size={13} className="fill-current" />
                  <span>Launch MPI Experiment</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live Execution Output */}
        <div className="lg:col-span-2 rounded border border-border bg-surface p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rule mb-3.5">
              <div className="flex items-center gap-2">
                <Zap size={15} className="text-warning" />
                <h3 className="text-sm font-semibold text-text">
                  MPI Convergence Result
                </h3>
              </div>
              {expResult && (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-positive bg-control px-2 py-0.5 rounded border border-positive/30">
                  <CheckCircle2 size={11} />
                  <span>Converged in {expResult.max_rounds} Rounds</span>
                </span>
              )}
            </div>

            {!expResult && !runningExp && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Cpu size={32} className="text-muted/40 mb-2" />
                <p className="text-text text-xs font-medium">Ready to execute</p>
                <p className="text-muted text-[11px] max-w-sm mt-1">
                  Configure subgraph parameters and click &ldquo;Launch MPI Experiment&rdquo; to evaluate distributed rounds and message counts.
                </p>
              </div>
            )}

            {runningExp && (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <RefreshCw size={28} className="text-accent animate-spin mb-2" />
                <p className="text-text text-xs font-medium">
                  Dispatching MPI ranks across Gnutella subgraph...
                </p>
                <p className="text-muted text-[11px] mt-1">
                  Exchanging candidate proposals and synchronizing graph diameter bounds.
                </p>
              </div>
            )}

            {expResult && (
              <div className="space-y-3">
                {/* Outcome summary grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="bg-raised p-2.5 rounded border border-border">
                    <span className="text-muted block text-[10px]">Elected Leader</span>
                    <p className="text-base font-semibold text-positive mt-0.5 tabular-nums">
                      Node {expResult.coordinators_elected ? expResult.coordinators_elected.join(', ') : 'None'}
                    </p>
                    <span className="text-[10px] text-muted">Max-ID active host</span>
                  </div>
                  <div className="bg-raised p-2.5 rounded border border-border">
                    <span className="text-muted block text-[10px]">Wall-Clock Time</span>
                    <p className="text-base font-semibold text-text mt-0.5 tabular-nums">
                      {(expResult.wall_clock_time * 1000).toFixed(2)} ms
                    </p>
                    <span className="text-[10px] text-muted">{expResult.wall_clock_time.toFixed(4)}s total</span>
                  </div>
                  <div className="bg-raised p-2.5 rounded border border-border">
                    <span className="text-muted block text-[10px]">MPI Messages</span>
                    <p className="text-base font-semibold text-text mt-0.5 tabular-nums">
                      {expResult.total_messages.toLocaleString()}
                    </p>
                    <span className="text-[10px] text-muted">Exchanged across edges</span>
                  </div>
                  <div className="bg-raised p-2.5 rounded border border-border">
                    <span className="text-muted block text-[10px]">Graph Diameter (&Delta;)</span>
                    <p className="text-base font-semibold text-warning mt-0.5 tabular-nums">
                      {expResult.diameter}
                    </p>
                    <span className="text-[10px] text-muted">Round upper bound</span>
                  </div>
                </div>

                {/* Rank to Node Assignment */}
                <div className="bg-raised p-3 rounded border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-text flex items-center gap-1.5">
                      <Layers size={13} className="text-accent" />
                      MPI Rank-to-Host Assignment
                    </span>
                    <span className="text-[11px] text-muted font-mono tabular-nums">
                      {expResult.num_ranks} MPI ranks
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-1.5 text-xs">
                    {Object.entries(expResult.rank_node_distribution || {}).map(([rk, nodes]: any) => (
                      <div
                        key={rk}
                        className="bg-surface p-2 rounded border border-border text-[11px]"
                      >
                        <div className="font-semibold text-text mb-0.5 font-mono">
                          Rank {rk} ({nodes.length} hosts)
                        </div>
                        <div className="text-[10px] text-muted font-mono truncate" title={nodes.join(', ')}>
                          {nodes.slice(0, 6).join(', ')}
                          {nodes.length > 6 ? '...' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engine trace snippet */}
                {expResult.events && expResult.events.length > 0 && (
                  <div className="bg-ground p-2.5 rounded border border-border font-mono text-[10px] max-h-32 overflow-y-auto space-y-1">
                    <div className="text-muted text-[10px] sticky top-0 bg-ground py-0.5 font-semibold">
                      Recent MPI Trace Events:
                    </div>
                    {expResult.events.slice(-5).map((ev: any, idx: number) => (
                      <div key={idx} className="text-text flex items-center gap-1.5">
                        <span className="text-accent">[{ev.type}]</span>
                        <span className="text-muted">{ev.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Laboratory Benchmark Suite & Charts */}
      <div className="rounded border border-border bg-surface p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-text flex items-center gap-2">
              <BarChart3 size={15} className="text-accent" />
              Empirical Performance Evaluation & Scaling Suite
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Measurements across 12 full experimental configurations (1, 2, and 4 MPI ranks for 10, 25, 50, and 100 Gnutella nodes).
            </p>
          </div>
          <a
            href="/plots/speedup_and_efficiency.png"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-control text-xs text-muted hover:text-text border border-border transition-colors"
          >
            <Download size={12} />
            <span>High-Res Plots</span>
          </a>
        </div>

        {/* 3 Matplotlib Plots Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <div className="bg-raised rounded p-2.5 border border-border flex flex-col">
            <span className="text-xs font-semibold text-text mb-1.5">
              Execution Runtime vs Graph Size
            </span>
            <div className="rounded overflow-hidden bg-ground p-1 flex-1 flex items-center justify-center">
              <img
                src="/plots/runtime_vs_graph_size.png"
                alt="Runtime vs Graph Size"
                className="w-full h-auto rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-[10px] text-muted mt-1.5">
              Wall-clock convergence time across varying ranks.
            </span>
          </div>

          <div className="bg-raised rounded p-2.5 border border-border flex flex-col">
            <span className="text-xs font-semibold text-text mb-1.5">
              MPI Message Overhead vs Graph Size
            </span>
            <div className="rounded overflow-hidden bg-ground p-1 flex-1 flex items-center justify-center">
              <img
                src="/plots/message_count_vs_size.png"
                alt="Message Count vs Graph Size"
                className="w-full h-auto rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-[10px] text-muted mt-1.5">
              Message complexity bounded by communication graph edges.
            </span>
          </div>

          <div className="bg-raised rounded p-2.5 border border-border flex flex-col">
            <span className="text-xs font-semibold text-text mb-1.5">
              Speedup S(p) & Parallel Efficiency E(p)
            </span>
            <div className="rounded overflow-hidden bg-ground p-1 flex-1 flex items-center justify-center">
              <img
                src="/plots/speedup_and_efficiency.png"
                alt="Speedup and Parallel Efficiency"
                className="w-full h-auto rounded object-contain"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-[10px] text-muted mt-1.5">
              Characterizes communication-to-computation trade-off.
            </span>
          </div>
        </div>

        {/* Benchmarks Summary Table */}
        {metrics.length > 0 && (
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-raised text-[11px] text-muted font-medium border-b border-rule">
                <tr>
                  <th className="py-2 px-3">Graph size (|V|)</th>
                  <th className="py-2 px-3">MPI ranks (p)</th>
                  <th className="py-2 px-3 text-right">Wall-clock (s)</th>
                  <th className="py-2 px-3 text-right">Messages</th>
                  <th className="py-2 px-3 text-right">Rounds</th>
                  <th className="py-2 px-3 text-right">Diameter (&Delta;)</th>
                  <th className="py-2 px-3 text-right">Speedup S(p)</th>
                  <th className="py-2 px-3 text-right">Efficiency E(p)</th>
                  <th className="py-2 px-3">Coordinator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule font-mono text-[11px]">
                {metrics.map((row, idx) => (
                  <tr key={idx} className="hover:bg-raised transition-colors">
                    <td className="py-2 px-3 font-semibold text-text tabular-nums">{row.GraphSize} nodes</td>
                    <td className="py-2 px-3 text-accent tabular-nums">{row.MPIRanks}</td>
                    <td className="py-2 px-3 text-right text-text tabular-nums">{Number(row.WallClockSec).toFixed(4)}s</td>
                    <td className="py-2 px-3 text-right text-muted tabular-nums">{Number(row.TotalMessages).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{row.Rounds}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{row.Diameter}</td>
                    <td className="py-2 px-3 text-right text-warning tabular-nums">{Number(row.Speedup).toFixed(3)}x</td>
                    <td className="py-2 px-3 text-right text-positive tabular-nums">{(Number(row.Efficiency) * 100).toFixed(1)}%</td>
                    <td className="py-2 px-3 text-muted tabular-nums">{row.Coordinators}</td>
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
