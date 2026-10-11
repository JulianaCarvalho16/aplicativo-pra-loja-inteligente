import React, { useState } from 'react';
import { X, RefreshCw, CheckCircle2, Clock, WifiOff, Wifi, Database, ArrowUpCircle } from 'lucide-react';
import { OfflineSaleItem } from '../services/db';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface SyncQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  queue: OfflineSaleItem[];
  isOnline: boolean;
  onSyncNow: () => Promise<void>;
}

export const SyncQueueModal: React.FC<SyncQueueModalProps> = ({
  isOpen,
  onClose,
  queue,
  isOnline,
  onSyncNow,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSync = async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      await onSyncNow();
      setSyncMessage('Sincronização realizada com sucesso!');
    } catch {
      setSyncMessage('Falha ao comunicar com o servidor central.');
    } finally {
      setSyncing(false);
    }
  };

  const totalPendingAmount = queue.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base font-bold text-white">
                Fila de Sincronização Offline ({queue.length})
              </h2>
              <p className="text-xs text-slate-400">
                Vendas registradas localmente aguardando envio ao banco central
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sync Status Banner */}
        <div className="px-5 py-3 bg-slate-950/50 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            {isOnline ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <Wifi className="w-4 h-4" />
                Conectado à Matriz
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <WifiOff className="w-4 h-4" />
                Sem Conexão — Modo Offline
              </span>
            )}
            <span className="text-slate-500">·</span>
            <span className="text-slate-300 font-mono">
              Total Retido: <strong>{formatCurrency(totalPendingAmount)}</strong>
            </span>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing || queue.length === 0 || !isOnline}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              syncing || queue.length === 0 || !isOnline
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </button>
        </div>

        {syncMessage && (
          <div className="px-5 py-2 bg-emerald-950/40 border-b border-emerald-800 text-xs text-emerald-300">
            {syncMessage}
          </div>
        )}

        {/* Queue List */}
        <div className="flex-1 overflow-y-auto p-5">
          {queue.length === 0 ? (
            <div className="h-full py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-slate-200">
                Todas as vendas estão sincronizadas!
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                O banco central da matriz está 100% atualizado com os cupons deste terminal.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((sale) => (
                <div
                  key={sale.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-100">
                        {sale.saleNumber}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pendente
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      <span>Operador: {sale.sellerName}</span>
                      <span className="mx-1">·</span>
                      <span>{sale.items.length} itens</span>
                      <span className="mx-1">·</span>
                      <span className="uppercase">{sale.paymentMethod}</span>
                    </div>

                    <span className="text-[10px] text-slate-500 block">
                      {formatDateTime(sale.timestamp)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black font-mono text-emerald-400 block tabular-nums">
                      {formatCurrency(sale.total)}
                    </span>
                    <span className="text-[10px] text-slate-500">Armazenado no IndexedDB</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Fechar Janela (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
