import React, { useState } from 'react';
import { Printer, Copy, Check, X, CheckCircle2, RotateCcw } from 'lucide-react';
import { Sale } from '../types';
import { formatCurrency, formatDateTime, generateEscPosReceipt } from '../utils/formatters';

interface ReceiptModalProps {
  sale: Sale | null;
  isOpen: boolean;
  onClose: () => void;
  onNewSale: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  isOpen,
  onClose,
  onNewSale,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !sale) return null;

  const rawEscPos = generateEscPosReceipt({
    storeName: 'LOJA MATRIZ PDV PRO',
    cnpj: '12.345.678/0001-90',
    address: 'Av. Paulista, 1000 - Bela Vista - SP',
    saleNumber: sale.saleNumber,
    timestamp: sale.timestamp,
    sellerName: sale.sellerName,
    customerCpf: sale.customerCpf,
    customerIp: sale.customerIp,
    items: sale.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      price: i.price,
      total: i.total,
    })),
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    paymentMethod: sale.paymentMethod,
    receivedAmount: sale.paymentDetails.receivedAmount,
    changeAmount: sale.paymentDetails.changeAmount,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleCopyRaw = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(rawEscPos);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">Venda Finalizada com Sucesso!</h2>
              <span className="text-xs text-slate-400 font-mono">Cupom: {sale.saleNumber}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar (Print, Copy, etc) */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Cupom Térmico</span>
          </button>

          <button
            onClick={handleCopyRaw}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition"
            title="Copiar texto bruto no protocolo ESC/POS para impressora serial/bluetooth"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'ESC/POS'}</span>
          </button>
        </div>

        {/* Scrollable Receipt Preview (simulating 58mm/80mm thermal paper) */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-950/90 flex justify-center">
          <div 
            id="thermal-receipt"
            className="w-full max-w-[340px] bg-amber-50 text-slate-900 p-5 rounded-lg shadow-lg font-mono text-[11px] leading-tight select-text"
          >
            {/* Header */}
            <div className="text-center space-y-0.5 border-b border-dashed border-slate-400 pb-3">
              <p className="font-bold text-xs uppercase">LOJA MATRIZ PDV PRO</p>
              <p className="text-[10px] text-slate-600">CNPJ: 12.345.678/0001-90</p>
              <p className="text-[10px] text-slate-600">Av. Paulista, 1000 - São Paulo, SP</p>
              <p className="font-semibold text-[10px] pt-1">*** COMPROVANTE AUXILIAR DE VENDA ***</p>
              <p className="text-[9px] text-slate-500">NÃO POSSUI VALOR FISCAL</p>
            </div>

            {/* Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>CUPOM: <strong>{sale.saleNumber}</strong></span>
                <span>{formatDateTime(sale.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span>OPERADOR: {sale.sellerName}</span>
              </div>
              <div className="flex justify-between">
                <span>CLIENTE: {sale.customerCpf ? sale.customerCpf : 'CONSUMIDOR FINAL'}</span>
              </div>
              {sale.customerIp && (
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>TERMINAL IP:</span>
                  <span>{sale.customerIp}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1.5">
              <div className="flex justify-between text-[10px] font-bold border-b border-slate-300 pb-1">
                <span>ITEM / DESCRIÇÃO</span>
                <span>TOTAL</span>
              </div>

              {sale.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between font-medium">
                    <span className="truncate pr-1">{idx + 1}. {item.name}</span>
                    <span className="tabular-nums font-bold">R$ {item.total.toFixed(2)}</span>
                  </div>
                  <div className="text-[10px] text-slate-600 flex justify-between pl-3">
                    <span>{item.quantity} x R$ {item.price.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>SUBTOTAL:</span>
                <span className="tabular-nums">R$ {sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-rose-700">
                  <span>DESCONTO:</span>
                  <span className="tabular-nums">- R$ {sale.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-300">
                <span>TOTAL A PAGAR:</span>
                <span className="tabular-nums">R$ {sale.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>FORMA PGTO:</span>
                <span className="font-bold uppercase">{sale.paymentMethod}</span>
              </div>
              {sale.paymentDetails.receivedAmount && sale.paymentDetails.receivedAmount > 0 && (
                <>
                  <div className="flex justify-between">
                    <span>RECEBIDO:</span>
                    <span className="tabular-nums">R$ {sale.paymentDetails.receivedAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>TROCO:</span>
                    <span className="tabular-nums">R$ {(sale.paymentDetails.changeAmount || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer Message */}
            <div className="text-center pt-3 space-y-1 text-[10px] text-slate-700">
              <p className="font-semibold">SISTEMA PDV PRO - OFFLINE-FIRST PWA</p>
              <p>Obrigado pela preferência!</p>
              <p className="text-[9px] text-slate-500 font-mono">Volte Sempre!</p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Fechar
          </button>

          <button
            onClick={onNewSale}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4 text-emerald-400" />
            <span>Iniciar Nova Venda</span>
          </button>
        </div>
      </div>
    </div>
  );
};
