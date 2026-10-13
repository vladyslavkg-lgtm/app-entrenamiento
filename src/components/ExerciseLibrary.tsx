import React, { useState, useMemo } from 'react';
import { Search, Dumbbell, ShieldCheck, Info, X, Sparkles, BookOpen } from 'lucide-react';
import { EXERCISE_DATABASE } from '../data/exercises';
import { ExerciseDefinition, MuscleGroup } from '../types/fitness';

export const ExerciseLibrary: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroup | 'Todos'>('Todos');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDefinition | null>(null);

  const groups: (MuscleGroup | 'Todos')[] = [
    'Todos',
    'Pecho',
    'Espalda',
    'Piernas',
    'Hombros',
    'Brazos',
    'Core',
  ];

  const filteredExercises = useMemo(() => {
    return EXERCISE_DATABASE.filter((e) => {
      const matchGroup = selectedGroup === 'Todos' || e.muscleGroup === selectedGroup;
      const matchSearch =
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.muscleGroup.toLowerCase().includes(search.toLowerCase()) ||
        e.secondaryMuscles.some((m) => m.toLowerCase().includes(search.toLowerCase()));
      return matchGroup && matchSearch;
    });
  }, [search, selectedGroup]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            Biblioteca Científica de Ejercicios
          </h2>
          <p className="text-xs text-zinc-400">
            Biometría, ejecución estricta, selección de rango de RIR y sobrecarga progresiva.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por ejercicio o músculo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Muscle Group Filter Badges */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {groups.map((group) => (
          <button
            key={group}
            onClick={() => setSelectedGroup(group)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
              selectedGroup === group
                ? 'bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800'
            }`}
          >
            {group}
          </button>
        ))}
      </div>

      {/* Grid of Exercises */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.map((exercise) => (
          <div
            key={exercise.id}
            onClick={() => setSelectedExercise(exercise)}
            className="bg-zinc-900/90 hover:bg-zinc-850 border border-zinc-800 hover:border-emerald-500/40 p-5 rounded-2xl transition cursor-pointer shadow-lg group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {exercise.muscleGroup}
                </span>
                <span className="text-[10px] text-zinc-500 font-medium">
                  {exercise.equipment} • {exercise.movementType}
                </span>
              </div>
              <h3 className="text-base font-bold text-white group-hover:text-emerald-300 transition">
                {exercise.name}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                {exercise.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs">
              <span className="text-zinc-500 font-mono">{exercise.targetRIR}</span>
              <span className="text-emerald-400 font-semibold group-hover:underline flex items-center gap-1">
                Ver técnica ➔
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Exercise Detail Modal */}
      {selectedExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-zinc-800 mb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {selectedExercise.muscleGroup}
                </span>
                <h3 className="text-xl font-extrabold text-white mt-1.5">
                  {selectedExercise.name}
                </h3>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Tipo: {selectedExercise.movementType} • Equipamiento: {selectedExercise.equipment}
                </div>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-1">
                  Descripción biomecánica
                </h4>
                <p className="text-zinc-300 text-xs leading-relaxed">
                  {selectedExercise.description}
                </p>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-1">
                  Músculos secundarios involucrados
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedExercise.secondaryMuscles.map((m) => (
                    <span
                      key={m}
                      className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-300 font-medium border border-zinc-700/60"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-2">
                  Técnica de ejecución paso a paso
                </h4>
                <ol className="space-y-2 text-xs text-zinc-300 list-decimal list-inside bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
                  {selectedExercise.technique.map((step, idx) => (
                    <li key={idx} className="leading-relaxed">
                      <span className="text-zinc-200">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Consejo basado en evidencia científica</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  {selectedExercise.scientificTips}
                </p>
                <div className="text-emerald-400 font-semibold pt-1">
                  Esfuerzo objetivo: {selectedExercise.targetRIR}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setSelectedExercise(null)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-white font-bold text-xs transition"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
