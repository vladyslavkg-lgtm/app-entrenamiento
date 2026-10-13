import { WorkoutSession } from '../types/fitness';

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export interface SheetsExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  rowsAppended: number;
}

export interface CalendarEventResult {
  eventId: string;
  htmlLink: string;
}

/**
 * Searches for or creates a Google Sheet titled "AuraFit - Registro de Entrenamientos"
 * and appends the workout session data.
 */
export async function exportWorkoutToGoogleSheets(
  accessToken: string,
  workout: WorkoutSession,
  existingSheetId?: string | null
): Promise<SheetsExportResult> {
  let spreadsheetId = existingSheetId;

  // If no spreadsheet ID provided, check or create a new one
  if (!spreadsheetId) {
    const createRes = await fetch(SHEETS_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: 'AuraFit - Registro de Entrenamientos',
        },
        sheets: [
          {
            properties: {
              title: 'Historial de Fuerza',
              gridProperties: {
                frozenRowCount: 1,
              },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      throw new Error(err.error?.message || 'Error al crear la hoja de cálculo en Google Sheets');
    }

    const sheetData = await createRes.json();
    spreadsheetId = sheetData.spreadsheetId;

    // Insert styled header row
    const headers = [
      'Fecha',
      'Rutina / Título',
      'Duración (min)',
      'Volumen Total (kg)',
      'Total Ejercicios',
      'Desglose de Series (Sets x Reps @ Peso kg [RPE])',
      'Notas del Entrenamiento',
    ];

    await fetch(`${SHEETS_API}/${spreadsheetId}/values/A1:G1?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [headers],
      }),
    });
  }

  // Format the exercise breakdown
  const exercisesSummary = workout.exercises
    .map((e) => {
      const setsStr = e.sets
        .filter((s) => s.completed)
        .map((s) => `${s.reps}r@${s.weightKg}kg (RPE ${s.rpe})`)
        .join(', ');
      return `${e.exerciseName}: [${setsStr || 'Sin series completadas'}]`;
    })
    .join(' | ');

  const formattedDate = new Date(workout.date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rowData = [
    formattedDate,
    workout.title || workout.routineType,
    workout.durationMinutes,
    workout.totalVolumeKg,
    workout.exercises.length,
    exercisesSummary,
    workout.notes || 'Ninguna',
  ];

  const appendRes = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData],
      }),
    }
  );

  if (!appendRes.ok) {
    const err = await appendRes.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al añadir el entrenamiento a Google Sheets');
  }

  return {
    spreadsheetId: spreadsheetId!,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    rowsAppended: 1,
  };
}

/**
 * Creates an event in Google Calendar for a scheduled workout
 */
export async function scheduleWorkoutInGoogleCalendar(
  accessToken: string,
  params: {
    routineTitle: string;
    routineType: string;
    scheduledAt: Date;
    durationMinutes?: number;
    exercisesSummary?: string[];
  }
): Promise<CalendarEventResult> {
  const start = params.scheduledAt;
  const duration = params.durationMinutes || 60;
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const description = [
    `🏋️ Sesión de entrenamiento planificada con AuraFit - Coach IA.`,
    `Rutina: ${params.routineType}`,
    params.exercisesSummary && params.exercisesSummary.length > 0
      ? `\nEjercicios previstos:\n• ${params.exercisesSummary.join('\n• ')}`
      : '',
    `\nObjetivo: Sobrecarga progresiva, control de RPE/RIR y recuperación adecuada.`,
  ].join('\n');

  const eventPayload = {
    summary: `🏋️ AuraFit: ${params.routineTitle}`,
    description,
    start: {
      dateTime: start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    colorId: '10', // Green/Athletic color in Google Calendar
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 30 },
        { method: 'popup', minutes: 10 },
      ],
    },
  };

  const response = await fetch(CALENDAR_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Error al agendar la sesión en Google Calendar');
  }

  const result = await response.json();
  return {
    eventId: result.id,
    htmlLink: result.htmlLink,
  };
}
