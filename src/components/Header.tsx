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
  BarChart3
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
  onFocusSearch: () => void;
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
  onFocusSearch,
  onLogout,
}) => {
  const isCashOpen = cashSession?.status === 'open';

  return (
    <header className="flex items-center justify-between gap-6 px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-200 select-none">
      {/* Zone 1: Brand wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm">
            P
          </div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap shrink-0">
            PDV Pro <span className="text-xs font-normal text-slate-400">| Caixa Físico</span>
          </span>
        </div>

        {/* Cash Status Indicator */}
        <button
          onClick={onOpenCashModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition whitespace-nowrap ${
            isCashOpen 
              ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60' 
              : 'bg-rose-950/50 border-rose-800/80 text-rose-300 hover:bg-rose-900/60'
          }`}
          title="Clique para gerenciar o Caixa (F4)"
        >
          <CircleDollarSign className="w-3.5 h-3.5" />
          <span>Caixa {isCashOpen ? 'Aberto' : 'Fechado'}</span>
          <span className="text-[10px] text-slate-400 font-mono">F4</span>
        </button>
      </div>

      {/* Zone 2: Omnichannel Links & Shortcuts */}
      <nav className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-400">
        {/* Switch to Online Storefront */}
        <button
          onClick={onOpenOnlineStore}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 hover:bg-emerald-900/60 transition whitespace-nowrap shrink-0"
          title="Abrir a Loja Online / Vitrine do Cliente"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>Loja Online (Web)</span>
        </button>

        {/* Omnichannel Incoming Orders */}
        <button
          onClick={onOpenOnlineOrders}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 text-slate-300 transition whitespace-nowrap shrink-0"
          title="Ver pedidos recebidos da Loja Online para separação no PDV"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
          <span>Pedidos Online</span>
          {onlineOrdersCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-sky-500 text-slate-950 font-black">
              {onlineOrdersCount}
            </span>
          )}
        </button>

        {/* Dashboard Analytics Control */}
        <button
          onClick={onOpenDashboard}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-750 text-emerald-300 border border-slate-700 hover:border-emerald-700/60 transition whitespace-nowrap shrink-0"
          title="Abrir Dashboard de Vendas por Hora e Formas de Pagamento (F8)"
        >
          <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Dashboard</span>
          <kbd className="px-1 py-0.2 text-[10px] bg-slate-900 border border-slate-700 rounded text-emerald-400 font-mono">F8</kbd>
        </button>

        {/* Cloud Backup Control */}
        <button
          onClick={onOpenCloudBackup}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 text-slate-300 transition whitespace-nowrap shrink-0"
          title="Central de Backup em Nuvem e Resiliência Local"
        >
          <Cloud className="w-3.5 h-3.5 text-indigo-400" />
          <span>Backup Nuvem</span>
        </button>

        <span className="text-slate-700">|</span>

        <button
          onClick={onFocusSearch}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 transition whitespace-nowrap shrink-0"
        >
          <span>Buscar</span>
          <kbd className="px-1 py-0.2 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">F2</kbd>
        </button>

        <button
          onClick={onOpenCustomerModal}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 transition whitespace-nowrap shrink-0"
        >
          <span>CPF</span>
          <kbd className="px-1 py-0.2 text-[10px] bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">F3</kbd>
        </button>

        <button
          onClick={onOpenShortcutsModal}
          className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 transition whitespace-nowrap shrink-0"
        >
          <Keyboard className="w-3.5 h-3.5 text-slate-400" />
          <span>Atalhos</span>
        </button>
      </nav>

      {/* Zone 3: Status & Operator Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Offline / Online Pill */}
        <button
          onClick={onOpenSyncQueue}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition whitespace-nowrap ${
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

        {/* Operator Info */}
        {currentUser && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <div className="flex flex-col text-right">
              <span className="text-xs font-semibold text-slate-100 whitespace-nowrap">
                {currentUser.name}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono">
                {currentUser.role}
              </span>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-md transition"
              title="Trocar operador ou bloquear tela"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

