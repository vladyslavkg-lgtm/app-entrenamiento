import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Dumbbell,
  FileSpreadsheet,
  Trash2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flame,
  CheckCircle2,
  Edit3,
  Save,
  X,
} from 'lucide-react';
import { WorkoutSession } from '../types/fitness';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';

interface WorkoutHistoryProps {
  userId: string;
  workouts: WorkoutSession[];
  onDeleteWorkout: (id: string) => void;
  onUpdateWorkout?: (workout: WorkoutSession) => void;
  onRequestExportSheets: (workout: WorkoutSession) => void;
  onRequestScheduleCalendar: (workout: WorkoutSession) => void;
}

export const WorkoutHistory: React.FC<WorkoutHistoryProps> = ({
  userId,
  workouts,
  onDeleteWorkout,
  onUpdateWorkout,
  onRequestExportSheets,
  onRequestScheduleCalendar,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(
    workouts.length > 0 && workouts[0].id ? workouts[0].id : null
  );
  const [editingWorkoutId, setEditingWorkoutId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDelete = async (workoutId?: string) => {
    if (!workoutId) return;
    if (confirmDeleteId !== workoutId) {
      setConfirmDeleteId(workoutId);
      setTimeout(() => setConfirmDeleteId(null), 4000);
      return;
    }
    setConfirmDeleteId(null);
    try {
      const path = `users/${userId}/workouts/${workoutId}`;
      await deleteDoc(doc(db, 'users', userId, 'workouts', workoutId));
      onDeleteWorkout(workoutId);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/workouts/${workoutId}`);
    }
  };

  const handleStartEdit = (workout: WorkoutSession) => {
    setEditingWorkoutId(workout.id || null);
    setEditTitle(workout.title);
    setEditNotes(workout.notes || '');
  };

  const handleSaveEdit = async (workout: WorkoutSession) => {
    if (!workout.id) return;
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'users', userId, 'workouts', workout.id), {
        title: editTitle.trim() || workout.title,
        notes: editNotes.trim(),
      });
      const updated = {
        ...workout,
        title: editTitle.trim() || workout.title,
        notes: editNotes.trim(),
      };
      if (onUpdateWorkout) onUpdateWorkout(updated);
      setEditingWorkoutId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}/workouts/${workout.id}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (workouts.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-10 text-center space-y-3">
        <div className="w-16 h-16 rounded-3xl bg-zinc-800/80 mx-auto flex items-center justify-center text-zinc-500">
          <Calendar className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white">No hay entrenamientos guardados</h3>
        <p className="text-sm text-zinc-400 max-w-sm mx-auto">
          Inicia una sesión en la pestaña "Entrenar" o usa a Gemini Coach por voz para registrar tu primer entrenamiento.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Historial de Entrenamientos</h2>
          <p className="text-xs text-zinc-400">
            {workouts.length} {workouts.length === 1 ? 'sesión completada' : 'sesiones completadas'}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {workouts.map((workout) => {
          const isExpanded = expandedId === workout.id;
          const formattedDate = new Date(workout.date).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          return (
            <div
              key={workout.id}
              className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-lg transition"
            >
              {/* Summary Header */}
              <div
                onClick={() => workout.id && toggleExpand(workout.id)}
                className="p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-zinc-800/50 transition"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <Dumbbell className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{workout.title}</h3>
                    <div className="text-xs text-zinc-400 capitalize">{formattedDate}</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Volumen</div>
                    <div className="font-mono text-sm sm:text-base font-bold text-emerald-400">
                      {workout.totalVolumeKg.toLocaleString()} kg
                    </div>
                  </div>

                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] uppercase text-zinc-500 font-semibold">Duración</div>
                    <div className="font-mono text-sm text-zinc-300">
                      {workout.durationMinutes} min
                    </div>
                  </div>

                  <div className="text-zinc-400">
                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Breakdown */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-2 border-t border-zinc-800/80 space-y-4 bg-zinc-950/40">
                  {/* Exercises Details */}
                  <div className="space-y-3">
                    {workout.exercises.map((ex, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 space-y-2"
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-white">{ex.exerciseName}</span>
                          <span className="text-zinc-500">{ex.muscleGroup}</span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {ex.sets.map((s) => (
                            <div
                              key={s.id}
                              className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border ${
                                s.completed
                                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                              }`}
                            >
                              S{s.setNumber}: {s.reps}r @ {s.weightKg}kg [RPE {s.rpe}]
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Edit Form if editing */}
                  {editingWorkoutId === workout.id ? (
                    <div className="p-3.5 rounded-xl bg-zinc-900 border border-emerald-500/40 space-y-3 animate-fade-in">
                      <div className="text-xs font-bold text-emerald-400">Editar Detalles de la Sesión:</div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Título del entrenamiento:</label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Notas / Sensaciones:</label>
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          rows={2}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveEdit(workout)}
                          disabled={isUpdating}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-zinc-950 font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>{isUpdating ? 'Guardando...' : 'Guardar Cambios'}</span>
                        </button>
                        <button
                          onClick={() => setEditingWorkoutId(null)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white text-xs cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    workout.notes && (
                      <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 italic">
                        "{workout.notes}"
                      </div>
                    )
                  )}

                  {/* Action Buttons: Sheets, Calendar, Edit, Delete */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleStartEdit(workout)}
                        className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer border border-zinc-700/60"
                        title="Editar notas o título"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => onRequestExportSheets(workout)}
                        className="py-2 px-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Exportar a Google Sheets"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Exportar a Sheets</span>
                      </button>

                      <button
                        onClick={() => onRequestScheduleCalendar(workout)}
                        className="py-2 px-3.5 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/25 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                        title="Agendar repetición en Google Calendar"
                      >
                        <Calendar className="w-4 h-4" />
                        <span>Agendar en Calendar</span>
                      </button>

                      {workout.spreadsheetUrl && (
                        <a
                          href={workout.spreadsheetUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="py-2 px-3 rounded-xl bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Ver en Sheets</span>
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(workout.id)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                        confirmDeleteId === workout.id
                          ? 'bg-red-500/20 text-red-400 border border-red-500/40 font-bold'
                          : 'text-zinc-500 hover:text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{confirmDeleteId === workout.id ? '¿Seguro? Toca para borrar' : 'Eliminar'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
