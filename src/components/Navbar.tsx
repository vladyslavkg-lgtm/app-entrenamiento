import React from 'react';
import { User } from 'firebase/auth';
import {
  LayoutDashboard,
  Dumbbell,
  Mic,
  History,
  BookOpen,
  TrendingUp,
  Timer,
  User as UserIcon,
  Sparkles,
  HeartPulse,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type ActiveTab =
  | 'dashboard'
  | 'workout'
  | 'coach'
  | 'profile'
  | 'creator'
  | 'history'
  | 'library'
  | 'progress';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onOpenTimer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onOpenAuth,
  onOpenTimer,
}) => {
  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Inicio', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'workout', label: 'Entrenar', icon: <Dumbbell className="w-4 h-4" /> },
    { id: 'coach', label: 'Coach IA', icon: <Mic className="w-4 h-4" /> },
    { id: 'profile', label: 'Perfil Atleta', icon: <HeartPulse className="w-4 h-4" /> },
    { id: 'creator', label: 'Creador IA', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'history', label: 'Historial', icon: <History className="w-4 h-4" /> },
    { id: 'library', label: 'Ejercicios', icon: <BookOpen className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Top Navbar for Desktop & Tablet */}
      <header className="sticky top-0 z-40 bg-zinc-950/85 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-cyan-500 p-0.5 shadow-md shadow-emerald-500/20 group-hover:scale-105 transition">
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-emerald-400 group-hover:rotate-12 transition duration-300" />
              </div>
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                <span>AuraFit</span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  PRO
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 leading-none">Fuerza & Coach IA</div>
            </div>
          </div>

          {/* Desktop Navigation Items */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-900/90 p-1 rounded-2xl border border-zinc-800">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 shadow-sm border border-emerald-500/30'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons: PWA Install, Rest Timer, Profile */}
          <div className="flex items-center gap-2.5">
            <PWAInstallButton />

            {/* Quick Rest Timer Trigger */}
            <button
              onClick={onOpenTimer}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-400 hover:border-emerald-500/40 transition cursor-pointer"
              title="Temporizador de descanso"
            >
              <Timer className="w-4 h-4" />
            </button>

            {/* User Profile / Auth */}
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition cursor-pointer"
            >
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Avatar"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                  {currentUser?.displayName ? currentUser.displayName[0] : <UserIcon className="w-3.5 h-3.5" />}
                </div>
              )}
              <span className="text-xs font-semibold text-zinc-200 hidden sm:inline max-w-[90px] truncate">
                {currentUser?.displayName || (currentUser ? 'Mi Cuenta' : 'Entrar')}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (Sticky for thumbs) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-800/90 px-2 py-1.5">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
                  isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <div className={`p-1 rounded-lg ${isActive ? 'bg-emerald-500/15' : ''}`}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
