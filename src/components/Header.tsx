import React from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CircleDollarSign, 
  HelpCircle, 
  LogOut, 
  UserCheck, 
  Keyboard, 
  ShieldAlert,
  Globe,
  ShoppingBag,
  Cloud,
  BarChart3,
  Package,
  Lock
} from 'lucide-react';
import { User, CashSession } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentUser: User | null;
  cashSession: CashSession | null;
  isOnline: boolean;
  pendingSyncCount: number;
  onlineOrdersCount: number;
  onOpenSyncQueue: () => void;
  onOpenCashModal: () => void;
  onOpenShortcutsModal: () => void;
  onOpenCustomerModal: () => void;
  onOpenOnlineStore: () => void;
  onOpenOnlineOrders: () => void;
  onOpenCloudBackup: () => void;
  onOpenDashboard: () => void;
  onOpenProductManagement: () => void;
  onOpenCustomerHistory?: () => void;
  onFocusSearch?: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  cashSession,
  isOnline,
  pendingSyncCount,
  onlineOrdersCount,
  onOpenSyncQueue,
  onOpenCashModal,
  onOpenShortcutsModal,
  onOpenCustomerModal,
  onOpenOnlineStore,
  onOpenOnlineOrders,
  onOpenCloudBackup,
  onOpenDashboard,
  onOpenProductManagement,
  onOpenCustomerHistory,
  onLogout,
}) => {
  const isCashOpen = cashSession?.status === 'open';

  return (
    <header className="flex items-center justify-between gap-2 sm:gap-3 px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-200 select-none shrink-0 w-full">
      {/* Zone 1: Brand wordmark & Cash status */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center font-black text-white text-xs shadow-sm">
            P
          </div>
          <span className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
            PDV Pro
            <span className="hidden 2xl:inline text-xs font-normal text-slate-400"> | Caixa Físico</span>
          </span>
        </div>

        {/* Cash Status Indicator */}
        <button
          onClick={onOpenCashModal}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition whitespace-nowrap ${
            isCashOpen 
              ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60' 
              : 'bg-rose-950/50 border-rose-800/80 text-rose-300 hover:bg-rose-900/60'
          }`}
          title="Clique para gerenciar o Caixa (F4)"
        >
          <CircleDollarSign className="w-3.5 h-3.5" />
          <span>{isCashOpen ? 'Aberto' : 'Fechado'}</span>
          <span className="text-[10px] text-slate-400 font-mono">F4</span>
        </button>
      </div>

      {/* Zone 2: Navigation Links & Shortcuts (Search button removed per user request) */}
      <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 text-xs font-medium text-slate-300 min-w-0 overflow-hidden">
        {/* Switch to Online Storefront */}
        <button
          onClick={onOpenOnlineStore}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 transition whitespace-nowrap shrink-0"
          title="Abrir a Loja Online / Vitrine do Cliente"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Loja Online</span>
        </button>

        {/* Omnichannel Incoming Orders */}
        <button
          onClick={onOpenOnlineOrders}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 text-slate-300 transition whitespace-nowrap shrink-0"
          title="Ver pedidos recebidos da Loja Online para separação no PDV"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
          <span>Pedidos</span>
          {onlineOrdersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500 text-slate-950 font-black">
              {onlineOrdersCount}
            </span>
          )}
        </button>

        {/* Dashboard Analytics Control */}
        <button
          onClick={onOpenDashboard}
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-750 text-emerald-300 border border-slate-700 hover:border-emerald-700/60 transition whitespace-nowrap shrink-0"
          title="Abrir Dashboard de Vendas e Desempenho (F8)"
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Dashboard</span>
        </button>

        {/* Cloud Backup Control */}
        <button
          onClick={onOpenCloudBackup}
          className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 text-slate-300 transition whitespace-nowrap shrink-0"
          title="Central de Backup em Nuvem e Resiliência Local"
        >
          <Cloud className="w-3.5 h-3.5 text-indigo-400" />
          <span>Backup</span>
        </button>

        {/* Product / Items Admin Management */}
        <button
          onClick={onOpenProductManagement}
          className={`flex items-center gap-1 px-2 py-1 rounded-md border transition whitespace-nowrap shrink-0 ${
            currentUser?.role === 'admin'
              ? 'bg-emerald-950/70 border-emerald-700/80 text-emerald-300 hover:bg-emerald-900/60'
              : 'hover:bg-slate-800 hover:text-slate-200 border-transparent text-slate-300'
          }`}
          title="Gerenciar catálogo de itens e estoque (Apenas Administrador)"
        >
          <Package className="w-3.5 h-3.5 text-emerald-400" />
          <span>Estoque</span>
          {currentUser?.role === 'admin' ? (
            <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              Admin
            </span>
          ) : (
            <Lock className="w-3 h-3 text-slate-500" />
          )}
        </button>

        <span className="text-slate-700">|</span>

        {/* CPF Identification Shortcut */}
        <button
          onClick={onOpenCustomerModal}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 transition whitespace-nowrap shrink-0"
          title="Identificar cliente com CPF (F3)"
        >
          <span>CPF</span>
          <kbd className="px-1 py-0.2 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">F3</kbd>
        </button>

        {/* Customer Dossier / History */}
        {onOpenCustomerHistory && (
          <button
            onClick={onOpenCustomerHistory}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/80 transition whitespace-nowrap shrink-0"
            title="Abrir Histórico Completo de Compras e Serviços do Cliente (F6)"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Ficha Cliente</span>
            <kbd className="px-1 py-0.2 text-[10px] bg-slate-900 border border-emerald-700/80 rounded text-emerald-400 font-mono">F6</kbd>
          </button>
        )}

        {/* Shortcuts */}
        <button
          onClick={onOpenShortcutsModal}
          className="hidden xl:flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 transition whitespace-nowrap shrink-0"
          title="Ver teclas de atalho do sistema"
        >
          <Keyboard className="w-3.5 h-3.5 text-slate-400" />
          <span>Atalhos</span>
        </button>
      </nav>

      {/* Zone 3: Connection Status & Operator Profile with Guaranteed Visible Logout Button */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Offline / Online Pill */}
        <button
          onClick={onOpenSyncQueue}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border transition whitespace-nowrap shrink-0 ${
            isOnline
              ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
              : 'bg-amber-950/60 border-amber-800 text-amber-300 animate-pulse'
          }`}
          title="Status da conexão e sincronização com servidor central"
        >
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
          {pendingSyncCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
              {pendingSyncCount}
            </span>
          )}
        </button>

        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Operator Info & Distinct Logout Button */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800 shrink-0">
            <div className="flex flex-col text-right">
              <span className="text-xs font-bold text-slate-100 whitespace-nowrap">
                {currentUser.name}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono">
                {currentUser.role}
              </span>
            </div>

            {/* Logout Button (Highlighted, Compact, and Guaranteed in View) */}
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-rose-300 hover:text-white bg-rose-950/50 hover:bg-rose-900 border border-rose-800/70 hover:border-rose-600 rounded-lg transition shrink-0 shadow-sm"
              title="Sair do sistema ou trocar de operador"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

