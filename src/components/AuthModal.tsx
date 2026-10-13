import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  logout,
} from '../firebase';
import { X, LogIn, UserPlus, LogOut, CheckCircle2, ShieldAlert } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  onAuthSuccess: (user: User, token: string | null) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAuthSuccess,
}) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogle();
      onAuthSuccess(res.user, res.accessToken);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al iniciar sesión con Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (tab === 'login') {
        const res = await signInWithEmail(email, password);
        onAuthSuccess(res.user, null);
      } else {
        const res = await signUpWithEmail(email, password);
        onAuthSuccess(res.user, null);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error en autenticación con email');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await logout();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            {currentUser ? 'Cuenta de Usuario' : 'Acceso a AuraFit'}
          </h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {currentUser ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400 text-lg">
                {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : currentUser.email?.[0].toUpperCase() || 'U'}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-sm text-white truncate">
                  {currentUser.displayName || 'Atleta AuraFit'}
                </div>
                <div className="text-xs text-zinc-400 truncate">{currentUser.email}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 space-y-1">
              <div className="flex justify-between">
                <span>Base de Datos:</span>
                <span className="font-semibold text-emerald-400">Cloud Firestore Sincronizado</span>
              </div>
              <div className="flex justify-between">
                <span>Workspace:</span>
                <span className="font-semibold text-cyan-400">OAuth Listo</span>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-red-400 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google Sign In Button (Styled to standard) */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white text-zinc-900 font-semibold text-xs hover:bg-zinc-100 transition shadow-md cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-zinc-800" />
              <span className="text-[10px] uppercase text-zinc-500 font-bold">o con email</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>

            {/* Login / Register tab switch */}
            <div className="flex rounded-xl bg-zinc-800/80 p-1 border border-zinc-700/60">
              <button
                type="button"
                onClick={() => setTab('login')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                  tab === 'login' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-400'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => setTab('register')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                  tab === 'register' ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-400'
                }`}
              >
                Crear Cuenta
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {errorMsg && (
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="line-clamp-2">{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold text-xs hover:brightness-110 transition shadow-lg shadow-emerald-500/20"
              >
                {isLoading ? 'Cargando...' : tab === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
