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
  const padding = isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs font-medium';
  const iconSize = isSm ? 11 : 13;

  if (isCoordinator && status === 'ALIVE') {
    return (
      <span className={`inline-flex items-center gap-1 rounded bg-control text-positive border border-positive/30 font-semibold ${padding}`}>
        <Crown size={iconSize} />
        <span>Coordinator</span>
      </span>
    );
  }

  switch (status) {
    case 'ALIVE':
      return (
        <span className={`inline-flex items-center gap-1 rounded bg-control text-positive border border-border ${padding}`}>
          <CheckCircle2 size={iconSize} />
          <span>Active</span>
        </span>
      );
    case 'FAILED':
      return (
        <span className={`inline-flex items-center gap-1 rounded bg-control text-negative border border-negative/30 ${padding}`}>
          <AlertOctagon size={iconSize} />
          <span>Failed</span>
        </span>
      );
    case 'ELECTION':
      return (
        <span className={`inline-flex items-center gap-1 rounded bg-control text-warning border border-warning/30 ${padding}`}>
          <RefreshCw size={iconSize} />
          <span>Election</span>
        </span>
      );
    case 'SUSPECTED':
      return (
        <span className={`inline-flex items-center gap-1 rounded bg-control text-warning border border-border ${padding}`}>
          <HelpCircle size={iconSize} />
          <span>Suspected</span>
        </span>
      );
    case 'OFFLINE':
    default:
      return (
        <span className={`inline-flex items-center gap-1 rounded bg-raised text-muted border border-border ${padding}`}>
          <PowerOff size={iconSize} />
          <span>Offline</span>
        </span>
      );
  }
};
