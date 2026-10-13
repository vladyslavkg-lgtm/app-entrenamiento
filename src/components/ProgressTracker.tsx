import React, { useState } from 'react';
import { Scale, Ruler, Plus, Calendar, TrendingDown, TrendingUp, CheckCircle, Trash2 } from 'lucide-react';
import { BodyMetric } from '../types/fitness';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';

interface ProgressTrackerProps {
  userId: string;
  metrics: BodyMetric[];
  onAddMetric: (metric: BodyMetric) => void;
  onDeleteMetric: (id: string) => void;
}

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  userId,
  metrics,
  onAddMetric,
  onDeleteMetric,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [weightKg, setWeightKg] = useState<string>('');
  const [chestCm, setChestCm] = useState<string>('');
  const [waistCm, setWaistCm] = useState<string>('');
  const [bicepCm, setBicepCm] = useState<string>('');
  const [thighCm, setThighCm] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const w = parseFloat(weightKg);
    if (!w || isNaN(w) || w <= 0) {
      setFormError('Ingresa un peso corporal válido mayor que cero.');
      return;
    }
    setFormError(null);

    setIsSubmitting(true);
    try {
      const newMetric: BodyMetric = {
        userId,
        date: new Date().toISOString(),
        weightKg: w,
        chestCm: chestCm ? parseFloat(chestCm) : undefined,
        waistCm: waistCm ? parseFloat(waistCm) : undefined,
        bicepCm: bicepCm ? parseFloat(bicepCm) : undefined,
        thighCm: thighCm ? parseFloat(thighCm) : undefined,
        notes: notes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const path = `users/${userId}/metrics`;
      const docRef = await addDoc(collection(db, path), newMetric);
      newMetric.id = docRef.id;

      onAddMetric(newMetric);
      setShowAddForm(false);
      setWeightKg('');
      setChestCm('');
      setWaistCm('');
      setBicepCm('');
      setThighCm('');
      setNotes('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${userId}/metrics`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (metricId?: string) => {
    if (!metricId) return;
    try {
      await deleteDoc(doc(db, 'users', userId, 'metrics', metricId));
      onDeleteMetric(metricId);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}/metrics/${metricId}`);
    }
  };

  const sortedMetrics = [...metrics].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-purple-400" />
            Progreso Corporal y Antropometría
          </h2>
          <p className="text-xs text-zinc-400">
            Control de peso, perímetros corporales y composición.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-lg shadow-purple-600/20 cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{showAddForm ? 'Cerrar Formulario' : 'Nuevo Registro'}</span>
        </button>
      </div>

      {/* Form modal or expander */}
      {showAddForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl space-y-4 shadow-xl animate-fade-in"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Ruler className="w-4 h-4 text-purple-400" />
            Registrar Nuevas Medidas
          </h3>

          {formError && (
            <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-semibold">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Peso Corporal (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="Ej. 78.5"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Perímetro de Pecho (cm)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="Ej. 104"
                value={chestCm}
                onChange={(e) => setChestCm(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Perímetro de Cintura (cm)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="Ej. 82"
                value={waistCm}
                onChange={(e) => setWaistCm(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Perímetro de Bíceps en flexión (cm)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="Ej. 38.5"
                value={bicepCm}
                onChange={(e) => setBicepCm(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Perímetro de Cuádriceps / Muslo (cm)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="Ej. 60"
                value={thighCm}
                onChange={(e) => setThighCm(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">
                Notas / Sensaciones
              </label>
              <input
                type="text"
                placeholder="Ej. En ayunas, buena definición"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition shadow-md shadow-purple-600/20"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar en Firestore'}
            </button>
          </div>
        </form>
      )}

      {/* Metrics List */}
      <div className="space-y-3">
        {sortedMetrics.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-400 text-xs">
            No tienes registros de medidas aún. Añade tu primera medición para ver tu evolución antropométrica.
          </div>
        ) : (
          sortedMetrics.map((item, idx) => {
            const nextOlder = sortedMetrics[idx + 1];
            const weightDelta = nextOlder ? item.weightKg - nextOlder.weightKg : null;

            return (
              <div
                key={item.id || idx}
                className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
                    <Scale className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-mono text-xl font-extrabold text-white flex items-center gap-2">
                      <span>{item.weightKg} kg</span>
                      {weightDelta !== null && weightDelta !== 0 && (
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                            weightDelta > 0
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-cyan-500/15 text-cyan-400'
                          }`}
                        >
                          {weightDelta > 0 ? `+${weightDelta.toFixed(1)}` : weightDelta.toFixed(1)} kg
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-400">
                      {new Date(item.date).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                  {item.chestCm && (
                    <div className="bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700/60">
                      <span className="text-zinc-400">Pecho: </span>
                      <span className="text-white font-bold">{item.chestCm} cm</span>
                    </div>
                  )}
                  {item.waistCm && (
                    <div className="bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700/60">
                      <span className="text-zinc-400">Cintura: </span>
                      <span className="text-white font-bold">{item.waistCm} cm</span>
                    </div>
                  )}
                  {item.bicepCm && (
                    <div className="bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700/60">
                      <span className="text-zinc-400">Bíceps: </span>
                      <span className="text-white font-bold">{item.bicepCm} cm</span>
                    </div>
                  )}
                  {item.thighCm && (
                    <div className="bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700/60">
                      <span className="text-zinc-400">Muslo: </span>
                      <span className="text-white font-bold">{item.thighCm} cm</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-zinc-500 hover:text-red-400 p-1.5"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
