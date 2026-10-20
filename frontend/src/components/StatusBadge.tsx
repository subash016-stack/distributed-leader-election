import React from 'react';
import { NodeStatusType } from '../types/node';
import { CheckCircle2, AlertOctagon, RefreshCw, HelpCircle, PowerOff, Crown } from 'lucide-react';

interface Props {
  status: NodeStatusType;
  isCoordinator?: boolean;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<Props> = ({ status, isCoordinator, size = 'md' }) => {
  const isSm = size === 'sm';
  const padding = isSm ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';
  const iconSize = isSm ? 12 : 14;

  if (isCoordinator && status === 'ALIVE') {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold ${padding}`}>
        <Crown size={iconSize} className="text-emerald-400" />
        Coordinator
      </span>
    );
  }

  switch (status) {
    case 'ALIVE':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 ${padding}`}>
          <CheckCircle2 size={iconSize} />
          Active
        </span>
      );
    case 'FAILED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 ${padding}`}>
          <AlertOctagon size={iconSize} />
          Failed
        </span>
      );
    case 'ELECTION':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse ${padding}`}>
          <RefreshCw size={iconSize} className="animate-spin" />
          Election
        </span>
      );
    case 'SUSPECTED':
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 ${padding}`}>
          <HelpCircle size={iconSize} />
          Suspected
        </span>
      );
    case 'OFFLINE':
    default:
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full bg-slate-700/20 border border-slate-700 text-slate-400 ${padding}`}>
          <PowerOff size={iconSize} />
          Offline
        </span>
      );
  }
};
