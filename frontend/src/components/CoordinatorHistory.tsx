import React from 'react';
import { History, Crown, ArrowRight, ShieldCheck } from 'lucide-react';
import { CoordinatorRecord } from '../types/event';

interface Props {
  history: CoordinatorRecord[];
}

export const CoordinatorHistory: React.FC<Props> = ({ history }) => {
  return (
    <div className="rounded border border-border bg-surface p-4 flex flex-col h-[460px]">
      <div className="flex items-center gap-2 pb-3 border-b border-rule">
        <History size={15} className="text-positive" />
        <h2 className="text-sm font-semibold text-text">Leader Transitions</h2>
        <span className="px-1.5 py-0.2 rounded bg-raised border border-border text-[11px] font-mono text-muted tabular-nums">
          {history.length}
        </span>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto">
        {history.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted font-sans">
            No leader transitions recorded yet.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-rule text-muted font-medium text-[11px]">
                <th className="pb-2">Timestamp</th>
                <th className="pb-2">Transition</th>
                <th className="pb-2">Trigger cause</th>
                <th className="pb-2">Generation</th>
                <th className="pb-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule font-mono text-[11px]">
              {history.map((record) => {
                const timeStr = new Date(record.timestamp * 1000).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <tr key={record.id} className="hover:bg-raised transition-colors">
                    <td className="py-2 text-muted tabular-nums">{timeStr}</td>
                    <td className="py-2 font-sans">
                      <div className="flex items-center gap-1.5">
                        {record.previous_coordinator ? (
                          <span className="text-muted tabular-nums">Node {record.previous_coordinator}</span>
                        ) : (
                          <span className="text-muted/60">None</span>
                        )}
                        <ArrowRight size={10} className="text-muted" />
                        <span className="inline-flex items-center gap-1 text-positive font-medium tabular-nums">
                          <Crown size={11} />
                          Node {record.new_coordinator}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 font-sans text-text max-w-[200px] truncate" title={record.reason}>
                      {record.reason}
                    </td>
                    <td className="py-2 text-muted tabular-nums">#{record.generation}</td>
                    <td className="py-2 text-right">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-control text-positive text-[10px] font-mono">
                        <ShieldCheck size={10} />
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
