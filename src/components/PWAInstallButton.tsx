import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/25 transition shadow-sm cursor-pointer"
        title="Instalar aplicación en el dispositivo"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Instalar App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition"
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span>Instalar en iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  Instalar AuraFit en iPhone / iPad
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-zinc-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-zinc-300 space-y-2">
                1. Toca el botón <strong>Compartir</strong> en la barra de Safari.<br />
                2. Desplázate hacia abajo y selecciona <strong>Añadir a pantalla de inicio</strong>.<br />
                3. ¡Abre AuraFit a pantalla completa como una app nativa!
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition"
              >
                Entendido
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
