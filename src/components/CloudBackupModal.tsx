import React, { useState } from 'react';
import { 
  X, 
  Cloud, 
  CloudCheck, 
  CloudOff, 
  HardDrive, 
  RefreshCw, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Wifi, 
  WifiOff 
} from 'lucide-react';
import { CloudBackupSnapshot } from '../types';
import { formatDateTime } from '../utils/formatters';
import { exportCloudBackup, restoreCloudBackup, performAutoBackupSync } from '../services/api';
import { localDB } from '../services/db';

interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onRefreshAllData: () => void;
  onToggleSimulatedOffline?: () => void;
  isSimulatedOffline?: boolean;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onRefreshAllData,
  onToggleSimulatedOffline,
  isSimulatedOffline,
}) => {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<CloudBackupSnapshot | null>(null);

  if (!isOpen) return null;

  const handleSyncBackupNow = async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const res = await performAutoBackupSync();
      const snap = await exportCloudBackup();
      setSnapshot(snap);
      setStatusMessage(res.message);
      onRefreshAllData();
    } catch (err: unknown) {
      setStatusMessage('Falha ao comunicar com o servidor em nuvem.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = async () => {
    setLoading(true);
    try {
      const snap = await exportCloudBackup();
      const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_loja_nuvem_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatusMessage('Arquivo de backup exportado com sucesso para o seu dispositivo!');
    } catch {
      setStatusMessage('Falha ao exportar backup. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        setLoading(true);
        const res = await restoreCloudBackup(parsed);
        setStatusMessage(res.message);
        onRefreshAllData();
      } catch {
        setStatusMessage('Erro: Formato de backup inválido. Selecione um JSON compatível.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const lastBackup = localDB.getLastBackupTimestamp() || new Date().toISOString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-white">Central de Backup em Nuvem & Dispositivo</h2>
              <p className="text-xs text-slate-400">
                Sincronização bidirecional entre Loja Física (IndexedDB) e Loja Online (Cloud)
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Status Panel */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status da Conexão & Armazenamento
              </span>
              {isOnline ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" />
                  Nuvem Conectada
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <WifiOff className="w-3.5 h-3.5" />
                  Offline — Salvando Localmente
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2.5">
                <HardDrive className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-white block">Dispositivo Local</span>
                  <span className="text-[11px] text-slate-400">IndexedDB Ativo</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-sky-400 shrink-0" />
                <div>
                  <span className="font-bold text-white block">Banco Central Nuvem</span>
                  <span className="text-[11px] text-slate-400">Loja Online Sincronizada</span>
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/80 flex items-center gap-2 text-xs text-emerald-300">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>
                <strong>Backup Automático Ativo:</strong> Ao faltar internet, os dados são salvos localmente. Ao restabelecer a conexão, o backup é enviado automaticamente para a nuvem.
              </span>
            </div>
          </div>

          {statusMessage && (
            <div className="p-3 rounded-xl bg-slate-950 border border-emerald-800 text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={handleSyncBackupNow}
              disabled={loading || !isOnline}
              className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition ${
                loading || !isOnline
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Fazer Backup na Nuvem Agora</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportJson}
                disabled={loading}
                className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Arquivo (.JSON)</span>
              </button>

              <label className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5" />
                <span>Restaurar de Arquivo</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Offline Resiliency Simulation Tool */}
          {onToggleSimulatedOffline && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Simulador de Teste de Queda de Internet
                </span>
                <button
                  onClick={onToggleSimulatedOffline}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    isSimulatedOffline
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {isSimulatedOffline ? 'Reconectar Internet (Simular)' : 'Simular Queda de Conexão'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Permite testar o comportamento do PDV sem internet: realize vendas locais e, em seguida, reconecte para ver o backup automático subir para a nuvem.
              </p>
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
