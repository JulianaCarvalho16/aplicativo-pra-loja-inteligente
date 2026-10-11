import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  History, 
  User, 
  UserCheck, 
  Package, 
  Wrench, 
  Clock, 
  Calendar, 
  DollarSign, 
  ShoppingBag, 
  Store, 
  Globe, 
  CheckCircle2, 
  Plus, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  ArrowRight,
  Filter,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { Customer, CustomerHistory, CustomerHistoryItem, Product } from '../types';
import { formatCurrency, maskCPF, formatDate } from '../utils/formatters';
import { fetchCustomers, fetchCustomerHistory } from '../services/api';

interface CustomerHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerQuery?: string;
  onSelectCustomerForCart?: (cpf: string, name: string) => void;
  onAddToCart?: (productId: string) => void;
  availableProducts?: Product[];
}

export const CustomerHistoryModal: React.FC<CustomerHistoryModalProps> = ({
  isOpen,
  onClose,
  initialCustomerQuery = '',
  onSelectCustomerForCart,
  onAddToCart,
  availableProducts = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customersList, setCustomersList] = useState<Customer[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [dossier, setDossier] = useState<CustomerHistory | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [dossierError, setDossierError] = useState<string | null>(null);

  // Active filter tab: 'all' | 'services' | 'products' | 'transactions'
  const [activeTab, setActiveTab] = useState<'all' | 'services' | 'products' | 'transactions'>('all');
  const [itemSearchQuery, setItemSearchQuery] = useState('');

  // Load initial customer list
  useEffect(() => {
    if (isOpen) {
      setLoadingList(true);
      fetchCustomers().then((list) => {
        setCustomersList(list);
        setLoadingList(false);
        // If initial query provided, auto-select matching customer
        if (initialCustomerQuery) {
          const match = list.find(
            (c) =>
              c.cpf?.includes(initialCustomerQuery.replace(/\D/g, '')) ||
              c.name.toLowerCase().includes(initialCustomerQuery.toLowerCase())
          );
          if (match) {
            loadCustomerDossier(match);
          } else {
            // Search query directly
            loadDirectQueryDossier(initialCustomerQuery);
          }
        } else if (list.length > 0 && !selectedCustomer) {
          // Select first customer by default for immediate preview
          loadCustomerDossier(list[0]);
        }
      });
    }
  }, [isOpen, initialCustomerQuery]);

  const loadCustomerDossier = async (cust: Customer) => {
    setSelectedCustomer(cust);
    setLoadingDossier(true);
    setDossierError(null);
    setItemSearchQuery('');
    try {
      const data = await fetchCustomerHistory({ customerId: cust.id, cpf: cust.cpf });
      setDossier(data);
    } catch (err: unknown) {
      setDossierError(err instanceof Error ? err.message : 'Falha ao carregar histórico do cliente');
    } finally {
      setLoadingDossier(false);
    }
  };

  const loadDirectQueryDossier = async (queryText: string) => {
    setLoadingDossier(true);
    setDossierError(null);
    setItemSearchQuery('');
    try {
      const data = await fetchCustomerHistory({ query: queryText });
      setDossier(data);
      setSelectedCustomer(data.customer);
    } catch (err: unknown) {
      setDossierError(err instanceof Error ? err.message : 'Falha ao buscar histórico.');
    } finally {
      setLoadingDossier(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const term = searchTerm.toLowerCase().trim();
    const cleanDigits = term.replace(/\D/g, '');

    const found = customersList.find((c) => {
      const matchName = c.name.toLowerCase().includes(term);
      const matchCpf = cleanDigits.length >= 8 && c.cpf?.replace(/\D/g, '').includes(cleanDigits);
      const matchPhone = cleanDigits.length >= 8 && c.phone?.replace(/\D/g, '').includes(cleanDigits);
      return matchName || matchCpf || matchPhone;
    });

    if (found) {
      loadCustomerDossier(found);
    } else {
      loadDirectQueryDossier(searchTerm);
    }
  };

  // Filter items in history by tab and search query
  const filteredItems = useMemo(() => {
    if (!dossier?.items) return [];

    let items = dossier.items;

    if (activeTab === 'services') {
      items = items.filter((i) => i.type === 'service');
    } else if (activeTab === 'products') {
      items = items.filter((i) => i.type === 'product');
    }

    if (itemSearchQuery.trim()) {
      const q = itemSearchQuery.toLowerCase().trim();
      items = items.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.sku.toLowerCase().includes(q) ||
          i.sellerName?.toLowerCase().includes(q) ||
          i.transactionNumber.toLowerCase().includes(q)
      );
    }

    return items;
  }, [dossier?.items, activeTab, itemSearchQuery]);

  const handleLinkToCart = () => {
    if (selectedCustomer && onSelectCustomerForCart) {
      onSelectCustomerForCart(selectedCustomer.cpf || '', selectedCustomer.name);
      onClose();
    }
  };

  const handleReorderItem = (productId: string) => {
    if (onAddToCart) {
      onAddToCart(productId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 select-none">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col h-[90vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Dossiê & Histórico de Compras e Serviços do Cliente
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800/80">
                  Visão do Atendente PDV
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Consulte o que o cliente já comprou ou utilizou na loja física e online com datas e valores exatos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Split: Left (Customer Selection) | Right (Customer Dossier & History) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Customer Selector & Search */}
          <aside className="w-full md:w-80 lg:w-96 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col bg-slate-950/40 shrink-0">
            {/* Search Box */}
            <div className="p-3 border-b border-slate-800">
              <form onSubmit={handleSearchSubmit} className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por Nome, CPF ou Telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </form>
            </div>

            {/* Customers List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Clientes Cadastrados</span>
                <span className="font-mono text-emerald-400 font-normal">{customersList.length}</span>
              </div>

              {loadingList ? (
                <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  Carregando clientes...
                </div>
              ) : customersList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  Nenhum cliente cadastrado ainda.
                </div>
              ) : (
                customersList
                  .filter((c) => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    const digits = term.replace(/\D/g, '');
                    return (
                      c.name.toLowerCase().includes(term) ||
                      (digits && c.cpf?.replace(/\D/g, '').includes(digits)) ||
                      (digits && c.phone?.replace(/\D/g, '').includes(digits))
                    );
                  })
                  .map((cust) => {
                    const isSelected = selectedCustomer?.id === cust.id;
                    return (
                      <button
                        key={cust.id}
                        onClick={() => loadCustomerDossier(cust)}
                        className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between border ${
                          isSelected
                            ? 'bg-emerald-950/60 border-emerald-500/80 text-white shadow-sm'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSelected
                                ? 'bg-emerald-500 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {cust.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold leading-tight truncate">{cust.name}</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate">
                              CPF: {cust.cpf ? maskCPF(cust.cpf) : 'Não informado'}
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })
              )}
            </div>

            {/* Quick Link Action at Bottom of list */}
            {selectedCustomer && onSelectCustomerForCart && (
              <div className="p-3 border-t border-slate-800 bg-slate-950/80">
                <button
                  onClick={handleLinkToCart}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Vincular ao Carrinho Atual (F3)</span>
                </button>
              </div>
            )}
          </aside>

          {/* Right Column: Customer Profile Dossier & Purchases Timeline */}
          <main className="flex-1 flex flex-col overflow-hidden bg-slate-900">
            {loadingDossier ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400 gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
                <p className="text-sm font-semibold text-slate-300">Carregando histórico completo do cliente...</p>
                <p className="text-xs text-slate-500">Buscando transações da loja física e pedidos da loja online</p>
              </div>
            ) : dossier ? (
              <>
                {/* Customer Dossier Hero Header */}
                <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/70 space-y-4 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-slate-950 font-black text-lg shadow-md shrink-0">
                        {dossier.customer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                          {dossier.customer.name}
                          {dossier.customer.notes?.includes('VIP') && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              VIP
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 mt-0.5">
                          {dossier.customer.cpf && (
                            <span className="font-mono">CPF: {maskCPF(dossier.customer.cpf)}</span>
                          )}
                          {dossier.customer.phone && (
                            <span className="flex items-center gap-1 font-mono">
                              <Phone className="w-3 h-3 text-slate-500" />
                              {dossier.customer.phone}
                            </span>
                          )}
                          {dossier.customer.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              {dossier.customer.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Customer Action: Link to current sale */}
                    {onSelectCustomerForCart && (
                      <button
                        onClick={handleLinkToCart}
                        className="self-start sm:self-auto px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Atender este Cliente no PDV</span>
                      </button>
                    )}
                  </div>

                  {/* High-Level Metrics Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                        Total Investido
                      </span>
                      <span className="text-base font-black text-emerald-400 font-mono">
                        {formatCurrency(dossier.totalSpent)}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-semibold block uppercase tracking-wider">
                        Visitas / Compras
                      </span>
                      <span className="text-base font-black text-white font-mono">
                        {dossier.totalTransactions} {dossier.totalTransactions === 1 ? 'visita' : 'visitas'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1 uppercase tracking-wider">
                        <Wrench className="w-3 h-3" />
                        Serviços Usados
                      </span>
                      <span className="text-base font-black text-amber-300 font-mono">
                        {dossier.totalServicesUsed} {dossier.totalServicesUsed === 1 ? 'serviço' : 'serviços'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                      <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1 uppercase tracking-wider">
                        <Clock className="w-3 h-3 text-sky-400" />
                        Última Atividade
                      </span>
                      <span className="text-xs font-bold text-slate-200 mt-1 block truncate">
                        {dossier.lastVisit ? formatDate(dossier.lastVisit) : 'Hoje'}
                      </span>
                    </div>
                  </div>

                  {dossier.customer.address && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{dossier.customer.address}</span>
                    </div>
                  )}
                </div>

                {/* Sub-Toolbar: Tabs and History Search */}
                <div className="px-4 py-2.5 border-b border-slate-800 bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
                  {/* Category Tabs */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setActiveTab('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'all'
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Todos ({dossier.items.length})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('services')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'services'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5 text-amber-400" />
                      <span>Serviços ({dossier.totalServicesUsed})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('products')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'products'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Produtos ({dossier.totalItemsPurchased})</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('transactions')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                        activeTab === 'transactions'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-sky-400" />
                      <span>Cupons & Pedidos ({dossier.transactions.length})</span>
                    </button>
                  </div>

                  {/* Filter inside History Items */}
                  {activeTab !== 'transactions' && (
                    <div className="relative w-full sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Ex: película, cabo, café, higienização..."
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}
                </div>

                {/* Items & Services Detailed Timeline */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                  {activeTab === 'transactions' ? (
                    /* Transactions View */
                    dossier.transactions.length === 0 ? (
                      <div className="text-center p-8 text-slate-500 text-xs">
                        Nenhuma transação registrada para este cliente.
                      </div>
                    ) : (
                      dossier.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                                tx.origin === 'pos'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                                  : 'bg-sky-950 text-sky-400 border border-sky-800/80'
                              }`}
                            >
                              {tx.origin === 'pos' ? <Store className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                            </div>

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-white">{tx.number}</span>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                    tx.origin === 'pos'
                                      ? 'bg-emerald-950/80 text-emerald-300'
                                      : 'bg-sky-950/80 text-sky-300'
                                  }`}
                                >
                                  {tx.origin === 'pos' ? 'Loja Física (Balcão)' : 'Loja Online Oficial'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                <span>{formatDate(tx.date)}</span>
                                {tx.sellerName && (
                                  <>
                                    <span>•</span>
                                    <span>Atendido por: {tx.sellerName}</span>
                                  </>
                                )}
                                {tx.paymentMethod && (
                                  <>
                                    <span>•</span>
                                    <span className="capitalize">{tx.paymentMethod.replace('_', ' ')}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-black text-emerald-400 font-mono">
                              {formatCurrency(tx.total)}
                            </span>
                            <p className="text-[11px] text-slate-400">
                              {tx.itemsCount} {tx.itemsCount === 1 ? 'item' : 'itens'}
                            </p>
                          </div>
                        </div>
                      ))
                    )
                  ) : /* Timeline of Items & Services */
                  filteredItems.length === 0 ? (
                    <div className="text-center p-8 text-slate-500 text-xs">
                      {itemSearchQuery
                        ? `Nenhum item encontrado com o termo "${itemSearchQuery}".`
                        : 'Nenhum histórico encontrado para esta categoria.'}
                    </div>
                  ) : (
                    filteredItems.map((item) => {
                      const isService = item.type === 'service';
                      return (
                        <div
                          key={item.id}
                          className={`p-3 sm:p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isService
                              ? 'bg-amber-950/20 border-amber-800/40 hover:border-amber-700/60'
                              : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          {/* Item Identity and Service Timestamp Notice */}
                          <div className="flex items-start sm:items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isService
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              }`}
                            >
                              {isService ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                            </div>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-white">
                                  {item.name}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                    isService
                                      ? 'bg-amber-950 text-amber-300 border border-amber-700/70'
                                      : 'bg-emerald-950 text-emerald-300 border border-emerald-700/70'
                                  }`}
                                >
                                  {isService ? 'Serviço da Loja' : 'Produto'}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                  {item.sku}
                                </span>
                              </div>

                              {/* Crucial timestamp: exact date & time the service or product was acquired */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 mt-1">
                                <span className="flex items-center gap-1 text-slate-200 font-semibold bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-800">
                                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{isService ? 'Utilizado em:' : 'Comprado em:'}</span>
                                  <span className="font-mono text-white">{formatDate(item.date)}</span>
                                </span>

                                <span className="text-slate-400">
                                  {item.origin === 'pos' ? (
                                    <span className="flex items-center gap-1">
                                      <Store className="w-3 h-3 text-slate-500" />
                                      Atendente: <strong className="text-slate-300">{item.sellerName}</strong>
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1">
                                      <Globe className="w-3 h-3 text-sky-400" />
                                      <span>Pedido Online ({item.transactionNumber})</span>
                                    </span>
                                  )}
                                </span>

                                {item.transactionNumber && item.origin === 'pos' && (
                                  <span className="text-slate-400 font-mono">
                                    Cupom: {item.transactionNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Price, Quantity & Reorder Quick Action */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-900">
                            <div className="text-left sm:text-right">
                              <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                                {formatCurrency(item.total)}
                              </span>
                              <p className="text-[11px] text-slate-400 font-mono">
                                {item.quantity}x {formatCurrency(item.price)}
                              </p>
                            </div>

                            {/* Quick Repeat / Add to Cart Action */}
                            {onAddToCart && (
                              <button
                                onClick={() => handleReorderItem(item.productId)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                                title={isService ? 'Realizar este serviço novamente' : 'Adicionar este produto novamente ao carrinho atual'}
                              >
                                <Plus className="w-3 h-3" />
                                <span>{isService ? 'Repetir Serviço' : 'Recomprar'}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-500 text-xs">
                Selecione um cliente ao lado ou digite o CPF no topo para carregar o histórico.
              </div>
            )}
          </main>
        </div>

        {/* Footer info bar */}
        <div className="px-4 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dados sincronizados em tempo real entre o PDV da loja física e a loja online</span>
          </div>

          <button
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
          >
            Fechar (Esc)
          </button>
        </div>

      </div>
    </div>
  );
};
