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
  Check,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { CashSession, User } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CashSession | null;
  currentUser: User | null;
  onOpenCash: (initialAmount: number) => Promise<void>;
  onRecordMovement: (
    type: 'sangria' | 'suprimento',
    amount: number,
    reason: string,
    adminValidation?: { adminPin: string; adminUsername?: string }
  ) => Promise<void>;
  onCloseCash: (
    actualAmount: number, 
    closingNotes: string, 
    adminValidation: { adminPin: string; adminUsername?: string }
  ) => Promise<void>;
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
  const [sangriaAdminUsername, setSangriaAdminUsername] = useState('admin');
  const [sangriaAdminPin, setSangriaAdminPin] = useState('');
  const [showSangriaAdminPin, setShowSangriaAdminPin] = useState(false);
  const [sangriaAdminError, setSangriaAdminError] = useState<string | null>(null);

  // Close Cash State
  const [actualAmountInput, setActualAmountInput] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPin, setAdminPin] = useState('');
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);

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
    setSangriaAdminError(null);

    if (movType === 'sangria') {
      if (!sangriaAdminPin.trim()) {
        setSangriaAdminError('É obrigatório informar o PIN de um Administrador para autorizar a sangria de caixa.');
        return;
      }
    }

    setLoading(true);
    try {
      await onRecordMovement(
        movType,
        parseFloat(movAmount),
        movReason,
        movType === 'sangria' ? { adminPin: sangriaAdminPin.trim(), adminUsername: sangriaAdminUsername } : undefined
      );
      setMovAmount('');
      setMovReason('');
      setSangriaAdminPin('');
      setSangriaAdminError(null);
      setActiveTab('status');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar movimentação.';
      if (movType === 'sangria') {
        setSangriaAdminError(msg);
      } else {
        alert(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError(null);

    if (!adminPin || !adminPin.trim()) {
      setAdminError('É obrigatório informar o PIN de um Administrador para validar e autorizar o fechamento do caixa.');
      return;
    }

    setLoading(true);
    try {
      await onCloseCash(parseFloat(actualAmountInput) || 0, closingNotes, {
        adminPin: adminPin.trim(),
        adminUsername,
      });
      setAdminPin('');
      setAdminError(null);
      setActiveTab('status');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na validação do administrador.';
      setAdminError(msg);
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

              {/* Requirement: Sangria requires Admin Permission */}
              {movType === 'sangria' && (
                <div className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-900/60 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
                      <ShieldCheck className="w-4 h-4 text-rose-400" />
                      <span>Autorização de Administrador Obrigatória (Sangria)</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 border border-rose-800 text-rose-300 font-mono">
                      Permissão Admin
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Para conformidade e segurança da tesouraria, a retirada de dinheiro (sangria) exige a validação e PIN de um usuário com perfil de <strong>Administrador</strong>.
                  </p>

                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                        Administrador Responsável
                      </label>
                      <select
                        value={sangriaAdminUsername}
                        onChange={(e) => {
                          setSangriaAdminUsername(e.target.value);
                          setSangriaAdminError(null);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-rose-500 font-medium"
                      >
                        <option value="admin">Ana Gestora (Administradora Geral)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                          <KeyRound className="w-3.5 h-3.5 text-rose-400" />
                          PIN do Administrador (4 dígitos)
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">PIN padrão: 1234</span>
                      </div>

                      <div className="relative">
                        <input
                          type={showSangriaAdminPin ? 'text' : 'password'}
                          maxLength={6}
                          required
                          placeholder="Digite o PIN do Administrador..."
                          value={sangriaAdminPin}
                          onChange={(e) => {
                            setSangriaAdminPin(e.target.value);
                            setSangriaAdminError(null);
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest text-slate-100 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSangriaAdminPin(!showSangriaAdminPin)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-200"
                        >
                          {showSangriaAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {sangriaAdminError && (
                      <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                        <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                        <span>{sangriaAdminError}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg transition flex items-center justify-center gap-2 ${
                  movType === 'sangria' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                }`}
              >
                {movType === 'sangria' && <ShieldCheck className="w-4 h-4" />}
                {loading
                  ? 'Registrando...'
                  : movType === 'sangria'
                  ? 'Autorizar com Admin e Confirmar Sangria'
                  : 'Confirmar Suprimento'}
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

              {/* Admin Validation Section */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-amber-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Validação de Administrador Obrigatória</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 font-mono">
                    Supervisor / Admin
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Para controle fiscal e auditoria financeira, o fechamento do caixa deve ser validado por um usuário com perfil de <strong>Administrador</strong>.
                </p>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Administrador Responsável
                    </label>
                    <select
                      value={adminUsername}
                      onChange={(e) => {
                        setAdminUsername(e.target.value);
                        setAdminError(null);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-medium"
                    >
                      <option value="admin">Ana Gestora (Administradora Geral)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                        PIN do Administrador (4 dígitos)
                      </label>
                      <span className="text-[10px] text-slate-500 font-mono">PIN padrão: 1234</span>
                    </div>

                    <div className="relative">
                      <input
                        type={showAdminPin ? 'text' : 'password'}
                        maxLength={6}
                        required
                        placeholder="Digite o PIN do Administrador..."
                        value={adminPin}
                        onChange={(e) => {
                          setAdminPin(e.target.value);
                          setAdminError(null);
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest text-slate-100 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminPin(!showAdminPin)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-200"
                      >
                        {showAdminPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {adminError && (
                    <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-800 text-xs text-rose-300 flex items-start gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <span>{adminError}</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-xs uppercase tracking-wider text-white shadow-lg transition flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                {loading ? 'Validando e Fechando...' : 'Validar com Admin e Fechar Caixa'}
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
