import React from 'react';
import { History, Crown, ArrowRight, ShieldCheck } from 'lucide-react';
import { CoordinatorRecord } from '../types/event';

interface Props {
  history: CoordinatorRecord[];
}

export const CoordinatorHistory: React.FC<Props> = ({ history }) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur">
      <div className="flex items-center gap-2 pb-3 border-b border-border/60">
        <History size={18} className="text-emerald-400" />
        <h2 className="text-base font-bold text-slate-100">Coordinator Transition History</h2>
        <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-400">
          {history.length} elections
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No election transitions recorded yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                <th className="pb-2.5">Time</th>
                <th className="pb-2.5">Transition</th>
                <th className="pb-2.5">Trigger / Reason</th>
                <th className="pb-2.5">Generation</th>
                <th className="pb-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {history.map((record) => {
                const timeStr = new Date(record.timestamp * 1000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <tr key={record.id} className="hover:bg-slate-900/50 transition">
                    <td className="py-2.5 text-slate-400">{timeStr}</td>
                    <td className="py-2.5 font-sans">
                      <div className="flex items-center gap-2">
                        {record.previous_coordinator ? (
                          <span className="text-slate-400 font-medium">Node {record.previous_coordinator}</span>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                        <ArrowRight size={12} className="text-slate-600" />
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold">
                          <Crown size={12} />
                          Node {record.new_coordinator}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 font-sans text-slate-300 max-w-[250px] truncate" title={record.reason}>
                      {record.reason}
                    </td>
                    <td className="py-2.5 text-slate-400">#{record.generation}</td>
                    <td className="py-2.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                        <ShieldCheck size={11} />
                        {record.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
