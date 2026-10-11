import React from 'react';
import { 
  Trash2, 
  Plus, 
  Minus, 
  ShoppingCart, 
  UserCheck, 
  Globe, 
  Tag, 
  CreditCard, 
  UserPlus, 
  Percent,
  Package,
  History
} from 'lucide-react';
import { CartItem, User } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CartProps {
  items: CartItem[];
  currentUser: User | null;
  customerCpf: string;
  customerName: string;
  clientIp: string;
  discount: number;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  onOpenCustomerModal: () => void;
  onOpenCustomerHistory?: (query?: string) => void;
  onSetDiscount: (discount: number) => void;
  onCheckout: () => void;
}

export const Cart: React.FC<CartProps> = ({
  items,
  currentUser,
  customerCpf,
  customerName,
  clientIp,
  discount,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onOpenCustomerModal,
  onOpenCustomerHistory,
  onSetDiscount,
  onCheckout,
}) => {
  const subtotal = items.reduce(
    (sum, item) => sum + (item.product.price * item.quantity - item.discount),
    0
  );
  const total = Math.max(0, subtotal - discount);
  const totalItemsCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-100 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-emerald-400" />
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">
            Carrinho Atual
          </h2>
          <span className="text-xs font-mono bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-slate-300">
            {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'}
          </span>
        </div>

        {items.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-2 py-1 rounded transition flex items-center gap-1"
            title="Limpar todos os itens do carrinho"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      {/* Seller & Customer Metadata Bar */}
      <div className="p-2.5 bg-slate-950/60 border-b border-slate-800 text-xs space-y-1.5">
        {/* Logged Seller info */}
        <div className="flex items-center justify-between text-slate-300">
          <span className="text-slate-400 flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            Vendedor:
          </span>
          <span className="font-semibold text-slate-200">
            {currentUser ? currentUser.name : 'Não identificado'}
          </span>
        </div>

        {/* Customer Identification (CPF / Name / History) */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={onOpenCustomerModal}
              className="flex items-center gap-1 text-slate-300 hover:text-emerald-400 transition truncate"
              title="Clique para vincular ou alterar CPF e dados do cliente"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="shrink-0">{customerName ? customerName : 'Cliente'}:</span>
              <span className="font-mono text-emerald-400 font-semibold truncate">
                {customerCpf ? customerCpf : 'Não informado (F3)'}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onOpenCustomerHistory && (
              <button
                onClick={() => onOpenCustomerHistory(customerCpf || customerName)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 text-[11px] font-bold transition"
                title="Consultar o que este cliente já comprou ou utilizou na loja (F8)"
              >
                <History className="w-3 h-3 text-emerald-400" />
                <span>Histórico</span>
              </button>
            )}

            {/* Client IP Link */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-mono" title="IP do terminal do cliente">
              <Globe className="w-3 h-3 text-sky-400" />
              <span>{clientIp || '127.0.0.1'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
            <ShoppingCart className="w-12 h-12 stroke-[1.2] text-slate-700 mb-2" />
            <p className="text-sm font-semibold text-slate-300">O carrinho está vazio</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[200px]">
              Selecione itens no catálogo ao lado ou bipe um código de barras.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const itemTotal = item.product.price * item.quantity - item.discount;
            return (
              <div
                key={item.product.id}
                className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/90 flex flex-col gap-2"
              >
                {/* Top Row: Thumbnail, Name and Remove */}
                <div className="flex items-start justify-between gap-2.5">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0 flex items-center justify-center">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-4 h-4 text-slate-500" />
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-xs sm:text-sm font-medium text-slate-100 leading-snug">
                      {item.product.name}
                    </p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {item.product.sku} · {formatCurrency(item.product.price)} / {item.product.unit}
                    </p>
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.product.id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                    title="Remover item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Bottom Row: Quantity Steppers and Item Total */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-900">
                  {/* Stepper Buttons (>= 40px touch area) */}
                  <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                    <button
                      onClick={() => onUpdateQuantity(item.product.id, -1)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition"
                      title="Diminuir quantidade"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <span className="w-8 text-center text-xs font-mono font-bold text-white">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => onUpdateQuantity(item.product.id, 1)}
                      className="w-8 h-8 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition"
                      title="Aumentar quantidade"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Subtotal Item */}
                  <div className="text-right">
                    <span className="text-sm font-bold text-emerald-400 font-mono tabular-nums">
                      {formatCurrency(itemTotal)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Summary & Checkout Action */}
      <div className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-3">
        {/* Totals Breakdown */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Subtotal:</span>
            <span className="font-mono tabular-nums text-slate-200">
              {formatCurrency(subtotal)}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-amber-400" />
              Desconto Global:
            </span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="0"
                step="0.5"
                value={discount === 0 ? '' : discount}
                onChange={(e) => onSetDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="R$ 0,00"
                className="w-20 bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-right font-mono text-xs text-amber-300 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex items-baseline justify-between pt-2 border-t border-slate-800/90 text-slate-100">
            <span className="text-sm font-bold tracking-tight">TOTAL A PAGAR:</span>
            <span className="text-2xl font-black text-emerald-400 font-mono tabular-nums">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Primary Checkout Button (F9) */}
        <button
          onClick={onCheckout}
          disabled={items.length === 0}
          className={`w-full py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-sm uppercase tracking-wider transition duration-150 shadow-lg ${
            items.length === 0
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 active:scale-[0.98]'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Finalizar Venda (F9)</span>
        </button>
      </div>
    </div>
  );
};
