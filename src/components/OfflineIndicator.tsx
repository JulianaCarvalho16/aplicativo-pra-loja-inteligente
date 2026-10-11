import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineIndicatorProps {
  isOnline: boolean;
  pendingCount: number;
  onOpenSyncQueue: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOnline,
  pendingCount,
  onOpenSyncQueue,
}) => {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-center gap-3 rounded-xl border border-amber-500/40 bg-slate-900/95 px-3.5 py-2 text-xs shadow-2xl backdrop-blur-md">
      {!isOnline ? (
        <div className="flex items-center gap-2 text-amber-400 font-medium">
          <WifiOff className="w-4 h-4 text-amber-400 animate-pulse" />
          <span>Modo Offline Ativo — Vendas salvas localmente</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Conexão restabelecida</span>
        </div>
      )}

      {pendingCount > 0 && (
        <button
          onClick={onOpenSyncQueue}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 font-semibold text-amber-300 transition"
        >
          <RefreshCw className="w-3 h-3" />
          <span>{pendingCount} pendente{pendingCount > 1 ? 's' : ''}</span>
        </button>
      )}
    </div>
  );
};
