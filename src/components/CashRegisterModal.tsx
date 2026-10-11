import React, { useState } from 'react';
import { 
  X, 
  CircleDollarSign, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Lock, 
  Unlock, 
  History, 
  AlertCircle, 
  Check 
} from 'lucide-react';
import { CashSession, User } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CashSession | null;
  currentUser: User | null;
  onOpenCash: (initialAmount: number) => Promise<void>;
  onRecordMovement: (type: 'sangria' | 'suprimento', amount: number, reason: string) => Promise<void>;
  onCloseCash: (actualAmount: number, closingNotes: string) => Promise<void>;
}

export const CashRegisterModal: React.FC<CashRegisterModalProps> = ({
  isOpen,
  onClose,
  session,
  currentUser,
  onOpenCash,
  onRecordMovement,
  onCloseCash,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'movimentacao' | 'fechamento'>('status');

  // Open Cash State
  const [initialAmountInput, setInitialAmountInput] = useState('150.00');

  // Movement State
  const [movType, setMovType] = useState<'sangria' | 'suprimento'>('sangria');
  const [movAmount, setMovAmount] = useState('');
  const [movReason, setMovReason] = useState('');

  // Close Cash State
  const [actualAmountInput, setActualAmountInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isCashOpen = session?.status === 'open';

  // Compute total movements
  const totalSuprimentos = session?.movements
    .filter((m) => m.type === 'suprimento')
    .reduce((sum, m) => sum + m.amount, 0) || 0;

  const totalSangrias = session?.movements
    .filter((m) => m.type === 'sangria')
    .reduce((sum, m) => sum + m.amount, 0) || 0;

  const currentExpectedCash = (session?.initialAmount || 0) + totalSuprimentos - totalSangrias;

  const handleOpenCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onOpenCash(parseFloat(initialAmountInput) || 0);
      setActiveTab('status');
    } finally {
      setLoading(false);
    }
  };

  const handleMovementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movAmount || parseFloat(movAmount) <= 0) return;
    setLoading(true);
    try {
      await onRecordMovement(movType, parseFloat(movAmount), movReason);
      setMovAmount('');
      setMovReason('');
      setActiveTab('status');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCloseCash(parseFloat(actualAmountInput) || 0, closingNotes);
      setActiveTab('status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <CircleDollarSign className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">Controle de Caixa & Turno</h2>
              <p className="text-xs text-slate-400">
                {isCashOpen
                  ? `Caixa Aberto por ${session.openedByName} às ${formatDateTime(session.openedAt)}`
                  : 'Nenhum caixa aberto atualmente'}
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

        {/* Tab Navigation if open */}
        {isCashOpen && (
          <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2">
            <button
              onClick={() => setActiveTab('status')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'status'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Resumo do Caixa
            </button>
            <button
              onClick={() => setActiveTab('movimentacao')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'movimentacao'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Sangria / Suprimento
            </button>
            <button
              onClick={() => setActiveTab('fechamento')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'fechamento'
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              Fechamento de Caixa
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {!isCashOpen ? (
            /* Open Cash Form */
            <form onSubmit={handleOpenCashSubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-2">
                <Lock className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-base font-bold text-white">Abrir Novo Turno de Caixa</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Para registrar transações em espécie e movimentações, informe o valor de fundo de troco inicial.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Fundo de Troco Inicial (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={initialAmountInput}
                  onChange={(e) => setInitialAmountInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xl font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs uppercase tracking-wider text-white shadow-lg transition"
              >
                {loading ? 'Abrindo...' : 'Confirmar Abertura de Caixa'}
              </button>
            </form>
          ) : activeTab === 'status' ? (
            /* Status / Summary Tab */
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Fundo Inicial</span>
                  <span className="text-base font-bold font-mono text-slate-200">
                    {formatCurrency(session.initialAmount)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Suprimentos</span>
                  <span className="text-base font-bold font-mono text-emerald-400">
                    + {formatCurrency(totalSuprimentos)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Sangrias</span>
                  <span className="text-base font-bold font-mono text-rose-400">
                    - {formatCurrency(totalSangrias)}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/80 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase tracking-wider text-emerald-300 font-bold block">
                    Saldo Estimado em Dinheiro na Gaveta
                  </span>
                  <span className="text-xs text-slate-400">
                    (Fundo de Troco + Suprimentos - Sangrias)
                  </span>
                </div>
                <span className="text-2xl font-black font-mono text-emerald-300">
                  {formatCurrency(currentExpectedCash)}
                </span>
              </div>

              {/* Movements Log */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  Movimentações do Turno ({session.movements.length})
                </h4>

                {session.movements.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-lg border border-slate-800/80">
                    Nenhuma sangria ou suprimento registrado neste turno.
                  </p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {session.movements.map((mov) => (
                      <div
                        key={mov.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {mov.type === 'suprimento' ? (
                            <ArrowDownLeft className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-rose-400 shrink-0" />
                          )}
                          <div>
                            <span className="font-semibold text-slate-200">
                              {mov.type === 'suprimento' ? 'Suprimento' : 'Sangria'}
                            </span>
                            <span className="text-slate-400 block text-[11px]">{mov.reason}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-bold ${
                              mov.type === 'suprimento' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {mov.type === 'suprimento' ? '+' : '-'} {formatCurrency(mov.amount)}
                          </span>
                          <span className="block text-[10px] text-slate-500">
                            {formatDateTime(mov.timestamp)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'movimentacao' ? (
            /* Movement Form (Sangria / Suprimento) */
            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovType('sangria')}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    movType === 'sangria'
                      ? 'bg-rose-950/70 border-rose-500 text-rose-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>Sangria (Retirada)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMovType('suprimento')}
                  className={`py-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    movType === 'suprimento'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4" />
                  <span>Suprimento (Entrada)</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Valor da Movimentação (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  placeholder="0,00"
                  value={movAmount}
                  onChange={(e) => setMovAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Motivo / Justificativa
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    movType === 'sangria'
                      ? 'Ex: Recolhimento para cofre central'
                      : 'Ex: Troco adicional para moedas'
                  }
                  value={movReason}
                  onChange={(e) => setMovReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg transition ${
                  movType === 'sangria' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {loading ? 'Registrando...' : `Confirmar ${movType === 'sangria' ? 'Sangria' : 'Suprimento'}`}
              </button>
            </form>
          ) : (
            /* Close Cash Form */
            <form onSubmit={handleCloseCashSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800 text-xs text-amber-300 space-y-1">
                <span className="font-bold block flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Conferência de Fechamento de Caixa
                </span>
                <span>
                  Conte o dinheiro físico presente na gaveta e insira o valor real apurado. O sistema calculará divergências ou quebras de caixa.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Valor Físico Apurado na Gaveta (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  placeholder="0,00"
                  value={actualAmountInput}
                  onChange={(e) => setActualAmountInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-lg font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Observações de Encerramento (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Turno encerrado sem intercorrências..."
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs uppercase tracking-wider text-white shadow-lg transition"
              >
                {loading ? 'Fechando...' : 'Confirmar Fechamento do Caixa'}
              </button>
            </form>
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
