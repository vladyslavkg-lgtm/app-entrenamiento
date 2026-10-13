import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw, Plus, X, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { playTimerBeep } from '../services/geminiCoach';

interface RestTimerProps {
  initialSeconds?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const RestTimer: React.FC<RestTimerProps> = ({
  initialSeconds = 90,
  isOpen,
  onClose,
}) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync when initialSeconds changes
  useEffect(() => {
    if (initialSeconds > 0) {
      setSecondsLeft(initialSeconds);
      setTotalSeconds(initialSeconds);
      setIsRunning(true);
    }
  }, [initialSeconds]);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev === 4 && soundEnabled) {
            playTimerBeep('warning');
          }
          if (prev <= 1) {
            if (soundEnabled) playTimerBeep('finish');
            if ('vibrate' in navigator) {
              try {
                navigator.vibrate([300, 150, 300]);
              } catch (_) {}
            }
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (secondsLeft === 0) {
      setIsRunning(false);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft, soundEnabled]);

  if (!isOpen) return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePreset = (s: number) => {
    setSecondsLeft(s);
    setTotalSeconds(s);
    setIsRunning(true);
  };

  const add30Seconds = () => {
    setSecondsLeft((prev) => prev + 30);
    setTotalSeconds((prev) => prev + 30);
  };

  const progressPercent = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  // Minimized floating bubble
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 z-50 flex items-center gap-2 bg-zinc-900/95 border border-emerald-500/40 text-white px-3.5 py-2 rounded-2xl shadow-2xl backdrop-blur-md animate-fade-in">
        <div className="relative flex items-center justify-center">
          <Timer className={`w-5 h-5 ${isRunning ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
        </div>
        <span className="font-mono font-bold text-base text-emerald-300">{formatTime(secondsLeft)}</span>
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          title={isRunning ? 'Pausar' : 'Reanudar'}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button
          onClick={add30Seconds}
          className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
          title="+30s"
        >
          +30s
        </button>
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 rounded-lg hover:text-white text-zinc-400"
          title="Expandir"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:text-red-400 text-zinc-500"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900/95 border border-zinc-800 p-6 shadow-2xl text-zinc-100 flex flex-col items-center">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Timer className="w-4 h-4" />
            <span>Temporizador de Descanso</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="text-zinc-400 hover:text-zinc-200 p-1"
              title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsMinimized(true)}
              className="text-zinc-400 hover:text-zinc-200 p-1"
              title="Minimizar en pantalla"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="text-zinc-400 hover:text-red-400 p-1" title="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Circular Display */}
        <div className="relative w-48 h-48 flex items-center justify-center my-3">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="#27272a"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke="#10b981"
              strokeWidth="6"
              strokeDasharray={276.46}
              strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-300 ease-linear"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="font-mono text-4xl font-extrabold text-white tracking-wider">
              {formatTime(secondsLeft)}
            </span>
            <span className="text-xs text-zinc-400 mt-1 uppercase tracking-wider font-semibold">
              {secondsLeft === 0 ? '¡Listo para la serie!' : isRunning ? 'Recuperando ATP-PC' : 'En pausa'}
            </span>
          </div>
        </div>

        {/* Play/Pause & Reset controls */}
        <div className="flex items-center gap-4 my-4">
          <button
            onClick={() => {
              setSecondsLeft(totalSeconds);
              setIsRunning(false);
            }}
            className="p-3 rounded-2xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white transition"
            title="Reiniciar"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold hover:brightness-110 shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition"
          >
            {isRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                Pausar
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current" />
                Reanudar
              </>
            )}
          </button>
          <button
            onClick={add30Seconds}
            className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 font-semibold flex items-center gap-0.5 transition"
            title="Añadir 30 segundos"
          >
            <Plus className="w-4 h-4" />
            <span className="text-xs font-bold">30s</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="w-full mt-2 pt-4 border-t border-zinc-800/80">
          <div className="text-xs text-zinc-400 mb-2 font-medium text-center">Preajustes basados en ciencia</div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '30s', secs: 30, desc: 'Aislamiento' },
              { label: '60s', secs: 60, desc: 'Hipertrofia' },
              { label: '90s', secs: 90, desc: 'Estándar' },
              { label: '2 min', secs: 120, desc: 'Compuesto' },
            ].map((p) => (
              <button
                key={p.label}
                onClick={() => handlePreset(p.secs)}
                className={`py-2 px-1 rounded-xl text-xs font-semibold transition border ${
                  totalSeconds === p.secs
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800'
                }`}
              >
                <div>{p.label}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
