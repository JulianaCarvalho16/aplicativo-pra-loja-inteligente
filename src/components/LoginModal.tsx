import React, { useState } from 'react';
import { Lock, UserCheck, Shield, KeyRound, AlertCircle, Delete } from 'lucide-react';
import { User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (username: string, pin: string) => Promise<void>;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onLogin }) => {
  const [selectedUsername, setSelectedUsername] = useState('carlos');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const operators = [
    { username: 'carlos', name: 'Carlos Silva', role: 'Caixa / Operador', defaultPin: '1001' },
    { username: 'mariana', name: 'Mariana Santos', role: 'Vendedora', defaultPin: '1002' },
    { username: 'lucas', name: 'Lucas Oliveira', role: 'Vendedor', defaultPin: '1003' },
    { username: 'admin', name: 'Ana Gestora', role: 'Administradora Geral', defaultPin: '1234' },
  ];

  const handleKeyPress = (num: string) => {
    if (pin.length < 6) {
      setPin((prev) => prev + num);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pin) {
      setError('Digite seu PIN de 4 dígitos');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onLogin(selectedUsername, pin);
      setPin('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Credenciais inválidas';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Brand Banner */}
        <div className="p-6 bg-slate-950 border-b border-slate-800 text-center space-y-1">
          <div className="w-12 h-12 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center font-black text-xl text-white shadow-lg shadow-emerald-950/50 mb-2">
            P
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            PDV Pro - Ponto de Venda
          </h1>
          <p className="text-xs text-slate-400">
            Selecione o operador do turno e digite a senha/PIN de acesso
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Operator Selector Cards */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Operador em Atendimento
            </label>
            <div className="grid grid-cols-2 gap-2">
              {operators.map((op) => {
                const isSelected = selectedUsername === op.username;
                return (
                  <button
                    key={op.username}
                    type="button"
                    onClick={() => {
                      setSelectedUsername(op.username);
                      setPin('');
                      setError(null);
                    }}
                    className={`p-3 rounded-xl border text-left transition ${
                      isSelected
                        ? 'bg-emerald-950/70 border-emerald-500 shadow-sm'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="text-xs font-bold text-white flex items-center justify-between">
                      <span>{op.name}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{op.role}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      PIN padrão: {op.defaultPin}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN Display and Touch Keypad */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                Senha / PIN
              </label>

              {pin.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[11px] text-slate-400 hover:text-slate-200"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* PIN Dots Display */}
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center gap-3">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full transition-all duration-150 ${
                    pin.length > idx
                      ? 'bg-emerald-400 scale-110 shadow-sm shadow-emerald-400/50'
                      : 'border-2 border-slate-700 bg-transparent'
                  }`}
                />
              ))}
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Touch-Friendly Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 text-lg font-bold font-mono text-slate-100 transition shadow-sm"
                >
                  {digit}
                </button>
              ))}

              <button
                type="button"
                onClick={handleDelete}
                className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 text-xs font-bold text-slate-400 flex items-center justify-center transition"
              >
                <Delete className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="py-3 rounded-xl bg-slate-950 hover:bg-slate-800 active:bg-slate-700 border border-slate-800 text-lg font-bold font-mono text-slate-100 transition shadow-sm"
              >
                0
              </button>

              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={loading || pin.length < 4}
                className={`py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
                  loading || pin.length < 4
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                }`}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
