import React, { useState } from 'react';
import {
  Sparkles,
  Dumbbell,
  Target,
  Calendar,
  Save,
  Play,
  Brain,
  CheckCircle2,
  Trash2,
  Plus,
  Info,
  ShieldCheck,
  ChevronRight,
  Flame,
  Search,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Edit3,
  BookOpen,
  X,
  Layers,
} from 'lucide-react';
import { AthleteProfile, CustomRoutine, FitnessGoal, WorkoutExercise, MuscleGroup, SetEntry } from '../types/fitness';
import { EXERCISE_DATABASE } from '../data/exercises';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { substituteExercise, ExerciseSubstituteOption } from '../services/geminiCoach';

interface RoutineCreatorProps {
  userId: string;
  athleteProfile: AthleteProfile | null;
  savedRoutines?: CustomRoutine[];
  onSaveRoutine: (routine: CustomRoutine) => void;
  onDeleteRoutine?: (id: string) => void;
  onStartRoutineNow: (routine: CustomRoutine) => void;
}

type CreatorTab = 'ai' | 'manual' | 'saved';

export const RoutineCreator: React.FC<RoutineCreatorProps> = ({
  userId,
  athleteProfile,
  savedRoutines = [],
  onSaveRoutine,
  onDeleteRoutine,
  onStartRoutineNow,
}) => {
  const [activeTab, setActiveTab] = useState<CreatorTab>('ai');

  // AI Generator state
  const [goal, setGoal] = useState<FitnessGoal>(athleteProfile?.primaryGoal || 'volumen');
  const [splitPreference, setSplitPreference] = useState('auto');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [focusMuscles, setFocusMuscles] = useState<MuscleGroup[]>([]);
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  // Active working routine being edited
  const [activeRoutine, setActiveRoutine] = useState<CustomRoutine | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Exercise Picker Modal
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerMuscleFilter, setPickerMuscleFilter] = useState<string>('all');
  const [replaceTargetIndex, setReplaceTargetIndex] = useState<number | null>(null);

  // IA Substitute Modal
  const [substituteModalOpen, setSubstituteModalOpen] = useState(false);
  const [substituteLoading, setSubstituteLoading] = useState(false);
  const [substituteExerciseIndex, setSubstituteExerciseIndex] = useState<number | null>(null);
  const [substituteOptions, setSubstituteOptions] = useState<ExerciseSubstituteOption[]>([]);
  const [substituteReason, setSubstituteReason] = useState<string>('variación biomecánica y mayor estímulo muscular');

  const toggleFocusMuscle = (m: MuscleGroup) => {
    setFocusMuscles((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  // Generate Routine with Gemini Coach
  const handleGenerateWithGemini = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/coach/generate-routine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: athleteProfile,
          goal,
          daysPerWeek,
          splitPreference,
          focusMuscles,
          searchGrounding: useSearchGrounding,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al comunicarse con Gemini Coach');
      }

      const data = await res.json();
      const raw = data.routine;

      const formattedExercises: WorkoutExercise[] = (raw.exercises || []).map((ex: any, idx: number) => {
        const setsCount = Number(ex.defaultSets) || 3;
        const reps = Number(ex.defaultReps) || 8;
        const weight = Number(ex.defaultWeight) || 50;

        return {
          exerciseId: ex.exerciseId || `ex-${idx}`,
          exerciseName: ex.exerciseName || 'Ejercicio',
          muscleGroup: (ex.muscleGroup as MuscleGroup) || 'Pecho',
          sets: Array.from({ length: setsCount }, (_, sIdx) => ({
            id: `set-gen-${idx}-${sIdx}-${Date.now()}`,
            setNumber: sIdx + 1,
            weightKg: weight,
            reps,
            rpe: 8,
            completed: false,
            notes: ex.notes,
          })),
        };
      });

      const fullRoutine: CustomRoutine = {
        userId,
        name: raw.name || `Rutina Personalizada ${goal.toUpperCase()}`,
        goal,
        splitType: raw.splitType || splitPreference,
        daysPerWeek,
        scientificRationale:
          raw.scientificRationale ||
          'Prescripción ajustada con sobrecarga progresiva, volumen semanal de 12-16 series y control de fatiga neuromotora.',
        exercises: formattedExercises,
        createdAt: new Date().toISOString(),
      };

      setActiveRoutine(fullRoutine);
    } catch (err: any) {
      console.error('Error generando rutina:', err);
      setErrorMessage(err.message || 'Error al generar la rutina');
    } finally {
      setIsGenerating(false);
    }
  };

  // Start a fresh manual routine template
  const handleStartManualRoutine = () => {
    const blankRoutine: CustomRoutine = {
      userId,
      name: 'Nueva Rutina Personalizada',
      goal,
      splitType: 'Full Body',
      daysPerWeek: 4,
      scientificRationale: 'Rutina personalizada diseñada por el atleta con gestión individualizada de volumen y esfuerzo.',
      exercises: [
        {
          exerciseId: 'press-banca-barra',
          exerciseName: 'Press de Banca Plano con Barra',
          muscleGroup: 'Pecho',
          sets: [
            { id: `s-1-${Date.now()}`, setNumber: 1, weightKg: 60, reps: 8, rpe: 8, completed: false },
            { id: `s-2-${Date.now()}`, setNumber: 2, weightKg: 60, reps: 8, rpe: 8, completed: false },
            { id: `s-3-${Date.now()}`, setNumber: 3, weightKg: 60, reps: 8, rpe: 8.5, completed: false },
          ],
        },
      ],
      createdAt: new Date().toISOString(),
    };
    setActiveRoutine(blankRoutine);
  };

  // Save or Update Routine in Firestore
  const handleSaveToFirestore = async () => {
    if (!activeRoutine) return;
    if (activeRoutine.exercises.length === 0) {
      setErrorMessage('La rutina debe contener al menos un ejercicio.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const routineId = activeRoutine.id || `routine_${Date.now()}`;
      const path = `users/${userId}/customRoutines/${routineId}`;

      const payload = {
        ...activeRoutine,
        id: routineId,
        userId,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', userId, 'customRoutines', routineId), {
        ...payload,
        serverTimestamp: serverTimestamp(),
      });

      // Update local storage backup
      const cached = localStorage.getItem(`aurafit_custom_routines_${userId}`);
      let list: CustomRoutine[] = [];
      if (cached) {
        try {
          list = JSON.parse(cached);
        } catch (_) {}
      }
      const updatedList = [payload, ...list.filter((r) => r.id !== routineId)];
      localStorage.setItem(`aurafit_custom_routines_${userId}`, JSON.stringify(updatedList));

      setActiveRoutine(payload);
      onSaveRoutine(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } catch (err) {
      // Fallback save to local if offline
      const routineId = activeRoutine.id || `routine_local_${Date.now()}`;
      const payload = { ...activeRoutine, id: routineId };
      onSaveRoutine(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Routine from Firestore
  const handleDeleteRoutine = async (routineId?: string) => {
    if (!routineId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'customRoutines', routineId));
    } catch (_) {}

    // Update local cache
    const cached = localStorage.getItem(`aurafit_custom_routines_${userId}`);
    if (cached) {
      try {
        const list = JSON.parse(cached).filter((r: CustomRoutine) => r.id !== routineId);
        localStorage.setItem(`aurafit_custom_routines_${userId}`, JSON.stringify(list));
      } catch (_) {}
    }

    if (onDeleteRoutine) onDeleteRoutine(routineId);
    if (activeRoutine?.id === routineId) {
      setActiveRoutine(null);
    }
  };

  // Exercise Editing Handlers
  const handleUpdateExercise = (index: number, updates: Partial<WorkoutExercise>) => {
    if (!activeRoutine) return;
    const updatedExercises = [...activeRoutine.exercises];
    updatedExercises[index] = { ...updatedExercises[index], ...updates };
    setActiveRoutine({ ...activeRoutine, exercises: updatedExercises });
  };

  const handleRemoveExercise = (index: number) => {
    if (!activeRoutine) return;
    const updated = activeRoutine.exercises.filter((_, idx) => idx !== index);
    setActiveRoutine({ ...activeRoutine, exercises: updated });
  };

  const handleMoveExercise = (index: number, direction: 'up' | 'down') => {
    if (!activeRoutine) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= activeRoutine.exercises.length) return;

    const list = [...activeRoutine.exercises];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setActiveRoutine({ ...activeRoutine, exercises: list });
  };

  const handleAddSetToExercise = (exerciseIndex: number) => {
    if (!activeRoutine) return;
    const ex = activeRoutine.exercises[exerciseIndex];
    const lastSet = ex.sets[ex.sets.length - 1];
    const newSet: SetEntry = {
      id: `set-${Date.now()}-${ex.sets.length + 1}`,
      setNumber: ex.sets.length + 1,
      weightKg: lastSet ? lastSet.weightKg : 50,
      reps: lastSet ? lastSet.reps : 10,
      rpe: lastSet ? lastSet.rpe : 8,
      completed: false,
    };
    handleUpdateExercise(exerciseIndex, { sets: [...ex.sets, newSet] });
  };

  const handleRemoveSetFromExercise = (exerciseIndex: number, setIdx: number) => {
    if (!activeRoutine) return;
    const ex = activeRoutine.exercises[exerciseIndex];
    if (ex.sets.length <= 1) return; // Keep at least 1 set
    const updatedSets = ex.sets
      .filter((_, idx) => idx !== setIdx)
      .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
    handleUpdateExercise(exerciseIndex, { sets: updatedSets });
  };

  // Open Exercise Picker
  const handleOpenPicker = (targetIdx?: number) => {
    setReplaceTargetIndex(targetIdx !== undefined ? targetIdx : null);
    setPickerSearch('');
    setPickerMuscleFilter('all');
    setIsPickerOpen(true);
  };

  // Select Exercise from Picker
  const handleSelectExerciseFromPicker = (def: any) => {
    if (!activeRoutine) return;

    const newExercise: WorkoutExercise = {
      exerciseId: def.id,
      exerciseName: def.name,
      muscleGroup: def.muscleGroup,
      sets: [
        { id: `s-1-${Date.now()}`, setNumber: 1, weightKg: 50, reps: 10, rpe: 8, completed: false },
        { id: `s-2-${Date.now()}`, setNumber: 2, weightKg: 50, reps: 10, rpe: 8, completed: false },
        { id: `s-3-${Date.now()}`, setNumber: 3, weightKg: 50, reps: 10, rpe: 8, completed: false },
      ],
    };

    if (replaceTargetIndex !== null) {
      // Replace existing
      const updated = [...activeRoutine.exercises];
      updated[replaceTargetIndex] = {
        ...newExercise,
        sets: updated[replaceTargetIndex].sets, // preserve user configured sets
      };
      setActiveRoutine({ ...activeRoutine, exercises: updated });
    } else {
      // Append to end
      setActiveRoutine({
        ...activeRoutine,
        exercises: [...activeRoutine.exercises, newExercise],
      });
    }

    setIsPickerOpen(false);
    setReplaceTargetIndex(null);
  };

  // Open AI Substitute Modal
  const handleOpenSubstituteModal = async (exerciseIdx: number) => {
    if (!activeRoutine) return;
    const target = activeRoutine.exercises[exerciseIdx];
    setSubstituteExerciseIndex(exerciseIdx);
    setSubstituteOptions([]);
    setSubstituteModalOpen(true);
    setSubstituteLoading(true);

    try {
      const res = await substituteExercise({
        exerciseName: target.exerciseName,
        muscleGroup: target.muscleGroup,
        reason: substituteReason,
        profile: athleteProfile,
      });
      setSubstituteOptions(res.substitutes || []);
    } catch (err: any) {
      console.warn('Error fetching substitutes:', err);
    } finally {
      setSubstituteLoading(false);
    }
  };

  const handleApplySubstitute = (opt: ExerciseSubstituteOption) => {
    if (!activeRoutine || substituteExerciseIndex === null) return;
    const ex = activeRoutine.exercises[substituteExerciseIndex];
    handleUpdateExercise(substituteExerciseIndex, {
      exerciseName: opt.name,
      muscleGroup: (opt.muscleGroup as MuscleGroup) || ex.muscleGroup,
    });
    setSubstituteModalOpen(false);
    setSubstituteExerciseIndex(null);
  };

  const filteredPickerExercises = EXERCISE_DATABASE.filter((ex) => {
    const matchSearch =
      ex.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      ex.muscleGroup.toLowerCase().includes(pickerSearch.toLowerCase());
    const matchMuscle = pickerMuscleFilter === 'all' || ex.muscleGroup === pickerMuscleFilter;
    return matchSearch && matchMuscle;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              Inteligencia y Personalización de Rutinas
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20">
              <Search className="w-3 h-3" />
              Google Search Grounding
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Diseñador y Asesor de Rutinas Científicas
          </h1>

          <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
            Genera prescripciones con Gemini respaldadas por evidencia científica y Google Search, o diseña y edita tus propias plantillas con control total sobre ejercicios, series, RPE y descansos.
          </p>

          {/* Tab Selector */}
          <div className="pt-2 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('ai')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'ai'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700/60'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Asesoría Gemini IA</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('manual');
                if (!activeRoutine) handleStartManualRoutine();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700/60'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Creador Manual</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'saved'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-700/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Mis Plantillas Guardadas ({savedRoutines.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: AI GENERATOR */}
      {activeTab === 'ai' && (
        <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-3xl shadow-xl space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Goal */}
            <div>
              <label className="block text-zinc-300 font-bold mb-1.5 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                Objetivo Fisiológico
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value as FitnessGoal)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="volumen">Volumen (Hipertrofia & Tensión Mecánica)</option>
                <option value="definicion">Definición (Preservación de Fuerza)</option>
                <option value="recomposicion">Recomposición Corporal</option>
              </select>
            </div>

            {/* Days per week */}
            <div>
              <label className="block text-zinc-300 font-bold mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                Frecuencia Semanal
              </label>
              <select
                value={daysPerWeek}
                onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value={3}>3 Días por semana</option>
                <option value={4}>4 Días por semana (Recomendado)</option>
                <option value={5}>5 Días por semana</option>
                <option value={6}>6 Días por semana (Avanzados)</option>
              </select>
            </div>

            {/* Split */}
            <div>
              <label className="block text-zinc-300 font-bold mb-1.5 flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5 text-purple-400" />
                División Muscular
              </label>
              <select
                value={splitPreference}
                onChange={(e) => setSplitPreference(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white font-semibold focus:outline-none focus:border-emerald-500"
              >
                <option value="auto">Automática (Óptima según días)</option>
                <option value="Push-Pull-Legs">Push / Pull / Pierna</option>
                <option value="Torso-Pierna">Torso / Pierna (Upper-Lower)</option>
                <option value="Full Body">Full Body (Cuerpo Completo)</option>
              </select>
            </div>

            {/* Generate Action Button */}
            <div className="flex items-end">
              <button
                onClick={handleGenerateWithGemini}
                disabled={isGenerating}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-extrabold text-xs hover:brightness-110 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-1.5 animate-pulse">
                    <Brain className="w-4 h-4 animate-spin" />
                    Diseñando Biomecánica...
                  </span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generar con Gemini</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Muscle emphasis and Google Search toggle */}
          <div className="pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div>
              <label className="block text-zinc-400 font-semibold mb-1.5">
                Énfasis muscular prioritario (opcional):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core'] as MuscleGroup[]).map((m) => {
                  const isSelected = focusMuscles.includes(m);
                  return (
                    <button
                      key={m}
                      onClick={() => toggleFocusMuscle(m)}
                      className={`px-3 py-1 rounded-xl font-medium transition border cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-zinc-800/60 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-white'
                      }`}
                    >
                      {isSelected ? `✓ ${m}` : `+ ${m}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Search Grounding toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setUseSearchGrounding(!useSearchGrounding)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-semibold transition border cursor-pointer ${
                  useSearchGrounding
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-zinc-800/60 text-zinc-500 border-zinc-700/50'
                }`}
                title="Cruza la generación con las investigaciones más recientes en Google Search"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Grounding: {useSearchGrounding ? 'Activo' : 'Inactivo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SAVED ROUTINES LIBRARY */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span>Plantillas Guardadas en tu Cuenta</span>
            </h2>
            <button
              onClick={handleStartManualRoutine}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold hover:bg-emerald-500/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Nueva Plantilla</span>
            </button>
          </div>

          {savedRoutines.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center space-y-3">
              <Layers className="w-10 h-10 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No tienes rutinas personalizadas guardadas</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Usa la pestaña "Asesoría Gemini IA" o "Creador Manual" para diseñar tu primera rutina y guardarla en tu cuenta de Firestore.
              </p>
              <button
                onClick={() => setActiveTab('ai')}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition cursor-pointer"
              >
                Generar Rutina con Gemini
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedRoutines.map((routine) => (
                <div
                  key={routine.id}
                  className="bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700/80 rounded-2xl p-5 shadow-lg space-y-3 transition flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {routine.splitType}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {routine.daysPerWeek} días/sem • {routine.exercises.length} ejercicios
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-white">{routine.name}</h3>

                    <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                      {routine.scientificRationale}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {routine.exercises.slice(0, 4).map((ex, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-zinc-800/80 text-zinc-300 text-[10px] border border-zinc-700/50"
                        >
                          {ex.exerciseName}
                        </span>
                      ))}
                      {routine.exercises.length > 4 && (
                        <span className="px-1.5 py-0.5 text-zinc-500 text-[10px]">
                          +{routine.exercises.length - 4} más
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setActiveRoutine(routine);
                          setActiveTab('manual');
                        }}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Editar esta rutina"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleDeleteRoutine(routine.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition cursor-pointer"
                        title="Eliminar rutina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => onStartRoutineNow(routine)}
                      className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Entrenar Ahora</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>¡Rutina guardada y sincronizada en Firestore con éxito! Puedes usarla en cualquier momento.</span>
        </div>
      )}

      {/* ACTIVE ROUTINE WORKBENCH (FULL EDITABILITY) */}
      {activeRoutine && (
        <div className="bg-zinc-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl space-y-6 animate-fade-in">
          {/* Header & Meta Edit */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
            <div className="space-y-2 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  {activeRoutine.splitType}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  Objetivo: {activeRoutine.goal}
                </span>
                <span className="text-zinc-500 text-[10px]">
                  Modo Editor Interactivo
                </span>
              </div>

              {/* Editable Name */}
              <input
                type="text"
                value={activeRoutine.name}
                onChange={(e) => setActiveRoutine({ ...activeRoutine, name: e.target.value })}
                className="w-full text-xl sm:text-2xl font-extrabold text-white bg-transparent border-b border-zinc-700/80 focus:border-emerald-500 focus:outline-none pb-1"
                placeholder="Nombre de la Rutina..."
              />

              <div className="text-xs text-zinc-400">
                {activeRoutine.exercises.length} ejercicios seleccionados • {activeRoutine.daysPerWeek} días/semana
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => handleOpenPicker()}
                className="py-2.5 px-3.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-emerald-400 font-bold text-xs border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Ejercicio</span>
              </button>

              <button
                onClick={handleSaveToFirestore}
                disabled={isSaving}
                className="py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-xs border border-zinc-700 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>{isSaving ? 'Guardando...' : 'Guardar en Firestore'}</span>
              </button>

              <button
                onClick={() => onStartRoutineNow(activeRoutine)}
                className="py-2.5 px-5 rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-extrabold text-xs transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Entrenar Esta Rutina Ahora</span>
              </button>
            </div>
          </div>

          {/* Scientific Rationale Card */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-1.5 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>Fundamentación Biomecánica & Prescripción</span>
            </div>
            <textarea
              value={activeRoutine.scientificRationale}
              onChange={(e) => setActiveRoutine({ ...activeRoutine, scientificRationale: e.target.value })}
              rows={2}
              className="w-full bg-transparent text-zinc-300 text-xs leading-relaxed focus:outline-none resize-none border-b border-zinc-800/60 focus:border-emerald-500/40"
              placeholder="Justificación biomecánica..."
            />
          </div>

          {/* Exercise List (Draggable/Reorderable/Editable) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-emerald-400" />
                <span>Secuencia y Parámetros de Carga ({activeRoutine.exercises.length})</span>
              </h3>
              <span className="text-zinc-500 text-[11px]">
                Edita repeticiones, peso sugerido o sustituye con IA en cualquier momento
              </span>
            </div>

            <div className="space-y-3">
              {activeRoutine.exercises.map((ex, exIdx) => (
                <div
                  key={ex.exerciseId || exIdx}
                  className="p-4 sm:p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition space-y-3 text-xs"
                >
                  {/* Top Bar of Exercise */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center font-bold text-emerald-400 text-xs">
                        {exIdx + 1}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={ex.exerciseName}
                          onChange={(e) => handleUpdateExercise(exIdx, { exerciseName: e.target.value })}
                          className="font-extrabold text-white text-sm bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-emerald-500 focus:outline-none"
                        />
                        <div className="text-zinc-400 text-[11px]">{ex.muscleGroup}</div>
                      </div>
                    </div>

                    {/* Exercise Controls */}
                    <div className="flex items-center gap-1.5">
                      {/* AI Substitute Button */}
                      <button
                        onClick={() => handleOpenSubstituteModal(exIdx)}
                        className="px-2.5 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20 transition flex items-center gap-1 text-[11px] font-semibold cursor-pointer"
                        title="Buscar alternativa biomecánica con IA"
                      >
                        <RefreshCw className="w-3 h-3 text-purple-400" />
                        <span>Sustituir con IA</span>
                      </button>

                      {/* Replace from DB */}
                      <button
                        onClick={() => handleOpenPicker(exIdx)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white transition text-[11px] font-semibold cursor-pointer border border-zinc-700/60"
                        title="Cambiar ejercicio de la biblioteca"
                      >
                        Cambiar
                      </button>

                      {/* Reorder */}
                      <button
                        onClick={() => handleMoveExercise(exIdx, 'up')}
                        disabled={exIdx === 0}
                        className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Mover arriba"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveExercise(exIdx, 'down')}
                        disabled={exIdx === activeRoutine.exercises.length - 1}
                        className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 cursor-pointer"
                        title="Mover abajo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleRemoveExercise(exIdx)}
                        className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition cursor-pointer"
                        title="Eliminar de la rutina"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Sets Table */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900">
                    <div className="grid grid-cols-12 gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-1">
                      <div className="col-span-2">Serie</div>
                      <div className="col-span-3">Peso (kg)</div>
                      <div className="col-span-3">Reps</div>
                      <div className="col-span-3">RPE / RIR</div>
                      <div className="col-span-1 text-center">Acción</div>
                    </div>

                    {ex.sets.map((set, sIdx) => (
                      <div
                        key={set.id || sIdx}
                        className="grid grid-cols-12 gap-2 items-center bg-zinc-900/80 px-2 py-1.5 rounded-xl border border-zinc-800/80"
                      >
                        <div className="col-span-2 font-mono font-bold text-zinc-300">
                          #{set.setNumber}
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={set.weightKg}
                            onChange={(e) => {
                              const newSets = [...ex.sets];
                              newSets[sIdx] = { ...newSets[sIdx], weightKg: Number(e.target.value) };
                              handleUpdateExercise(exIdx, { sets: newSets });
                            }}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-cyan-400 font-mono font-bold text-center focus:outline-none focus:border-cyan-500"
                          />
                        </div>

                        <div className="col-span-3">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={set.reps}
                            onChange={(e) => {
                              const newSets = [...ex.sets];
                              newSets[sIdx] = { ...newSets[sIdx], reps: Number(e.target.value) };
                              handleUpdateExercise(exIdx, { sets: newSets });
                            }}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-emerald-400 font-mono font-bold text-center focus:outline-none focus:border-emerald-500"
                          />
                        </div>

                        <div className="col-span-3">
                          <select
                            value={set.rpe}
                            onChange={(e) => {
                              const newSets = [...ex.sets];
                              newSets[sIdx] = { ...newSets[sIdx], rpe: Number(e.target.value) };
                              handleUpdateExercise(exIdx, { sets: newSets });
                            }}
                            className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1 text-purple-300 font-bold text-xs text-center focus:outline-none focus:border-purple-500"
                          >
                            <option value={7}>RPE 7 (RIR 3)</option>
                            <option value={8}>RPE 8 (RIR 2)</option>
                            <option value={8.5}>RPE 8.5 (RIR 1.5)</option>
                            <option value={9}>RPE 9 (RIR 1)</option>
                            <option value={9.5}>RPE 9.5 (RIR 0.5)</option>
                            <option value={10}>RPE 10 (Fallo)</option>
                          </select>
                        </div>

                        <div className="col-span-1 text-center">
                          <button
                            onClick={() => handleRemoveSetFromExercise(exIdx, sIdx)}
                            disabled={ex.sets.length <= 1}
                            className="p-1 rounded text-zinc-500 hover:text-red-400 disabled:opacity-20 cursor-pointer"
                            title="Quitar serie"
                          >
                            <X className="w-3.5 h-3.5 mx-auto" />
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() => handleAddSetToExercise(exIdx)}
                      className="w-full py-1.5 rounded-xl bg-zinc-900 border border-dashed border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Añadir Serie</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXERCISE PICKER FROM DATABASE */}
      {isPickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Dumbbell className="w-4 h-4 text-emerald-400" />
                  <span>{replaceTargetIndex !== null ? 'Cambiar Ejercicio' : 'Añadir Ejercicio a la Rutina'}</span>
                </h3>
                <p className="text-xs text-zinc-400">
                  Selecciona de la biblioteca biomecánica de AuraFit
                </p>
              </div>
              <button
                onClick={() => setIsPickerOpen(false)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search & Muscle Filters */}
            <div className="p-4 border-b border-zinc-800 space-y-3 bg-zinc-950/50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Buscar ejercicio por nombre o músculo..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex flex-wrap gap-1.5 text-xs">
                {['all', 'Pecho', 'Espalda', 'Piernas', 'Hombros', 'Brazos', 'Core'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPickerMuscleFilter(m)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border cursor-pointer ${
                      pickerMuscleFilter === m
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    {m === 'all' ? 'Todos' : m}
                  </button>
                ))}
              </div>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredPickerExercises.map((def) => (
                <div
                  key={def.id}
                  onClick={() => handleSelectExerciseFromPicker(def)}
                  className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 hover:border-emerald-500/50 hover:bg-zinc-800/40 transition flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white text-xs group-hover:text-emerald-400 transition">
                      {def.name}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {def.muscleGroup} • {def.equipment} • {def.movementType}
                    </div>
                  </div>
                  <button className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold group-hover:bg-emerald-500 group-hover:text-zinc-950 transition">
                    Seleccionar
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IA EXERCISE SUBSTITUTE */}
      {substituteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-purple-500/40 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-extrabold text-white">
                  Sustituir Ejercicio con Evidencia IA
                </h3>
              </div>
              <button
                onClick={() => setSubstituteModalOpen(false)}
                className="p-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {substituteLoading ? (
              <div className="py-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
                <p className="text-xs text-zinc-300 font-semibold">
                  Gemini está buscando alternativas biomecánicas óptimas en Google Search...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-zinc-400">
                  Selecciona una de las alternativas biomecánicas respaldadas por la evidencia científica:
                </p>

                {substituteOptions.length === 0 ? (
                  <div className="p-4 bg-zinc-950 rounded-2xl text-xs text-zinc-400 text-center">
                    No se encontraron sustitutos directos. Intenta con la biblioteca de ejercicios.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {substituteOptions.map((opt, oIdx) => (
                      <div
                        key={oIdx}
                        className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-purple-500/50 transition space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-bold text-white">{opt.name}</div>
                            <div className="text-[11px] text-purple-300 font-medium">
                              {opt.muscleGroup} • Equipamiento: {opt.equipment}
                            </div>
                          </div>
                          <button
                            onClick={() => handleApplySubstitute(opt)}
                            className="px-3 py-1.5 rounded-xl bg-purple-500 text-zinc-950 font-bold text-xs hover:bg-purple-400 transition cursor-pointer"
                          >
                            Aplicar
                          </button>
                        </div>
                        <p className="text-xs text-zinc-400 leading-relaxed">
                          {opt.rationale}
                        </p>
                        <div className="text-[11px] text-emerald-400 font-semibold">
                          💡 Ventaja: {opt.advantage}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
