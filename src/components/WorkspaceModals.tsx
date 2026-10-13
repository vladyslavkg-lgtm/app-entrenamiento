import React, { useState } from 'react';
import { Table, Calendar, X, Check, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { WorkoutSession } from '../types/fitness';

interface ExportSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workout: WorkoutSession | null;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export const ExportSheetsModal: React.FC<ExportSheetsModalProps> = ({
  isOpen,
  onClose,
  workout,
  onConfirm,
  isLoading,
}) => {
  if (!isOpen || !workout) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-base">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <span>Exportar a Google Sheets</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1" disabled={isLoading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5 text-sm">
          <div className="p-3.5 rounded-2xl bg-zinc-800/80 border border-zinc-700/60">
            <div className="text-xs text-zinc-400 font-medium">Hoja de cálculo destino:</div>
            <div className="text-sm font-semibold text-white">"AuraFit - Registro de Entrenamientos"</div>
            <div className="text-xs text-zinc-400 mt-1">
              Se creará automáticamente en tu Google Drive si no existe, o se añadirá una nueva fila a tu historial.
            </div>
          </div>

          <div className="space-y-1.5 bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Sesión:</span>
              <span className="font-semibold text-zinc-200">{workout.title} ({workout.routineType})</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Volumen Total:</span>
              <span className="font-bold text-emerald-400">{workout.totalVolumeKg.toLocaleString()} kg</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Duración:</span>
              <span className="font-semibold text-zinc-200">{workout.durationMinutes} minutos</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Ejercicios:</span>
              <span className="font-semibold text-zinc-200">{workout.exercises.length} ejercicios registrados</span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Se requiere confirmación para añadir esta fila con tus datos de entrenamiento a tu cuenta de Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-zinc-300 font-semibold hover:bg-zinc-800 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-zinc-950 font-bold hover:brightness-110 transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="animate-spin text-sm">⏳ Exportando...</span>
            ) : (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                Confirmar y Exportar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

interface ScheduleCalendarModalProps {
  isOpen: boolean;
  onClose: () => void;
  routineTitle: string;
  routineType: string;
  exercisesList: string[];
  onConfirm: (scheduledDate: Date, durationMinutes: number) => Promise<void>;
  isLoading: boolean;
}

export const ScheduleCalendarModal: React.FC<ScheduleCalendarModalProps> = ({
  isOpen,
  onClose,
  routineTitle,
  routineType,
  exercisesList,
  onConfirm,
  isLoading,
}) => {
  const [selectedDate, setSelectedDate] = useState(() => {
    // Tomorrow at 18:00 default
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(60);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(new Date(selectedDate), duration);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-zinc-100">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5 text-cyan-400 font-bold text-base">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <span>Agendar en Google Calendar</span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-white p-1" disabled={isLoading}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="p-3 rounded-2xl bg-zinc-950/60 border border-zinc-800">
            <div className="text-xs text-zinc-400">Entrenamiento:</div>
            <div className="font-semibold text-white">{routineTitle} ({routineType})</div>
            {exercisesList.length > 0 && (
              <div className="text-xs text-zinc-400 mt-1">
                {exercisesList.length} ejercicios planificados
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Fecha y Hora programada
            </label>
            <input
              type="datetime-local"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
              Duración estimada (minutos)
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-xl bg-zinc-800 border border-zinc-700 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
            >
              <option value={45}>45 minutos</option>
              <option value={60}>60 minutos (1 hora)</option>
              <option value={75}>75 minutos</option>
              <option value={90}>90 minutos (1 hora 30 min)</option>
              <option value={120}>120 minutos (2 horas)</option>
            </select>
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">
            Se creará un nuevo evento en tu calendario principal con recordatorio de 30 minutos antes.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800/60 text-zinc-300 font-semibold hover:bg-zinc-800 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-zinc-950 font-bold hover:brightness-110 transition shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <span className="animate-spin text-sm">⏳ Agendando...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  Confirmar y Agendar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
