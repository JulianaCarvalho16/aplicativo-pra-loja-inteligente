import React, { useState, useMemo } from 'react';
import { 
  X, 
  TrendingUp, 
  BarChart3, 
  CreditCard, 
  DollarSign, 
  ShoppingBag, 
  Calendar, 
  Store, 
  Globe, 
  Layers, 
  ArrowUpRight,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Sale, OnlineOrder } from '../types';
import { formatCurrency } from '../utils/formatters';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  onlineOrders: OnlineOrder[];
}

export const DashboardModal: React.FC<DashboardModalProps> = ({
  isOpen,
  onClose,
  sales,
  onlineOrders,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'today' | '7days' | 'all'>('today');
  const [hourlyChartType, setHourlyChartType] = useState<'area' | 'bar'>('area');
  const [paymentChartType, setPaymentChartType] = useState<'donut' | 'bar'>('donut');

  // Filter sales based on period
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

    return sales.filter((s) => {
      const saleTime = new Date(s.timestamp).getTime();
      if (filterPeriod === 'today') {
        return saleTime >= startOfToday;
      }
      if (filterPeriod === '7days') {
        return saleTime >= sevenDaysAgo;
      }
      return true;
    });
  }, [sales, filterPeriod]);

  // Filter online orders based on period
  const filteredOnlineOrders = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

    return onlineOrders.filter((o) => {
      const orderTime = new Date(o.createdAt).getTime();
      if (filterPeriod === 'today') {
        return orderTime >= startOfToday;
      }
      if (filterPeriod === '7days') {
        return orderTime >= sevenDaysAgo;
      }
      return true;
    });
  }, [onlineOrders, filterPeriod]);

  // Overall KPIs
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalOnlineRevenue = filteredOnlineOrders.reduce((acc, o) => acc + o.total, 0);
  const totalCombinedRevenue = totalSalesRevenue + totalOnlineRevenue;
  const totalTransactionsCount = filteredSales.length + filteredOnlineOrders.length;
  const averageTicket = totalTransactionsCount > 0 ? totalCombinedRevenue / totalTransactionsCount : 0;

  // 1. Hourly Sales Volume Data (dynamically covers 08h to 22h + any outlier hours)
  const hourlyData = useMemo(() => {
    const hoursSet = new Set<number>();
    for (let h = 8; h <= 22; h++) {
      hoursSet.add(h);
    }

    filteredSales.forEach((sale) => {
      const h = new Date(sale.timestamp).getHours();
      hoursSet.add(h);
    });

    filteredOnlineOrders.forEach((order) => {
      const h = new Date(order.createdAt).getHours();
      hoursSet.add(h);
    });

    const sortedHours = Array.from(hoursSet).sort((a, b) => a - b);
    const hoursMap: Record<number, { hour: number; hourLabel: string; valorVendas: number; quantidade: number }> = {};

    sortedHours.forEach((h) => {
      hoursMap[h] = {
        hour: h,
        hourLabel: `${String(h).padStart(2, '0')}h`,
        valorVendas: 0,
        quantidade: 0,
      };
    });

    filteredSales.forEach((sale) => {
      const h = new Date(sale.timestamp).getHours();
      if (hoursMap[h]) {
        hoursMap[h].valorVendas += sale.total;
        hoursMap[h].quantidade += 1;
      }
    });

    // Also include online orders in hourly data
    filteredOnlineOrders.forEach((order) => {
      const h = new Date(order.createdAt).getHours();
      if (hoursMap[h]) {
        hoursMap[h].valorVendas += order.total;
        hoursMap[h].quantidade += 1;
      }
    });

    return Object.values(hoursMap);
  }, [filteredSales, filteredOnlineOrders]);

  // Peak sales hour
  const peakHour = useMemo(() => {
    if (hourlyData.length === 0) return null;
    let peak = hourlyData[0];
    hourlyData.forEach((item) => {
      if (item.valorVendas > peak.valorVendas) peak = item;
    });
    return peak.valorVendas > 0 ? peak : null;
  }, [hourlyData]);

  // 2. Payment Methods Breakdown Data
  const paymentMethodsData = useMemo(() => {
    const methodsMap: Record<string, { name: string; value: number; count: number; color: string }> = {
      dinheiro: { name: 'Dinheiro', value: 0, count: 0, color: '#10b981' },
      pix: { name: 'PIX Instantâneo', value: 0, count: 0, color: '#06b6d4' },
      cartao_credito: { name: 'Cartão de Crédito', value: 0, count: 0, color: '#8b5cf6' },
      cartao_debito: { name: 'Cartão de Débito', value: 0, count: 0, color: '#f59e0b' },
      multiplo: { name: 'Múltiplo / Dividido', value: 0, count: 0, color: '#ec4899' },
    };

    filteredSales.forEach((s) => {
      const m = s.paymentMethod || 'dinheiro';
      if (methodsMap[m]) {
        methodsMap[m].value += s.total;
        methodsMap[m].count += 1;
      }
    });

    // Online orders (paid via pix or cartao_credito)
    filteredOnlineOrders.forEach((o) => {
      const m = o.paymentMethod || 'pix';
      if (methodsMap[m]) {
        methodsMap[m].value += o.total;
        methodsMap[m].count += 1;
      }
    });

    return Object.values(methodsMap).filter((item) => item.value > 0);
  }, [filteredSales, filteredOnlineOrders]);

  // 3. Top Products Sold
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number; category: string }> = {};

    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = { name: item.name, quantity: 0, revenue: 0, category: item.type === 'service' ? 'Serviço' : 'Produto' };
        }
        map[item.productId].quantity += item.quantity;
        map[item.productId].revenue += item.total;
      });
    });

    filteredOnlineOrders.forEach((o) => {
      o.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = { name: item.name, quantity: 0, revenue: 0, category: 'Produto' };
        }
        map[item.productId].quantity += item.quantity;
        map[item.productId].revenue += item.total;
      });
    });

    return Object.values(map)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredSales, filteredOnlineOrders]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 select-none">
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Dashboard de Vendas & Performance</span>
              </h2>
              <p className="text-xs text-slate-400">
                Visualização de dados analíticos em tempo real (Loja Física + Loja Online)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Buttons */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs font-semibold">
              <button
                onClick={() => setFilterPeriod('today')}
                className={`px-3 py-1.5 rounded-md transition ${
                  filterPeriod === 'today'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setFilterPeriod('7days')}
                className={`px-3 py-1.5 rounded-md transition ${
                  filterPeriod === '7days'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Dias
              </button>
              <button
                onClick={() => setFilterPeriod('all')}
                className={`px-3 py-1.5 rounded-md transition ${
                  filterPeriod === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Histórico Geral
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Top Metric KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* KPI 1: Faturamento Total */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Faturamento Total</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400 tabular-nums my-1">
                {formatCurrency(totalCombinedRevenue)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>{filterPeriod === 'today' ? 'Apuração do dia' : 'Período filtrado'}</span>
                <span className="text-emerald-400 font-semibold flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  100% ativo
                </span>
              </div>
            </div>

            {/* KPI 2: Vendas Realizadas */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Vendas Concluídas</span>
                <TrendingUp className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-sky-400 tabular-nums my-1">
                {totalTransactionsCount} <span className="text-xs font-normal text-slate-400">cupons</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {filteredSales.length} PDV Balcão · {filteredOnlineOrders.length} Loja Online
              </div>
            </div>

            {/* KPI 3: Ticket Médio */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Ticket Médio</span>
                <CreditCard className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-purple-400 tabular-nums my-1">
                {formatCurrency(averageTicket)}
              </div>
              <div className="text-[11px] text-slate-500">
                Média por consumidor atendido
              </div>
            </div>

            {/* KPI 4: Omnichannel Breakdown */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Canais de Atendimento</span>
                <Layers className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-baseline justify-between my-1">
                <div>
                  <span className="text-xs text-slate-400 block flex items-center gap-1">
                    <Store className="w-3 h-3 text-emerald-400" /> Balcão PDV:
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-200">
                    {formatCurrency(totalSalesRevenue)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block flex items-center justify-end gap-1">
                    <Globe className="w-3 h-3 text-sky-400" /> Online:
                  </span>
                  <span className="text-sm font-bold font-mono text-slate-200">
                    {formatCurrency(totalOnlineRevenue)}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500">
                Estoque 100% unificado
              </div>
            </div>
          </div>

          {/* Charts Row: Hourly Volume + Payment Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Chart 1: Volume de Vendas por Hora (Recharts AreaChart / BarChart) */}
            <div className="lg:col-span-7 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Volume de Vendas por Hora
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {filterPeriod === 'today' ? 'Horários de pico no dia atual' : 'Distribuição horária agregada'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {peakHour && (
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-800/80 text-[10px] text-emerald-300 font-mono">
                      Pico: {peakHour.hourLabel} ({formatCurrency(peakHour.valorVendas)})
                    </span>
                  )}

                  {/* Toggle Chart Mode */}
                  <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                    <button
                      onClick={() => setHourlyChartType('area')}
                      className={`px-2 py-1 rounded transition font-medium ${
                        hourlyChartType === 'area'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Área
                    </button>
                    <button
                      onClick={() => setHourlyChartType('bar')}
                      className={`px-2 py-1 rounded transition font-medium ${
                        hourlyChartType === 'bar'
                          ? 'bg-emerald-600 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Barras
                    </button>
                  </div>
                </div>
              </div>

              {/* Chart Container */}
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {hourlyChartType === 'area' ? (
                    <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis 
                        dataKey="hourLabel" 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        interval={1}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        tickFormatter={(val) => `R$${val}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderColor: '#334155', 
                          borderRadius: '0.75rem', 
                          color: '#f8fafc',
                          fontSize: '12px' 
                        }}
                        formatter={(value: any, name: any) => [
                          name === 'quantidade' ? `${value} vendas` : formatCurrency(Number(value)),
                          name === 'quantidade' ? 'Qtd. Transações' : 'Faturamento'
                        ]}
                        labelFormatter={(label) => `Horário: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="valorVendas" 
                        name="valorVendas"
                        stroke="#10b981" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#colorSales)" 
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                      <XAxis 
                        dataKey="hourLabel" 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        interval={1}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        fontSize={11} 
                        tickLine={false} 
                        tickFormatter={(val) => `R$${val}`}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderColor: '#334155', 
                          borderRadius: '0.75rem', 
                          color: '#f8fafc',
                          fontSize: '12px' 
                        }}
                        formatter={(value: any, name: any) => [
                          name === 'quantidade' ? `${value} vendas` : formatCurrency(Number(value)),
                          name === 'quantidade' ? 'Qtd. Transações' : 'Faturamento'
                        ]}
                        labelFormatter={(label) => `Horário: ${label}`}
                      />
                      <Bar 
                        dataKey="valorVendas" 
                        name="valorVendas"
                        fill="#10b981" 
                        radius={[4, 4, 0, 0]} 
                      />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400">
                <span>Horários comerciais: 08:00 às 22:00</span>
                <span className="font-mono text-emerald-400 font-bold">
                  Total Período: {formatCurrency(totalCombinedRevenue)}
                </span>
              </div>
            </div>

            {/* Chart 2: Formas de Pagamento Mais Utilizadas (Recharts PieChart / BarChart) */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <PieIcon className="w-3.5 h-3.5 text-cyan-400" />
                    Formas de Pagamento no Dia
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Liquidações por modalidade
                  </span>
                </div>

                {/* Toggle Payment Chart Mode */}
                <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                  <button
                    onClick={() => setPaymentChartType('donut')}
                    className={`px-2 py-1 rounded transition font-medium ${
                      paymentChartType === 'donut'
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Rosca
                  </button>
                  <button
                    onClick={() => setPaymentChartType('bar')}
                    className={`px-2 py-1 rounded transition font-medium ${
                      paymentChartType === 'bar'
                        ? 'bg-cyan-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Barras
                  </button>
                </div>
              </div>

              {/* Chart Container */}
              <div className="h-48 w-full">
                {paymentMethodsData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Nenhum pagamento registrado no período.
                  </div>
                ) : paymentChartType === 'donut' ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentMethodsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {paymentMethodsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderColor: '#334155', 
                          borderRadius: '0.75rem', 
                          color: '#f8fafc',
                          fontSize: '12px' 
                        }}
                        formatter={(val: any, name: any) => [
                          `${formatCurrency(Number(val))} (${((Number(val) / totalCombinedRevenue) * 100).toFixed(1)}%)`,
                          name
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={paymentMethodsData} 
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
                      <XAxis type="number" stroke="#94a3b8" fontSize={10} tickFormatter={(val) => `R$${val}`} />
                      <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={90} tickLine={false} />
                      <Tooltip
                        contentStyle={{ 
                          backgroundColor: '#0f172a', 
                          borderColor: '#334155', 
                          borderRadius: '0.75rem', 
                          color: '#f8fafc',
                          fontSize: '12px' 
                        }}
                        formatter={(val: any) => [formatCurrency(Number(val)), 'Faturamento']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {paymentMethodsData.map((entry, index) => (
                          <Cell key={`bar-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Custom Clean Legend with values, ticket average and percentage */}
              <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-900 text-xs">
                {paymentMethodsData.map((item) => {
                  const percentage = totalCombinedRevenue > 0 ? (item.value / totalCombinedRevenue) * 100 : 0;
                  const avgPerMethod = item.count > 0 ? item.value / item.count : 0;
                  return (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-300 truncate max-w-[120px]">{item.name}</span>
                        <span className="text-[10px] text-slate-500">({item.count}x)</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="font-bold text-slate-100">{formatCurrency(item.value)}</span>
                        <span className="text-[10px] text-slate-400 w-14 text-right">Méd: {formatCurrency(avgPerMethod)}</span>
                        <span className="text-[11px] text-slate-400 w-9 text-right font-bold">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Section: Top Products Sold */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
              Produtos & Serviços Mais Vendidos do Dia
            </h3>

            {topProducts.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Nenhum produto vendido ainda no período selecionado.
              </p>
            ) : (
              <div className="divide-y divide-slate-800/80">
                {topProducts.map((p, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-md bg-slate-800 text-slate-300 font-bold flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-200 block">{p.name}</span>
                        <span className="text-[11px] text-slate-400">{p.category}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="font-bold text-emerald-400 block">{formatCurrency(p.revenue)}</span>
                      <span className="text-[10px] text-slate-500">{p.quantity} unidades vendidas</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition"
          >
            Fechar Dashboard (Esc)
          </button>
        </div>
      </div>
    </div>
  );
};
