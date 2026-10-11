import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F2', label: 'Buscar Produto', desc: 'Foco imediato na barra de busca ou leitor de código de barras' },
    { key: 'F3', label: 'CPF / Cliente', desc: 'Abre a janela de identificação do cliente e validação de CPF' },
    { key: 'F4', label: 'Caixa / Movimentação', desc: 'Abre o controle de abertura, sangria e suprimento de caixa' },
    { key: 'F7', label: 'Resumo do Caixa', desc: 'Visualiza saldo estimado em gaveta e histórico do turno' },
    { key: 'F8', label: 'Dashboard de Vendas', desc: 'Abre os gráficos de vendas por hora e formas de pagamento (Recharts)' },
    { key: 'F9', label: 'Finalizar Venda', desc: 'Abre a tela rápida de pagamento (Dinheiro, PIX, Cartão)' },
    { key: 'Enter', label: 'Adicionar / Confirmar', desc: 'Ao bipar ou digitar código, adiciona o item direto ao carrinho' },
    { key: 'Esc', label: 'Fechar / Cancelar', desc: 'Fecha qualquer modal ativo ou cancela a operação atual' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Atalhos de Teclado Operacionais</h2>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-2.5 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((s) => (
            <div
              key={s.key}
              className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3"
            >
              <div>
                <span className="text-xs font-bold text-slate-200 block">{s.label}</span>
                <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">{s.desc}</span>
              </div>

              <kbd className="px-2.5 py-1 text-xs bg-slate-800 border border-slate-700 rounded-md font-mono text-emerald-400 font-bold shrink-0 shadow-sm">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Fechar (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
