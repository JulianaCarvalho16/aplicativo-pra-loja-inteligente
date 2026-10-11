import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600/90 hover:bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold shadow-sm transition whitespace-nowrap shrink-0"
        title="Instalar PDV como aplicativo no dispositivo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-750 px-3 py-1.5 text-xs font-medium transition whitespace-nowrap shrink-0"
          title="Instalar no iOS / iPad"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Instalar no iPad</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-6 text-slate-100 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-semibold">Instalar no iPad / iPhone</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-200 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-300">
                Para rodar o PDV em modo tela cheia e offline no Safari:
                <br /><br />
                1. Toque no botão <strong>Compartilhar</strong> (ícone de quadrado com seta para cima).<br />
                2. Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.<br />
                3. Abra o app direto do ícone na tela de início.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-lg bg-slate-800 hover:bg-slate-700 py-2 text-xs font-semibold text-white transition"
              >
                Entendi
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
