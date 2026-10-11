import React, { useState, useEffect } from 'react';
import { 
  X, 
  Banknote, 
  QrCode, 
  CreditCard, 
  Split, 
  CheckCircle2, 
  ArrowRight, 
  Coins, 
  Copy, 
  Check, 
  ShieldCheck, 
  Receipt 
} from 'lucide-react';
import { PaymentMethod, PaymentDetails } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CheckoutModalProps {
  total: number;
  isOpen: boolean;
  onClose: () => void;
  onConfirmSale: (paymentMethod: PaymentMethod, paymentDetails: PaymentDetails) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  total,
  isOpen,
  onClose,
  onConfirmSale,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('dinheiro');
  
  // Dinheiro State
  const [receivedAmount, setReceivedAmount] = useState<string>(total.toFixed(2));
  const change = Math.max(0, (parseFloat(receivedAmount) || 0) - total);

  // Cartão State
  const [cardType, setCardType] = useState<'credito' | 'debito'>('credito');
  const [cardBrand, setCardBrand] = useState('Mastercard');
  const [installments, setInstallments] = useState(1);
  const [tefProcessing, setTefProcessing] = useState(false);

  // PIX State
  const [pixCopied, setPixCopied] = useState(false);
  const pixKey = `00020126580014br.gov.bcb.pix0136${Math.random().toString(36).substring(2, 15)}520400005303986540${total.toFixed(2)}5802BR5920LOJA MATRIZ PDV PRO6009SAO PAULO62070503***6304`;

  // Multi Payment State (Split)
  const [splitCash, setSplitCash] = useState<number>(Math.floor(total / 2));
  const splitRemaining = Math.max(0, total - splitCash);
  const [splitSecondMethod, setSplitSecondMethod] = useState<PaymentMethod>('cartao_credito');

  useEffect(() => {
    if (isOpen) {
      setReceivedAmount(total.toFixed(2));
      setSplitCash(Math.floor(total / 2));
      setTefProcessing(false);
      setPixCopied(false);
    }
  }, [isOpen, total]);

  if (!isOpen) return null;

  const handleQuickCash = (amount: number) => {
    setReceivedAmount(amount.toFixed(2));
  };

  const handleExactCash = () => {
    setReceivedAmount(total.toFixed(2));
  };

  const handleCopyPix = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(pixKey);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    }
  };

  const handleSubmit = () => {
    let details: PaymentDetails = {};

    if (method === 'dinheiro') {
      const rec = parseFloat(receivedAmount) || total;
      details = {
        receivedAmount: rec,
        changeAmount: Math.max(0, rec - total),
      };
    } else if (method === 'pix') {
      details = {
        receivedAmount: total,
        changeAmount: 0,
        pixCode: pixKey,
      };
    } else if (method === 'cartao_credito') {
      details = {
        receivedAmount: total,
        changeAmount: 0,
        cardBrand,
        cardInstallments: installments,
      };
    } else if (method === 'cartao_debito') {
      details = {
        receivedAmount: total,
        changeAmount: 0,
        cardBrand,
        cardInstallments: 1,
      };
    } else if (method === 'multiplo') {
      details = {
        receivedAmount: total,
        changeAmount: 0,
        splits: [
          { method: 'dinheiro', amount: splitCash },
          { method: splitSecondMethod, amount: splitRemaining },
        ],
      };
    }

    onConfirmSale(method, details);
  };

  const isDinheiroValid = (parseFloat(receivedAmount) || 0) >= total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-400" />
              Finalização de Venda
            </h2>
            <p className="text-xs text-slate-400">
              Escolha a forma de pagamento e confirme a transação
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
                Total da Compra
              </span>
              <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
                {formatCurrency(total)}
              </span>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Payment Method Selector Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Forma de Pagamento
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setMethod('dinheiro')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  method === 'dinheiro'
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Banknote className="w-5 h-5" />
                <span>Dinheiro</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('pix')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  method === 'pix'
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <QrCode className="w-5 h-5" />
                <span>PIX Instantâneo</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('cartao_credito')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  method === 'cartao_credito' || method === 'cartao_debito'
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <CreditCard className="w-5 h-5" />
                <span>Cartão</span>
              </button>

              <button
                type="button"
                onClick={() => setMethod('multiplo')}
                className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                  method === 'multiplo'
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Split className="w-5 h-5" />
                <span>Dividido / Misto</span>
              </button>
            </div>
          </div>

          {/* Dinheiro Panel */}
          {method === 'dinheiro' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Valor Recebido em Espécie (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 font-mono text-sm">
                      R$
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min={total}
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-3 py-2.5 text-lg font-bold font-mono text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Auto Calculated Change Box */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Troco a Devolver
                  </span>
                  <div className="text-2xl font-black font-mono tabular-nums text-emerald-400">
                    {formatCurrency(change)}
                  </div>
                  {!isDinheiroValid && (
                    <span className="text-[11px] text-rose-400 font-medium">
                      Valor recebido é menor que o total!
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Cash Buttons */}
              <div>
                <span className="text-xs text-slate-400 mb-1.5 block">
                  Sugestões Rápidas de Cédulas:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleExactCash}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-200 border border-slate-700"
                  >
                    Exato ({formatCurrency(total)})
                  </button>
                  {[10, 20, 50, 100, 200].map((val) => {
                    if (val < total && val !== 100 && val !== 50) return null;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleQuickCash(val)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-semibold text-slate-200 border border-slate-700"
                      >
                        R$ {val},00
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PIX Panel */}
          {method === 'pix' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center gap-6">
              {/* Simulated QR Code Visual */}
              <div className="w-36 h-36 bg-white p-2.5 rounded-xl shrink-0 flex flex-col items-center justify-center shadow-md">
                <div className="w-full h-full border-4 border-slate-900 rounded-lg p-1.5 grid grid-cols-4 gap-1">
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-300 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-400 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-300 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-300 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-300 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                  <div className="bg-slate-900 rounded-sm"></div>
                </div>
              </div>

              {/* PIX details and copy button */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                  <span className="text-xs font-semibold text-emerald-400">
                    Aguardando confirmação do PIX...
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Apresente o QR Code na tela ao cliente ou use o código Copia e Cola para pagamento imediato.
                </p>

                <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition"
                  >
                    {pixCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{pixCopied ? 'Código Copiado!' : 'Copiar Chave PIX'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Cartão (Crédito ou Débito) Panel */}
          {(method === 'cartao_credito' || method === 'cartao_debito') && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
              {/* Type Switch (Crédito / Débito) */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCardType('credito');
                    setMethod('cartao_credito');
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    cardType === 'credito'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  Cartão de Crédito
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCardType('debito');
                    setMethod('cartao_debito');
                    setInstallments(1);
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    cardType === 'debito'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  Cartão de Débito
                </button>
              </div>

              {/* Bandeira & Parcelas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Bandeira do Cartão
                  </label>
                  <select
                    value={cardBrand}
                    onChange={(e) => setCardBrand(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Mastercard">Mastercard</option>
                    <option value="Visa">Visa</option>
                    <option value="Elo">Elo</option>
                    <option value="Hipercard">Hipercard</option>
                    <option value="American Express">American Express</option>
                  </select>
                </div>

                {cardType === 'credito' ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Número de Parcelas
                    </label>
                    <select
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
                    >
                      <option value={1}>1x à vista ({formatCurrency(total)})</option>
                      <option value={2}>2x de {formatCurrency(total / 2)}</option>
                      <option value={3}>3x de {formatCurrency(total / 3)}</option>
                      <option value={4}>4x de {formatCurrency(total / 4)}</option>
                      <option value={6}>6x de {formatCurrency(total / 6)}</option>
                      <option value={10}>10x de {formatCurrency(total / 10)}</option>
                      <option value={12}>12x de {formatCurrency(total / 12)}</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center text-xs text-slate-400 italic pt-6">
                    Débito à vista - Transação instantânea
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Integração TEF / Maquininha POS: Comunicação criptografada pronta para captura.</span>
              </div>
            </div>
          )}

          {/* Multiplo / Dividido Panel */}
          {method === 'multiplo' && (
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
              <p className="text-xs text-slate-300">
                Divida o valor total entre dinheiro em espécie e outra forma eletrônica:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    1. Parte em Dinheiro (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={total}
                    value={splitCash}
                    onChange={(e) => setSplitCash(Math.min(total, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-base font-bold font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    2. Restante ({formatCurrency(splitRemaining)}) em:
                  </label>
                  <select
                    value={splitSecondMethod}
                    onChange={(e) => setSplitSecondMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="pix">PIX</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Voltar ao Carrinho (Esc)
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={method === 'dinheiro' && !isDinheiroValid}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition duration-150 ${
              method === 'dinheiro' && !isDinheiroValid
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40 active:scale-95'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmar Pagamento & Emitir Cupom</span>
          </button>
        </div>
      </div>
    </div>
  );
};
