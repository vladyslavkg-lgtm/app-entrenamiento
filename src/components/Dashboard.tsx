import React, { useMemo } from 'react';
import {
  Dumbbell,
  Flame,
  Activity,
  Timer,
  Mic,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Scale,
  Brain,
  RefreshCw,
  X,
  HeartPulse,
} from 'lucide-react';
import { WorkoutSession, BodyMetric, MuscleGroup, AthleteProfile } from '../types/fitness';
import { analyzeAthleticProgress, AthleticAnalysisReport } from '../services/geminiCoach';

interface DashboardProps {
  workouts: WorkoutSession[];
  metrics: BodyMetric[];
  athleteProfile?: AthleteProfile | null;
  onStartTraining: () => void;
  onOpenCoach: () => void;
  onOpenTimer: () => void;
  onOpenProgress: () => void;
  onOpenHistory: () => void;
  onOpenProfile?: () => void;
  onOpenCreator?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  workouts,
  metrics,
  athleteProfile,
  onStartTraining,
  onOpenCoach,
  onOpenTimer,
  onOpenProgress,
  onOpenHistory,
  onOpenProfile,
  onOpenCreator,
}) => {
  const [analysisReport, setAnalysisReport] = React.useState<AthleticAnalysisReport | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = React.useState(false);
  const [analysisError, setAnalysisError] = React.useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setIsLoadingAnalysis(true);
    setAnalysisError(null);
    try {
      const rep = await analyzeAthleticProgress({
        workouts,
        metrics,
        profile: athleteProfile,
      });
      setAnalysisReport(rep);
    } catch (err: any) {
      setAnalysisError(err?.message || 'Error al generar análisis');
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  // Last workout
  const lastWorkout = workouts.length > 0 ? workouts[0] : null;

  // Weekly volume in kg (last 7 days)
  const weeklyVolume = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return workouts
      .filter((w) => new Date(w.date).getTime() >= oneWeekAgo)
      .reduce((sum, w) => sum + (w.totalVolumeKg || 0), 0);
  }, [workouts]);

  // Total workouts this week
  const workoutsThisWeek = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return workouts.filter((w) => new Date(w.date).getTime() >= oneWeekAgo).length;
  }, [workouts]);

  // Muscle Recovery Status (Fisiología del deporte: 48h - 72h window)
  const recoveryStatus = useMemo(() => {
    const groups: MuscleGroup[] = ['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos'];
    const now = Date.now();

    return groups.map((group) => {
      // Find latest workout containing this muscle group
      let latestTime: number | null = null;
      for (const w of workouts) {
        const hasGroup = w.exercises.some((e) => e.muscleGroup === group);
        if (hasGroup) {
          latestTime = new Date(w.date).getTime();
          break;
        }
      }

      if (!latestTime) {
        return {
          group,
          status: 'Descansado',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          percent: 100,
          hours: null,
        };
      }

      const diffHours = (now - latestTime) / (1000 * 60 * 60);
      if (diffHours < 24) {
        return {
          group,
          status: 'Fatiga alta (0-24h)',
          color: 'text-amber-400',
          bg: 'bg-amber-500/10',
          percent: 35,
          hours: Math.round(diffHours),
        };
      } else if (diffHours < 48) {
        return {
          group,
          status: 'Síntesis proteica (24-48h)',
          color: 'text-cyan-400',
          bg: 'bg-cyan-500/10',
          percent: 75,
          hours: Math.round(diffHours),
        };
      } else {
        return {
          group,
          status: 'Listo (Supercompensado)',
          color: 'text-emerald-400',
          bg: 'bg-emerald-500/10',
          percent: 100,
          hours: Math.round(diffHours),
        };
      }
    });
  }, [workouts]);

  // Latest body weight
  const latestMetric = metrics.length > 0 ? metrics[0] : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Entrenamiento Inteligente con Gemini Coach</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              AuraFit Dashboard
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed">
              Monitorea tu sobrecarga progresiva, fatiga neuromuscular y conversa con tu asistente IA por voz en tiempo real para registrar tus series manos libres.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onStartTraining}
              className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-extrabold text-sm hover:brightness-110 shadow-lg shadow-emerald-500/25 transition flex items-center gap-2 cursor-pointer"
            >
              <Dumbbell className="w-4 h-4" />
              <span>Entrenar Ahora</span>
            </button>
            {onOpenCreator && (
              <button
                onClick={onOpenCreator}
                className="px-5 py-3.5 rounded-2xl bg-zinc-800/90 hover:bg-zinc-750 text-emerald-400 font-bold text-sm border border-emerald-500/30 transition flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Diseñar Rutina IA</span>
              </button>
            )}
            <button
              onClick={onOpenCoach}
              className="px-5 py-3.5 rounded-2xl bg-zinc-800/90 hover:bg-zinc-700/90 text-white font-bold text-sm border border-zinc-700/80 transition flex items-center gap-2 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-emerald-400" />
              <span>Hablar con Coach</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main 4 Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Volumen Semanal */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Volumen Semanal</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-mono text-2xl sm:text-3xl font-extrabold text-white">
              {weeklyVolume.toLocaleString()}{' '}
              <span className="text-sm font-semibold text-zinc-400">kg</span>
            </div>
            <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{workoutsThisWeek} sesiones en los últimos 7 días</span>
            </div>
          </div>
        </div>

        {/* Card 2: Último Entrenamiento */}
        <div
          onClick={onOpenHistory}
          className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 p-5 rounded-2xl shadow-lg flex flex-col justify-between cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Última Sesión</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            {lastWorkout ? (
              <>
                <div className="font-bold text-base text-white group-hover:text-cyan-300 transition truncate">
                  {lastWorkout.title}
                </div>
                <div className="text-xs text-zinc-400 mt-1 flex justify-between">
                  <span>{new Date(lastWorkout.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span className="font-mono text-cyan-400 font-bold">{lastWorkout.totalVolumeKg} kg</span>
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-500">Sin entrenamientos registrados aún</div>
            )}
          </div>
        </div>

        {/* Card 3: Perfil Atleta & Metabolismo */}
        <div
          onClick={onOpenProfile}
          className="bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/40 p-5 rounded-2xl shadow-lg flex flex-col justify-between cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Perfil & Metabolismo</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition">
              <HeartPulse className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            {athleteProfile ? (
              <>
                <div className="font-mono text-xl sm:text-2xl font-extrabold text-white">
                  {athleteProfile.bmr} <span className="text-xs text-zinc-400 font-normal">kcal TMB</span>
                </div>
                <div className="text-xs text-emerald-400 mt-1 font-semibold truncate">
                  {athleteProfile.proteinGrams}g proteína • {athleteProfile.primaryGoal}
                </div>
              </>
            ) : (
              <>
                <div className="text-base font-bold text-white group-hover:text-purple-300 transition flex items-center justify-between">
                  <span>Configurar Perfil</span>
                  <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:translate-x-1 transition" />
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Mifflin-St Jeor & Proteína
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Progreso Corporal */}
        <div
          onClick={onOpenProgress}
          className="bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/40 p-5 rounded-2xl shadow-lg flex flex-col justify-between cursor-pointer transition group"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Peso & Progreso</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            {latestMetric ? (
              <>
                <div className="font-mono text-2xl font-extrabold text-white">
                  {latestMetric.weightKg}{' '}
                  <span className="text-sm font-semibold text-zinc-400">kg</span>
                </div>
                <div className="text-xs text-purple-400 mt-1">
                  Registrado {new Date(latestMetric.date).toLocaleDateString('es-ES')}
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-400">
                Registra tu peso y medidas antropométricas
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Muscle Recovery Matrix & Gemini Coach Voice Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery Matrix (Fisiología) */}
        <div className="lg:col-span-2 bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">
                Estado de Recuperación Muscular & Fatiga
              </h2>
            </div>
            <button
              onClick={handleRunAnalysis}
              disabled={isLoadingAnalysis}
              className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Brain className={`w-3.5 h-3.5 text-purple-400 ${isLoadingAnalysis ? 'animate-spin' : ''}`} />
              <span>{isLoadingAnalysis ? 'Analizando...' : 'Diagnóstico IA de Sobrecarga'}</span>
            </button>
          </div>

          {/* AI Analysis Report Card if present */}
          {analysisReport && (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 via-zinc-950 to-zinc-950 border border-purple-500/30 space-y-3 text-xs animate-fade-in relative">
              <button
                onClick={() => setAnalysisReport(null)}
                className="absolute top-3 right-3 text-zinc-500 hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold text-[10px] uppercase">
                  Estado: {analysisReport.fatigaStatus}
                </span>
                <span className="font-bold text-white text-xs">Evaluación de Rendimiento Fisiológico</span>
              </div>

              <p className="text-zinc-300 leading-relaxed italic">
                "{analysisReport.summary}"
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="text-[11px] font-bold text-emerald-400">📈 Sobrecarga Progresiva:</div>
                  <div className="text-zinc-300 text-[11px]">{analysisReport.progressiveOverloadTip}</div>
                </div>

                <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <div className="text-[11px] font-bold text-cyan-400">💧 Recuperación & Sueño:</div>
                  <div className="text-zinc-300 text-[11px]">{analysisReport.recoveryAdvice}</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 pt-2">
            {recoveryStatus.map((item) => (
              <div key={item.group} className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-zinc-200">{item.group}</span>
                  <span className={`font-semibold ${item.color}`}>
                    {item.status}
                    {item.hours !== null ? ` • hace ${item.hours}h` : ''}
                  </span>
                </div>
                <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.percent === 100
                        ? 'bg-emerald-500'
                        : item.percent >= 75
                        ? 'bg-cyan-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Optimizado para síntesis de miofibrillas y prevención de sobreentrenamiento</span>
            </div>
          </div>
        </div>

        {/* Gemini Coach Voice Promo Card */}
        <div className="bg-gradient-to-br from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
              <Mic className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Gemini Coach por Voz</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Habla directamente con tu entrenador mientras descansas. No teclees en el gimnasio: di por voz tus series, repeticiones y peso y se registrarán al instante.
            </p>
            <div className="mt-4 p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-300 italic">
              "Apunta press de banca 4 series de 10 reps con 80kg RPE 8"
            </div>
          </div>

          <button
            onClick={onOpenCoach}
            className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-extrabold text-sm hover:brightness-110 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Mic className="w-4 h-4" />
            <span>Hablar con el Asistente</span>
          </button>
        </div>
      </div>
    </div>
  );
};
