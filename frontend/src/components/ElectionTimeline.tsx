import React, { useState } from 'react';
import { Activity, Trash2, ArrowRight } from 'lucide-react';
import { SystemEvent } from '../types/event';

interface Props {
  events: SystemEvent[];
  onClear: () => void;
}

export const ElectionTimeline: React.FC<Props> = ({ events, onClear }) => {
  const [filter, setFilter] = useState<'ALL' | 'ELECTION' | 'COORDINATOR' | 'FAILURE'>('ALL');

  const filteredEvents = events.filter((ev) => {
    if (filter === 'ALL') return true;
    if (filter === 'ELECTION') return ev.event_type.includes('ELECTION') || ev.event_type.includes('OK');
    if (filter === 'COORDINATOR') return ev.event_type.includes('COORDINATOR');
    if (filter === 'FAILURE') return ev.event_type.includes('FAILED') || ev.event_type.includes('TIMEOUT');
    return true;
  });

  const getEventBadge = (type: string) => {
    if (type.includes('COORDINATOR')) {
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
    if (type.includes('ELECTION')) {
      return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
    }
    if (type.includes('OK')) {
      return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
    }
    if (type.includes('FAILED') || type.includes('TIMEOUT')) {
      return 'bg-rose-500/20 text-rose-400 border-rose-500/40';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xl backdrop-blur flex flex-col h-[480px]">
      <div className="flex items-center justify-between pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-amber-400" />
          <h2 className="text-base font-bold text-slate-100">
            Real-Time Election Event Timeline
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-slate-400">
            {events.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
            {(['ALL', 'ELECTION', 'COORDINATOR', 'FAILURE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition ${
                  filter === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={onClear}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            title="Clear event history"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* Events Scroll Area */}
      <div className="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500">
            No events logged yet. Start the simulation to begin.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const timeStr = new Date(evt.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            });

            return (
              <div
                key={evt.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition flex flex-col gap-1.5"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">{timeStr}</span>
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-mono font-semibold uppercase ${getEventBadge(
                        evt.event_type
                      )}`}
                    >
                      {evt.event_type.replace(/_/g, ' ')}
                    </span>
                    {evt.generation > 0 && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        Gen #{evt.generation}
                      </span>
                    )}
                  </div>

                  {evt.sender_id && (
                    <div className="flex items-center gap-1 font-mono text-[11px] text-slate-400">
                      <span className="text-blue-400 font-semibold">Node {evt.sender_id}</span>
                      {evt.receiver_id ? (
                        <>
                          <ArrowRight size={11} className="text-slate-600" />
                          <span className="text-emerald-400 font-semibold">Node {evt.receiver_id}</span>
                        </>
                      ) : (
                        <span className="text-slate-500">(Broadcast)</span>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-300 font-normal leading-relaxed">
                  {evt.description}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
