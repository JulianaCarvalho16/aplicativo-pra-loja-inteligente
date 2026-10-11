import React, { useState, useEffect } from 'react';
import { X, UserPlus, Globe, Check, AlertCircle, Trash2 } from 'lucide-react';
import { maskCPF, validateCPF, cleanCPF } from '../utils/formatters';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCpf: string;
  currentName: string;
  clientIp: string;
  onSaveCustomer: (cpf: string, name: string) => void;
  onClearCustomer: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  currentCpf,
  currentName,
  clientIp,
  onSaveCustomer,
  onClearCustomer,
}) => {
  const [cpf, setCpf] = useState(currentCpf);
  const [name, setName] = useState(currentName);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setCpf(currentCpf);
      setName(currentName);
      setTouched(false);
    }
  }, [isOpen, currentCpf, currentName]);

  if (!isOpen) return null;

  const rawCpf = cleanCPF(cpf);
  const isValidCpf = rawCpf.length === 0 || validateCPF(rawCpf);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskCPF(e.target.value);
    setCpf(masked);
    setTouched(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawCpf.length > 0 && !validateCPF(rawCpf)) {
      return;
    }
    onSaveCustomer(cpf, name);
    onClose();
  };

  const handleClear = () => {
    setCpf('');
    setName('');
    onClearCustomer();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Identificação do Cliente</h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4">
          {/* Client IP automatic badge */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              IP do Cliente / Terminal:
            </span>
            <span className="font-mono font-semibold text-slate-200">
              {clientIp || '127.0.0.1'}
            </span>
          </div>

          {/* CPF Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                CPF na Nota (Opcional)
              </label>
              {touched && rawCpf.length > 0 && (
                <span
                  className={`text-[11px] font-medium ${
                    isValidCpf ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isValidCpf ? 'CPF Válido' : 'CPF Inválido'}
                </span>
              )}
            </div>

            <input
              type="text"
              placeholder="000.000.000-00"
              maxLength={14}
              value={cpf}
              onChange={handleCpfChange}
              className={`w-full bg-slate-950 border rounded-xl px-3.5 py-2.5 text-base font-mono text-white focus:outline-none transition ${
                touched && rawCpf.length > 0 && !isValidCpf
                  ? 'border-rose-500 ring-1 ring-rose-500'
                  : 'border-slate-700 focus:border-emerald-500'
              }`}
            />
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Nome do Cliente (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: João Ferreira"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            {(currentCpf || currentName) && (
              <button
                type="button"
                onClick={handleClear}
                className="px-3.5 py-2.5 rounded-xl border border-rose-800/80 text-rose-300 hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Desvincular</span>
              </button>
            )}

            <button
              type="submit"
              disabled={rawCpf.length > 0 && !isValidCpf}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg transition ${
                rawCpf.length > 0 && !isValidCpf
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              Salvar Identificação (Enter)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
