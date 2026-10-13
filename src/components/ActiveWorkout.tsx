import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle,
  Plus,
  Trash2,
  Clock,
  Dumbbell,
  FileSpreadsheet,
  Calendar,
  Save,
  Flame,
  ArrowRight,
  Sparkles,
  Info,
  Timer,
} from 'lucide-react';
import { ROUTINE_TEMPLATES, RoutineTemplate, buildWorkoutExercisesFromTemplate } from '../data/routines';
import { EXERCISE_DATABASE } from '../data/exercises';
import { WorkoutSession, WorkoutExercise, SetEntry, ExerciseDefinition, CustomRoutine } from '../types/fitness';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface ActiveWorkoutProps {
  userId: string;
  onWorkoutSaved: (session: WorkoutSession) => void;
  onRequestExportSheets: (session: WorkoutSession) => void;
  onRequestScheduleCalendar: (session: WorkoutSession) => void;
  onOpenTimer: (seconds?: number) => void;
  voiceLoggedData?: { exercise: string; sets: number; reps: number; weight: number; rpe?: number } | null;
  customRoutines?: CustomRoutine[];
  activePresetRoutine?: CustomRoutine | null;
  onClearPresetRoutine?: () => void;
}

export const ActiveWorkout: React.FC<ActiveWorkoutProps> = ({
  userId,
  onWorkoutSaved,
  onRequestExportSheets,
  onRequestScheduleCalendar,
  onOpenTimer,
  voiceLoggedData,
  customRoutines = [],
  activePresetRoutine = null,
  onClearPresetRoutine,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<RoutineTemplate | null>(null);
  const [sessionTitle, setSessionTitle] = useState('Entrenamiento Libre');
  const [routineType, setRoutineType] = useState<any>('Push');
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [validationWarning, setValidationWarning] = useState<string | null>(null);

  // Handle active preset routine directly triggered from creator or external
  useEffect(() => {
    if (activePresetRoutine) {
      setSessionTitle(activePresetRoutine.name);
      setRoutineType(activePresetRoutine.splitType || 'Personalizada');
      setExercises(activePresetRoutine.exercises);
      setIsSessionActive(true);
      setStartTime(Date.now());
      setElapsedSeconds(0);
      if (onClearPresetRoutine) onClearPresetRoutine();
    }
  }, [activePresetRoutine]);

  // Handle voice logging automatically
  useEffect(() => {
    if (voiceLoggedData) {
      if (!isSessionActive) {
        setIsSessionActive(true);
        setStartTime(Date.now());
      }

      setExercises((prev) => {
        const matchingIndex = prev.findIndex((e) =>
          e.exerciseName.toLowerCase().includes(voiceLoggedData.exercise.toLowerCase())
        );

        const newSets: SetEntry[] = Array.from({ length: voiceLoggedData.sets }, (_, i) => ({
          id: `set-voice-${Date.now()}-${i}`,
          setNumber: i + 1,
          weightKg: voiceLoggedData.weight,
          reps: voiceLoggedData.reps,
          rpe: voiceLoggedData.rpe || 8,
          completed: true,
        }));

        if (matchingIndex >= 0) {
          const updated = [...prev];
          const curr = updated[matchingIndex];
          const existingMaxSet = curr.sets.length;
          const appended = newSets.map((s, idx) => ({
            ...s,
            setNumber: existingMaxSet + idx + 1,
          }));
          updated[matchingIndex] = {
            ...curr,
            sets: [...curr.sets, ...appended],
          };
          return updated;
        } else {
          // Find muscle group from DB
          const foundDef = EXERCISE_DATABASE.find((e) =>
            e.name.toLowerCase().includes(voiceLoggedData.exercise.toLowerCase())
          );
          return [
            ...prev,
            {
              exerciseId: foundDef ? foundDef.id : `custom-${Date.now()}`,
              exerciseName: voiceLoggedData.exercise,
              muscleGroup: foundDef ? foundDef.muscleGroup : 'Pecho',
              sets: newSets,
            },
          ];
        }
      });
    }
  }, [voiceLoggedData]);

  // Stopwatch timer
  useEffect(() => {
    let interval: any = null;
    if (isSessionActive && startTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive, startTime]);

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startFromTemplate = (template: RoutineTemplate) => {
    setSelectedTemplate(template);
    setSessionTitle(template.name);
    setRoutineType(template.type);
    setExercises(buildWorkoutExercisesFromTemplate(template));
    setIsSessionActive(true);
    setStartTime(Date.now());
    setElapsedSeconds(0);
  };

  const startFreeSession = () => {
    setSelectedTemplate(null);
    setSessionTitle('Sesión Libre de Fuerza');
    setRoutineType('Sesión Libre');
    setExercises([]);
    setIsSessionActive(true);
    setStartTime(Date.now());
    setElapsedSeconds(0);
  };

  // Set management
  const updateSet = (exerciseIdx: number, setIdx: number, field: keyof SetEntry, val: any) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], [field]: val };
      ex.sets = sets;
      updated[exerciseIdx] = ex;
      return updated;
    });
  };

  const toggleSetCompleted = (exerciseIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIdx] };
      const sets = [...ex.sets];
      const isDone = !sets[setIdx].completed;
      sets[setIdx] = { ...sets[setIdx], completed: isDone };
      ex.sets = sets;
      updated[exerciseIdx] = ex;
      return updated;
    });
    // Trigger rest timer on completed set
    onOpenTimer(90);
  };

  const addSetToExercise = (exerciseIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIdx] };
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSetNumber = ex.sets.length + 1;
      const newSet: SetEntry = {
        id: `set-${Date.now()}-${newSetNumber}`,
        setNumber: newSetNumber,
        weightKg: lastSet ? lastSet.weightKg : 50,
        reps: lastSet ? lastSet.reps : 10,
        rpe: lastSet ? lastSet.rpe : 8,
        completed: false,
      };
      ex.sets = [...ex.sets, newSet];
      updated[exerciseIdx] = ex;
      return updated;
    });
  };

  const removeSetFromExercise = (exerciseIdx: number, setIdx: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const ex = { ...updated[exerciseIdx] };
      ex.sets = ex.sets.filter((_, i) => i !== setIdx).map((s, idx) => ({ ...s, setNumber: idx + 1 }));
      updated[exerciseIdx] = ex;
      return updated;
    });
  };

  const removeExercise = (exerciseIdx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== exerciseIdx));
  };

  const addExerciseFromCatalog = (def: ExerciseDefinition) => {
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: def.id,
        exerciseName: def.name,
        muscleGroup: def.muscleGroup,
        sets: [
          {
            id: `set-${def.id}-1-${Date.now()}`,
            setNumber: 1,
            weightKg: 60,
            reps: 10,
            rpe: 8,
            completed: false,
          },
          {
            id: `set-${def.id}-2-${Date.now()}`,
            setNumber: 2,
            weightKg: 60,
            reps: 10,
            rpe: 8,
            completed: false,
          },
          {
            id: `set-${def.id}-3-${Date.now()}`,
            setNumber: 3,
            weightKg: 60,
            reps: 10,
            rpe: 8,
            completed: false,
          },
        ],
      },
    ]);
    setShowAddExerciseModal(false);
  };

  // Calculations
  const totalVolumeKg = exercises.reduce((acc, ex) => {
    return (
      acc +
      ex.sets
        .filter((s) => s.completed)
        .reduce((sum, s) => sum + s.weightKg * s.reps, 0)
    );
  }, 0);

  const completedSetsCount = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );

  const totalSetsCount = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);

  // Epley 1RM formula
  const calculate1RM = (weight: number, reps: number) => {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    return Math.round(weight * (1 + reps / 30));
  };

  // Save Workout to Firestore
  const finishAndSaveWorkout = async () => {
    if (exercises.length === 0) {
      setValidationWarning('Añade al menos un ejercicio a la sesión antes de guardar.');
      setTimeout(() => setValidationWarning(null), 6000);
      return;
    }
    setValidationWarning(null);

    setIsSaving(true);
    try {
      const workoutPayload: WorkoutSession = {
        userId,
        title: sessionTitle || 'Entrenamiento AuraFit',
        routineType,
        date: new Date().toISOString(),
        durationMinutes: Math.max(1, Math.round(elapsedSeconds / 60)),
        totalVolumeKg,
        notes: notes.trim(),
        exercises,
        createdAt: new Date().toISOString(),
      };

      const path = `users/${userId}/workouts`;
      const docRef = await addDoc(collection(db, path), {
        ...workoutPayload,
        serverCreated: serverTimestamp(),
      });

      workoutPayload.id = docRef.id;

      onWorkoutSaved(workoutPayload);
      setIsSessionActive(false);
      setStartTime(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/workouts`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Session Header / Controls */}
      {!isSessionActive ? (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-xl">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
                <Dumbbell className="w-3.5 h-3.5" />
                Modo Sesión Activa
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Elige tu rutina o inicia una sesión libre
              </h1>
              <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
                Selecciona una plantilla basada en principios de volumen óptimo y recuperación muscular, o diseña tu sesión en vivo con soporte de voz.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={startFreeSession}
                  className="px-5 py-3 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 text-sm font-bold transition flex items-center gap-2 border border-zinc-700/80 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  Sesión Libre
                </button>
              </div>
            </div>
          </div>

          {/* Rutinas Personalizadas / Generadas por IA */}
          {customRoutines.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Mis Rutinas Personalizadas con IA
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customRoutines.map((routine) => (
                  <div
                    key={routine.id}
                    className="bg-zinc-900/90 hover:bg-zinc-800/80 border border-emerald-500/30 p-5 rounded-2xl transition duration-200 flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {routine.splitType}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300">
                          {routine.goal}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                        {routine.name}
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed line-clamp-2">
                        {routine.scientificRationale}
                      </p>
                      <div className="text-xs text-zinc-500 mt-2 font-mono">
                        {routine.exercises.length} ejercicios programados
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setSessionTitle(routine.name);
                        setRoutineType(routine.splitType || 'Personalizada');
                        setExercises(routine.exercises);
                        setIsSessionActive(true);
                        setStartTime(Date.now());
                        setElapsedSeconds(0);
                      }}
                      className="mt-5 w-full py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/15 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Empezar Esta Rutina</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plantillas Clásicas */}
          <div>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-emerald-400" />
              Plantillas Científicas de Hipertrofia
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ROUTINE_TEMPLATES.map((tpl) => (
                <div
                  key={tpl.id}
                  className="bg-zinc-900/90 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/40 p-5 rounded-2xl transition duration-200 flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tpl.type}
                      </span>
                      <span className="text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        ~{tpl.estimatedMinutes} min
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                      {tpl.name}
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                      {tpl.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {tpl.focusMuscles.map((m) => (
                        <span
                          key={m}
                          className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => startFromTemplate(tpl)}
                    className="mt-5 w-full py-2.5 rounded-xl bg-emerald-500 text-zinc-950 font-bold text-xs hover:bg-emerald-400 transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/15 cursor-pointer"
                  >
                    <span>Empezar Rutina</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ACTIVE WORKOUT INTERFACE */
        <div className="space-y-6 animate-fade-in">
          {/* Top Live Stats Bar */}
          <div className="sticky top-16 z-30 bg-zinc-900/95 backdrop-blur-md border border-zinc-800/90 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="text-base sm:text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-zinc-700 focus:border-emerald-500 focus:outline-none"
                />
                <div className="text-xs text-emerald-400 font-medium">
                  {routineType} • En curso
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 sm:gap-6">
              {/* Cronómetro */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-base sm:text-lg font-bold text-white">
                  {formatTimer(elapsedSeconds)}
                </span>
              </div>

              {/* Volumen Acumulado */}
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Volumen Total
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-emerald-400">
                  {totalVolumeKg.toLocaleString()} kg
                </div>
              </div>

              {/* Series Completadas */}
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                  Series
                </div>
                <div className="font-mono text-sm sm:text-base font-bold text-white">
                  {completedSetsCount}/{totalSetsCount}
                </div>
              </div>

              {/* Temporizador rápido */}
              <button
                onClick={() => onOpenTimer(90)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 border border-zinc-700 transition"
                title="Abrir temporizador de descanso"
              >
                <Timer className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Exercise List */}
          <div className="space-y-5">
            {exercises.map((exercise, exIdx) => (
              <div
                key={exercise.exerciseId + exIdx}
                className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 shadow-lg space-y-4"
              >
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                      {exIdx + 1}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{exercise.exerciseName}</h3>
                      <span className="text-xs text-zinc-400">{exercise.muscleGroup}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removeExercise(exIdx)}
                    className="text-zinc-500 hover:text-red-400 p-1.5 transition"
                    title="Eliminar ejercicio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Sets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-zinc-400 border-b border-zinc-800/80 uppercase tracking-wider font-semibold">
                        <th className="py-2 px-2 text-center w-12">Serie</th>
                        <th className="py-2 px-3 text-center">Peso (kg)</th>
                        <th className="py-2 px-3 text-center">Reps</th>
                        <th className="py-2 px-2 text-center">RPE (1-10)</th>
                        <th className="py-2 px-2 text-center">1RM Est.</th>
                        <th className="py-2 px-3 text-center w-14">Listo</th>
                        <th className="py-2 px-1 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {exercise.sets.map((set, setIdx) => {
                        const estimated1RM = calculate1RM(set.weightKg, set.reps);
                        return (
                          <tr
                            key={set.id}
                            className={`transition ${
                              set.completed ? 'bg-emerald-950/20' : 'hover:bg-zinc-800/40'
                            }`}
                          >
                            <td className="py-2.5 px-2 text-center font-bold text-zinc-400">
                              {set.setNumber}
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                step="0.5"
                                value={set.weightKg}
                                onChange={(e) =>
                                  updateSet(exIdx, setIdx, 'weightKg', parseFloat(e.target.value) || 0)
                                }
                                className="w-20 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <input
                                type="number"
                                value={set.reps}
                                onChange={(e) =>
                                  updateSet(exIdx, setIdx, 'reps', parseInt(e.target.value, 10) || 0)
                                }
                                className="w-16 text-center bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-2.5 px-2 text-center">
                              <select
                                value={set.rpe}
                                onChange={(e) =>
                                  updateSet(exIdx, setIdx, 'rpe', parseFloat(e.target.value))
                                }
                                className="bg-zinc-800 border border-zinc-700 rounded-lg py-1.5 px-2 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                              >
                                {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((val) => (
                                  <option key={val} value={val}>
                                    @{val}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="py-2.5 px-2 text-center font-mono text-zinc-400 text-xs">
                              {estimated1RM > 0 ? `${estimated1RM} kg` : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => toggleSetCompleted(exIdx, setIdx)}
                                className={`p-1.5 rounded-lg transition ${
                                  set.completed
                                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-md shadow-emerald-500/20'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                }`}
                                title={set.completed ? 'Serie completada' : 'Marcar como completada'}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            </td>
                            <td className="py-2.5 px-1 text-center">
                              <button
                                onClick={() => removeSetFromExercise(exIdx, setIdx)}
                                className="text-zinc-600 hover:text-red-400 p-1"
                                title="Quitar serie"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    onClick={() => addSetToExercise(exIdx)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Serie
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add Exercise Button */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="py-3 px-5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-emerald-400 text-sm font-bold flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              Añadir Ejercicio de la Biblioteca
            </button>
          </div>

          {/* Notes Section */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4">
            <label className="block text-xs font-semibold text-zinc-400 mb-2">
              Notas del entrenamiento / Sensaciones (RPE global, molestias, congestión)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej: Excelente congestión en pectoral, aumenté 2.5kg en press inclinado..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {validationWarning && (
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>{validationWarning}</span>
            </div>
          )}

          {/* Finish & Sync Action Bar */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="text-sm font-bold text-white">¿Sesión completada?</div>
              <div className="text-xs text-zinc-400">
                Guarda los datos en Firestore y sincronízalos opcionalmente con Google Sheets o Calendar.
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={finishAndSaveWorkout}
                disabled={isSaving}
                className="py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-extrabold text-sm hover:brightness-110 shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? (
                  <span className="animate-spin text-sm">⏳ Guardando...</span>
                ) : (
                  <>
                    <Save className="w-4 h-4 stroke-[3]" />
                    Finalizar y Guardar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Add Exercise */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-emerald-400" />
                Seleccionar Ejercicio
              </h3>
              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              placeholder="Buscar por nombre o músculo..."
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 mb-4 focus:outline-none focus:border-emerald-500"
            />

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {EXERCISE_DATABASE.filter(
                (e) =>
                  e.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                  e.muscleGroup.toLowerCase().includes(exerciseSearch.toLowerCase())
              ).map((def) => (
                <div
                  key={def.id}
                  onClick={() => addExerciseFromCatalog(def)}
                  className="p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 hover:border-emerald-500/50 transition cursor-pointer flex items-center justify-between group"
                >
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-emerald-300">
                      {def.name}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {def.muscleGroup} • {def.equipment} • {def.movementType}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
