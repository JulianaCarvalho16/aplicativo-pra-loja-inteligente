import React, { useState, useMemo, useEffect } from 'react';
import { 
  ShoppingBag, 
  Store, 
  Truck, 
  MapPin, 
  ArrowLeft, 
  CheckCircle2, 
  QrCode, 
  CreditCard, 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  X,
  Phone,
  Coffee,
  Smartphone,
  Shirt,
  Package,
  Wrench,
  BarChart3,
  AlertCircle,
  User,
  UserCheck,
  LogOut,
  KeyRound,
  Lock,
  Mail,
  History,
  FileText
} from 'lucide-react';
import { Product, OnlineOrder, DeliveryType, Customer } from '../types';
import { formatCurrency, maskCPF, validateCPF, cleanCPF, formatDate } from '../utils/formatters';
import { createOnlineOrder, loginOnlineCustomer, registerOnlineCustomer, fetchOnlineCustomerOrders } from '../services/api';

interface OnlineStoreViewProps {
  products: Product[];
  onBackToPos: () => void;
  onOpenDashboard?: () => void;
  onOrderCreated: (order: OnlineOrder) => void;
  isOnline: boolean;
}

interface OnlineCartItem {
  product: Product;
  quantity: number;
}

export const OnlineStoreView: React.FC<OnlineStoreViewProps> = ({
  products,
  onBackToPos,
  onOpenDashboard,
  onOrderCreated,
  isOnline,
}) => {
  const [cart, setCart] = useState<OnlineCartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  // Customer Authentication & Session State for Online Store
  const [loggedCustomer, setLoggedCustomer] = useState<Customer | null>(() => {
    try {
      const saved = localStorage.getItem('online_store_customer');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authCpf, setAuthCpf] = useState('');
  const [authAddress, setAuthAddress] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // My Orders Modal
  const [isMyOrdersOpen, setIsMyOrdersOpen] = useState(false);
  const [myOrders, setMyOrders] = useState<OnlineOrder[]>([]);
  const [loadingMyOrders, setLoadingMyOrders] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerCpf, setCustomerCpf] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'cartao_credito'>('pix');
  const [notes, setNotes] = useState('');

  // Sync customer details when customer logs in
  useEffect(() => {
    if (loggedCustomer) {
      setCustomerName(loggedCustomer.name || '');
      setCustomerEmail(loggedCustomer.email || '');
      setCustomerPhone(loggedCustomer.phone || '');
      setCustomerCpf(loggedCustomer.cpf ? maskCPF(loggedCustomer.cpf) : '');
      if (loggedCustomer.address) {
        setDeliveryAddress(loggedCustomer.address);
      }
    }
  }, [loggedCustomer]);

  const [submitting, setSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<OnlineOrder | null>(null);

  const handleCustomerLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('Informe seu e-mail/CPF e senha para entrar.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await loginOnlineCustomer({
        emailOrCpf: authEmail.trim(),
        password: authPassword.trim(),
      });
      setLoggedCustomer(res.customer);
      localStorage.setItem('online_store_customer', JSON.stringify(res.customer));
      setIsAuthModalOpen(false);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Falha ao autenticar cliente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCustomerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName.trim() || !authEmail.trim() || !authPassword.trim() || !authPhone.trim()) {
      setAuthError('Nome completo, e-mail, telefone e senha são obrigatórios.');
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await registerOnlineCustomer({
        name: authName.trim(),
        email: authEmail.trim(),
        phone: authPhone.trim(),
        cpf: authCpf.trim() ? cleanCPF(authCpf) : undefined,
        password: authPassword.trim(),
        address: authAddress.trim(),
      });
      setLoggedCustomer(res.customer);
      localStorage.setItem('online_store_customer', JSON.stringify(res.customer));
      setIsAuthModalOpen(false);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Falha ao cadastrar cliente.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickDemoLogin = async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await loginOnlineCustomer({
        emailOrCpf: 'beatriz.lima@email.com',
        password: '123456',
      });
      setLoggedCustomer(res.customer);
      localStorage.setItem('online_store_customer', JSON.stringify(res.customer));
      setIsAuthModalOpen(false);
    } catch (err: unknown) {
      setAuthError(err instanceof Error ? err.message : 'Falha no login demo');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleCustomerLogout = () => {
    setLoggedCustomer(null);
    localStorage.removeItem('online_store_customer');
    setIsAccountMenuOpen(false);
  };

  const handleOpenMyOrders = async () => {
    if (!loggedCustomer) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsAccountMenuOpen(false);
    setIsMyOrdersOpen(true);
    setLoadingMyOrders(true);
    try {
      const orders = await fetchOnlineCustomerOrders(loggedCustomer.id);
      setMyOrders(orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMyOrders(false);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    // Requirement: Customer must be registered & logged in to place an online order!
    if (!loggedCustomer) {
      setIsAuthModalOpen(true);
      setCheckoutError('É necessário fazer cadastro ou login para finalizar seu pedido online.');
      return;
    }

    setSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await createOnlineOrder({
        customerId: loggedCustomer.id,
        customerName: customerName.trim() || loggedCustomer.name,
        customerEmail: customerEmail.trim() || loggedCustomer.email,
        customerPhone: customerPhone.trim() || loggedCustomer.phone,
        customerCpf: customerCpf.trim() ? cleanCPF(customerCpf) : (loggedCustomer.cpf ? cleanCPF(loggedCustomer.cpf) : undefined),
        deliveryType,
        deliveryAddress: deliveryType === 'delivery' ? deliveryAddress.trim() : 'Balcão da Loja Física (Click & Collect)',
        items: cart.map((i) => ({
          productId: i.product.id,
          name: i.product.name,
          sku: i.product.sku,
          price: i.product.price,
          quantity: i.quantity,
          total: i.product.price * i.quantity,
        })),
        paymentMethod,
        notes: notes.trim(),
      });

      setCompletedOrder(res.order);
      onOrderCreated(res.order);
      setCart([]);
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Falha ao processar pedido online. Verifique a conexão com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['Todos', ...Array.from(set)];
  }, [products]);

  // Filter products for online showcase (products with stock > 0 or services)
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat = selectedCategory === 'Todos' || p.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchCat) return false;
      if (!term) return true;
      return p.name.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term);
    });
  }, [products, selectedCategory, searchTerm]);

  const cartTotalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const shippingFee = deliveryType === 'delivery' ? 15.00 : 0.00;
  const cartGrandTotal = cartSubtotal + shippingFee;

  const handleAddToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product.id === productId) {
            const next = i.quantity + delta;
            return next > 0 ? { ...i, quantity: next } : null;
          }
          return i;
        })
        .filter((i): i is OnlineCartItem => i !== null)
    );
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const getCategoryFallbackIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes('bebida') || cat.includes('café') || cat.includes('alimento')) {
      return <Coffee className="w-8 h-8 text-emerald-400/50" />;
    }
    if (cat.includes('eletrônico')) {
      return <Smartphone className="w-8 h-8 text-sky-400/50" />;
    }
    if (cat.includes('vestuário') || cat.includes('moda')) {
      return <Shirt className="w-8 h-8 text-purple-400/50" />;
    }
    if (cat.includes('serviço')) {
      return <Wrench className="w-8 h-8 text-amber-400/50" />;
    }
    return <Package className="w-8 h-8 text-slate-400/50" />;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-y-auto">
      {/* Top Banner & Omnichannel Navigation */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onBackToPos}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao PDV</span>
          </button>

          {onOpenDashboard && (
            <button
              onClick={onOpenDashboard}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-xs font-semibold text-emerald-300 border border-emerald-800/80 transition"
              title="Visualizar Dashboard Analítico (Recharts)"
            >
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Dashboard</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400 font-medium">
              Vitrine Conectada à Matriz Física & Nuvem
            </span>
          </div>
        </div>

        {/* Brand & Store Name */}
        <div className="text-center">
          <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center justify-center gap-2">
            <Store className="w-5 h-5 text-emerald-400" />
            Loja Online Oficial
          </h1>
          <span className="text-[11px] text-emerald-400 font-medium block">
            Estoque Central Sincronizado em Tempo Real
          </span>
        </div>

        {/* Cart & Customer Auth Trigger */}
        <div className="flex items-center gap-2">
          {loggedCustomer ? (
            <div className="relative">
              <button
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Olá, {loggedCustomer.name.split(' ')[0]}</span>
              </button>

              {isAccountMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-48 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-50 text-xs animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="font-bold text-white truncate">{loggedCustomer.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{loggedCustomer.email}</p>
                  </div>

                  <button
                    onClick={handleOpenMyOrders}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2 transition"
                  >
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    <span>Meus Pedidos Online</span>
                  </button>

                  <button
                    onClick={handleCustomerLogout}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 text-rose-300 flex items-center gap-2 transition border-t border-slate-800"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sair da Conta</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthTab('login');
                setIsAuthModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>Entrar / Cadastrar</span>
            </button>
          )}

          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Minha Sacola</span>
            {cartTotalItems > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-emerald-900 flex items-center justify-center text-[11px] font-black">
                {cartTotalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Omnichannel Campaign Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-sky-950/60 border-b border-slate-800 px-4 py-6 text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Click & Collect Disponível: Compre Online e Retire Imediatamente na Loja Física!</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          Catálogo Digital Integrado com a Loja Física
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
          Tudo o que você vê aqui reflete a quantidade real na gaveta e no depósito da nossa loja física. Sem risco de comprar itens esgotados.
        </p>
      </div>

      {/* Search & Category Filter */}
      <div className="max-w-6xl w-full mx-auto px-4 py-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar produtos na loja online..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
          {filteredProducts.map((product) => {
            const isOutOfStock = product.type === 'product' && product.stock <= 0;

            return (
              <div
                key={product.id}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-3 flex flex-col justify-between hover:border-slate-700 transition group shadow-sm"
              >
                {/* Photo Showcase */}
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-slate-950 border border-slate-800/80 mb-2.5 relative flex items-center justify-center">
                  {product.imageUrl && !failedImages[product.id] ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      onError={() => {
                        setFailedImages((prev) => ({ ...prev, [product.id]: true }));
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                      {getCategoryFallbackIcon(product.category)}
                      <span className="text-[10px] text-slate-500 font-mono mt-1">{product.category}</span>
                    </div>
                  )}

                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-xs text-[10px] font-mono border border-slate-700/60">
                    {product.type === 'service' ? (
                      <span className="text-sky-400 font-semibold">Serviço</span>
                    ) : (
                      <span className={product.stock < 5 ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                        {product.stock} un
                      </span>
                    )}
                  </div>
                </div>

                {/* Header: SKU / Stock Tag */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1">
                  <span className="font-mono text-slate-500">{product.sku}</span>
                  <span className="text-slate-400 text-[10px]">{product.category}</span>
                </div>

                {/* Body */}
                <div className="flex-1 my-1">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition line-clamp-2">
                    {product.name}
                  </h3>
                </div>

                {/* Footer Price & Add Button */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-sm sm:text-base font-black font-mono tabular-nums text-white">
                    {formatCurrency(product.price)}
                  </div>

                  <button
                    onClick={() => handleAddToCart(product)}
                    disabled={isOutOfStock}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                      isOutOfStock
                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm active:scale-95'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Adicionar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart & Checkout Modal / Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col text-slate-100 shadow-2xl">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Sacola de Compras Online</h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 overflow-y-auto max-h-56 space-y-2 border-b border-slate-800 bg-slate-950/40">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Sua sacola está vazia. Adicione itens da vitrine!
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    {/* Item Thumbnail */}
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0 mr-2.5 flex items-center justify-center">
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

                    <div className="flex-1 pr-2">
                      <span className="font-semibold text-slate-200 block truncate">
                        {item.product.name}
                      </span>
                      <span className="text-slate-400 font-mono">
                        {formatCurrency(item.product.price)} x {item.quantity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                        <button
                          onClick={() => handleUpdateQty(item.product.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-mono font-bold">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQty(item.product.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-300 hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemoveFromCart(item.product.id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Checkout Form */}
            <form onSubmit={handleCheckoutSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Dados para Entrega & Faturamento
                </h4>
                {loggedCustomer && (
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Conta Verificada
                  </span>
                )}
              </div>

              {/* Login Status or Mandatory Login Prompt */}
              {loggedCustomer ? (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-white block">{loggedCustomer.name}</span>
                      <span className="text-[11px] text-emerald-300 font-mono">{loggedCustomer.email}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCustomerLogout}
                    className="text-[11px] text-slate-400 hover:text-rose-400 transition"
                  >
                    Trocar conta
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs space-y-2.5">
                  <div className="flex items-center gap-2 font-bold text-white">
                    <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Cadastro ou Login Obrigatório</span>
                  </div>
                  <p className="text-[11px] text-amber-300/90 leading-relaxed">
                    Para concluir sua compra online na loja e acompanhar o pedido, faça login ou cadastre-se agora.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthTab('login');
                      setIsAuthModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Fazer Login ou Criar Cadastro</span>
                  </button>
                </div>
              )}

              {/* Delivery Type Option */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                    deliveryType === 'pickup'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span>Retirar na Loja (Grátis)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition ${
                    deliveryType === 'delivery'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Entrega Expressa (+R$ 15)</span>
                </button>
              </div>

              {/* Customer Inputs */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Beatriz Lima"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    WhatsApp / Telefone *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="(11) 98765-4321"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    CPF na Nota
                  </label>
                  <input
                    type="text"
                    placeholder="000.000.000-00"
                    maxLength={14}
                    value={customerCpf}
                    onChange={(e) => setCustomerCpf(maskCPF(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {deliveryType === 'delivery' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Endereço Completo de Entrega *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Rua, número, complemento, bairro, CEP"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* Payment Method Online */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Forma de Pagamento Online
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('pix')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      paymentMethod === 'pix'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>PIX Instantâneo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cartao_credito')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      paymentMethod === 'cartao_credito'
                        ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Cartão de Crédito</span>
                  </button>
                </div>
              </div>

              {/* Totals Summary */}
              {checkoutError && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{checkoutError}</span>
                  </div>
                  <button type="button" onClick={() => setCheckoutError(null)} className="text-rose-400 hover:text-white font-bold ml-2">✕</button>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal dos Itens:</span>
                  <span className="font-mono">{formatCurrency(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Taxa de Entrega:</span>
                  <span className="font-mono">
                    {deliveryType === 'pickup' ? 'GRÁTIS (Retirada)' : formatCurrency(15)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-emerald-400 pt-1 border-t border-slate-800">
                  <span>TOTAL A PAGAR:</span>
                  <span className="font-mono">{formatCurrency(cartGrandTotal)}</span>
                </div>
              </div>

              {/* Submit Button */}
              {!loggedCustomer ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab('login');
                    setIsAuthModalOpen(true);
                  }}
                  disabled={cart.length === 0}
                  className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg transition flex items-center justify-center gap-2 active:scale-95 shadow-emerald-950/40"
                >
                  <Lock className="w-4 h-4" />
                  <span>Fazer Login ou Cadastro para Comprar</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || cart.length === 0}
                  className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider text-white shadow-lg transition ${
                    submitting || cart.length === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/40 active:scale-95'
                  }`}
                >
                  {submitting ? 'Gravando Pedido na Nuvem...' : 'Finalizar Pedido Online'}
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Online Customer Auth Modal (Login & Cadastro) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700/90 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-slate-100">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Identificação na Loja Online</h3>
                  <p className="text-xs text-slate-400">Acesse sua conta ou crie um novo cadastro</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsAuthModalOpen(false);
                  setAuthError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs: Entrar vs Cadastrar */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/40 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setAuthError(null);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authTab === 'login'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Já tenho Conta (Login)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setAuthError(null);
                }}
                className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  authTab === 'register'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Nova Conta</span>
              </button>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="m-4 mb-0 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{authError}</span>
              </div>
            )}

            {/* Form Body */}
            {authTab === 'login' ? (
              /* LOGIN FORM */
              <form onSubmit={handleCustomerLogin} className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    E-mail ou CPF *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="seu.email@exemplo.com ou CPF"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Senha de Acesso *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition active:scale-95 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {authLoading ? 'Verificando...' : 'Entrar na Minha Conta'}
                </button>

                {/* Demo Quick Account Login */}
                <div className="pt-2 border-t border-slate-800 text-center">
                  <p className="text-[11px] text-slate-400 mb-2">Para testes rápidos sem digitar senha:</p>
                  <button
                    type="button"
                    onClick={handleQuickDemoLogin}
                    className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-700 text-emerald-400 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Entrar como Beatriz Lima (Conta Demo VIP)</span>
                  </button>
                </div>
              </form>
            ) : (
              /* REGISTER FORM */
              <form onSubmit={handleCustomerRegister} className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Beatriz Lima"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      E-mail *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="email@exemplo.com"
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      WhatsApp / Telefone *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="(11) 98765-4321"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      CPF (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      maxLength={14}
                      value={authCpf}
                      onChange={(e) => setAuthCpf(maskCPF(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Criar Senha *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Mínimo 6 dígitos"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Endereço de Entrega (Rua, Número, Bairro, CEP)
                  </label>
                  <input
                    type="text"
                    placeholder="Av. Paulista, 1000, Apto 42 - São Paulo"
                    value={authAddress}
                    onChange={(e) => setAuthAddress(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg transition active:scale-95 disabled:bg-slate-800 disabled:text-slate-500"
                >
                  {authLoading ? 'Cadastrando...' : 'Concluir Cadastro e Comprar'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Online Customer My Orders Modal */}
      {isMyOrdersOpen && loggedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] text-slate-100">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Meus Pedidos Online</h3>
                  <p className="text-xs text-slate-400">Cliente: {loggedCustomer.name}</p>
                </div>
              </div>

              <button
                onClick={() => setIsMyOrdersOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMyOrders ? (
                <div className="p-8 text-center text-xs text-slate-400">Carregando seus pedidos...</div>
              ) : myOrders.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Você ainda não realizou nenhum pedido online nesta conta.
                </div>
              ) : (
                myOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-white">{ord.orderNumber}</span>
                        <span className="text-xs text-slate-400">• {formatDate(ord.createdAt)}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {ord.orderStatus === 'pending'
                          ? 'Aguardando Separação'
                          : ord.orderStatus === 'preparing'
                          ? 'Em Separação no PDV'
                          : ord.orderStatus === 'ready_for_pickup'
                          ? 'Pronto para Retirada no Balcão'
                          : ord.orderStatus === 'delivered'
                          ? 'Entregue / Concluído'
                          : ord.orderStatus}
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1 pt-1 border-t border-slate-900">
                      {ord.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-mono font-semibold text-slate-200">
                            {formatCurrency(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900 text-xs">
                      <span className="text-slate-400">
                        {ord.deliveryType === 'pickup'
                          ? 'Retirada no Balcão da Loja Física'
                          : 'Entrega Expressa'}
                      </span>
                      <span className="font-mono font-black text-sm text-emerald-400">
                        Total: {formatCurrency(ord.total)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Order Confirmation Modal */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <CheckCircle2 className="w-14 h-14 text-emerald-400 mx-auto" />
            <div>
              <span className="text-xs uppercase font-mono text-emerald-400 font-bold block">
                Pedido Gravado na Nuvem & Estoque Atualizado!
              </span>
              <h3 className="text-xl font-black text-white mt-1">
                Número do Pedido: {completedOrder.orderNumber}
              </h3>
              <p className="text-xs text-slate-300 mt-1">
                Cliente: <strong>{completedOrder.customerName}</strong>
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-left space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Modalidade:</span>
                <span className="font-bold text-slate-200">
                  {completedOrder.deliveryType === 'pickup'
                    ? 'Retirada no Balcão da Loja Física'
                    : 'Entrega Expressa'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Pago:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(completedOrder.total)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status no Caixa PDV:</span>
                <span className="text-amber-400 font-bold uppercase">Pendente para Separação</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              O operador do caixa no PDV físico acabou de receber a notificação deste pedido para separação dos itens no estoque!
            </p>

            <button
              onClick={() => setCompletedOrder(null)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs uppercase tracking-wider text-white"
            >
              Continuar Comprando
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
