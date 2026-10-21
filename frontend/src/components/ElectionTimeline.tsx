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

  const getEventBadgeClass = (type: string) => {
    if (type.includes('COORDINATOR')) {
      return 'bg-control text-positive border border-positive/30';
    }
    if (type.includes('ELECTION')) {
      return 'bg-control text-warning border border-warning/30';
    }
    if (type.includes('OK')) {
      return 'bg-control text-accent border border-accent/30';
    }
    if (type.includes('FAILED') || type.includes('TIMEOUT')) {
      return 'bg-control text-negative border border-negative/30';
    }
    return 'bg-raised text-muted border border-border';
  };

  return (
    <div className="rounded border border-border bg-surface p-4 flex flex-col h-[460px]">
      <div className="flex items-center justify-between pb-3 border-b border-rule">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-warning" />
          <h2 className="text-sm font-semibold text-text">
            Event Stream
          </h2>
          <span className="px-1.5 py-0.2 rounded bg-raised border border-border text-[11px] font-mono text-muted tabular-nums">
            {events.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters */}
          <div className="flex rounded bg-raised p-0.5 border border-border text-xs">
            {(['ALL', 'ELECTION', 'COORDINATOR', 'FAILURE'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  filter === tab
                    ? 'bg-control text-text border border-border'
                    : 'text-muted hover:text-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <button
            onClick={onClear}
            className="p-1 rounded text-muted hover:text-negative hover:bg-raised transition-colors"
            title="Clear event history"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Events Scroll Area */}
      <div className="flex-1 overflow-y-auto mt-2.5 pr-1 space-y-1.5 font-mono text-[11px]">
        {filteredEvents.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted font-sans">
            No events recorded for current filter.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const timeStr = new Date(evt.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={evt.id}
                className="p-2 rounded bg-raised border border-border flex items-start justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted tabular-nums text-[10px] shrink-0">
                    {timeStr}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] shrink-0 ${getEventBadgeClass(
                      evt.event_type
                    )}`}
                  >
                    {evt.event_type}
                  </span>
                  <span className="text-text font-sans text-xs">
                    {evt.description}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-muted text-[10px] shrink-0">
                  {evt.sender_id !== null && (
                    <span className="tabular-nums">H:{evt.sender_id}</span>
                  )}
                  {evt.receiver_id !== null && (
                    <>
                      <ArrowRight size={10} className="text-muted/60" />
                      <span className="tabular-nums">H:{evt.receiver_id}</span>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
