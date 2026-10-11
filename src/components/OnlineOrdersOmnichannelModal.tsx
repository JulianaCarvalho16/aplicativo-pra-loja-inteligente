import React, { useState } from 'react';
import { 
  X, 
  ShoppingBag, 
  Store, 
  Truck, 
  Clock, 
  CheckCircle2, 
  PackageCheck, 
  Phone, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { OnlineOrder, OrderStatus } from '../types';
import { formatCurrency, formatDateTime } from '../utils/formatters';
import { updateOnlineOrderStatus } from '../services/api';

interface OnlineOrdersOmnichannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OnlineOrder[];
  onRefreshOrders: () => void;
}

export const OnlineOrdersOmnichannelModal: React.FC<OnlineOrdersOmnichannelModalProps> = ({
  isOpen,
  onClose,
  orders,
  onRefreshOrders,
}) => {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdvanceStatus = async (order: OnlineOrder) => {
    let nextStatus: OrderStatus = 'preparing';
    if (order.orderStatus === 'pending') {
      nextStatus = 'preparing';
    } else if (order.orderStatus === 'preparing') {
      nextStatus = 'ready_for_pickup';
    } else if (order.orderStatus === 'ready_for_pickup') {
      nextStatus = 'delivered';
    } else {
      return;
    }

    setUpdatingId(order.id);
    setErrorMessage(null);
    try {
      await updateOnlineOrderStatus(order.id, nextStatus);
      onRefreshOrders();
    } catch {
      setErrorMessage('Falha ao atualizar status do pedido. Verifique a conexão.');
    } finally {
      setUpdatingId(null);
    }
  };

  const pendingOrdersCount = orders.filter((o) => o.orderStatus !== 'delivered' && o.orderStatus !== 'cancelled').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 select-none">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Pedidos da Loja Online no Caixa PDV</span>
                {pendingOrdersCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500 text-slate-950 font-black">
                    {pendingOrdersCount} em andamento
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Integração Omnichannel: Separe os itens vendidos pela vitrine online
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

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white font-bold ml-2">✕</button>
            </div>
          )}

          {orders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhum pedido online registrado no momento.
            </div>
          ) : (
            orders.map((order) => {
              const isDelivered = order.orderStatus === 'delivered';

              return (
                <div
                  key={order.id}
                  className={`p-4 rounded-xl border transition ${
                    isDelivered
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                      : 'bg-slate-950 border-slate-800 shadow-sm'
                  }`}
                >
                  {/* Top line: Order #, Date, Status */}
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {formatDateTime(order.createdAt)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {order.deliveryType === 'pickup' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-sky-950 text-sky-300 font-bold border border-sky-800 flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          Retirada no Balcão
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 font-bold border border-amber-800 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          Entrega
                        </span>
                      )}

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          order.orderStatus === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : order.orderStatus === 'preparing'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : order.orderStatus === 'ready_for_pickup'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {order.orderStatus === 'pending'
                          ? 'Aguardando Separação'
                          : order.orderStatus === 'preparing'
                          ? 'Em Separação'
                          : order.orderStatus === 'ready_for_pickup'
                          ? 'Pronto para Retirada'
                          : 'Entregue'}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-slate-300">
                    <div>
                      <span className="font-bold text-white">{order.customerName}</span>
                      {order.customerPhone && (
                        <span className="text-slate-400 ml-2 font-mono">
                          {order.customerPhone}
                        </span>
                      )}
                      {order.customerCpf && (
                        <span className="text-slate-400 ml-2 font-mono">
                          CPF: {order.customerCpf}
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400">Total Pago (PIX/Cartão): </span>
                      <strong className="font-mono text-emerald-400">{formatCurrency(order.total)}</strong>
                    </div>
                  </div>

                  {/* Items to separate */}
                  <div className="bg-slate-900 rounded-lg p-2.5 my-1 text-xs space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                      Itens para Separar do Estoque Físico:
                    </span>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-slate-200">
                        <span>
                          <strong>{item.quantity}x</strong> {item.name}
                        </span>
                        <span className="font-mono text-slate-400">{item.sku}</span>
                      </div>
                    ))}
                  </div>

                  {/* Advance status action button */}
                  {!isDelivered && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleAdvanceStatus(order)}
                        disabled={updatingId === order.id}
                        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>
                          {order.orderStatus === 'pending'
                            ? 'Iniciar Separação dos Itens'
                            : order.orderStatus === 'preparing'
                            ? 'Marcar Pronto no Balcão'
                            : 'Confirmar Entrega ao Cliente'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })
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
